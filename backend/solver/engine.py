import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ortools.sat.python import cp_model  # type: ignore
from schemas.api_models import GenerationPayload  # type: ignore
from typing import Dict, Any, List
from collections import defaultdict
import time
import math

GHOST_ROOM_ID = "__GHOST_ROOM__"
GHOST_ROOM_DISPLAY = "TBD (Overflow)"


class TimetableEngine:
    def __init__(self, data: GenerationPayload):
        self.data = data
        self.model = cp_model.CpModel()
        self.variables: Dict[tuple, Any] = {}
        self.schedule: List[Dict[str, Any]] = []
        self.overflow_count: int = 0
        self.progress_log: List[str] = []

        self.days: List[str] = data.college_settings.days_active
        self.slots: List[int] = data.college_settings.time_slots
        self.slot_set = set(self.slots)

        # ── Auto-heal impossible workload constraints ─────────────────────────
        for f in self.data.faculty:
            for w in f.workload:
                if w.consecutive_hours > w.hours:
                    self._log(f"[AUTO-FIX] {f.name}: '{w.subject}' consecutive_hours capped from {w.consecutive_hours} to {w.hours}")
                    w.consecutive_hours = w.hours
                if w.consecutive_hours > 0 and w.hours % w.consecutive_hours != 0:
                    fixed = w.consecutive_hours * math.ceil(w.hours / w.consecutive_hours)
                    self._log(f"[AUTO-FIX] {f.name}: '{w.subject}' hours rounded {w.hours}->{fixed} to be divisible by consecutive={w.consecutive_hours}")
                    w.hours = fixed

        self.faculty_map: Dict[str, Any] = {f.id: f for f in data.faculty}
        self.rooms_map: Dict[str, Any] = {r.id: r for r in data.rooms_config.rooms}

        # Pre-compute eligible rooms per workload (cache to avoid recomputing in loops)
        self._room_cache: Dict[str, List[str]] = {}

        self._log_init()

    def _log(self, msg: str):
        print(msg, flush=True)
        self.progress_log.append(msg)

    def _log_init(self):
        self._log("=" * 55)
        self._log("  ShiftSync CP-SAT Engine v2 - Initializing")
        self._log("=" * 55)
        self._log(f"  Days: {self.days}  ({len(self.days)} working days)")
        self._log(f"  Slots per day: {len(self.slots)}")
        self._log(f"  Physical rooms: {len(self.rooms_map)}")
        self._log(f"  Faculty: {len(self.data.faculty)}")
        total_events = sum(
            w.hours // max(w.consecutive_hours, 1)
            for f in self.data.faculty for w in f.workload
        )
        self._log(f"  Total events to schedule: {total_events}")
        self._log("=" * 55)

    def _get_rooms_for_workload(self, w) -> List[str]:
        """Cached room resolution."""
        cache_key = w.id
        if cache_key in self._room_cache:
            return self._room_cache[cache_key]

        if getattr(w, "is_online", False):
            result = ["ONLINE"]
        else:
            valid = [
                r.id for r in self.data.rooms_config.rooms
                if r.id.upper() != "ONLINE"
                and all(tag in r.tags for tag in getattr(w, "required_tags", []))
            ]
            result = valid if valid else [GHOST_ROOM_ID]

        self._room_cache[cache_key] = result
        return result

    def _create_variables(self):
        self._log("\n[STEP 1/4] Creating decision variables...")
        count = 0
        for f in self.data.faculty:
            for w in f.workload:
                valid_rooms = self._get_rooms_for_workload(w)
                for r in valid_rooms:
                    for d in self.days:
                        for s in self.slots:
                            # Only create variable if the block fits within the slot list
                            block_fits = all((s + offset) in self.slot_set for offset in range(w.consecutive_hours))
                            if block_fits:
                                key = (f.id, w.id, r, d, s)
                                self.variables[key] = self.model.NewBoolVar(f"V_{count}")
                                count += 1
        self._log(f"  Created {count} variables.")

    def _apply_hard_constraints(self):
        lunch_map = self.data.college_settings.lunch_slot
        self._log("\n[STEP 2/4] Applying hard constraints...")

        # Pre-build efficient lookup structures
        # For each (f_id, r, d, s) → list of vars that are active at that slot
        room_slot_vars: Dict[tuple, List] = defaultdict(list)    # (r, d, s) → vars
        faculty_slot_vars: Dict[tuple, List] = defaultdict(list) # (f_id, d, s) → vars
        group_slot_vars: Dict[tuple, List] = defaultdict(list)   # (tg, d, s) → vars

        for (f_id, w_id, r, d, s), var in self.variables.items():
            f = self.faculty_map[f_id]
            w = next(item for item in f.workload if item.id == w_id)
            blocked_set = {(b.day, b.time) for b in f.blocked_slots}
            daily_lunch = lunch_map.get(d)

            # HC-1: Shift, lunch, blocked slot validation per offset
            is_valid = True
            for offset in range(w.consecutive_hours):
                t = s + offset
                if t == daily_lunch or t not in f.shift or (d, t) in blocked_set:
                    is_valid = False
                    break
            if not is_valid:
                self.model.Add(var == 0)
                continue  # Don't add to overlap indexes

            # Register this var in overlap indexes (for all offsets it occupies)
            for offset in range(w.consecutive_hours):
                t = s + offset
                if r not in ("ONLINE", GHOST_ROOM_ID):
                    room_slot_vars[(r, d, t)].append(var)
                faculty_slot_vars[(f_id, d, t)].append(var)
                for tg in w.target_groups:
                    group_slot_vars[(tg, d, t)].append(var)

        self._log("  [HC-1] Shift/lunch/blocked constraints applied.")

        # HC-2: Workload fulfillment
        self._log("  [HC-2] Workload fulfillment...")
        for f in self.data.faculty:
            for w in f.workload:
                valid_rooms = self._get_rooms_for_workload(w)
                work_vars = [
                    self.variables[(f.id, w.id, r, d, s)]
                    for r in valid_rooms
                    for d in self.days
                    for s in self.slots
                    if (f.id, w.id, r, d, s) in self.variables
                ]
                if work_vars:
                    events_needed = w.hours // max(w.consecutive_hours, 1)
                    self.model.Add(sum(work_vars) == events_needed)

        # HC-3: Faculty load cap
        self._log("  [HC-3] Faculty load caps...")
        for f in self.data.faculty:
            load_vars = [
                self.variables[(f.id, w.id, r, d, s)] * w.consecutive_hours
                for w in f.workload
                for r in self._get_rooms_for_workload(w)
                for d in self.days
                for s in self.slots
                if (f.id, w.id, r, d, s) in self.variables
            ]
            if load_vars:
                self.model.Add(sum(load_vars) <= f.max_load_hrs)

        # HC-4: Room no-double-booking (using pre-built index)
        self._log("  [HC-4] Room double-booking prevention...")
        for key, vars_list in room_slot_vars.items():
            if len(vars_list) > 1:
                self.model.Add(sum(vars_list) <= 1)

        # HC-5: Faculty no-double-booking
        self._log("  [HC-5] Faculty double-booking prevention...")
        for key, vars_list in faculty_slot_vars.items():
            if len(vars_list) > 1:
                self.model.Add(sum(vars_list) <= 1)

        # HC-6: Student group no-overlap
        self._log("  [HC-6] Student group conflict prevention...")
        for key, vars_list in group_slot_vars.items():
            if len(vars_list) > 1:
                self.model.Add(sum(vars_list) <= 1)

        # HC-7: Parent-child subgroup guard (Theory parent vs Practical child can't overlap)
        self._log("  [HC-7] Parent-child subgroup guard...")
        all_targets = set(tg for f in self.data.faculty for w in f.workload for tg in w.target_groups)
        for parent_t in all_targets:
            children = [c for c in all_targets if parent_t in c and c != parent_t]
            if not children:
                continue
            # Check parent has any Theory session
            parent_has_theory = any(
                parent_t in w.target_groups and w.type == "Theory"
                for f in self.data.faculty for w in f.workload
            )
            if not parent_has_theory:
                continue
            for d in self.days:
                for s in self.slots:
                    parent_vars = group_slot_vars.get((parent_t, d, s), [])
                    if not parent_vars:
                        continue
                    for child_t in children:
                        child_vars = group_slot_vars.get((child_t, d, s), [])
                        if child_vars:
                            self.model.Add(sum(parent_vars) + sum(child_vars) <= 1)

        # HC-8: Fatigue limit
        self._log("  [HC-8] Faculty fatigue limit...")
        for f in self.data.faculty:
            fatigue_limit = getattr(f, "max_continuous_hrs", 3)
            window_size = int(fatigue_limit) + 1
            for d in self.days:
                active_at = {s: faculty_slot_vars.get((f.id, d, s), []) for s in self.slots}
                for i in range(len(self.slots) - window_size + 1):
                    window = self.slots[i: i + window_size]
                    wvars = [v for s in window for v in active_at.get(s, [])]
                    if wvars:
                        self.model.Add(sum(wvars) <= fatigue_limit)

        # HC-9: Custom pin rules
        for rule in getattr(self.data.college_settings, "custom_rules", []):
            if getattr(rule, "action_type", "") == "FORCE_PIN":
                w_id_target = getattr(rule, "condition_value", "")
                try:
                    r_t, d_t, s_t = getattr(rule, "action_value", "||").split("|")
                    s_int = int(s_t)
                    pin_vars = [v for (fi, wi, r, d, s), v in self.variables.items()
                                if w_id_target in wi and r == r_t and d == d_t and s == s_int]
                    if pin_vars:
                        self.model.Add(sum(pin_vars) == 1)
                except ValueError:
                    pass

        self._log("  All hard constraints applied.")

    def _apply_objective(self):
        self._log("\n[STEP 3/4] Building soft objective...")
        late_slots = set(self.slots[len(self.slots) * 3 // 4:])
        penalties = []
        for (f_id, w_id, r, d, s), var in self.variables.items():
            if r == GHOST_ROOM_ID:
                penalties.append(var * 100)
            elif s in late_slots:
                penalties.append(var * 2)
        if penalties:
            self.model.Minimize(sum(penalties))
        self._log(f"  {len(penalties)} soft penalty terms.")

    def _compute_score(self, solver) -> int:
        late_slots = set(self.slots[len(self.slots) * 3 // 4:])
        ghost = sum(1 for (_, _, r, _, _), v in self.variables.items() if r == GHOST_ROOM_ID and solver.Value(v) == 1)
        late = sum(1 for (_, _, r, _, s), v in self.variables.items() if r != GHOST_ROOM_ID and s in late_slots and solver.Value(v) == 1)
        return max(0, min(100, 100 - ghost * 5 - late * 1 - self.overflow_count * 3))

    def generate(self) -> Dict[str, Any]:
        t0 = time.time()
        self._create_variables()
        self._apply_hard_constraints()
        self._apply_objective()

        self._log("\n[STEP 4/4] Running CP-SAT solver (30s limit, 4 workers)...")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        solver.parameters.num_search_workers = 4
        status = solver.Solve(self.model)
        elapsed = round(time.time() - t0, 2)

        STATUS_MAP = {cp_model.OPTIMAL: "OPTIMAL", cp_model.FEASIBLE: "FEASIBLE",
                      cp_model.INFEASIBLE: "INFEASIBLE", cp_model.UNKNOWN: "TIMEOUT"}
        status_name = STATUS_MAP.get(status, str(status))
        self._log(f"  Solver done in {elapsed}s → {status_name}")

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for (f_id, w_id, r, d, s), var in self.variables.items():
                if solver.Value(var) == 1:
                    faculty = self.faculty_map[f_id]
                    workload = next((w for w in faculty.workload if w.id == w_id), None)
                    if not workload:
                        continue
                    is_overflow = (r == GHOST_ROOM_ID)
                    if is_overflow:
                        self.overflow_count += workload.consecutive_hours
                    for offset in range(workload.consecutive_hours):
                        self.schedule.append({
                            "workload_id": w_id,
                            "faculty_id": f_id,
                            "faculty_name": faculty.name,
                            "subject": workload.subject,
                            "targets": workload.target_groups,
                            "type": workload.type,
                            "room": GHOST_ROOM_DISPLAY if is_overflow else r,
                            "day": d,
                            "time_slot": s + offset,
                            "needs_room_assignment": is_overflow,
                        })

            score = self._compute_score(solver)
            result_status = "success_with_overflow" if self.overflow_count > 0 else "success"
            msg = f"{'Optimal' if status == cp_model.OPTIMAL else 'Feasible'} timetable in {elapsed}s."
            if self.overflow_count > 0:
                msg += f" {self.overflow_count} slot(s) need manual room assignment."

            self._log(f"  Classes: {len(self.schedule)} | Score: {score}/100 | Overflow: {self.overflow_count}")
            self._log("=" * 55)

            return {
                "status": result_status,
                "message": msg,
                "total_classes": len(self.schedule),
                "overflow_count": self.overflow_count,
                "optimality_score": score,
                "solver_status": status_name,
                "solve_time_seconds": elapsed,
                "progress_log": self.progress_log,
                "schedule": self.schedule,
            }
        else:
            diagnosis = self._diagnose()
            self._log("=" * 55)
            return {
                "status": "infeasible",
                "message": f"No solution found after {elapsed}s. See diagnosis.",
                "solver_status": status_name,
                "solve_time_seconds": elapsed,
                "overflow_count": 0,
                "optimality_score": 0,
                "progress_log": self.progress_log,
                "diagnosis": diagnosis,
                "schedule": [],
            }

    def _diagnose(self) -> Dict[str, Any]:
        issues = []
        lunch_map = self.data.college_settings.lunch_slot
        lunch_deductions = sum(1 for d in self.days if lunch_map.get(d) in self.slot_set)
        usable = len(self.days) * len(self.slots) - lunch_deductions
        group_demand: Dict[str, int] = defaultdict(int)

        for f in self.data.faculty:
            demand = sum(w.hours for w in f.workload)
            avail = len(f.shift) * len(self.days) - len(f.blocked_slots) - lunch_deductions
            if demand > f.max_load_hrs:
                issues.append({"type": "FACULTY_OVERLOADED",
                    "message": f"{f.name}: {demand}h demand > {f.max_load_hrs}h max_load",
                    "fix": f"Increase max_load_hrs to {demand} or reduce workloads."})
            if demand > avail:
                issues.append({"type": "FACULTY_NO_TIME",
                    "message": f"{f.name}: {demand}h demand > {avail}h available shift slots",
                    "fix": "Extend shift hours or remove blocked slots."})
            for w in f.workload:
                for tg in w.target_groups:
                    group_demand[tg] += w.hours

        for tg, hrs in group_demand.items():
            if hrs > usable:
                issues.append({"type": "GROUP_OVERLOADED",
                    "message": f"Group '{tg}': {hrs}h assigned, only {usable} usable slots/week",
                    "fix": "Split group or reduce classes."})

        phys_rooms = [r for r in self.data.rooms_config.rooms if r.id.upper() not in ("ONLINE", GHOST_ROOM_ID)]
        total_cap = len(phys_rooms) * usable
        total_demand = sum(w.hours for f in self.data.faculty for w in f.workload if not w.is_online)
        if total_demand > total_cap:
            issues.append({"type": "ROOM_CAPACITY",
                "message": f"Demand {total_demand}h > room capacity {total_cap}h ({len(phys_rooms)} rooms)",
                "fix": "Add rooms, extend hours, or move classes online."})

        if not issues:
            issues.append({"type": "CONSTRAINT_CONFLICT",
                "message": "Constraints are too tight — no valid schedule exists.",
                "fix": "Reduce consecutive_hours, add rooms/slots, or split groups."})

        self._log(f"  Diagnosis: {len(issues)} issue(s) found")
        for issue in issues:
            self._log(f"    [{issue['type']}] {issue['message']}")

        return {"issues": issues, "total_issues": len(issues)}
