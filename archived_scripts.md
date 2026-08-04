# Archived Scripts

This file contains one-off debugging scripts that were cluttering the root directory.

## fix_encoding.py

```python
import os

def replace_arrow_in_directory(directory):
    for root, dirs, files in os.walk(directory):
        if 'venv' in root or '.venv' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if '→' in content:
                        new_content = content.replace('→', '->')
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Replaced in {filepath}")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

replace_arrow_in_directory('backend')

```

## fix_header.py

```python
import sys

FILE = "frontend/app/dashboard/timetable/page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize to LF
content = content.replace("\r\n", "\n")

# ---- OLD BLOCK (exact match after LF normalization) -------------------------
OLD = (
    "            {/* Header & Controls */}\n"
    "            <div className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 print:hidden\">\n"
    "                <div>\n"
    "                    <div className=\"flex items-center gap-2\">\n"
    "                        <h1 className=\"text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50\">Master Timetable</h1>\n"
    "                        {slots.length > 0 && (\n"
    "                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${\n"
    "                                visibleSlots.length === slots.length\n"
    "                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'\n"
    "                                    : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'\n"
    "                            }`}>\n"
    "                                {visibleSlots.length === slots.length\n"
    "                                    ? `${slots.length} slots`\n"
    "                                    : `${visibleSlots.length} / ${slots.length} slots`}\n"
    "                            </span>\n"
    "                        )}\n"
    "                    </div>\n"
    "                    <p className=\"text-sm text-slate-500 dark:text-slate-400\">\n"
    "                        {activeFilter === \"All Divisions\"\n"
    "                            ? \"Viewing all divisions. Use the filter to isolate a single division's schedule.\"\n"
    "                            : `Filtered to: ${activeFilter} \u2014 each slot shows exactly one class.`}\n"
    "                    </p>\n"
    "                </div>\n"
    "                <div className=\"flex items-center gap-2 flex-wrap\">\n"
    "                    {/* Search box */}\n"
    "                    <div className=\"relative\">\n"
    "                        <Search className=\"absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400\" />\n"
    "                        <Input\n"
    "                            placeholder=\"Search subject or faculty...\"\n"
    "                            value={searchQuery}\n"
    "                            onChange={(e) => setSearchQuery(e.target.value)}\n"
    "                            className=\"pl-8 h-9 w-48 text-sm\"\n"
    "                        />\n"
    "                        {searchQuery && (\n"
    "                            <button onClick={() => setSearchQuery(\"\")} className=\"absolute right-2 top-2.5 text-slate-400 hover:text-slate-600\">\n"
    "                                <X className=\"w-3.5 h-3.5\" />\n"
    "                            </button>\n"
    "                        )}\n"
    "                    </div>\n"
    "\n"
    "                    {/* Division filter */}\n"
    "                    <div className=\"relative\">\n"
    "                        <Filter className=\"absolute left-2.5 top-2.5 h-4 w-4 text-slate-400\" />\n"
    "                        <select\n"
    "                            className=\"pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9\"\n"
    "                            value={activeFilter}\n"
    "                            onChange={(e) => setActiveFilter(e.target.value)}\n"
    "                        >\n"
    "                            {availableFilters.map(f => (\n"
    "                                <option key={f} value={f}>{f}</option>\n"
    "                            ))}\n"
    "                        </select>\n"
    "                    </div>\n"
    "\n"
    "                    {/* Faculty filter */}\n"
    "                    <div className=\"relative\">\n"
    "                        <Users className=\"absolute left-2.5 top-2.5 h-4 w-4 text-slate-400\" />\n"
    "                        <select\n"
    "                            className=\"pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9\"\n"
    "                            value={facultyFilter}\n"
    "                            onChange={(e) => setFacultyFilter(e.target.value)}\n"
    "                        >\n"
    "                            {availableFaculty.map(f => (\n"
    "                                <option key={f} value={f}>{f}</option>\n"
    "                            ))}\n"
    "                        </select>\n"
    "                    </div>\n"
    "\n"
    "                    <DropdownMenu>\n"
    "                        <DropdownMenuTrigger asChild>\n"
    "                            <Button variant=\"outline\" size=\"sm\" className=\"h-9\">\n"
    "                                <Download className=\"w-4 h-4 mr-2\" />\n"
    "                                Export\n"
    "                                <ChevronDown className=\"w-4 h-4 ml-2 opacity-50\" />\n"
    "                            </Button>\n"
    "                        </DropdownMenuTrigger>\n"
    "                        <DropdownMenuContent align=\"end\" className=\"w-52\">\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Spreadsheet</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToExcel} className=\"cursor-pointer text-green-700 dark:text-green-400 focus:text-green-700 focus:bg-green-50 dark:focus:bg-green-950/50\">\n"
    "                                <FileSpreadsheet className=\"w-4 h-4 mr-2\" />\n"
    "                                Download as Excel (.xlsx)\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuSeparator />\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Calendar Integration</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToICS} className=\"cursor-pointer text-teal-600 focus:text-teal-600 focus:bg-teal-50 dark:focus:bg-teal-950/50\">\n"
    "                                <CalendarIcon className=\"w-4 h-4 mr-2\" />\n"
    "                                Export to iCal (.ics)\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuItem onClick={pushToGoogleCalendar} className=\"cursor-pointer text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/50\">\n"
    "                                <Send className=\"w-4 h-4 mr-2\" />\n"
    "                                Push to Google Calendar\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuSeparator />\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Printable</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToPDF} className=\"cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/50\">\n"
    "                                <Printer className=\"w-4 h-4 mr-2\" />\n"
    "                                Save as PDF / Print\n"
    "                            </DropdownMenuItem>\n"
    "                        </DropdownMenuContent>\n"
    "                    </DropdownMenu>\n"
    "\n"
    "                    {!hideFullscreen && (\n"
    "                        <Button size=\"sm\" className=\"h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 md:flex hidden\" onClick={toggleFullscreen}>\n"
    "                            {isFullscreen ? <Minimize2 className=\"w-4 h-4 mr-2\" /> : <Maximize2 className=\"w-4 h-4 mr-2\" />}\n"
    "                            {isFullscreen ? \"Exit Fullscreen\" : \"Fullscreen\"}\n"
    "                        </Button>\n"
    "                    )}\n"
    "                </div>\n"
    "            </div>"
)

