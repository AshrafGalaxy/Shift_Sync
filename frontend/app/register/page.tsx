"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Calendar, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({ institutionName: "", email: "", password: "", confirm: "" });
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
        if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (!form.institutionName.trim()) { setError("Institution name is required."); return; }
        setIsLoading(true);

        try {
            // 1. Create auth user
            const { data: authData, error: authErr } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
            });
            if (authErr) throw new Error(authErr.message);
            const userId = authData.user?.id;
            if (!userId) throw new Error("User creation failed.");

            // 2. Create institution row
            const { data: inst, error: instErr } = await supabase
                .from("institutions")
                .insert({ name: form.institutionName.trim() })
                .select("id")
                .single();
            if (instErr) throw new Error("Could not create institution: " + instErr.message);

            // 3. Create profile row linking user → institution
            const { error: profileErr } = await supabase
                .from("profiles")
                .insert({ id: userId, institution_id: inst.id, role: "admin" });
            if (profileErr) throw new Error("Could not create profile: " + profileErr.message);

            setDone(true);
        } catch (err: any) {
            setError(err.message || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-600/10 dark:bg-teal-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full" />
            </div>

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-50">ShiftSync</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="w-full max-w-md z-10"
            >
                <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                    <CardHeader className="space-y-1 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center tracking-tight">Register Institution</CardTitle>
                        <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                            Create a new ShiftSync workspace for your college
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {done ? (
                            <div className="flex flex-col items-center gap-4 py-6 text-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-50 text-lg">Registration complete!</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Check your email to confirm your account, then sign in.
                                    </p>
                                </div>
                                <Button className="mt-2 w-full" onClick={() => router.push("/login")}>
                                    Go to Sign In <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="institutionName">Institution / College Name</Label>
                                    <Input
                                        id="institutionName" value={form.institutionName} onChange={set("institutionName")}
                                        placeholder="e.g. SATIS Engineering College" required
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Admin Email</Label>
                                    <Input
                                        id="reg-email" type="email" value={form.email} onChange={set("email")}
                                        placeholder="admin@college.edu" required
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Password</Label>
                                    <Input
                                        id="reg-password" type="password" value={form.password} onChange={set("password")}
                                        placeholder="Min. 8 characters" required
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm Password</Label>
                                    <Input
                                        id="confirm" type="password" value={form.confirm} onChange={set("confirm")}
                                        placeholder="••••••••" required
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                {error && (
                                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">
                                        {error}
                                    </p>
                                )}
                                <Button type="submit" className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating workspace...</>
                                    ) : (
                                        <>Create Institution <ArrowRight className="ml-2 w-4 h-4" /></>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800/60 pt-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
