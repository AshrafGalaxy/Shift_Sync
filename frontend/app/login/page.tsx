"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Users, Calendar, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState("faculty");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(error.message);
                setIsLoading(false);
                return;
            }

            // Redirect to dashboard on success
            router.push("/dashboard");
            router.refresh(); // Refresh to apply middleware session
        } catch (err: any) {
            alert(err.message || "An unexpected error occurred");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500/30">

            {/* Background Ornaments */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 dark:bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 group z-10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center group-hover:shadow-lg transition-all">
                    <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-50">ShiftSync</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl font-bold text-center tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                            Access the intelligent scheduling engine
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="faculty" className="w-full" onValueChange={setRole}>
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                <TabsTrigger value="faculty" className="rounded-md data-[state=active]:bg-white data-[state=active]:dark:bg-slate-800 data-[state=active]:shadow-sm text-xs sm:text-sm">
                                    <Users className="w-4 h-4 mr-2 hidden sm:block" />
                                    Faculty
                                </TabsTrigger>
                                <TabsTrigger value="admin" className="rounded-md data-[state=active]:bg-white data-[state=active]:dark:bg-slate-800 data-[state=active]:shadow-sm text-xs sm:text-sm">
                                    <ShieldCheck className="w-4 h-4 mr-2 hidden sm:block" />
                                    Admin
                                </TabsTrigger>
                            </TabsList>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key="email-input"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-2"
                                    >
                                        <Label htmlFor="email">Institute Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@institute.edu"
                                            required
                                            className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                                        />
                                    </motion.div>
                                </AnimatePresence>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link href="#" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
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
                    </CardContent>
                    <CardFooter className="flex flex-col items-center gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Need help? Contact <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">IT Support</a>
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            New institution?{" "}
                            <Link href="/register" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
                                Register here
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