# ---- NEW BLOCK --------------------------------------------------------------
NEW = (
    "            {/* Header - Row 1: Title+chip | Search (full-width) | Export | Fullscreen */}\n"
    "            <div className=\"shrink-0 print:hidden space-y-2\">\n"
    "                <div className=\"flex items-center gap-3\">\n"
    "                    <div className=\"flex items-center gap-2 shrink-0\">\n"
    "                        <h1 className=\"text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50\">Master Timetable</h1>\n"
    "                        {slots.length > 0 && (\n"
    "                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${visibleSlots.length === slots.length ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'}`}>\n"
    "                                {visibleSlots.length === slots.length ? `${slots.length} slots` : `${visibleSlots.length} / ${slots.length} slots`}\n"
    "                            </span>\n"
    "                        )}\n"
    "                    </div>\n"
    "                    {/* Search stretches full width */}\n"
    "                    <div className=\"relative flex-1\">\n"
    "                        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none\" />\n"
    "                        <Input\n"
    "                            placeholder=\"Search subject, faculty or room...\"\n"
    "                            value={searchQuery}\n"
    "                            onChange={(e) => setSearchQuery(e.target.value)}\n"
    "                            className=\"pl-9 h-9 w-full text-sm\"\n"
    "                        />\n"
    "                        {searchQuery && (\n"
    "                            <button onClick={() => setSearchQuery(\"\")} className=\"absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600\">\n"
    "                                <X className=\"w-3.5 h-3.5\" />\n"
    "                            </button>\n"
    "                        )}\n"
    "                    </div>\n"
    "                    {/* Export */}\n"
    "                    <DropdownMenu>\n"
    "                        <DropdownMenuTrigger asChild>\n"
    "                            <Button variant=\"outline\" size=\"sm\" className=\"h-9 shrink-0\">\n"
    "                                <Download className=\"w-4 h-4 mr-2\" />Export<ChevronDown className=\"w-4 h-4 ml-2 opacity-50\" />\n"
    "                            </Button>\n"
    "                        </DropdownMenuTrigger>\n"
    "                        <DropdownMenuContent align=\"end\" className=\"w-52\">\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Spreadsheet</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToExcel} className=\"cursor-pointer text-green-700 dark:text-green-400 focus:text-green-700 focus:bg-green-50 dark:focus:bg-green-950/50\">\n"
    "                                <FileSpreadsheet className=\"w-4 h-4 mr-2\" />Download as Excel (.xlsx)\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuSeparator />\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Calendar Integration</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToICS} className=\"cursor-pointer text-teal-600 focus:text-teal-600 focus:bg-teal-50 dark:focus:bg-teal-950/50\">\n"
    "                                <CalendarIcon className=\"w-4 h-4 mr-2\" />Export to iCal (.ics)\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuItem onClick={pushToGoogleCalendar} className=\"cursor-pointer text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/50\">\n"
    "                                <Send className=\"w-4 h-4 mr-2\" />Push to Google Calendar\n"
    "                            </DropdownMenuItem>\n"
    "                            <DropdownMenuSeparator />\n"
    "                            <DropdownMenuLabel className=\"text-xs\">Printable</DropdownMenuLabel>\n"
    "                            <DropdownMenuItem onClick={exportToPDF} className=\"cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/50\">\n"
    "                                <Printer className=\"w-4 h-4 mr-2\" />Save as PDF / Print\n"
    "                            </DropdownMenuItem>\n"
    "                        </DropdownMenuContent>\n"
    "                    </DropdownMenu>\n"
    "                    {/* Fullscreen */}\n"
    "                    {!hideFullscreen && (\n"
    "                        <Button size=\"sm\" className=\"h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 md:flex hidden shrink-0\" onClick={toggleFullscreen}>\n"
    "                            {isFullscreen ? <Minimize2 className=\"w-4 h-4 mr-2\" /> : <Maximize2 className=\"w-4 h-4 mr-2\" />}\n"
    "                            {isFullscreen ? \"Exit\" : \"Fullscreen\"}\n"
    "                        </Button>\n"
    "                    )}\n"
    "                </div>\n"
    "                {/* Row 2: Description | Division filter | Faculty filter */}\n"
    "                <div className=\"flex items-center justify-between gap-3 flex-wrap\">\n"
    "                    <p className=\"text-sm text-slate-500 dark:text-slate-400\">\n"
    "                        {activeFilter === \"All Divisions\" ? \"Viewing all divisions. Use the filter to isolate a single division's schedule.\" : `Filtered to: ${activeFilter} \u2014 each slot shows exactly one class.`}\n"
    "                    </p>\n"
    "                    <div className=\"flex items-center gap-2 shrink-0\">\n"
    "                        <div className=\"relative\">\n"
    "                            <Filter className=\"absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none\" />\n"
    "                            <select className=\"pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9\" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>\n"
    "                                {availableFilters.map(f => <option key={f} value={f}>{f}</option>)}\n"
    "                            </select>\n"
    "                        </div>\n"
    "                        <div className=\"relative\">\n"
    "                            <Users className=\"absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none\" />\n"
    "                            <select className=\"pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9\" value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>\n"
    "                                {availableFaculty.map(f => <option key={f} value={f}>{f}</option>)}\n"
    "                            </select>\n"
    "                        </div>\n"
    "                    </div>\n"
    "                </div>\n"
    "            </div>"
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND - checking partial...")
    # find where it diverges
    for i in range(0, len(OLD), 50):
        if OLD[:i+50] not in content:
            print(f"Diverges around char {i}: {repr(OLD[i:i+80])}")
            break
    sys.exit(1)

```

## fix_json.py

```python
import re
with open('frontend/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const \[jsonPayload, setJsonPayload\] = useState\(JSON\.stringify\(\{.*?\}, null, 4\)\);'
replacement = '''const [jsonPayload, setJsonPayload] = useState(JSON.stringify({
  "college_settings": {
    "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "time_slots": [8, 9, 10, 11, 12, 13, 14, 15, 16],
    "lunch_slot": {"Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13},
    "max_continuous_lectures": 3,
    "custom_rules": []
  },
  "rooms_config": {
    "rooms": [
      {"id": "D201", "type": "theory", "capacity": 80, "tags": []},
      {"id": "D205", "type": "theory", "capacity": 80, "tags": []},
      {"id": "D207", "type": "theory", "capacity": 80, "tags": []},
      {"id": "Lab1", "type": "practical", "capacity": 40, "tags": ["Computer_Lab"]},
      {"id": "Lab2", "type": "practical", "capacity": 40, "tags": ["Computer_Lab"]}
    ]
  },
  "faculty": [
    {
      "id": "F001", "name": "Dr. Smith", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 12, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "SY-A",
      "workload": [
        {"id": "W1", "type": "Theory", "subject": "Math", "target_groups": ["SY-A"], "hours": 4, "consecutive_hours": 1, "required_tags": [], "is_online": false},
        {"id": "W2", "type": "Theory", "subject": "Math", "target_groups": ["SY-B"], "hours": 4, "consecutive_hours": 1, "required_tags": [], "is_online": false}
      ]
    },
    {
      "id": "F002", "name": "Prof. Jones", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 17, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "SY-B",
      "workload": [
        {"id": "W3", "type": "Theory", "subject": "Physics", "target_groups": ["SY-A"], "hours": 3, "consecutive_hours": 1, "required_tags": [], "is_online": false},
        {"id": "W4", "type": "Theory", "subject": "Physics", "target_groups": ["SY-B"], "hours": 3, "consecutive_hours": 1, "required_tags": [], "is_online": false}
      ]
    },
    {
      "id": "F003", "name": "Dr. Davis", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 14, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "",
      "workload": [
        {"id": "W5", "type": "Practical", "subject": "CS Lab", "target_groups": ["SY-A"], "hours": 4, "consecutive_hours": 2, "required_tags": ["Computer_Lab"], "is_online": false},
        {"id": "W6", "type": "Practical", "subject": "CS Lab", "target_groups": ["SY-B"], "hours": 4, "consecutive_hours": 2, "required_tags": ["Computer_Lab"], "is_online": false}
      ]
    }
  ]
}, null, 2));'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('frontend/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced')

```

## refactor_page.py

```python
import re

with open('frontend/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { TemplateManager } from "@/components/forms/TemplateManager";',
    'import { TemplateManager } from "@/components/forms/TemplateManager";\nimport SolverConsoleModal from "@/components/SolverConsoleModal";'
)

# 2. Add states
content = content.replace(
    'const [isGenerating, setIsGenerating] = useState(false);',
    'const [isGenerating, setIsGenerating] = useState(false);\n    const [isSolverModalOpen, setIsSolverModalOpen] = useState(false);\n    const [readiness, setReadiness] = useState<{ready: boolean, score: number, issues: any[], total_issues: number} | null>(null);\n    const [currentPayload, setCurrentPayload] = useState<any>(null);'
)

# 3. Add payload_funcs before fetchDashboardStats
payload_funcs = """
    const buildDynamicPayload = async (instId: string) => {
        const { data: inst } = await supabase.from("institutions").select("*").eq("id", instId).single();
        const { data: rooms } = await supabase.from("rooms").select("*").eq("institution_id", instId).eq("is_archived", false);
        const { data: facSettings } = await supabase.from("faculty_settings").select("*").eq("institution_id", instId).eq("is_archived", false);
        
        if (!facSettings || facSettings.length === 0) return null;

        const mappedFaculties = await Promise.all(facSettings.map(async (facSetting) => {
            const { data: workloads } = await supabase.from("workloads").select("*").eq("faculty_id", facSetting.id);
            const realName = facSetting.name || facSetting.faculty_csv_id || `Faculty ${facSetting.id.slice(0, 8)}`;
            return {
                id: facSetting.id,
                name: realName,
                shift: (!facSetting.shift_hours || facSetting.shift_hours.length === 0) ? (inst?.time_slots || []) : facSetting.shift_hours,
                max_load_hrs: facSetting.max_load_hrs,
                max_continuous_hrs: facSetting.max_continuous_hrs || 3,
                blocked_slots: (facSetting.blocked_slots || []).filter((s: any) => s.day && s.time !== undefined),
                class_teacher_for: facSetting.class_teacher_for,
                workload: (workloads || []).map(w => ({
                    id: w.id,
                    type: w.type || "Theory",
                    subject: w.subject_code || "Unknown Subject",
                    target_groups: Array.isArray(w.target_groups) ? w.target_groups : [],
                    hours: w.weekly_hours || 1,
                    consecutive_hours: w.consecutive_hours || 1,
                    required_tags: Array.isArray(w.required_tags) ? w.required_tags : [],
                    is_online: w.is_online || false
                }))
            };
        }));

        let customRules: any[] = [];
        const storedPins = localStorage.getItem(`pinned_classes_${instId}`);
        if (storedPins) {
            try {
                const pins = JSON.parse(storedPins);
                customRules = pins.map((pin: string, index: number) => {
                    const parts = pin.split("|");
                    const w_id = parts[0];
                    return {
                        id: `PIN_${index}`,
                        condition_field: "workload_id",
                        condition_operator: "EQUALS",
                        condition_value: w_id,
                        action_type: "FORCE_PIN",
                        action_value: `${parts[1]}|${parts[2]}|${parts[3]}`
                    };
                });
            } catch (e) {}
        }

        const lunchMap: Record<string, number> = {};
        const rawLunch = inst?.lunch_slot;
        if (rawLunch && typeof rawLunch === 'object' && !Array.isArray(rawLunch)) {
            Object.assign(lunchMap, rawLunch);
        } else {
            const lunchHour = typeof rawLunch === 'number' ? rawLunch : 13;
            (inst?.days_active || []).forEach((day: string) => { lunchMap[day] = lunchHour; });
        }
        (inst?.days_active || []).forEach((day: string) => {
            if (!(day in lunchMap)) lunchMap[day] = 13;
        });

        return {
            college_settings: {
                days_active: inst?.days_active || [],
                time_slots: inst?.time_slots || [],
                lunch_slot: lunchMap,
                custom_rules: customRules
            },
            rooms_config: {
                rooms: rooms?.map(r => ({ id: r.name, type: r.type, capacity: r.capacity, tags: r.tags })) || []
            },
            faculty: mappedFaculties
        };
    };

    const fetchReadiness = async (instId: string) => {
        try {
            const payload = await buildDynamicPayload(instId);
            if (!payload) return;
            setCurrentPayload(payload);
            const res = await fetch("/api/readiness", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setReadiness(data);
            }
        } catch (e) {
            console.error("Failed to fetch readiness", e);
        }
    };
"""
content = content.replace('const fetchDashboardStats = async () => {', payload_funcs + '\n    const fetchDashboardStats = async () => {')

content = content.replace(
    'setIsDbReady((facultyCount ?? 0) > 0 && roomCount > 0);',
    'setIsDbReady((facultyCount ?? 0) > 0 && roomCount > 0);\n            if ((facultyCount ?? 0) > 0 && roomCount > 0) fetchReadiness(instId);'
)

# 4. Refactor `startGeneration`
# We use regex to replace the entire `startGeneration` block up to its ending brace.
import re
new_start_gen = """const startGeneration = async () => {
        if (!isDbReady) {
            toast.error("Cannot generate timetable", { description: "Your database is empty! Add at least 1 Room and 1 Faculty member to continue." });
            return;
        }
        if (readiness && !readiness.ready) {
            toast.error("Generation Halted", { description: "You have critical unresolved constraints. Please fix them in the Readiness Dashboard first." });
            return;
        }
        setIsSolverModalOpen(true);
    };"""

content = re.sub(r'const startGeneration = async \(\) => \{.*?catch \(error\) \{.*?\n\s*\}\s*\};', new_start_gen, content, flags=re.DOTALL)


# 5. Inject readiness UI inside the Hero Card
# Instead of matching a string, let's inject it inside the `<CardHeader>` of the "AI Solver Engine" card.
hero_desc = '<CardDescription className="text-base text-slate-500 dark:text-slate-400">Generate an optimal collision-free timetable conforming to all hard and soft constraints.</CardDescription>'
readiness_ui = """
                    <div className="mt-4 w-full">
                        {readiness ? (
                            <div className={`p-4 rounded-xl border ${readiness.ready ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/50'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${readiness.ready ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                            {readiness.ready ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${readiness.ready ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                                                {readiness.ready ? 'Pre-Flight Checks Passed' : 'Pre-Flight Checks Failed'}
                                            </h4>
                                            <p className={`text-sm ${readiness.ready ? 'text-emerald-700 dark:text-emerald-400/80' : 'text-red-700 dark:text-red-400/80'}`}>
                                                {readiness.ready ? `100% Ready. Score: ${readiness.score}/100.` : `${readiness.total_issues} issue(s) detected. Score: ${readiness.score}/100.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {!readiness.ready && readiness.critical && readiness.critical.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {readiness.critical.map((iss: any, i: number) => (
                                            <div key={i} className="text-sm bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 flex justify-between items-center">
                                                <div>
                                                    <span className="font-semibold text-red-700 dark:text-red-400">[{iss.constraint}]</span> {iss.message}
                                                </div>
                                                {iss.tab_hint && (
                                                    <Button size="sm" variant="outline" className="ml-2 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400" onClick={() => {
                                                        const m: Record<string, string> = { rooms: "rooms", faculty: "faculty", workloads: "workloads", global: "global" };
                                                        if (m[iss.tab_hint]) {
                                                            setActiveTab(m[iss.tab_hint]);
                                                            document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" });
                                                        } else router.push("/dashboard/manage");
                                                    }}>
                                                        Fix
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800/50 flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin shrink-0" />
                                <span className="text-sm text-slate-500">Running initial pre-flight diagnostics...</span>
                            </div>
                        )}
                    </div>
"""
content = content.replace(hero_desc, hero_desc + readiness_ui)


# 6. Inject the modal at the END of the returned JSX, right before the last closing `</div>` and `);`
modal_ui = """
            <SolverConsoleModal 
                isOpen={isSolverModalOpen} 
                onClose={() => { setIsSolverModalOpen(false); fetchDashboardStats(); }} 
                payload={currentPayload} 
                onRoutingRequest={(tab) => {
                    setIsSolverModalOpen(false);
                    const tabMap: Record<string, string> = {
                        rooms: "rooms",
                        faculty: "faculty",
                        workloads: "workloads",
                        global: "global",
                    };
                    const mapped = tabMap[tab.toLowerCase()];
                    if (mapped) {
                        setActiveTab(mapped);
                        document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" });
                    } else {
                        router.push("/dashboard/manage");
                    }
                }}
                onSuccess={() => { fetchDashboardStats(); router.push('/dashboard/timetable'); }}
            />
"""

content = content.replace(
    '        </div>\n    );\n}\n',
    modal_ui + '        </div>\n    );\n}\n'
)

with open('frontend/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

```

## migrate.js

```javascript
/**
 * migrate.js — runs supabase_schema.sql against the live Supabase database.
 * Usage:  node migrate.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.db') });

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
    console.error('❌  SUPABASE_DB_URL not set in .env.db');
    process.exit(1);
}

const sqlFile = path.join(__dirname, 'supabase_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

(async () => {
    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗  Connecting to Supabase...');
        await client.connect();
        console.log('✅  Connected.');
        console.log('⚙️   Running supabase_schema.sql ...');
        await client.query(sql);
        console.log('✅  Migration complete — fresh schema applied!');
    } catch (err) {
        console.error('❌  Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
})();

```

## migrate.ps1

```powershell
# migrate.ps1 — run this any time you want to apply supabase_schema.sql to the live DB
# Usage:  .\migrate.ps1
Write-Host "Running ShiftSync migration..." -ForegroundColor Cyan
node "$PSScriptRoot\migrate.js"

```

## test_result.json

```json
{
  "status": "success",
  "message": "Optimal timetable in 1.8s.",
  "total_classes": 35,
  "overflow_count": 0,
  "optimality_score": 100,
  "solver_status": "OPTIMAL",
  "solve_time_seconds": 1.8,
  "progress_log": [
    "[AUTO-FIX] Faculty F007: 'Design Thinking' consecutive_hours capped from 2 to 1",
    "[AUTO-FIX] Faculty F007: 'Design Thinking' consecutive_hours capped from 2 to 1",
    "[AUTO-FIX] Faculty F007: 'Design Thinking' consecutive_hours capped from 2 to 1",
    "=======================================================",
    "  ShiftSync CP-SAT Engine v2 - Initializing",
    "=======================================================",
    "  Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']  (5 working days)",
    "  Slots per day: 8",
    "  Physical rooms: 5",
    "  Faculty: 6",
    "  Total events to schedule: 23",
    "=======================================================",
    "\n[STEP 1/4] Creating decision variables...",
    "  Created 2560 variables.",
    "\n[STEP 2/4] Applying hard constraints...",
    "  [HC-1] Shift/lunch/blocked constraints applied.",
    "  [HC-2] Workload fulfillment...",
    "  [HC-3] Faculty load caps...",
    "  [HC-4] Room double-booking prevention...",
    "  [HC-5] Faculty double-booking prevention...",
    "  [HC-6] Student group conflict prevention...",
    "  [HC-7] Parent-child subgroup guard...",
    "  [HC-8] Faculty fatigue limit...",
    "  All hard constraints applied.",
    "\n[STEP 3/4] Building soft objective...",
    "  520 soft penalty terms.",
    "\n[STEP 4/4] Running CP-SAT solver (30s limit, 4 workers)...",
    "  Solver done in 1.8s \u2192 OPTIMAL",
    "  Classes: 35 | Score: 100/100 | Overflow: 0",
    "======================================================="
  ],
  "schedule": [
    {
      "workload_id": "W001",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Wed",
      "time_slot": 12,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W001",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D205",
      "day": "Fri",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W002",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Fri",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W002",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Fri",
      "time_slot": 12,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W003",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Fri",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W003",
      "faculty_id": "F001",
      "faculty_name": "Faculty F001",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Fri",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W004",
      "faculty_id": "F002",
      "faculty_name": "Faculty F002",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W004",
      "faculty_id": "F002",
      "faculty_name": "Faculty F002",
      "subject": "Fundamental of Data Structure",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 15,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W005",
      "faculty_id": "F003",
      "faculty_name": "Faculty F003",
      "subject": "Computer Networks",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 10,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W005",
      "faculty_id": "F003",
      "faculty_name": "Faculty F003",
      "subject": "Computer Networks",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W006",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Computer Networks",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Mon",
      "time_slot": 10,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W007",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Computer Networks",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W007",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Computer Networks",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Thu",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W008",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Computer Networks",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Wed",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W008",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Computer Networks",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Wed",
      "time_slot": 15,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W009",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Design Thinking",
      "targets": [
        "SY B1"
      ],
      "type": "Tutorial",
      "room": "D205",
      "day": "Mon",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W010",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Design Thinking",
      "targets": [
        "SY B2"
      ],
      "type": "Tutorial",
      "room": "D201",
      "day": "Wed",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W011",
      "faculty_id": "F007",
      "faculty_name": "Faculty F007",
      "subject": "Design Thinking",
      "targets": [
        "SY B3"
      ],
      "type": "Tutorial",
      "room": "D201",
      "day": "Tue",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W012",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Mon",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W012",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Wed",
      "time_slot": 10,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W013",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Wed",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W013",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Wed",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W014",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Mon",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W014",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Mon",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W015",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Tue",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W015",
      "faculty_id": "F008",
      "faculty_name": "Faculty F008",
      "subject": "Object Oriented Programming",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Tue",
      "time_slot": 12,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W016",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Tue",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W016",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Tue",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W016",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B"
      ],
      "type": "Theory",
      "room": "D201",
      "day": "Tue",
      "time_slot": 10,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W017",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D205",
      "day": "Mon",
      "time_slot": 8,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W017",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B1"
      ],
      "type": "Practical",
      "room": "D205",
      "day": "Mon",
      "time_slot": 9,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W018",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Mon",
      "time_slot": 11,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W018",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B2"
      ],
      "type": "Practical",
      "room": "D201",
      "day": "Mon",
      "time_slot": 12,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W019",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D208",
      "day": "Wed",
      "time_slot": 14,
      "needs_room_assignment": false
    },
    {
      "workload_id": "W019",
      "faculty_id": "F014",
      "faculty_name": "Faculty F014",
      "subject": "Fundamentals of Data Structures & Algorithms",
      "targets": [
        "SY B3"
      ],
      "type": "Practical",
      "room": "D208",
      "day": "Wed",
      "time_slot": 15,
      "needs_room_assignment": false
    }
  ]
}
```
