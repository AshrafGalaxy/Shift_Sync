"""
Phase 35 — Production Pytest Suite
Covers: ghost-room fallback, conflict refiner checks, workload divisibility guard, valid generation.
Run from /backend: pytest tests/ -v
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from schemas.api_models import GenerationPayload, CollegeSettings, RoomsConfig, Room, FacultyConfig, WorkloadItem
from solver.engine import TimetableEngine, GHOST_ROOM_ID, GHOST_ROOM_DISPLAY
from solver.diagnostics import analyze as diagnose
from services.validator import validate_input_payload

# ─── Shared fixtures ──────────────────────────────────────────────────────────

DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = [8, 9, 10, 11, 12, 14, 15, 16]
LUNCH = {"Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13}

def _settings(**kwargs):
    base = dict(days_active=DAYS, time_slots=SLOTS, lunch_slot=LUNCH, custom_rules=[])
    base.update(kwargs)
    return CollegeSettings(**base)

def _room(id="R1", tags=None):
    return Room(id=id, type="Classroom", capacity=60, tags=tags or [])

def _faculty(id="F1", name="Test", shift=None, workload=None, max_load=20):
    return FacultyConfig(
        id=id, name=name,
        shift=shift or SLOTS,
        blocked_slots=[],
        max_load_hrs=max_load,
        max_continuous_hrs=3,
        workload=workload or [],
    )

def _workload(id="W1", subject="MATH", hours=2, consec=1, tags=None, is_online=False, targets=None):
    return WorkloadItem(
        id=id, type="Theory", subject=subject,
        target_groups=targets or ["DIV-A"],
        hours=hours, consecutive_hours=consec,
        required_tags=tags or [],
        is_online=is_online,
    )

def _payload(rooms, faculty):
    return GenerationPayload(
        college_settings=_settings(),
        rooms_config=RoomsConfig(rooms=rooms),
        faculty=faculty,
    )


# ─── Phase 33: Ghost Room Fallback ───────────────────────────────────────────

class TestGhostRoom:
    def test_ghost_room_injected_when_no_tag_match(self):
        """Workload needing 'Linux_Lab' but no room has it -> ghost room used."""
        w = _workload(tags=["Linux_Lab"], hours=2)
        f = _faculty(workload=[w])
        payload = _payload(rooms=[_room()], faculty=[f])
        engine = TimetableEngine(data=payload)
        rooms = engine._get_rooms_for_workload(w)
        assert rooms == [GHOST_ROOM_ID]

    def test_ghost_room_not_injected_when_tag_matches(self):
        """Workload needing 'Lab' and a room has 'Lab' -> no ghost room."""
        w = _workload(tags=["Lab"], hours=2)
        f = _faculty(workload=[w])
        payload = _payload(rooms=[_room(tags=["Lab"])], faculty=[f])
        engine = TimetableEngine(data=payload)
        rooms = engine._get_rooms_for_workload(w)
        assert GHOST_ROOM_ID not in rooms

    def test_online_workload_never_ghost(self):
        """Online workload should always go to ONLINE, not ghost room."""
        w = _workload(is_online=True, hours=2)
        f = _faculty(workload=[w])
        payload = _payload(rooms=[], faculty=[f])
        engine = TimetableEngine(data=payload)
        rooms = engine._get_rooms_for_workload(w)
        assert rooms == ["ONLINE"]

    def test_generation_succeeds_with_ghost(self):
        """Engine returns success_with_overflow, not infeasible, when ghost fires."""
        w = _workload(tags=["Linux_Lab"], hours=2, consec=1)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        result = TimetableEngine(data=payload).generate()
        assert result["status"] == "success_with_overflow"
        assert result["overflow_count"] > 0

    def test_overflow_slots_have_flag(self):
        """Every slot on the ghost room must carry needs_room_assignment=True."""
        w = _workload(tags=["Linux_Lab"], hours=2, consec=1)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        result = TimetableEngine(data=payload).generate()
        overflow_slots = [s for s in result["schedule"] if s.get("needs_room_assignment")]
        assert len(overflow_slots) == result["overflow_count"]

    def test_ghost_room_display_name(self):
        """Overflow slots must use the human-readable display name, not the sentinel."""
        w = _workload(tags=["Linux_Lab"], hours=2, consec=1)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        result = TimetableEngine(data=payload).generate()
        ghost_slots = [s for s in result["schedule"] if s.get("needs_room_assignment")]
        for s in ghost_slots:
            assert s["room"] == GHOST_ROOM_DISPLAY
            assert GHOST_ROOM_ID not in s["room"]

    def test_clean_generation_status_is_success(self):
        """When all workloads have matching rooms, status must be plain 'success'."""
        w = _workload(tags=[], hours=2, consec=1)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        result = TimetableEngine(data=payload).generate()
        assert result["status"] == "success"
        assert result["overflow_count"] == 0


# ─── Phase 24: Workload Divisibility Guard ────────────────────────────────────

class TestValidator:
    def test_indivisible_hours_blocked(self):
        """hours=3, consecutive_hours=2 is not divisible — validator must reject it."""
        w = _workload(hours=3, consec=2)
        f = _faculty(workload=[w])
        payload = _payload(rooms=[_room()], faculty=[f])
        valid, errors = validate_input_payload(payload)
        assert not valid
        assert any("divisible" in e.lower() for e in errors)

    def test_divisible_hours_pass(self):
        """hours=4, consecutive_hours=2 is valid — validator must allow it."""
        w = _workload(hours=4, consec=2)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        valid, errors = validate_input_payload(payload)
        assert valid, f"Expected valid but got errors: {errors}"


# ─── Phase 34: Conflict Refiner / Diagnostics ────────────────────────────────

class TestDiagnostics:
    def test_no_rooms_critical(self):
        """Zero rooms -> critical 'Room Configuration' issue."""
        f = _faculty(workload=[_workload()])
        payload = _payload(rooms=[], faculty=[f])
        report = diagnose(payload)
        constraints = [i["constraint"] for i in report["critical"]]
        assert "Room Configuration" in constraints

    def test_demand_exceeds_capacity_critical(self):
        """Single room, 8 slots/day -> max 40 hrs/week. Demand 50 hrs -> critical."""
        workloads = [_workload(id=f"W{i}", hours=10, consec=1, targets=[f"DIV-{i}"]) for i in range(5)]
        f = _faculty(workload=workloads, max_load=100)
        payload = _payload(rooms=[_room()], faculty=[f])
        report = diagnose(payload)
        constraints = [i["constraint"] for i in report["critical"]]
        assert "Workload Demand vs Capacity" in constraints

    def test_faculty_shift_too_short_critical(self):
        """Faculty shift = [8,9] = 2 hrs/day × 5 days = 10 hrs, but workload = 15 hrs -> critical."""
        w = _workload(hours=15, consec=1)
        f = _faculty(shift=[8, 9], workload=[w], max_load=20)
        payload = _payload(rooms=[_room()], faculty=[f])
        report = diagnose(payload)
        constraints = [i["constraint"] for i in report["critical"]]
        assert "Faculty Shift vs Workload" in constraints

    def test_tag_mismatch_is_warning(self):
        """No room satisfies tag -> warning (not critical; ghost room handles it)."""
        w = _workload(tags=["Quantum_Lab"])
        f = _faculty(workload=[w])
        payload = _payload(rooms=[_room()], faculty=[f])
        report = diagnose(payload)
        constraints = [i["constraint"] for i in report["warnings"]]
        assert "Room Tag Match" in constraints

    def test_healthy_payload_no_issues(self):
        """Well-formed small payload -> zero issues."""
        w = _workload(hours=2, consec=1)
        f = _faculty(workload=[w], max_load=10)
        payload = _payload(rooms=[_room()], faculty=[f])
        report = diagnose(payload)
        assert report["total_issues"] == 0
