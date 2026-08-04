"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Users, Calendar, ArrowRight, Loader2, Calendar as CalendarIcon, Lock, Mail, Brain, CalendarCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState("faculty");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) {
                setError(authError.message);
                toast.error("Authentication failed", { description: authError.message });
                setIsLoading(false);
                return;
            }

            toast.success("Signed in successfully!", { description: "Redirecting to dashboard..." });
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            const message = err.message || "An unexpected error occurred";
            setError(message);
            toast.error("Sign in failed", { description: message });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30 overflow-hidden flex">
            {/* Left Panel - Branding */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
            >
                {/* Background Gradient — softened */}
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
                            Access Your Institution's Scheduling Engine
                        </h2>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: Brain,
                                    title: "Intelligent Scheduling",
                                    description: "CP-SAT solver handles thousands of constraints",
                                },
                                {
                                    icon: Lock,
                                    title: "Institution Privacy",
                                    description: "Row-level security ensures data isolation",
                                },
                                {
                                    icon: CalendarCheck,
                                    title: "Real-Time Sync",
                                    description: "Export to Google Calendar instantly",
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

                {/* Floating Orb Animation */}
                <motion.div
                    className="absolute bottom-12 left-12 w-48 h-48 rounded-full border border-purple-500/20"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
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
                        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-slate-400">
                            Access the intelligent scheduling engine
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="faculty" className="w-full" onValueChange={setRole}>
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/60 p-1 rounded-lg border border-slate-700/60 h-10">
                                <TabsTrigger
                                    value="faculty"
                                    className="rounded-md !h-full text-sm transition-all"
                                >
                                    <Users className="w-3.5 h-3.5 mr-2 hidden sm:block" />
                                    Faculty
                                </TabsTrigger>
                                <TabsTrigger
                                    value="admin"
                                    className="rounded-md !h-full text-sm transition-all"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-2 hidden sm:block" />
                                    Admin
                                </TabsTrigger>
                            </TabsList>

                            <form onSubmit={handleLogin} className="space-y-4">
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
                                    <Label htmlFor="email">Institute Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@institute.edu"
                                        required
                                        className="bg-slate-800/50 border-slate-700 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link
                                            href="#"
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
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
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full mt-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-600/20 transition-all"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Sign In to {role.charAt(0).toUpperCase() + role.slice(1)} Portal
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Tabs>

                        <div className="mt-6 text-center text-sm text-slate-400">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                Register here
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
