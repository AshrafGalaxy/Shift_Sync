"""
Phase 34 — Bottleneck Diagnostics / Conflict Refiner
Runs after the solver returns INFEASIBLE to produce a human-readable
diagnosis of exactly which constraint caused the failure.
"""
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dataclasses import dataclass, field
from typing import List, Literal, Dict, Any
from schemas.api_models import GenerationPayload  # type: ignore


@dataclass
class Issue:
    severity: Literal["critical", "warning"]
    constraint: str        # Short name, e.g. "Workload Demand vs Capacity"
    entity: str            # Human-readable entity, e.g. faculty name / division
    message: str           # Plain-English explanation with exact numbers
    fix_hint: str          # Actionable instruction
    tab_hint: str = ""     # Frontend tab to open: "rooms" | "faculty" | "workloads" | "global"


def _check_no_rooms(payload: GenerationPayload) -> List[Issue]:
    if not payload.rooms_config.rooms:
        return [Issue(
            severity="critical",
            constraint="Room Configuration",
            entity="Institution",
            message="No rooms are configured. The solver has no physical space to assign any class.",
            fix_hint="Add at least one room in Data Manager → Rooms.",
            tab_hint="rooms",
        )]
    return []


def _check_no_time_slots(payload: GenerationPayload) -> List[Issue]:
    issues = []
    if not payload.college_settings.time_slots:
        issues.append(Issue(
            severity="critical",
            constraint="Global Time Slots",
            entity="College Settings",
            message="No time slots are defined. The solver has no hours to schedule into.",
            fix_hint="Add time slots in Global Settings (e.g. [8, 9, 10, 11, 12, 13, 14, 15]).",
            tab_hint="global",
        ))
    if not payload.college_settings.days_active:
        issues.append(Issue(
            severity="critical",
            constraint="Active Days",
            entity="College Settings",
            message="No active days are defined.",
            fix_hint="Add days in Global Settings (e.g. ['Mon','Tue','Wed','Thu','Fri']).",
            tab_hint="global",
        ))
    return issues


def _check_demand_vs_capacity(payload: GenerationPayload) -> List[Issue]:
    total_slots = len(payload.college_settings.days_active) * len(payload.college_settings.time_slots)
    lunch_dict = payload.college_settings.lunch_slot or {}
    lunch_deductions = sum(
        1 for d in payload.college_settings.days_active
        if lunch_dict.get(d) in payload.college_settings.time_slots
    )
    room_count = len(payload.rooms_config.rooms)
    available = (total_slots - lunch_deductions) * room_count
    demanded = sum(
        w.hours for f in payload.faculty for w in f.workload if not w.is_online
    )
    if demanded > available:
        return [Issue(
            severity="critical",
            constraint="Workload Demand vs Capacity",
            entity="Institution",
            message=(
                f"Total physical class demand is {demanded} hrs/week, but "
                f"{room_count} room(s) × {total_slots - lunch_deductions} usable slot(s) "
                f"= only {available} hrs available."
            ),
            fix_hint=(
                f"Add {-(-( demanded - available) // (total_slots - lunch_deductions))} more room(s), "
                f"extend daily time slots, or reduce total workload hours by {demanded - available}."
            ),
            tab_hint="rooms",
        )]
    return []


def _check_faculty_shift_vs_load(payload: GenerationPayload) -> List[Issue]:
    issues = []
    lunch_dict = payload.college_settings.lunch_slot or {}
    for f in payload.faculty:
        load = sum(w.hours for w in f.workload)
        if load == 0:
            continue
        # Max hours faculty can physically teach per week
        available = 0
        for day in payload.college_settings.days_active:
            shift_hrs = len(f.shift)
            if lunch_dict.get(day) in f.shift:
                shift_hrs -= 1
            available += shift_hrs
        blocked = len(f.blocked_slots)
        available = max(0, available - blocked)
        if load > available:
            issues.append(Issue(
                severity="critical",
                constraint="Faculty Shift vs Workload",
                entity=f.name,
                message=(
                    f"{f.name} has {load} hrs of assigned workload but their shift "
                    f"only covers {available} teachable hrs/week "
                    f"(shift={len(f.shift)} hrs/day × {len(payload.college_settings.days_active)} days "
                    f"− {blocked} blocked slot(s) − lunch)."
                ),
                fix_hint=(
                    f"Extend {f.name}'s shift hours to cover at least {load} hrs/week, "
                    f"or reduce their workload by {load - available} hrs."
                ),
                tab_hint="faculty",
            ))
        if load > f.max_load_hrs:
            issues.append(Issue(
                severity="critical",
                constraint="Faculty Contract Limit",
                entity=f.name,
                message=(
                    f"{f.name} has {load} hrs of workload but their contract cap is {f.max_load_hrs} hrs."
                ),
                fix_hint=(
                    f"Increase {f.name}'s max load to at least {load} hrs, "
                    f"or reassign {load - f.max_load_hrs} hr(s) of their workload."
                ),
                tab_hint="faculty",
            ))
    return issues


