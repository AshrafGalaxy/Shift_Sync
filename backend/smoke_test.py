"""
Minimal smoke test - bypasses the full test_dataset script.
Just imports and runs the engine directly with print flushing.
"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Step 1: Importing schemas...", flush=True)
from schemas.api_models import GenerationPayload, FacultyConfig, WorkloadItem, Room, RoomsConfig, CollegeSettings, BlockedSlot

print("Step 2: Building minimal payload...", flush=True)

payload = GenerationPayload(
    college_settings=CollegeSettings(
        days_active=["Mon","Tue","Wed","Thu","Fri"],
        time_slots=[8,9,10,11,12,14,15,16],
        lunch_slot={"Mon":13,"Tue":13,"Wed":13,"Thu":13,"Fri":13},
        custom_rules=[]
    ),
    rooms_config=RoomsConfig(rooms=[
        Room(id="D201", type="theory", capacity=80, tags=[]),
        Room(id="D205", type="theory", capacity=80, tags=[]),
        Room(id="D207", type="theory", capacity=80, tags=[]),
        Room(id="D208", type="theory", capacity=80, tags=[]),
    ]),
    faculty=[
        FacultyConfig(
            id="F001", name="Faculty F001",
            shift=[8,9,10,11,12,14,15,16],
            blocked_slots=[], max_load_hrs=12, max_continuous_hrs=3,
            workload=[
                WorkloadItem(id="W001", type="Theory", subject="Data Structures", target_groups=["SY-B"], hours=2, consecutive_hours=1, required_tags=[], is_online=False),
                WorkloadItem(id="W002", type="Practical", subject="Data Structures Lab", target_groups=["SY-B1"], hours=2, consecutive_hours=2, required_tags=[], is_online=False),
            ]
        ),
        FacultyConfig(
            id="F002", name="Faculty F002",
            shift=[8,9,10,11,12,14,15,16],
            blocked_slots=[], max_load_hrs=20, max_continuous_hrs=3,
            workload=[
                WorkloadItem(id="W003", type="Theory", subject="Computer Networks", target_groups=["SY-B"], hours=2, consecutive_hours=1, required_tags=[], is_online=False),
                WorkloadItem(id="W004", type="Practical", subject="CN Lab", target_groups=["SY-B1"], hours=2, consecutive_hours=2, required_tags=[], is_online=False),
            ]
        ),
    ]
)

print("Step 3: Creating engine...", flush=True)
t0 = time.time()
from solver.engine import TimetableEngine
engine = TimetableEngine(data=payload)
print(f"  Engine init: {round(time.time()-t0,2)}s", flush=True)

print("Step 4: Running generate()...", flush=True)
t1 = time.time()
result = engine.generate()
print(f"  Generate: {round(time.time()-t1,2)}s", flush=True)

print(f"\nRESULT: {result['status']}", flush=True)
print(f"Message: {result['message']}", flush=True)
print(f"Classes: {result['total_classes']}", flush=True)
print(f"Score: {result.get('optimality_score','N/A')}/100", flush=True)
if result['schedule']:
    print("\nSample (first 5):", flush=True)
    for e in result['schedule'][:5]:
        print(f"  {e['day']} {e['time_slot']}h | {e['faculty_name']} | {e['subject'][:25]} | {e['room']}", flush=True)
print("\nDONE", flush=True)
