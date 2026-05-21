import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

print("A: imports", flush=True)
from schemas.api_models import GenerationPayload, FacultyConfig, WorkloadItem, Room, RoomsConfig, CollegeSettings

print("B: building payload", flush=True)
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
            id="F001", name="F001",
            shift=[8,9,10,11,12,14,15,16],
            blocked_slots=[], max_load_hrs=12, max_continuous_hrs=3,
            workload=[
                WorkloadItem(id="W001", type="Theory", subject="DS", target_groups=["SY-B"], hours=2, consecutive_hours=1, required_tags=[], is_online=False),
                WorkloadItem(id="W002", type="Practical", subject="DS Lab", target_groups=["SY-B1"], hours=2, consecutive_hours=2, required_tags=[], is_online=False),
            ]
        ),
    ]
)

print("C: importing engine", flush=True)
from ortools.sat.python import cp_model
from collections import defaultdict
import math

print("D: auto-heal loop", flush=True)
for f in payload.faculty:
    for w in f.workload:
        print(f"  checking {w.id}: hours={w.hours} consec={w.consecutive_hours}", flush=True)
        if w.consecutive_hours > w.hours:
            print(f"  fixing {w.id}", flush=True)
            w.consecutive_hours = w.hours

print("E: building faculty_map", flush=True)
faculty_map = {f.id: f for f in payload.faculty}
rooms_map = {r.id: r for r in payload.rooms_config.rooms}

print("F: room cache init", flush=True)
room_cache = {}
days = payload.college_settings.days_active
slots = payload.college_settings.time_slots
slot_set = set(slots)

print("G: _log_init", flush=True)
total_events = sum(w.hours // max(w.consecutive_hours,1) for f in payload.faculty for w in f.workload)
print(f"  total events: {total_events}", flush=True)

print("H: creating variables", flush=True)
model = cp_model.CpModel()
variables = {}
count = 0
for f in payload.faculty:
    for w in f.workload:
        valid_rooms = ["D201","D205","D207","D208"]
        for r in valid_rooms:
            for d in days:
                for s in slots:
                    block_fits = all((s+offset) in slot_set for offset in range(w.consecutive_hours))
                    if block_fits:
                        key = (f.id, w.id, r, d, s)
                        variables[key] = model.NewBoolVar(f"V_{count}")
                        count += 1
print(f"  {count} variables created", flush=True)

print("I: applying HC-1 and building indexes", flush=True)
room_slot_vars = defaultdict(list)
faculty_slot_vars = defaultdict(list)
group_slot_vars = defaultdict(list)
lunch_map = payload.college_settings.lunch_slot

for (f_id, w_id, r, d, s), var in variables.items():
    f = faculty_map[f_id]
    w = next(item for item in f.workload if item.id == w_id)
    blocked_set = {(b.day, b.time) for b in f.blocked_slots}
    daily_lunch = lunch_map.get(d)
    is_valid = True
    for offset in range(w.consecutive_hours):
        t = s + offset
        if t == daily_lunch or t not in f.shift or (d,t) in blocked_set:
            is_valid = False
            break
    if not is_valid:
        model.Add(var == 0)
        continue
    for offset in range(w.consecutive_hours):
        t = s + offset
        room_slot_vars[(r,d,t)].append(var)
        faculty_slot_vars[(f_id,d,t)].append(var)
        for tg in w.target_groups:
            group_slot_vars[(tg,d,t)].append(var)

print(f"  indexes built. room keys={len(room_slot_vars)}, faculty keys={len(faculty_slot_vars)}", flush=True)

print("J: HC-2 workload fulfillment", flush=True)
for f in payload.faculty:
    for w in f.workload:
        wvars = [variables[k] for k in variables if k[0]==f.id and k[1]==w.id]
        events = w.hours // max(w.consecutive_hours,1)
        model.Add(sum(wvars) == events)
        print(f"  {w.id}: {events} events, {len(wvars)} vars", flush=True)

print("K: room/faculty/group overlap constraints", flush=True)
for key, vlist in room_slot_vars.items():
    if len(vlist) > 1: model.Add(sum(vlist) <= 1)
for key, vlist in faculty_slot_vars.items():
    if len(vlist) > 1: model.Add(sum(vlist) <= 1)
for key, vlist in group_slot_vars.items():
    if len(vlist) > 1: model.Add(sum(vlist) <= 1)
print("  Done.", flush=True)

print("L: SOLVING", flush=True)
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 15.0
t0 = time.time()
status = solver.Solve(model)
print(f"  Status: {status} in {round(time.time()-t0,2)}s", flush=True)
print(f"  OPTIMAL={cp_model.OPTIMAL}, FEASIBLE={cp_model.FEASIBLE}", flush=True)

print("DONE", flush=True)
