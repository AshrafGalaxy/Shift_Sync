"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Lock, Mail, Building2, Loader2, ArrowRight, CheckCircle2, Zap, Layers, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [institutionName, setInstitutionName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            toast.error("Password mismatch", { description: "Passwords do not match" });
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            toast.error("Weak password", { description: "Password must be at least 8 characters" });
            return;
        }

        setIsLoading(true);

        try {
            // Register user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                let msg = authError.message;
                if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("email")) {
                    msg = "This email address was rejected by the authentication server. Supabase blocks role-based prefixes like 'admin@', 'postmaster@', or 'root@'. Please use a personal prefix instead — e.g., 'principal@vit.edu', 'timetable@vit.edu', or your name like 'j.sharma@vit.edu'.";
                }
                setError(msg);
                toast.error("Registration failed", { description: msg });
                setIsLoading(false);
                return;
            }

            if (authData.user) {
                // Create institution
                const { data: instData, error: instError } = await supabase
                    .from("institutions")
                    .insert({
                        name: institutionName,
                        days_active: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                        time_slots: [8, 9, 10, 11, 12, 13, 14, 15],
                        lunch_slot: 12,
                        max_continuous_lectures: 2,
                    })
                    .select()
                    .single();

                if (instError) throw instError;

                // Create profile
                const { error: profileError } = await supabase.from("profiles").insert({
                    id: authData.user.id,
                    full_name: email.split("@")[0],
                    role: "admin",
                    institution_id: instData?.id,
                });

                if (profileError) throw profileError;

                setSuccess(true);
                toast.success("Registration successful!", {
                    description: "Check your email to confirm your account",
                });

                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            }
        } catch (err: any) {
            const message = err.message || "An unexpected error occurred";
            setError(message);
            toast.error("Registration error", { description: message });
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30 overflow-hidden flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-3">Verify Your Email</h2>
                    <p className="text-slate-400 mb-8">
                        We&apos;ve sent a confirmation link to <span className="font-semibold text-teal-400">{email}</span>. Please check your inbox and click the link to activate your account.
                    </p>
                    <Link href="/login">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                            Back to Sign In
                        </Button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30 overflow-hidden flex">
            {/* Left Panel - Branding */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
            >
                {/* Background Gradient — softened blue theme */}
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600/12 to-blue-700/12" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[140px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-600/15 blur-[140px] rounded-full" />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 mb-12">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.3)]">
                            <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-400">
                            ShiftSync
                        </span>
                    </Link>

                    <div className="space-y-8">
                        <h2 className="text-4xl font-bold leading-tight">
                            Start Your Institution&apos;s Journey
                        </h2>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: Building2,
                                    title: "Dedicated Workspace",
                                    description: "Each institution gets isolated, secure data environment",
                                },
                                {
                                    icon: Zap,
                                    title: "Zero Setup Required",
                                    description: "Start generating timetables in minutes",
                                },
                                {
                                    icon: Layers,
                                    title: "Multi-Department Support",
                                    description: "Manage multiple departments and schedules",
                                },
                            ].map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + idx * 0.1 }}
                                        className="flex gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(14,165,233,0.3)]">
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm mb-1">{item.title}</p>
                                            <p className="text-slate-400 text-sm">{item.description}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right Panel - Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8"
            >
                {/* Mobile Logo */}
                <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.3)]">
                        <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-400">ShiftSync</span>
                </Link>

                <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl font-bold tracking-tight">Create Your Account</CardTitle>
                        <CardDescription className="text-slate-400">
                            Register your institution to get started
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Error Banner */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="institution">Institution Name</Label>
                                <Input
                                    id="institution"
                                    type="text"
                                    value={institutionName}
                                    onChange={(e) => setInstitutionName(e.target.value)}
                                    placeholder="e.g., SATIS Engineering College"
                                    required
                                    className="bg-slate-800/50 border-slate-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Institute Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="principal@institute.edu"
                                    required
                                    className="bg-slate-800/50 border-slate-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                                />
                                <p className="text-xs text-slate-400">
                                    Avoid role-based prefixes like <span className="text-amber-400 font-mono">admin@</span>, <span className="text-amber-400 font-mono">root@</span>. Use your name or title — e.g. <span className="text-slate-300 font-mono">principal@vit.edu</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="bg-slate-800/50 border-slate-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/50 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">Minimum 8 characters</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="bg-slate-800/50 border-slate-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/50 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-600/20 transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Register Institution
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
