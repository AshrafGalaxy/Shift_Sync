import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ortools.sat.python import cp_model  # type: ignore
from schemas.api_models import GenerationPayload, Room  # type: ignore
from typing import Dict, Any, List
import time
import math

# ─────────────────────────────────────────────────────────────────────────────
# GHOST_ROOM sentinel — used when no physical room matches required tags
# ─────────────────────────────────────────────────────────────────────────────
GHOST_ROOM_ID = "__GHOST_ROOM__"
GHOST_ROOM_DISPLAY = "TBD (Overflow)"


class TimetableEngine:
    def __init__(self, data: GenerationPayload):
        self.data = data
        self.model = cp_model.CpModel()
        self.variables: Dict[tuple, Any] = {}
        self.schedule: List[Dict[str, Any]] = []
        self.overflow_count: int = 0
        self.progress_log: List[str] = []  # Live terminal feed

        self.days: List[str] = data.college_settings.days_active
        self.slots: List[int] = data.college_settings.time_slots

        # ── Auto-heal workload data before indexing ───────────────────────────
        for f in self.data.faculty:
            for w in f.workload:
                # Fix: consecutive_hours > hours → cap to hours (Design Thinking bug)
                if w.consecutive_hours > w.hours:
                    self._log(f"[AUTO-FIX] {f.name}: '{w.subject}' consecutive_hours={w.consecutive_hours} > hours={w.hours}. Capping to {w.hours}.")
                    w.consecutive_hours = w.hours
                # Fix: hours not divisible by consecutive_hours → round up hours
                if w.consecutive_hours > 0 and w.hours % w.consecutive_hours != 0:
                    fixed = w.consecutive_hours * math.ceil(w.hours / w.consecutive_hours)
                    self._log(f"[AUTO-FIX] {f.name}: '{w.subject}' hours={w.hours} not divisible by consecutive={w.consecutive_hours}. Rounding up to {fixed}.")
                    w.hours = fixed

        # Build maps AFTER healing so IDs are consistent
        self.faculty_map: Dict[str, Any] = {f.id: f for f in data.faculty}
        self.rooms_map: Dict[str, Any] = {r.id: r for r in data.rooms_config.rooms}

        self._log_init()

    def _log(self, msg: str):
        """Append a message to the live progress log and print it."""
        print(msg)
        self.progress_log.append(msg)

    def _log_init(self):
        self._log("=" * 55)
        self._log("  ShiftSync CP-SAT Engine v2 — Initializing")
        self._log("=" * 55)
        self._log(f"  Days: {self.days}  ({len(self.days)} working days)")
        self._log(f"  Slots: {self.slots}  ({len(self.slots)} slots/day)")
        self._log(f"  Physical rooms: {len(self.rooms_map)} ({', '.join(self.rooms_map.keys())})")
        self._log(f"  Faculty members: {len(self.data.faculty)}")
        total_events = sum(
            w.hours // max(w.consecutive_hours, 1)
            for f in self.data.faculty
            for w in f.workload
        )
        self._log(f"  Total scheduling events: {total_events}")
        capacity = len(self.days) * len(self.slots) * max(len(self.rooms_map) - 1, 1)
        density = round(total_events / max(capacity, 1) * 100, 1)
        self._log(f"  Grid density: {density}%  ({'OK' if density < 80 else 'HIGH - may need more rooms/slots'})")
        self._log("-" * 55)
        for f in self.data.faculty:
            total_req = sum(w.hours for w in f.workload)
            self._log(f"  > {f.name} ({f.id[:8]}...)  demand={total_req}h  max={f.max_load_hrs}h  shift={len(f.shift)} slots/day")
        self._log("=" * 55)

    # ─────────────────────────────────────────────────────────────────────────
    # Room Resolution
    # ─────────────────────────────────────────────────────────────────────────
    def _get_rooms_for_workload(self, w) -> List[str]:
        if getattr(w, "is_online", False):
            return ["ONLINE"]

        valid_rooms = []
        for room in self.data.rooms_config.rooms:
            if room.id.upper() == "ONLINE":
                continue
            has_all_tags = all(tag in room.tags for tag in getattr(w, "required_tags", []))
            if has_all_tags:
                valid_rooms.append(room.id)

        if not valid_rooms:
            required = getattr(w, "required_tags", [])
            self._log(f"  [GHOST ROOM] '{getattr(w, 'subject', w.id)}' needs tags {required} — no match. Using TBD slot.")
            return [GHOST_ROOM_ID]

        return valid_rooms

    # ─────────────────────────────────────────────────────────────────────────
    # Variable Creation
    # ─────────────────────────────────────────────────────────────────────────
    def _create_variables(self):
        self._log("\n[STEP 1/4] Creating decision variables (4D Boolean matrix)...")
        count = 0
        for f in self.data.faculty:
            for w in f.workload:
                valid_rooms = self._get_rooms_for_workload(w)
                for r in valid_rooms:
                    for d in self.days:
                        for s in self.slots:
                            key = (f.id, w.id, r, d, s)
                            name = f"V_{f.id[:6]}_{w.id[:6]}_{r}_{d}_{s}"
                            self.variables[key] = self.model.NewBoolVar(name)
                            count += 1
        self._log(f"  Created {count} decision variables.")

    # ─────────────────────────────────────────────────────────────────────────
    # Hard Constraints
    # ─────────────────────────────────────────────────────────────────────────
    def _apply_hard_constraints(self):
        lunch_map = self.data.college_settings.lunch_slot
        self._log("\n[STEP 2/4] Applying hard constraints...")

        # ── 1. Boundary & Shift & Blocked Slots ──────────────────────────────
        self._log("  [HC-1] Shift bounds, lunch blocks, blocked slots...")
        for f in self.data.faculty:
            blocked_set = {(b.day, b.time) for b in f.blocked_slots}
            for w in f.workload:
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        daily_lunch = lunch_map.get(d)
                        for s in self.slots:
                            var_key = (f.id, w.id, r, d, s)
                            if var_key not in self.variables:
                                continue
                            v = self.variables[var_key]
                            is_valid = True
                            for offset in range(w.consecutive_hours):
                                t = s + offset
                                if (
                                    t == daily_lunch
                                    or t not in f.shift
                                    or (d, t) in blocked_set
                                    or t not in self.slots
                                ):
                                    is_valid = False
                                    break
                            if not is_valid:
                                self.model.Add(v == 0)

        # ── 2. Workload Fulfillment ───────────────────────────────────────────
        self._log("  [HC-2] Workload fulfillment (exact event counts)...")
        for f in self.data.faculty:
            for w in f.workload:
                work_sum = []
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        for s in self.slots:
                            var_key = (f.id, w.id, r, d, s)
                            if var_key in self.variables:
                                work_sum.append(self.variables[var_key])
                if work_sum:
                    events_needed = w.hours // max(w.consecutive_hours, 1)
                    self.model.Add(sum(work_sum) == events_needed)

        # ── 3. Faculty Load Caps ──────────────────────────────────────────────
        self._log("  [HC-3] Faculty weekly load caps...")
        for f in self.data.faculty:
            faculty_assigned = []
            for w in f.workload:
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        for s in self.slots:
                            var_key = (f.id, w.id, r, d, s)
                            if var_key in self.variables:
                                faculty_assigned.append(self.variables[var_key] * w.consecutive_hours)
            if faculty_assigned:
                self.model.Add(sum(faculty_assigned) <= f.max_load_hrs)

        # ── 4. Room Overlap ───────────────────────────────────────────────────
        self._log("  [HC-4] Room double-booking prevention (sliding window)...")
        physical_rooms = [r for r in self.rooms_map.keys() if r not in ("ONLINE", GHOST_ROOM_ID)]
        for r in physical_rooms:
            for d in self.days:
                for s in self.slots:
                    room_active = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            for offset in range(w.consecutive_hours):
                                start_s = s - offset
                                var_key = (f.id, w.id, r, d, start_s)
                                if var_key in self.variables:
                                    room_active.append(self.variables[var_key])
                    if room_active:
                        self.model.Add(sum(room_active) <= 1)

        # ── 5. Faculty Double-Booking ─────────────────────────────────────────
        self._log("  [HC-5] Faculty double-booking prevention...")
        for f in self.data.faculty:
            for d in self.days:
                for s in self.slots:
                    faculty_active = []
                    for w in f.workload:
                        valid_r_keys = self._get_rooms_for_workload(w)
                        for r in valid_r_keys:
                            for offset in range(w.consecutive_hours):
                                start_s = s - offset
                                var_key = (f.id, w.id, r, d, start_s)
                                if var_key in self.variables:
                                    faculty_active.append(self.variables[var_key])
                    if faculty_active:
                        self.model.Add(sum(faculty_active) <= 1)

        # ── 6. Target Group Overlap ───────────────────────────────────────────
        self._log("  [HC-6] Student group conflict prevention...")
        targets = set()
        for f in self.data.faculty:
            for w in f.workload:
                for t in w.target_groups:
                    targets.add(t)

        for t_group in targets:
            for d in self.days:
                for s in self.slots:
                    target_active = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            if t_group in w.target_groups:
                                valid_r_keys = self._get_rooms_for_workload(w)
                                for r in valid_r_keys:
                                    for offset in range(w.consecutive_hours):
                                        start_s = s - offset
                                        var_key = (f.id, w.id, r, d, start_s)
                                        if var_key in self.variables:
                                            target_active.append(self.variables[var_key])
                    if target_active:
                        self.model.Add(sum(target_active) <= 1)

        # ── 7. Parent-Child Subgroup Guard ────────────────────────────────────
        self._log("  [HC-7] Parent-child subgroup conflict guard...")
        for parent_t in targets:
            children = [c for c in targets if parent_t in c and c != parent_t and parent_t != c]
            # Only apply if the parent has Theory classes (not Practical-vs-Practical)
            parent_has_theory = any(
                parent_t in w.target_groups and w.type == "Theory"
                for f in self.data.faculty
                for w in f.workload
            )
            if not children or not parent_has_theory:
                continue
            for d in self.days:
                for s in self.slots:
                    parent_vars = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            if w.type == "Theory" and parent_t in w.target_groups:
                                valid_r_keys = self._get_rooms_for_workload(w)
                                for r in valid_r_keys:
                                    for offset in range(max(1, w.consecutive_hours)):
                                        start_s = s - offset
                                        var_key = (f.id, w.id, r, d, start_s)
                                        if var_key in self.variables:
                                            parent_vars.append(self.variables[var_key])
                    if not parent_vars:
                        continue
                    for child_t in children:
                        child_vars = []
                        for f in self.data.faculty:
                            for w in f.workload:
                                if w.type in ["Practical", "Tutorial"] and child_t in w.target_groups:
                                    valid_r_keys = self._get_rooms_for_workload(w)
                                    for r in valid_r_keys:
                                        for offset in range(max(1, w.consecutive_hours)):
                                            start_s = s - offset
                                            var_key = (f.id, w.id, r, d, start_s)
                                            if var_key in self.variables:
                                                child_vars.append(self.variables[var_key])
                        if child_vars:
                            self.model.Add(sum(parent_vars) + sum(child_vars) <= 1)

        # ── 8. Fatigue Limit (Continuous Teaching) ────────────────────────────
        self._log("  [HC-8] Faculty fatigue limit (continuous teaching cap)...")
        for f in self.data.faculty:
            fatigue_limit = getattr(f, "max_continuous_hrs", 3)
            window_size = fatigue_limit + 1
            for d in self.days:
                active_at_t = {}
                for s in self.slots:
                    vars_at_s = []
                    for w in f.workload:
                        valid_r_keys = self._get_rooms_for_workload(w)
                        for r in valid_r_keys:
                            for offset in range(w.consecutive_hours):
                                start_s = s - offset
                                var_key = (f.id, w.id, r, d, start_s)
                                if var_key in self.variables:
                                    vars_at_s.append(self.variables[var_key])
                    active_at_t[s] = sum(vars_at_s) if vars_at_s else 0
                for i in range(len(self.slots) - int(window_size) + 1):
                    window_slots = self.slots[i: i + int(window_size)]
                    window_vars = [active_at_t[s] for s in window_slots if s in active_at_t]
                    if window_vars:
                        self.model.Add(sum(window_vars) <= fatigue_limit)

        # ── 9. Custom Pin Rules ───────────────────────────────────────────────
        for rule in getattr(self.data.college_settings, "custom_rules", []):
            if getattr(rule, "action_type", "") == "FORCE_PIN":
                w_id_target = getattr(rule, "condition_value", "")
                try:
                    r_target, d_target, s_target_str = getattr(rule, "action_value", "||").split("|")
                    s_target = int(s_target_str)
                    pin_vars = []
                    for (f_id, w_id, var_r, var_d, var_s), v in self.variables.items():
                        if w_id_target in w_id and var_r == r_target and var_d == d_target:
                            if var_s == s_target:
                                pin_vars.append(v)
                    if pin_vars:
                        self.model.Add(sum(pin_vars) == 1)
                except ValueError:
                    pass

        self._log("  All hard constraints applied.")

    # ─────────────────────────────────────────────────────────────────────────
    # Soft Constraints + Objective
    # ─────────────────────────────────────────────────────────────────────────
    def _apply_soft_constraints_and_objective(self):
        self._log("\n[STEP 3/4] Building soft objective (optimality scoring)...")
        penalty_terms = []

        MORNING_SLOTS = set(self.slots[:len(self.slots)//2])  # prefer earlier slots
        LATE_SLOTS = set(self.slots[len(self.slots)*3//4:])   # penalize very late

        for f in self.data.faculty:
            for w in f.workload:
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        for s in self.slots:
                            var_key = (f.id, w.id, r, d, s)
                            if var_key not in self.variables:
                                continue
                            v = self.variables[var_key]
                            # Ghost room penalty
                            if r == GHOST_ROOM_ID:
                                penalty_terms.append(v * 100)
                            # Late slot penalty
                            elif s in LATE_SLOTS:
                                penalty_terms.append(v * 5)

        if penalty_terms:
            self.model.Minimize(sum(penalty_terms))
        self._log(f"  Soft objective: minimize {len(penalty_terms)} penalty terms.")

    # ─────────────────────────────────────────────────────────────────────────
    # Compute Optimality Score
    # ─────────────────────────────────────────────────────────────────────────
    def _compute_score(self, solver) -> int:
        """
        Returns 0-100. Deducts points for:
        - Ghost room slots (-5 each)
        - Late-slot assignments (-1 each)
        - Overflow (-3 per overflow hour)
        """
        base = 100
        LATE_SLOTS = set(self.slots[len(self.slots)*3//4:])

        ghost_count = 0
        late_count = 0
        for (f_id, w_id, r, d, s), v in self.variables.items():
            if solver.Value(v) == 1:
                if r == GHOST_ROOM_ID:
                    ghost_count += 1
                elif s in LATE_SLOTS:
                    late_count += 1

        score = base - (ghost_count * 5) - (late_count * 1) - (self.overflow_count * 3)
        return max(0, min(100, score))

    # ─────────────────────────────────────────────────────────────────────────
    # Generate (main entry point)
    # ─────────────────────────────────────────────────────────────────────────
    def generate(self) -> Dict[str, Any]:
        t_start = time.time()

        self._create_variables()
        self._apply_hard_constraints()
        self._apply_soft_constraints_and_objective()

        self._log("\n[STEP 4/4] Running CP-SAT solver (timeout: 30s)...")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        solver.parameters.num_search_workers = 4  # parallel search

        status = solver.Solve(self.model)
        elapsed = round(time.time() - t_start, 2)

        STATUS_NAMES = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.UNKNOWN: "UNKNOWN (timeout)",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
        }
        status_name = STATUS_NAMES.get(status, str(status))
        self._log(f"  Solver finished in {elapsed}s → status: {status_name}")

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for (f_id, w_id, r, d, s), v in self.variables.items():
                if solver.Value(v) == 1:
                    faculty = self.faculty_map[f_id]
                    workload = next((item for item in faculty.workload if item.id == w_id), None)
                    if not workload:
                        continue

                    is_overflow = (r == GHOST_ROOM_ID)
                    display_room = GHOST_ROOM_DISPLAY if is_overflow else r
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
                            "room": display_room,
                            "day": d,
                            "time_slot": s + offset,
                            "needs_room_assignment": is_overflow,
                        })

            optimality_score = self._compute_score(solver)
            result_status = "success_with_overflow" if self.overflow_count > 0 else "success"
            is_optimal = (status == cp_model.OPTIMAL)

            msg = f"{'Optimal' if is_optimal else 'Feasible'} timetable generated in {elapsed}s."
            if self.overflow_count > 0:
                msg += f" {self.overflow_count} slot(s) need manual room assignment."

            self._log(f"\n  Schedule entries: {len(self.schedule)}")
            self._log(f"  Optimality score: {optimality_score}/100")
            self._log(f"  Overflow slots: {self.overflow_count}")
            self._log("=" * 55)

            return {
                "status": result_status,
                "message": msg,
                "total_classes": len(self.schedule),
                "overflow_count": self.overflow_count,
                "optimality_score": optimality_score,
                "solver_status": status_name,
                "solve_time_seconds": elapsed,
                "progress_log": self.progress_log,
                "schedule": self.schedule,
            }

        else:
            # ── Detailed failure diagnosis ─────────────────────────────────
            diagnosis = self._diagnose_infeasibility()
            self._log("\n  [INFEASIBLE] Diagnosis complete.")
            self._log("=" * 55)

            return {
                "status": "infeasible",
                "message": f"Generation failed after {elapsed}s. See diagnosis for details.",
                "solver_status": status_name,
                "solve_time_seconds": elapsed,
                "overflow_count": 0,
                "optimality_score": 0,
                "progress_log": self.progress_log,
                "diagnosis": diagnosis,
                "schedule": [],
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Infeasibility Diagnosis
    # ─────────────────────────────────────────────────────────────────────────
    def _diagnose_infeasibility(self) -> Dict[str, Any]:
        """
        Returns human-readable reasons why the solver failed.
        Checks: overloaded faculty, overloaded groups, impossible slots.
        """
        issues = []
        total_slots_per_week = len(self.days) * len(self.slots)
        lunch_map = self.data.college_settings.lunch_slot
        lunch_deductions = sum(1 for d in self.days if lunch_map.get(d) in self.slots)
        usable_slots = total_slots_per_week - lunch_deductions

        from collections import defaultdict
        group_demand: Dict[str, int] = defaultdict(int)

        for f in self.data.faculty:
            total_demand = sum(w.hours for w in f.workload)
            faculty_slots = len(f.shift) * len(self.days) - len(f.blocked_slots)
            if total_demand > f.max_load_hrs:
                issues.append({
                    "type": "FACULTY_OVERLOADED",
                    "message": f"{f.name}: requires {total_demand}h but max_load={f.max_load_hrs}h",
                    "fix": f"Reduce workloads or increase max_load_hrs to {total_demand}."
                })
            if total_demand > faculty_slots:
                issues.append({
                    "type": "FACULTY_NO_TIME",
                    "message": f"{f.name}: requires {total_demand}h but only has {faculty_slots} available slots",
                    "fix": "Extend shift hours or reduce workload assignments."
                })
            for w in f.workload:
                for tg in w.target_groups:
                    group_demand[tg] += w.hours

        for tg, demand in group_demand.items():
            if demand > usable_slots:
                issues.append({
                    "type": "GROUP_OVERLOADED",
                    "message": f"Group '{tg}' has {demand}h of classes but only {usable_slots} usable slots/week",
                    "fix": "Split the group into subgroups or reduce the number of classes assigned to them."
                })

        # Check room capacity
        physical_rooms = [r for r in self.data.rooms_config.rooms if r.id.upper() not in ("ONLINE", GHOST_ROOM_ID)]
        total_room_capacity = len(physical_rooms) * usable_slots
        total_physical_demand = sum(
            w.hours for f in self.data.faculty for w in f.workload if not w.is_online
        )
        if total_physical_demand > total_room_capacity:
            issues.append({
                "type": "ROOM_CAPACITY_EXCEEDED",
                "message": f"Total demand {total_physical_demand}h exceeds room capacity {total_room_capacity}h ({len(physical_rooms)} rooms × {usable_slots} usable slots)",
                "fix": "Add more rooms, extend working hours, or move some classes online."
            })

        if not issues:
            issues.append({
                "type": "UNKNOWN_CONSTRAINT_CONFLICT",
                "message": "The solver could not find a feasible solution. The constraints may be too tight even if individual checks pass.",
                "fix": "Try: (1) adding more rooms, (2) extending working hours, (3) reducing consecutive_hours requirements, or (4) splitting large groups."
            })

        self._log(f"  Found {len(issues)} feasibility issue(s):")
        for issue in issues:
            self._log(f"    [{issue['type']}] {issue['message']}")
            self._log(f"    Fix: {issue['fix']}")

        return {"issues": issues, "total_issues": len(issues)}