def _check_tag_mismatches(payload: GenerationPayload) -> List[Issue]:
    """Workloads whose required_tags match NO single physical room — even after ghost fallback."""
    issues = []
    for f in payload.faculty:
        for w in f.workload:
            if w.is_online or not w.required_tags:
                continue
            matching = [
                r for r in payload.rooms_config.rooms
                if all(tag in r.tags for tag in w.required_tags)
            ]
            if not matching:
                issues.append(Issue(
                    severity="warning",
                    constraint="Room Tag Match",
                    entity=f"{f.name} → {w.subject}",
                    message=(
                        f"'{w.subject}' requires tags {w.required_tags} but no single room satisfies all of them. "
                        f"This workload will fall back to overflow (ghost room)."
                    ),
                    fix_hint=(
                        f"Add a room with all tags {w.required_tags}, "
                        f"or remove a tag from '{w.subject}' workload."
                    ),
                    tab_hint="rooms",
                ))
    return issues


def _check_division_overload(payload: GenerationPayload) -> List[Issue]:
    issues = []
    total_slots = len(payload.college_settings.days_active) * len(payload.college_settings.time_slots)
    lunch_dict = payload.college_settings.lunch_slot or {}
    lunch_deductions = sum(
        1 for d in payload.college_settings.days_active
        if lunch_dict.get(d) in payload.college_settings.time_slots
    )
    max_hrs = total_slots - lunch_deductions
    tg_hours: Dict[str, int] = {}
    for f in payload.faculty:
        for w in f.workload:
            for tg in w.target_groups:
                tg_hours[tg] = tg_hours.get(tg, 0) + w.hours
    for tg, hrs in tg_hours.items():
        if hrs > max_hrs:
            issues.append(Issue(
                severity="critical",
                constraint="Division Schedule Overload",
                entity=tg,
                message=(
                    f"Division '{tg}' is assigned {hrs} hrs/week but the week only has "
                    f"{max_hrs} teachable slots."
                ),
                fix_hint=(
                    f"Split '{tg}' into sub-divisions (e.g. '{tg}-1', '{tg}-2') "
                    f"or reduce its total workload by {hrs - max_hrs} hrs."
                ),
                tab_hint="workloads",
            ))
    return issues


def _check_lunch_coverage(payload: GenerationPayload) -> List[Issue]:
    issues = []
    lunch_dict = payload.college_settings.lunch_slot or {}
    for day in payload.college_settings.days_active:
        if day not in lunch_dict:
            issues.append(Issue(
                severity="warning",
                constraint="Lunch Slot Coverage",
                entity=day,
                message=f"No lunch slot defined for '{day}'. Faculty may be scheduled without a break.",
                fix_hint=f"Add '{day}' to the lunch_slot map in Global Settings.",
                tab_hint="global",
            ))
    return issues


# ── Public entry point ────────────────────────────────────────────────────────

def analyze(payload: GenerationPayload) -> Dict[str, Any]:
    """
    Run all checks and return a structured diagnosis dict suitable for
    JSON serialization in the HTTP 422 response body.
    """
    all_issues: List[Issue] = []
    all_issues += _check_no_rooms(payload)
    all_issues += _check_no_time_slots(payload)
    all_issues += _check_demand_vs_capacity(payload)
    all_issues += _check_faculty_shift_vs_load(payload)
    all_issues += _check_division_overload(payload)
    all_issues += _check_tag_mismatches(payload)
    all_issues += _check_lunch_coverage(payload)

    critical = [i for i in all_issues if i.severity == "critical"]
    warnings  = [i for i in all_issues if i.severity == "warning"]

    def _fmt(i: Issue) -> Dict[str, str]:
        return {
            "constraint": i.constraint,
            "entity": i.entity,
            "message": i.message,
            "fix_hint": i.fix_hint,
            "tab_hint": i.tab_hint,
        }

    return {
        "total_issues": len(all_issues),
        "critical": [_fmt(i) for i in critical],
        "warnings": [_fmt(i) for i in warnings],
    }
