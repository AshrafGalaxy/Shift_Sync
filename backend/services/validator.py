import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from schemas.api_models import GenerationPayload # type: ignore
from typing import List, Tuple

def validate_input_payload(payload: GenerationPayload) -> Tuple[bool, List[str]]:
    """
    Runs pre-generation math checks before the OR-Tools solver runs.
    Returns (is_valid, list_of_error_messages).
    """
    errors = []

    # 1. Gather all unique capabilities in the entire college
    available_room_tags = set()
    total_physical_room_count = len(payload.rooms_config.rooms)
    for r in payload.rooms_config.rooms:
        for tag in r.tags:
            available_room_tags.add(tag)

    valid_hours = len(payload.college_settings.time_slots) * len(payload.college_settings.days_active)
    lunch_dict = getattr(payload.college_settings, "lunch_slot", {})
    lunch_deductions = sum(1 for d in payload.college_settings.days_active if lunch_dict.get(d) in payload.college_settings.time_slots)

    # 0. Data Integrity: hours must be a clean multiple of consecutive_hours
    #    This MUST run first — a bad value here causes the solver to silently skip the workload.
    for faculty in payload.faculty:
        for w in faculty.workload:
            hrs = getattr(w, "hours", 1)
            consec = getattr(w, "consecutive_hours", 1)
            if consec > 0 and hrs % consec != 0:
                errors.append(
                    f"Data Error: {faculty.name}'s workload '{w.subject}' has weekly_hours={hrs} which is "
                    f"NOT divisible by consecutive_hours={consec}. "
                    f"Please fix your CSV/Form: e.g. set weekly_hours to {consec * (hrs // consec + 1)} or consecutive_hours to 1."
                )
    
    # 2. Shift vs. Load Check (Considering Visiting Faculty Blocked Slots)
    for faculty in payload.faculty:
        load = sum(getattr(w, "hours", 0) for w in faculty.workload)
        
        max_possible_weekly_hrs = 0
        for day in payload.college_settings.days_active:
            daily_lunch = lunch_dict.get(day)
            daily_shift_hrs = len(faculty.shift)
            if daily_lunch in faculty.shift:
                daily_shift_hrs -= 1
            max_possible_weekly_hrs += daily_shift_hrs
            
        max_possible_weekly_hrs -= len(faculty.blocked_slots)

        # Faculty Contract checking
        if load > faculty.max_load_hrs:
            errors.append(
                f"Validation Failed: {faculty.name} ({faculty.id}) has a target workload of {load} hours, "
                f"which exceeds their maximum contractual limit of {faculty.max_load_hrs} hours."
            )
            
        # Physical Temporal Impossibility checking
        if load > max_possible_weekly_hrs: # FIX: check load natively against the absolute max physically limit
            errors.append(
                 f"Validation Failed: {faculty.name} ({faculty.id}) has {load} hrs of classes, "
                 f"but after removing Lunch and {len(faculty.blocked_slots)} Blocked Slots, they are only physically present for {max_possible_weekly_hrs} hrs."
            )

        # 3. Tag Matching Check
        for w in faculty.workload:
            if getattr(w, "is_online", False):
                continue  # Online workloads don't need physical rooms

            # 3a. Each required tag must exist somewhere in the college
            for tag in w.required_tags:
                if tag not in available_room_tags:
                    errors.append(
                        f"Validation Failed: {faculty.name} is scheduled to teach {w.subject} which requires the tag '{tag}'. "
                        f"There is no room in the infrastructure master data possessing this capability."
                    )

            # 3b. At least ONE room must satisfy ALL required tags simultaneously
            if w.required_tags:
                rooms_matching_all_tags = [
                    r for r in payload.rooms_config.rooms
                    if all(tag in r.tags for tag in w.required_tags)
                ]
                if not rooms_matching_all_tags:
                    errors.append(
                        f"Validation Failed: {faculty.name}'s workload '{w.subject}' requires tags {w.required_tags} simultaneously, "
                        f"but no single room in the college possesses ALL of these tags together. "
                        f"Check that one room has all these capabilities, or remove a required_tag from the workload."
                    )
                     
    # 4. Capacity Check (Pigeonhole Principle)
    total_requested_class_hours = sum(
        getattr(w, "hours", 0)
        for faculty in payload.faculty
        for w in faculty.workload
        if getattr(w, "is_online", False) is False
    )
    
    total_available_room_hours = (total_physical_room_count * valid_hours) - (total_physical_room_count * lunch_deductions)

    if total_requested_class_hours > total_available_room_hours:
        errors.append(
             f"Validation Failed: The total college workload requires {total_requested_class_hours} simultaneous hours, "
             f"but the {total_physical_room_count} available rooms can only support {total_available_room_hours} total hours."
        )

    # 5. Target Group Capacity Check (Prevents monolithic overlapping)
    target_group_hours = {}
    for faculty in payload.faculty:
        for w in faculty.workload:
            for tg in w.target_groups:
                if tg not in target_group_hours:
                    target_group_hours[tg] = 0
                target_group_hours[tg] += getattr(w, "hours", 0)

    # A single target group can at most attend `valid_hours` minus lunch
    max_target_hours = valid_hours - lunch_deductions
    for tg, hrs in target_group_hours.items():
        if hrs > max_target_hours:
            errors.append(
                f"Validation Failed: Target Group '{tg}' is assigned {hrs} hours of classes, "
                f"but there are only {max_target_hours} physical hours in the college week! "
                f"Please ensure you split your batch into smaller divisions (e.g. 'SY-A' and 'SY-B') in your CSV Upload."
            )

    return len(errors) == 0, set(errors) # type: ignore
