"""
Comprehensive pytest suite for ShiftSync CP-SAT Engine.
Tests: solvability, hard constraints, room tags, workload distribution, infeasibility, edge cases.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from schemas.api_models import (
    GenerationPayload, CollegeSettings, RoomsConfig, Room,
    FacultyConfig, WorkloadItem, BlockedSlot
)
from solver.engine import TimetableEngine


# ─── Helpers ───────────────────────────────────────────────────────────────────

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = [8, 9, 10, 11, 12, 13, 14, 15]
LUNCH = {"Mon": 12, "Tue": 12, "Wed": 12, "Thu": 12, "Fri": 12}


def base_settings(days=None, slots=None):
    return CollegeSettings(
        days_active=days or DAYS,
        time_slots=slots or SLOTS,
        lunch_slot=LUNCH,
        custom_rules=[],
    )


def make_room(rid="R1", rtype="Classroom", capacity=60, tags=None):
    return Room(id=rid, type=rtype, capacity=capacity, tags=tags or [])


def make_workload(wid="W1", subject="CS101", hours=2, consecutive=1,
                  targets=None, tags=None, is_online=False):
    return WorkloadItem(
        id=wid, type="Theory", subject=subject,
        target_groups=targets or ["Div_A"],
        hours=hours, consecutive_hours=consecutive,
        required_tags=tags or [], is_online=is_online,
    )


def make_faculty(fid="F1", name="Dr. A", shift=None, max_load=20,
                 max_cont=3, blocked=None, workload=None):
    return FacultyConfig(
        id=fid, name=name,
        shift=shift or SLOTS,
        blocked_slots=blocked or [],
        max_load_hrs=max_load,
        max_continuous_hrs=max_cont,
        class_teacher_for=None,
        workload=workload or [],
    )


def run_engine(payload: GenerationPayload):
    engine = TimetableEngine(payload)
    return engine.generate()


# ─── Category 1: Basic Solvability ────────────────────────────────────────────

class TestBasicSolvability:

    def test_minimal_schedule(self):
        """1 faculty, 1 room, 1 workload of 2 hrs → FEASIBLE with exactly 2 slots."""
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[make_faculty(workload=[make_workload(hours=2)])]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow"), \
            f"Expected success, got {result['status']}: {result.get('error')}"
        schedule = result.get("schedule", [])
        assert len(schedule) == 2, f"Expected 2 slots, got {len(schedule)}"

    def test_single_slot(self):
        """1 workload of 1 hr → exactly 1 slot in output."""
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[make_faculty(workload=[make_workload(hours=1)])]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        assert len(result.get("schedule", [])) == 1

    def test_empty_faculty_no_crash(self):
        """No faculty → must not crash; returns empty schedule or infeasible gracefully."""
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[]
        )
        result = run_engine(payload)
        # Should not raise; empty faculty = empty schedule
        assert "status" in result
        schedule = result.get("schedule", [])
        assert len(schedule) == 0, f"Expected empty schedule, got {len(schedule)} slots"

    def test_empty_rooms_ghost_room(self):
        """No physical rooms → workloads go to ghost-room (overflow), status = success_with_overflow."""
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[]),
            faculty=[make_faculty(workload=[make_workload(hours=2)])]
        )
        result = run_engine(payload)
        assert result["status"] in ("success_with_overflow", "infeasible"), \
            f"Expected overflow or infeasible with no rooms, got {result['status']}"
        if result["status"] == "success_with_overflow":
            assert all(s.get("needs_room_assignment") for s in result.get("schedule", []))


# ─── Category 2: Hard Constraints ─────────────────────────────────────────────

class TestHardConstraints:

    def test_faculty_no_double_booking(self):
        """1 faculty with 2 workloads for different groups → no (day, time) clash."""
        f = make_faculty(workload=[
            make_workload("W1", "CS101", hours=3, targets=["Div_A"]),
            make_workload("W2", "CS102", hours=3, targets=["Div_B"]),
        ])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room("R1"), make_room("R2")]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        schedule = result.get("schedule", [])
        slots_by_fac_day_time = {}
        for s in schedule:
            key = (s.get("faculty_id"), s.get("day"), s.get("time_slot"))
            assert key not in slots_by_fac_day_time, \
                f"Double-booked faculty at {key}: {slots_by_fac_day_time[key]} and {s}"
            slots_by_fac_day_time[key] = s

    def test_room_no_double_booking(self):
        """2 faculty with same time demand → different rooms, no room clash."""
        f1 = make_faculty("F1", "Dr. A", workload=[make_workload("W1", "CS101", hours=2, targets=["Div_A"])])
        f2 = make_faculty("F2", "Dr. B", workload=[make_workload("W2", "CS102", hours=2, targets=["Div_B"])])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room("R1"), make_room("R2")]),
            faculty=[f1, f2]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        schedule = [s for s in result.get("schedule", []) if not s.get("needs_room_assignment")]
        room_day_time = {}
        for s in schedule:
            key = (s.get("room"), s.get("day"), s.get("time_slot"))
            assert key not in room_day_time, \
                f"Room {s['room']} double-booked at day={s['day']} time={s['time_slot']}"
            room_day_time[key] = True

    def test_blocked_slots_respected(self):
        """Faculty has blocked Mon@8 → no slot assigned at Mon,8 for that faculty."""
        blocked = [BlockedSlot(day="Mon", time=8)]
        f = make_faculty(blocked=blocked, workload=[make_workload(hours=4)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            if s.get("faculty_id") == "F1":
                assert not (s.get("day") == "Mon" and s.get("time_slot") == 8), \
                    f"Blocked slot Mon@8 was assigned: {s}"

    def test_shift_hours_respected(self):
        """Faculty shift=[10,11,12] → never scheduled outside those hours."""
        f = make_faculty(shift=[10, 11, 12], workload=[make_workload(hours=2)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            if s.get("faculty_id") == "F1":
                assert s.get("time_slot") in [10, 11, 12], \
                    f"Slot {s['time_slot']} is outside shift [10,11,12]"

    def test_max_continuous_hrs_respected(self):
        """Faculty max_continuous_hrs=2 → no 3 consecutive slots on same day."""
        f = make_faculty(max_cont=2, workload=[make_workload(hours=6)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        # Group slots by (faculty_id, day), check no 3-consecutive
        from collections import defaultdict
        day_slots: dict = defaultdict(list)
        for s in result.get("schedule", []):
            if s.get("faculty_id") == "F1":
                day_slots[s["day"]].append(s["time_slot"])
        for day, times in day_slots.items():
            times_sorted = sorted(times)
            for i in range(len(times_sorted) - 2):
                consec = (times_sorted[i+1] == times_sorted[i] + 1 and
                          times_sorted[i+2] == times_sorted[i] + 2)
                assert not consec, \
                    f"3 consecutive slots found on {day}: {times_sorted[i:i+3]}"


# ─── Category 3: Room Tag Matching ────────────────────────────────────────────

class TestRoomTagMatching:

    def test_required_tag_match(self):
        """Workload needs 'Computer_Lab' tag → only rooms with that tag assigned."""
        rooms = [
            make_room("R1", tags=["Computer_Lab"]),
            make_room("R2", tags=[]),  # No Computer_Lab
        ]
        f = make_faculty(workload=[make_workload(hours=2, tags=["Computer_Lab"])])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=rooms),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            if not s.get("needs_room_assignment"):
                assert s.get("room") == "R1", \
                    f"Slot assigned to {s['room']} which lacks Computer_Lab tag"

    def test_no_matching_room_ghost(self):
        """No room has required tag 'Dual_Screen' → ghost-room fallback, status=success_with_overflow."""
        f = make_faculty(workload=[make_workload(hours=2, tags=["Dual_Screen"])])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room("R1", tags=["Computer_Lab"])]),
            faculty=[f]
        )
        result = run_engine(payload)
        # Should overflow, not crash
        assert result["status"] in ("success_with_overflow", "infeasible"), \
            f"Expected overflow/infeasible, got {result['status']}"
        if result["status"] == "success_with_overflow":
            overflow = [s for s in result.get("schedule", []) if s.get("needs_room_assignment")]
            assert len(overflow) > 0, "Expected ghost-room slots but found none"

    def test_online_workload_no_physical_room(self):
        """Online workload → assigned to ONLINE room, not physical."""
        f = make_faculty(workload=[make_workload(hours=2, is_online=True)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room("R1")]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            if s.get("faculty_id") == "F1":
                assert s.get("room") == "ONLINE", \
                    f"Online workload assigned to physical room: {s['room']}"


# ─── Category 4: Workload Distribution ────────────────────────────────────────

class TestWorkloadDistribution:

    def test_hours_distributed_across_week(self):
        """5 hrs/week across 5 days → slots on at least 2 different days (not all Mon)."""
        f = make_faculty(workload=[make_workload(hours=5)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        days_used = set(s["day"] for s in result.get("schedule", []))
        assert len(days_used) >= 2, \
            f"Expected slots on multiple days, got only: {days_used}"

    def test_consecutive_hours_paired(self):
        """Workload consecutive_hours=2, hours=4 → all slots come in adjacent pairs."""
        f = make_faculty(workload=[make_workload(hours=4, consecutive=2)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        schedule = result.get("schedule", [])
        assert len(schedule) == 4
        # Group by (faculty, day) and check pairs
        from collections import defaultdict
        by_day: dict = defaultdict(list)
        for s in schedule:
            by_day[s["day"]].append(s["time_slot"])
        for day, times in by_day.items():
            times_sorted = sorted(times)
            for i in range(0, len(times_sorted) - 1, 2):
                assert times_sorted[i+1] == times_sorted[i] + 1, \
                    f"Non-adjacent pair on {day}: {times_sorted[i]}, {times_sorted[i+1]}"


# ─── Category 5: Infeasibility Detection ──────────────────────────────────────

class TestInfeasibility:

    def test_infeasible_all_slots_blocked(self):
        """Faculty blocks every slot in their shift → INFEASIBLE."""
        blocked = [BlockedSlot(day=d, time=t) for d in DAYS for t in [9, 10, 11]]
        f = make_faculty(shift=[9, 10, 11], blocked=blocked,
                         workload=[make_workload(hours=2)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("infeasible",), \
            f"Expected infeasible when all shift slots are blocked, got {result['status']}"

    def test_infeasible_demand_exceeds_capacity(self):
        """Single faculty, 1 day, 3 slots, demands 10 hrs → INFEASIBLE."""
        payload = GenerationPayload(
            college_settings=base_settings(days=["Mon"], slots=[8, 9, 10]),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[make_faculty(shift=[8, 9, 10], max_load=10,
                                  workload=[make_workload(hours=10)])]
        )
        result = run_engine(payload)
        assert result["status"] == "infeasible", \
            f"Expected infeasible: 10h demand in 3 slots, got {result['status']}"

    def test_zero_workload_no_slots(self):
        """Faculty with empty workload list → 0 slots, status = success."""
        f = make_faculty(workload=[])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        assert len(result.get("schedule", [])) == 0


# ─── Category 6: Multi-Faculty Scenarios ──────────────────────────────────────

class TestMultiFaculty:

    def test_multiple_faculty_no_conflict(self):
        """3 faculty with different subjects → all scheduled without faculty clash."""
        faculty = [
            make_faculty("F1", "Dr. A", workload=[make_workload("W1", "CS101", hours=3, targets=["Div_A"])]),
            make_faculty("F2", "Dr. B", workload=[make_workload("W2", "CS102", hours=3, targets=["Div_B"])]),
            make_faculty("F3", "Dr. C", workload=[make_workload("W3", "CS103", hours=3, targets=["Div_C"])]),
        ]
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room("R1"), make_room("R2"), make_room("R3")]),
            faculty=faculty
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        # No faculty appears twice at same (day, time)
        seen = {}
        for s in result.get("schedule", []):
            key = (s["faculty_id"], s["day"], s["time_slot"])
            assert key not in seen, f"Faculty double-booked at {key}"
            seen[key] = True

    def test_output_has_required_fields(self):
        """Every schedule slot must have: faculty_id, day, time_slot, room, subject, targets."""
        f = make_faculty(workload=[make_workload(hours=2)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        for s in result.get("schedule", []):
            for field in ("faculty_id", "day", "time_slot", "room", "subject"):
                assert field in s, f"Missing field '{field}' in slot: {s}"
            # targets key: backend outputs 'targets' (mapped from target_groups)
            assert "targets" in s or "target_groups" in s, \
                f"Neither 'targets' nor 'target_groups' in slot: {s}"


# ─── Category 7: Edge Cases ────────────────────────────────────────────────────

class TestEdgeCases:

    def test_single_day_active(self):
        """Only Monday active → all slots on Monday."""
        f = make_faculty(shift=[8, 9, 10], workload=[make_workload(hours=2)])
        payload = GenerationPayload(
            college_settings=base_settings(days=["Mon"], slots=[8, 9, 10]),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            assert s["day"] == "Mon", f"Slot on {s['day']} when only Mon is active"

    def test_single_slot_per_day(self):
        """Only 1 time slot configured → can schedule at most 1 event per day."""
        f = make_faculty(shift=[9], workload=[make_workload(hours=2)])
        payload = GenerationPayload(
            college_settings=base_settings(slots=[9]),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        # 1 slot/day × 5 days = max 5 slots; for hours=2 exactly 2 slots
        assert len(result.get("schedule", [])) == 2

    def test_auto_fix_consecutive_exceeds_hours(self):
        """consecutive_hours > hours → engine auto-fixes, no crash."""
        f = make_faculty(workload=[make_workload(hours=2, consecutive=5)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        # Should not raise; engine has auto-fix logic
        result = run_engine(payload)
        assert "status" in result

    def test_result_schema_keys(self):
        """Result dict must always have 'status' and 'schedule' keys."""
        f = make_faculty(workload=[make_workload(hours=1)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert "status" in result, "Missing 'status' key in engine result"
        assert "schedule" in result, "Missing 'schedule' key in engine result"

    def test_large_workload_within_capacity(self):
        """8 hrs/week across 5 days × 8 slots = plenty of capacity → success."""
        f = make_faculty(max_load=20, shift=SLOTS,
                         workload=[make_workload(hours=8)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        assert len(result.get("schedule", [])) == 8

    def test_lunch_slot_not_used(self):
        """Lunch slot (as per college_settings) should never be assigned."""
        # Lunch on all days = slot 12
        f = make_faculty(shift=[9, 10, 11, 12, 13, 14], workload=[make_workload(hours=4)])
        payload = GenerationPayload(
            college_settings=base_settings(),
            rooms_config=RoomsConfig(rooms=[make_room()]),
            faculty=[f]
        )
        result = run_engine(payload)
        assert result["status"] in ("success", "success_with_overflow")
        for s in result.get("schedule", []):
            lunch_hr = LUNCH.get(s["day"], 12)
            assert s["time_slot"] != lunch_hr, \
                f"Slot assigned during lunch hour {lunch_hr} on {s['day']}: {s}"


# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
