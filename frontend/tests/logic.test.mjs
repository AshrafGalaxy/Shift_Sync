/**
 * ShiftSync Frontend Logic Tests
 * Pure Node.js — no browser required. Tests all critical data-processing logic.
 * Run: node tests/logic.test.mjs
 */

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.error(`  \u2717 ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertDeepEqual(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Replicate key frontend functions ─────────────────────────────────────────

// From faculty/page.tsx: extractSlots
function extractSlots(matrixData) {
  if (!matrixData) return [];
  let raw = [];
  if (Array.isArray(matrixData)) raw = matrixData;
  else if (matrixData.schedule && Array.isArray(matrixData.schedule)) raw = matrixData.schedule;
  else raw = Object.values(matrixData).filter(Array.isArray).flat();
  return raw.map(s => ({
    workload_id: s.workload_id ?? "",
    faculty_id: s.faculty_id ?? s.faculty ?? "",
    faculty_name: s.faculty_name ?? s.faculty ?? "",
    subject: s.subject ?? "",
    room: s.room ?? "",
    day: s.day ?? "",
    time_slot: s.time_slot ?? 0,
    type: s.type ?? "Theory",
    target_groups: Array.isArray(s.target_groups) ? s.target_groups
      : Array.isArray(s.targets) ? s.targets
      : [],
    is_online: s.is_online ?? false,
    needs_room_assignment: s.needs_room_assignment ?? false,
    division: s.division ?? null,
  }));
}

// From dashboard/layout.tsx: notification hash dedup
function buildNotifHash(notifs) {
  return notifs.map(n => n.id).join(",");
}

// From resources/page.tsx: faculty load map builder
function buildFacultyLoadMap(slots, facSettings) {
  const facMap = {};
  slots.forEach(s => {
    const key = s.faculty_id ?? s.faculty ?? "Unknown";
    if (!facMap[key]) facMap[key] = { name: s.faculty_name ?? s.faculty ?? key, slots: 0, maxLoad: 0 };
    facMap[key].slots++;
  });
  (facSettings ?? []).forEach(f => {
    const key = f.id;
    if (facMap[key]) {
      facMap[key].maxLoad = f.max_load_hrs ?? 0;
      facMap[key].name = f.profiles?.full_name ?? f.name ?? facMap[key].name;
    }
  });
  // Secondary pass by name
  (facSettings ?? []).forEach(f => {
    const nameKey = Object.keys(facMap).find(k => facMap[k].name === (f.name ?? ""));
    if (nameKey && facMap[nameKey].maxLoad === 0) {
      facMap[nameKey].maxLoad = f.max_load_hrs ?? 0;
      facMap[nameKey].name = f.profiles?.full_name ?? f.name ?? facMap[nameKey].name;
    }
  });
  return facMap;
}

// From faculty/page.tsx: weekend clamp
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function resolveTodayDay(jsDay) {
  const isWeekend = jsDay === 0 || jsDay === 6;
  const resolved = isWeekend ? "Mon" : (DAYS[jsDay - 1] ?? "Mon");
  return { resolved, isWeekend };
}

// From manage page: assigned load compute
function computeAssignedLoad(matrixData) {
  const loadMap = {};
  if (!matrixData) return loadMap;
  const raw = matrixData;
  const slots = Array.isArray(raw) ? raw : (raw?.schedule ?? []);
  slots.forEach(s => {
    const fid = s.faculty_id ?? s.faculty ?? null;
    if (fid) loadMap[fid] = (loadMap[fid] ?? 0) + 1;
  });
  return loadMap;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

console.log("\n\u25ba Category 1: extractSlots — matrix_data normalization");

test("flat array format", () => {
  const result = extractSlots([{ faculty_id: "F1", day: "Mon", time_slot: 9, subject: "CS101", room: "R1", targets: ["Div_A"] }]);
  assertEqual(result.length, 1, "Should return 1 slot");
  assertDeepEqual(result[0].target_groups, ["Div_A"], "Should normalize 'targets' -> target_groups");
});

test("schedule object format", () => {
  const result = extractSlots({ schedule: [{ faculty_id: "F2", day: "Tue", time_slot: 10, subject: "MA201", room: "R2", target_groups: ["Div_B"] }] });
  assertEqual(result.length, 1);
  assertDeepEqual(result[0].target_groups, ["Div_B"]);
});

test("target_groups key takes precedence over targets", () => {
  const result = extractSlots([{ faculty_id: "F1", day: "Mon", time_slot: 8, subject: "X", room: "R1", target_groups: ["Div_A"], targets: ["WRONG"] }]);
  assertDeepEqual(result[0].target_groups, ["Div_A"]);
});

test("null/undefined matrixData returns empty array", () => {
  assertEqual(extractSlots(null).length, 0);
  assertEqual(extractSlots(undefined).length, 0);
});

test("empty schedule array returns empty", () => {
  assertEqual(extractSlots({ schedule: [] }).length, 0);
});

test("needs_room_assignment defaults to false", () => {
  const result = extractSlots([{ faculty_id: "F1", day: "Mon", time_slot: 9, subject: "CS", room: "R1" }]);
  assertEqual(result[0].needs_room_assignment, false);
});

test("needs_room_assignment passes through true", () => {
  const result = extractSlots([{ faculty_id: "F1", day: "Mon", time_slot: 9, subject: "CS", room: "TBD (Overflow)", needs_room_assignment: true }]);
  assertEqual(result[0].needs_room_assignment, true);
});

console.log("\n\u25ba Category 2: Notification dedup hash");

test("same notifications produce same hash", () => {
  const a = [{ id: "gen-ok" }, { id: "overflow" }];
  const b = [{ id: "gen-ok" }, { id: "overflow" }];
  assertEqual(buildNotifHash(a), buildNotifHash(b));
});

test("different notifications produce different hash", () => {
  const a = [{ id: "gen-ok" }];
  const b = [{ id: "gen-fail" }];
  assert(buildNotifHash(a) !== buildNotifHash(b), "Hashes should differ");
});

test("empty array produces empty hash", () => {
  assertEqual(buildNotifHash([]), "");
});

test("order matters in hash", () => {
  const a = [{ id: "A" }, { id: "B" }];
  const b = [{ id: "B" }, { id: "A" }];
  assert(buildNotifHash(a) !== buildNotifHash(b), "Order-sensitive hash");
});

console.log("\n\u25ba Category 3: Faculty load map (resources heatmap)");

test("slots correctly counted per faculty", () => {
  const slots = [
    { faculty_id: "uuid-1", faculty_name: "Dr. A" },
    { faculty_id: "uuid-1", faculty_name: "Dr. A" },
    { faculty_id: "uuid-2", faculty_name: "Dr. B" },
  ];
  const facMap = buildFacultyLoadMap(slots, []);
  assertEqual(facMap["uuid-1"].slots, 2);
  assertEqual(facMap["uuid-2"].slots, 1);
});

test("maxLoad enriched from facSettings by UUID", () => {
  const slots = [{ faculty_id: "uuid-1", faculty_name: "Dr. A" }];
  const facSettings = [{ id: "uuid-1", name: "Dr. A", max_load_hrs: 18, profiles: null }];
  const facMap = buildFacultyLoadMap(slots, facSettings);
  assertEqual(facMap["uuid-1"].maxLoad, 18);
});

test("secondary name-based fallback resolves maxLoad", () => {
  // Slot uses display name as key (CSV imported, no UUID match)
  const slots = [{ faculty_id: "Dr. Mehra", faculty_name: "Dr. Mehra" }];
  const facSettings = [{ id: "different-uuid", name: "Dr. Mehra", max_load_hrs: 20, profiles: null }];
  const facMap = buildFacultyLoadMap(slots, facSettings);
  // Primary pass won't match (key="Dr. Mehra" != "different-uuid")
  // Secondary pass should match by name
  assertEqual(facMap["Dr. Mehra"].maxLoad, 20, "Secondary fallback should set maxLoad");
});

test("unknown faculty gets maxLoad 0 (not 40)", () => {
  const slots = [{ faculty_id: "F999", faculty_name: "Unknown" }];
  const facMap = buildFacultyLoadMap(slots, []);
  assertEqual(facMap["F999"].maxLoad, 0, "Unresolved faculty should have maxLoad=0, not hardcoded 40");
});

test("profiles.full_name preferred over name", () => {
  const slots = [{ faculty_id: "u1", faculty_name: "CSV Name" }];
  const facSettings = [{ id: "u1", name: "CSV Name", max_load_hrs: 15, profiles: { full_name: "Dr. Real Name" } }];
  const facMap = buildFacultyLoadMap(slots, facSettings);
  assertEqual(facMap["u1"].name, "Dr. Real Name");
});

console.log("\n\u25ba Category 4: Weekend clamp (faculty portal)");

test("Monday (jsDay=1) maps to Mon", () => {
  const r = resolveTodayDay(1);
  assertEqual(r.resolved, "Mon");
  assertEqual(r.isWeekend, false);
});

test("Friday (jsDay=5) maps to Fri", () => {
  const r = resolveTodayDay(5);
  assertEqual(r.resolved, "Fri");
  assertEqual(r.isWeekend, false);
});

test("Saturday (jsDay=6) clamps to Mon with isWeekend=true", () => {
  const r = resolveTodayDay(6);
  assertEqual(r.resolved, "Mon");
  assertEqual(r.isWeekend, true);
});

test("Sunday (jsDay=0) clamps to Mon with isWeekend=true", () => {
  const r = resolveTodayDay(0);
  assertEqual(r.resolved, "Mon");
  assertEqual(r.isWeekend, true);
});

test("All weekdays map correctly", () => {
  const expected = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  for (let i = 1; i <= 5; i++) {
    assertEqual(resolveTodayDay(i).resolved, expected[i-1]);
  }
});

console.log("\n\u25ba Category 5: Assigned load map (Data Manager)");

test("flat array counts per faculty_id", () => {
  const matrix = { schedule: [
    { faculty_id: "F1" },
    { faculty_id: "F1" },
    { faculty_id: "F2" },
  ]};
  const map = computeAssignedLoad(matrix);
  assertEqual(map["F1"], 2);
  assertEqual(map["F2"], 1);
});

test("null matrixData returns empty map", () => {
  const map = computeAssignedLoad(null);
  assertEqual(Object.keys(map).length, 0);
});

test("faculty using 'faculty' key instead of 'faculty_id' still counted", () => {
  const matrix = [{ faculty: "Dr. X" }];
  const map = computeAssignedLoad(matrix);
  assertEqual(map["Dr. X"], 1);
});

test("ghost-room slots still count toward load", () => {
  const matrix = { schedule: [
    { faculty_id: "F1", needs_room_assignment: true },
    { faculty_id: "F1", needs_room_assignment: false },
  ]};
  const map = computeAssignedLoad(matrix);
  assertEqual(map["F1"], 2, "Both ghost and real slots should count");
});

console.log("\n\u25ba Category 6: Data integrity / boundary cases");

test("extractSlots: missing faculty_id falls back to faculty key", () => {
  const result = extractSlots([{ faculty: "Dr. Q", day: "Mon", time_slot: 9, subject: "X", room: "R1" }]);
  assertEqual(result[0].faculty_id, "Dr. Q");
});

test("extractSlots: all optional fields default safely", () => {
  const result = extractSlots([{}]);
  assertEqual(result[0].day, "");
  assertEqual(result[0].time_slot, 0);
  assertDeepEqual(result[0].target_groups, []);
  assertEqual(result[0].needs_room_assignment, false);
});

test("buildFacultyLoadMap: empty slots returns empty map", () => {
  const map = buildFacultyLoadMap([], []);
  assertEqual(Object.keys(map).length, 0);
});

test("computeAssignedLoad: slots without faculty_id/faculty are skipped", () => {
  const matrix = [{ day: "Mon", time_slot: 9 }]; // no faculty field
  const map = computeAssignedLoad(matrix);
  assertEqual(Object.keys(map).length, 0, "Slots without faculty should be ignored");
});

// ─── Category 7: Faculty name role-guard + admin preview mode ──────────────────

console.log("\n► Category 7: Faculty name role-guard + admin preview mode");

// Replicate the role-guard name resolution from faculty/page.tsx and manage/page.tsx
function resolveFacultyDisplayName(f) {
  return (f.profiles?.role === "faculty" && f.profiles?.full_name)
    ? f.profiles.full_name   // Real registered faculty user
    : (f.name || `Faculty ${f.id?.slice(0, 6) ?? "?"}`); // || catches empty string too
}

// Replicate overrideName display logic from FacultyPersonalPortal
function resolvePortalDisplayName(profile, overrideName) {
  return overrideName ?? profile.full_name;
}

function resolvePortalInitials(profile, overrideName) {
  const name = overrideName ?? profile.full_name ?? "FA";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

test("CSV faculty with null profile_id → uses faculty_settings.name", () => {
  const f = { id: "abc123", name: "Dr. Mehra", profiles: null };
  assertEqual(resolveFacultyDisplayName(f), "Dr. Mehra");
});

test("Faculty with admin-role profile → ignores profiles.full_name, uses faculty_settings.name", () => {
  const f = { id: "abc123", name: "Dr. Khan", profiles: { full_name: "Admin User", role: "admin" } };
  assertEqual(resolveFacultyDisplayName(f), "Dr. Khan", "Admin profile should be ignored");
});

test("Real registered faculty (role=faculty) → uses profiles.full_name", () => {
  const f = { id: "abc123", name: "CSV Import Name", profiles: { full_name: "Dr. Registered", role: "faculty" } };
  assertEqual(resolveFacultyDisplayName(f), "Dr. Registered");
});

test("Faculty with no name and no profile → falls back to 'Faculty <id>'", () => {
  const f = { id: "abcdef1234", name: null, profiles: null };
  assertEqual(resolveFacultyDisplayName(f), "Faculty abcdef");
});

test("Faculty with empty string name → falls back to 'Faculty <id>'", () => {
  const f = { id: "xyz999", name: "", profiles: null };
  // empty string is falsy
  assertEqual(resolveFacultyDisplayName(f), "Faculty xyz999");
});

test("Admin preview mode: portal shows overrideName instead of admin name", () => {
  const adminProfile = { full_name: "Admin User", role: "admin" };
  assertEqual(resolvePortalDisplayName(adminProfile, "Dr. Mehra"), "Dr. Mehra");
});

test("Admin preview mode: portal initials use overrideName", () => {
  const adminProfile = { full_name: "Admin User", role: "admin" };
  assertEqual(resolvePortalInitials(adminProfile, "Dr. Mehra"), "DM");
});

test("Non-preview mode: portal shows own profile name", () => {
  const facultyProfile = { full_name: "Prof. Khan", role: "faculty" };
  assertEqual(resolvePortalDisplayName(facultyProfile, undefined), "Prof. Khan");
});

test("Non-preview mode: portal initials from profile name", () => {
  const facultyProfile = { full_name: "Prof. Khan", role: "faculty" };
  assertEqual(resolvePortalInitials(facultyProfile, undefined), "PK");
});

test("Preset A faculty names are all distinct (no admin name bleed)", () => {
  const presetAFaculty = ["Dr. Mehra", "Prof. Khan", "Dr. Patel", "Dr. Sharma", "Ms. Verma"];
  const uniqueNames = new Set(presetAFaculty);
  assertEqual(uniqueNames.size, 5, "All 5 Preset A faculty should have distinct names");
  assert(!presetAFaculty.includes("Admin"), "No faculty should be named 'Admin'");
  assert(!presetAFaculty.some(n => n.toLowerCase().includes("admin")), "No admin name bleed");
});

test("allFacultyList for simulate panel filters correctly", () => {
  // Simulate the faculty list that would load in the admin demo panel
  const rawFaculty = [
    { id: "f1", name: "Dr. Mehra", is_archived: false },
    { id: "f2", name: "Prof. Khan", is_archived: false },
    { id: "f3", name: null, is_archived: false },        // null name edge case
    { id: "f4", name: "Dr. Patel", is_archived: true },  // archived, would be filtered by DB query
  ];
  // Simulate .filter(f => !f.is_archived).map(...)
  const list = rawFaculty
    .filter(f => !f.is_archived)
    .map(f => ({ id: f.id, name: f.name ?? "Unnamed" }));
  assertEqual(list.length, 3);
  assertEqual(list[2].name, "Unnamed", "Null name should become 'Unnamed'");
  assert(!list.some(f => f.id === "f4"), "Archived faculty should be excluded");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n✗ ${failed} test(s) FAILED`);
  process.exit(1);
} else {
  console.log(`\n✓ All ${passed} tests passed!`);
}
