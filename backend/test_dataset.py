"""
Direct solver test with the ShiftSync master dataset.
Run: python test_dataset.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas.api_models import GenerationPayload

# ── The exact dataset from the user ──────────────────────────────────────────
payload_dict = {
    "college_settings": {
        "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "time_slots": [8, 9, 10, 11, 12, 14, 15, 16],
        "lunch_slot": {"Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13},
        "custom_rules": []
    },
    "rooms_config": {
        "rooms": [
            {"id": "D201", "type": "theory", "capacity": 80, "tags": []},
            {"id": "D205", "type": "theory", "capacity": 80, "tags": []},
            {"id": "D207", "type": "theory", "capacity": 80, "tags": []},
            {"id": "D208", "type": "theory", "capacity": 80, "tags": []},
            {"id": "Online", "type": "theory", "capacity": 80, "tags": ["Online"]}
        ]
    },
    "faculty": [
        {
            "id": "F001", "name": "Faculty F001",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 12, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W001", "type": "Theory", "subject": "Fundamental of Data Structure", "target_groups": ["SY B"], "hours": 2, "consecutive_hours": 1, "required_tags": [], "is_online": False},
                {"id": "W002", "type": "Practical", "subject": "Fundamental of Data Structure", "target_groups": ["SY B1"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W003", "type": "Practical", "subject": "Fundamental of Data Structure", "target_groups": ["SY B2"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
        {
            "id": "F002", "name": "Faculty F002",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 17, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W004", "type": "Practical", "subject": "Fundamental of Data Structure", "target_groups": ["SY B3"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
        {
            "id": "F003", "name": "Faculty F003",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 20, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W005", "type": "Practical", "subject": "Computer Networks", "target_groups": ["SY B3"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
        {
            "id": "F007", "name": "Faculty F007",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 20, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W006", "type": "Theory", "subject": "Computer Networks", "target_groups": ["SY B"], "hours": 1, "consecutive_hours": 1, "required_tags": [], "is_online": False},
                {"id": "W007", "type": "Practical", "subject": "Computer Networks", "target_groups": ["SY B1"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W008", "type": "Practical", "subject": "Computer Networks", "target_groups": ["SY B2"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W009", "type": "Tutorial", "subject": "Design Thinking", "target_groups": ["SY B1"], "hours": 1, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W010", "type": "Tutorial", "subject": "Design Thinking", "target_groups": ["SY B2"], "hours": 1, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W011", "type": "Tutorial", "subject": "Design Thinking", "target_groups": ["SY B3"], "hours": 1, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
        {
            "id": "F008", "name": "Faculty F008",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 20, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W012", "type": "Theory", "subject": "Object Oriented Programming", "target_groups": ["SY B"], "hours": 2, "consecutive_hours": 1, "required_tags": [], "is_online": False},
                {"id": "W013", "type": "Practical", "subject": "Object Oriented Programming", "target_groups": ["SY B1"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W014", "type": "Practical", "subject": "Object Oriented Programming", "target_groups": ["SY B2"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W015", "type": "Practical", "subject": "Object Oriented Programming", "target_groups": ["SY B3"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
        {
            "id": "F014", "name": "Faculty F014",
            "shift": [8,9,10,11,12,14,15,16],
            "blocked_slots": [], "max_load_hrs": 20, "max_continuous_hrs": 3, "class_teacher_for": None,
            "workload": [
                {"id": "W016", "type": "Theory", "subject": "Fundamentals of Data Structures & Algorithms", "target_groups": ["SY B"], "hours": 3, "consecutive_hours": 1, "required_tags": [], "is_online": False},
                {"id": "W017", "type": "Practical", "subject": "Fundamentals of Data Structures & Algorithms", "target_groups": ["SY B1"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W018", "type": "Practical", "subject": "Fundamentals of Data Structures & Algorithms", "target_groups": ["SY B2"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
                {"id": "W019", "type": "Practical", "subject": "Fundamentals of Data Structures & Algorithms", "target_groups": ["SY B3"], "hours": 2, "consecutive_hours": 2, "required_tags": [], "is_online": False},
            ]
        },
    ]
}

print("=" * 60)
print("SHIFTSYNC SOLVER DIRECT TEST")
print("=" * 60)

# ── Constraint analysis before solving ────────────────────────────────────────
print("\n📊 CONSTRAINT ANALYSIS:")
days = payload_dict["college_settings"]["days_active"]
slots = payload_dict["college_settings"]["time_slots"]
total_slots = len(days) * len(slots)
rooms = len(payload_dict["rooms_config"]["rooms"]) - 1  # exclude Online
total_capacity = total_slots * rooms

total_demand = 0
for f in payload_dict["faculty"]:
    for w in f["workload"]:
        # consecutive workloads use 1 start slot per block
        events = w["hours"] // w["consecutive_hours"]
        total_demand += events

print(f"  Days: {days}")
print(f"  Slots per day: {slots} ({len(slots)} slots)")
print(f"  Physical rooms: {rooms}")
print(f"  Total physical room-slots: {total_capacity}")
print(f"  Total events needed: {total_demand}")
print(f"  Density: {round(total_demand/total_capacity*100,1)}%")

# ── Check subgroup conflicts ──────────────────────────────────────────────────
print("\n🔍 SUBGROUP CONFLICT ANALYSIS:")
from collections import defaultdict
group_demand = defaultdict(int)
for f in payload_dict["faculty"]:
    for w in f["workload"]:
        for tg in w["target_groups"]:
            events = w["hours"] // w["consecutive_hours"]
            group_demand[tg] += events

for grp, demand in sorted(group_demand.items()):
    avail = len(days) * len(slots)
    pct = round(demand / avail * 100, 1)
    flag = " ⚠️  OVERSCHEDULED" if demand > avail else ""
    print(f"  {grp}: {demand} events / {avail} available slots ({pct}%){flag}")

# ── Design Thinking consecutive bug ──────────────────────────────────────────
print("\n⚠️  ISSUE CHECK:")
for f in payload_dict["faculty"]:
    for w in f["workload"]:
        if w["consecutive_hours"] > w["hours"]:
            print(f"  BUG: {w['id']} ({w['subject']}) - consecutive={w['consecutive_hours']} > hours={w['hours']} → IMPOSSIBLE!")
        if w["hours"] % w["consecutive_hours"] != 0:
            print(f"  WARN: {w['id']} ({w['subject']}) - hours={w['hours']} not divisible by consecutive={w['consecutive_hours']}")

# ── Run the solver ────────────────────────────────────────────────────────────
print("\n🚀 RUNNING SOLVER...")
try:
    payload = GenerationPayload(**payload_dict)
    from solver.engine import TimetableEngine
    engine = TimetableEngine(data=payload)
    result = engine.generate()
    print(f"\n✅ STATUS: {result['status']}")
    print(f"   Message: {result['message']}")
    print(f"   Total classes scheduled: {result['total_classes']}")
    print(f"   Overflow count: {result['overflow_count']}")
    
    if result["status"] != "infeasible" and result["schedule"]:
        print("\n📅 SAMPLE OUTPUT (first 5):")
        for entry in result["schedule"][:5]:
            print(f"   {entry['day']} {entry['time_slot']}h | {entry['faculty_id']} | {entry['subject'][:30]} | {entry['room']} | {entry['targets']}")
    
    with open("test_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("\n💾 Full result saved to test_result.json")

except Exception as e:
    import traceback
    print(f"\n❌ SOLVER CRASHED: {e}")
    traceback.print_exc()
