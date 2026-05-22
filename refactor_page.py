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
