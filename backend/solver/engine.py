import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ortools.sat.python import cp_model # type: ignore
from schemas.api_models import GenerationPayload, Room # type: ignore
from typing import Dict, Any, List

# ─────────────────────────────────────────────────────────────────────────────
# GHOST_ROOM sentinel value
# Injected when a workload has no eligible physical room (missing tags, or no
# rooms at all).  The ghost room has unlimited capacity and is exempt from all
# physical-room overlap constraints.  Slots assigned here surface to the
# frontend as "TBD (Overflow)" with a visual warning badge.
# ─────────────────────────────────────────────────────────────────────────────
GHOST_ROOM_ID = "__GHOST_ROOM__"
GHOST_ROOM_DISPLAY = "TBD (Overflow)"


class TimetableEngine:
    def __init__(self, data: GenerationPayload):
        self.data = data
        self.model = cp_model.CpModel()
        self.variables: Dict[tuple, Any] = {}
        # Structured output
        self.schedule: List[Dict[str, Any]] = []
        # Count how many slots ended up on the ghost room
        self.overflow_count: int = 0

        # Helper structures for indexing
        self.days: List[str] = data.college_settings.days_active
        self.slots: List[int] = data.college_settings.time_slots
        self.faculty_map: Dict[str, Any] = {f.id: f for f in data.faculty}
        self.rooms_map: Dict[str, Any] = {r.id: r for r in data.rooms_config.rooms}

        # DIAGNOSTIC LOGGING
        print("====== DIAGNOSTIC ENGINE INIT ======")
        print(f"Total Faculties: {len(data.faculty)}")
        print(f"Total Workloads: {sum(len(f.workload) for f in data.faculty)}")
        print(f"Time Slots Total: {len(self.days) * len(self.slots)}")
        print(f"Rooms Total: {len(self.rooms_map)}")
        for f in data.faculty:
            total_req = sum(w.hours for w in f.workload)
            print(f"> Faculty {f.name} ({f.id}) - Requires {total_req} hours (Max Load is: {f.max_load_hrs})")
        print("=====================================")

    # ─────────────────────────────────────────────────────────────────────────
    # Room Resolution
    # ─────────────────────────────────────────────────────────────────────────
    def _get_rooms_for_workload(self, w) -> List[str]:
        """
        Return eligible room IDs for a workload.

        Priority order:
          1. ONLINE sentinel  — if workload.is_online is True
          2. Physical rooms   — that carry all required_tags
          3. GHOST_ROOM_ID    — last resort when no physical room qualifies
                                (prevents INFEASIBLE on tag-mismatch or empty room list)
        """
        if getattr(w, "is_online", False):
            return ["ONLINE"]

        valid_rooms = []
        for room in self.data.rooms_config.rooms:
            # Never let a physical workload fall into the ONLINE bucket
            if room.id.upper() == "ONLINE":
                continue
            has_all_tags = all(tag in room.tags for tag in getattr(w, "required_tags", []))
            if has_all_tags:
                valid_rooms.append(room.id)

        if not valid_rooms:
            # No physical room qualifies → inject ghost room instead of crashing
            required = getattr(w, "required_tags", [])
            print(
                f"[GHOST ROOM] Workload '{getattr(w, 'subject', w.id)}' "
                f"(tags required: {required}) has no matching physical room. "
                f"Assigning to {GHOST_ROOM_ID}."
            )
            return [GHOST_ROOM_ID]

        return valid_rooms

    # ─────────────────────────────────────────────────────────────────────────
    # Variable Creation
    # ─────────────────────────────────────────────────────────────────────────
    def _create_variables(self):
        """
        Instantiates the 4D Boolean Matrix: V[Faculty][Workload_ID][Room][Day][TimeSlot]
        Ghost room variables are created the same way — they just bypass capacity checks.
        """
        for f in self.data.faculty:
            for w in f.workload:
                valid_rooms = self._get_rooms_for_workload(w)
                for r in valid_rooms:
                    for d in self.days:
                        for s in self.slots:
                            name = f"V_F-{getattr(f, 'id', 'f')}_W-{getattr(w, 'id', 'w')}_R-{r}_D-{d}_S-{s}"
                            self.variables[(getattr(f, 'id', 'f'), getattr(w, 'id', 'w'), r, d, s)] = self.model.NewBoolVar(name)

    # ─────────────────────────────────────────────────────────────────────────
    # Hard Constraints
    # ─────────────────────────────────────────────────────────────────────────
    def _apply_hard_constraints(self):
        lunch_map = self.data.college_settings.lunch_slot

        # ── 1. Global Boundaries, Shift Compliance & Blocked Slots ───────────
        for f in self.data.faculty:
            blocked_set = {(b.day, b.time) for b in f.blocked_slots}
            for w in f.workload:
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        daily_lunch = lunch_map.get(d)
                        for s in self.slots:
                            var_key = (f.id, w.id, r, d, s)
                            if var_key in self.variables:
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
                                    self.model.Add(v == 0)  # type: ignore

        # ── 2. Workload Fulfillment (Exact block-count match) ─────────────────
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
                    w_hrs: int = getattr(w, "hours", 1)          # type: ignore
                    w_consec: int = getattr(w, "consecutive_hours", 1)  # type: ignore
                    events_needed = w_hrs // w_consec
                    self.model.Add(sum(work_sum) == events_needed)  # type: ignore

        # ── 3. Individual Faculty Workload Caps ───────────────────────────────
        for f in self.data.faculty:
            faculty_assigned_hours = []
            for w in f.workload:
                valid_r_keys = self._get_rooms_for_workload(w)
                for r in valid_r_keys:
                    for d in self.days:
                        for s in self.slots:
                            var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, s)
                            if var_key in self.variables:
                                faculty_assigned_hours.append(self.variables[var_key] * w.consecutive_hours)
                if faculty_assigned_hours:
                    self.model.Add(sum(faculty_assigned_hours) <= getattr(f, "max_load_hrs", 40))  # type: ignore

        # ── 4. Room Overlap (Sliding Window) — GHOST ROOM IS EXEMPT ──────────
        # The ghost room has unlimited capacity; we only constrain physical rooms.
        physical_rooms = [r for r in list(self.rooms_map.keys()) if r not in ("ONLINE", GHOST_ROOM_ID)]
        for r in physical_rooms:
            for d in self.days:
                for s in self.slots:
                    room_active_vars = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            for offset in range(getattr(w, "consecutive_hours", 1)):  # type: ignore
                                start_s = s - offset  # type: ignore
                                var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                if var_key in self.variables:
                                    room_active_vars.append(self.variables[var_key])
                    if room_active_vars:
                        self.model.Add(sum(room_active_vars) <= 1)  # type: ignore

        # ── 5. Faculty Double Booking (Sliding Window) ────────────────────────
        for f in self.data.faculty:
            for d in self.days:
                for s in self.slots:
                    faculty_active_vars = []
                    for w in f.workload:
                        valid_r_keys = self._get_rooms_for_workload(w)
                        for r in valid_r_keys:
                            for offset in range(w.consecutive_hours):
                                start_s = s - offset
                                var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                if var_key in self.variables:
                                    faculty_active_vars.append(self.variables[var_key])
                    if faculty_active_vars:
                        self.model.Add(sum(faculty_active_vars) <= 1)  # type: ignore

        # ── 6. Batch / Division Overlap ───────────────────────────────────────
        targets = set()
        for f in self.data.faculty:
            for w in f.workload:
                for t in w.target_groups:
                    targets.add(t)

        for t_group in targets:
            for d in self.days:
                for s in self.slots:
                    target_active_vars = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            if t_group in w.target_groups:
                                valid_r_keys = self._get_rooms_for_workload(w)
                                for r in valid_r_keys:
                                    for offset in range(w.consecutive_hours):
                                        start_s = int(s) - offset
                                        var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                        if var_key in self.variables:
                                            target_active_vars.append(self.variables[var_key])
                    if target_active_vars:
                        self.model.Add(sum(target_active_vars) <= 1)  # type: ignore

        # ── 7. Parent-Child Subgroup Conflict ─────────────────────────────────
        for parent_t in targets:
            children = [c for c in targets if parent_t in c and c != parent_t]
            if not children:
                continue
            for d in self.days:
                for s in self.slots:
                    parent_theory_vars = []
                    for f in self.data.faculty:
                        for w in f.workload:
                            if w.type == "Theory" and parent_t in w.target_groups:
                                valid_r_keys = self._get_rooms_for_workload(w)
                                for r in valid_r_keys:
                                    for offset in range(max(1, w.consecutive_hours)):
                                        start_s = int(s) - offset
                                        var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                        if var_key in self.variables:
                                            parent_theory_vars.append(self.variables[var_key])
                    if not parent_theory_vars:
                        continue
                    for child_t in children:
                        child_active_vars = []
                        for f in self.data.faculty:
                            for w in f.workload:
                                if w.type in ["Practical", "Tutorial"] and child_t in w.target_groups:
                                    valid_r_keys = self._get_rooms_for_workload(w)
                                    for r in valid_r_keys:
                                        for offset in range(max(1, w.consecutive_hours)):
                                            start_s = int(s) - offset
                                            var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                            if var_key in self.variables:
                                                child_active_vars.append(self.variables[var_key])
                        if child_active_vars:
                            self.model.Add(sum(parent_theory_vars) + sum(child_active_vars) <= 1)  # type: ignore

        # ── 8. Continuous Teaching Fatigue (Individual Scaling) ───────────────
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
                                var_key = (getattr(f, "id", "f"), getattr(w, "id", "w"), r, d, start_s)
                                if var_key in self.variables:
                                    vars_at_s.append(self.variables[var_key])
                    active_at_t[s] = sum(vars_at_s)
                for i in range(len(self.slots) - int(window_size) + 1):
                    window_slots = self.slots[i: i + int(window_size)]
                    window_vars = [active_at_t[s] for s in window_slots]
                    self.model.Add(sum(window_vars) <= fatigue_limit)  # type: ignore

        # ── 9. Custom Rules Engine (Pins) ─────────────────────────────────────
        for rule in getattr(self.data.college_settings, "custom_rules", []):  # type: ignore
            if getattr(rule, "action_type", "") == "FORCE_PIN":
                w_id_target = getattr(rule, "condition_value", "")
                try:
                    r_target, d_target, s_target_str = getattr(rule, "action_value", "||").split("|")
                    s_target = int(s_target_str)
                    pin_vars = []
                    for (f_id, w_id, var_r, var_d, var_s), v in self.variables.items():  # type: ignore
                        if w_id == w_id_target and var_r == r_target and var_d == d_target:
                            if var_s <= s_target < var_s + w.consecutive_hours:
                                pin_vars.append(v)
                    if pin_vars:
                        self.model.Add(sum(pin_vars) == 1)  # type: ignore
                except ValueError:
                    pass  # Safely ignore malformed pin strings

    # ─────────────────────────────────────────────────────────────────────────
    # Solve & Output Mapping
    # ─────────────────────────────────────────────────────────────────────────
    def generate(self) -> Dict[str, Any]:
        """
        Executes the CP-SAT Solver and extracts the matrix.
        Ghost-room assignments are surfaced as 'TBD (Overflow)' with a flag.
        """
        self._create_variables()
        self._apply_hard_constraints()

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10.0

        status = solver.Solve(self.model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for (f_id, w_id, r, d, s), v in self.variables.items():
                if solver.Value(v) == 1:
                    faculty = self.faculty_map[f_id]
                    workload = next(item for item in faculty.workload if item.id == w_id)

                    # Resolve ghost room to human-readable display value
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
                            # Overflow flag — consumed by frontend for ⚠ badge
                            "needs_room_assignment": is_overflow,
                        })

            result_status = "success_with_overflow" if self.overflow_count > 0 else "success"
            message = (
                f"Timetable generated with {self.overflow_count} overflow slot(s) "
                f"requiring manual room assignment."
                if self.overflow_count > 0
                else "Optimal edge-case-proof timetable generated."
            )

            if self.overflow_count > 0:
                print(
                    f"[GHOST ROOM] Generation complete — {self.overflow_count} slot(s) "
                    f"assigned to {GHOST_ROOM_DISPLAY}."
                )

            return {
                "status": result_status,
                "message": message,
                "total_classes": len(self.schedule),
                "overflow_count": self.overflow_count,
                "schedule": self.schedule,
            }
        else:
            return {
                "status": "infeasible",
                "message": "Critical Failure: The constraints provided are mathematically impossible to map.",
                "overflow_count": 0,
                "schedule": [],
            }
