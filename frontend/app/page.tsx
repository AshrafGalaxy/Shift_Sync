"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Star,
  Menu,
  X,
  Play,
  Upload,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";

// New premium landing components
import { CursorGlow }       from "@/components/landing/CursorGlow";
import { GrainOverlay }     from "@/components/landing/GrainOverlay";
import { MagneticButton }   from "@/components/landing/MagneticButton";
import { MorphingTimetable } from "@/components/landing/MorphingTimetable";
import { BentoFeatures }    from "@/components/landing/BentoFeatures";
import { StickyShowcase }   from "@/components/landing/StickyShowcase";
import { GrainFooter }      from "@/components/landing/GrainFooter";

// ─── Typewriter phrases ───────────────────────────────────────────────────────
const typewriterPhrases = [
  "Instantly.",
  "Conflict-Free.",
  "Intelligently.",
  "Automatically.",
];

// ─── Marquee ─────────────────────────────────────────────────────────────────
function Marquee() {
  const institutions = [
    "SATIS Engineering", "Tech University", "NIT Surathkal",
    "VJTI Mumbai", "COEP Pune", "MIT Manipal",
    "VIT Vellore", "BITS Pilani", "IIT Bombay Style", "BIT Mesra",
  ];
  const doubled = [...institutions, ...institutions];

  return (
    <div className="mt-32 py-12 border-y border-slate-800/70">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Trusted by Institutions Across India
        </p>
      </div>
      <div className="marquee-container overflow-hidden">
        <div className="animate-marquee gap-4">
          {doubled.map((inst, idx) => (
            <div
              key={idx}
              className="mx-2 px-5 py-2 rounded-full bg-slate-900 border border-slate-700/60 text-sm text-slate-300 flex-shrink-0 whitespace-nowrap hover:border-sky-500/40 hover:text-sky-300 transition-colors cursor-default"
            >
              {inst}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / 50;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return <>{count}{suffix}</>;
}

// ─── Live Stats ───────────────────────────────────────────────────────────────
function LiveStats() {
  const stats = [
    { label: "Timetables Generated",        value: 500,   suffix: "+", accent: "from-sky-400 to-blue-500" },
    { label: "Institutions Onboarded",      value: 30,    suffix: "+", accent: "from-teal-400 to-cyan-500" },
    { label: "Avg. Generation Time",        value: 42,    suffix: "s", accent: "from-violet-400 to-purple-500" },
    { label: "Constraint Conflicts Resolved", value: 10000, suffix: "+", accent: "from-amber-400 to-orange-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="relative bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 hover:border-sky-500/40 hover:shadow-[0_0_24px_rgba(14,165,233,0.10)] transition-all overflow-hidden group"
        >
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.accent} opacity-70 group-hover:opacity-100 transition-opacity`} />
          <div className={`text-3xl font-bold bg-gradient-to-r ${stat.accent} bg-clip-text text-transparent`}>
            <Counter value={stat.value} suffix={stat.suffix} />
          </div>
          <p className="text-slate-400 text-sm mt-2">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: "1", title: "Configure",
      description: "Upload your faculty, rooms, and workloads via CSV or the web form",
      icon: Upload,
      gradient: "from-sky-500 to-blue-600",
      glow: "shadow-[0_0_20px_rgba(14,165,233,0.4)]",
    },
    {
      number: "2", title: "Generate",
      description: "Click Generate. The CP-SAT engine applies every constraint and produces a conflict-free timetable",
      icon: Play,
      gradient: "from-blue-500 to-violet-600",
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.35)]",
    },
    {
      number: "3", title: "Export & Share",
      description: "Export to Excel, PDF, or push to Google Calendar. Done.",
      icon: Download,
      gradient: "from-violet-500 to-purple-600",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.35)]",
    },
  ];

  return (
    <div id="how-it-works" className="mt-32">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-4"
        >
          From setup to schedule in 3 steps
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400"
        >
          No training required. Start generating in minutes.
        </motion.p>
      </div>

      <div className="relative">
        {/* Self-drawing connector line — desktop only */}
        <div className="hidden md:block absolute top-10" style={{ left: "20%", right: "20%" }}>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
            className="h-[1px] bg-gradient-to-r from-sky-500/50 via-violet-500/50 to-purple-500/50"
            style={{ transformOrigin: "left" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 + 0.1 }}
                className="text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 260 }}
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} ${step.glow} text-white mb-6`}
                >
                  <Icon className="w-8 h-8" />
                </motion.div>
                <div className="mb-1">
                  <span className="text-xs uppercase tracking-widest text-slate-600 font-semibold">
                    Step {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-100">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable() {
  const rows = [
    { feature: "Conflict detection",          shiftsync: true,   sheets: false,  manual: false },
    { feature: "Room assignment",             shiftsync: true,   sheets: false,  manual: false },
    { feature: "Faculty shift compliance",    shiftsync: true,   sheets: false,  manual: false },
    { feature: "Lab continuity (2hr blocks)", shiftsync: true,   sheets: false,  manual: false },
    { feature: "Export to Google Calendar",   shiftsync: true,   sheets: false,  manual: false },
    { feature: "Generation time",             shiftsync: "42s",  sheets: "Days", manual: "Weeks" },
    { feature: "Free to use",                 shiftsync: true,   sheets: true,   manual: true },
  ];

  return (
    <div className="mt-32">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-4"
        >
          Why not just use a spreadsheet?
        </motion.h2>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-x-auto rounded-2xl border border-slate-800/70"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-4 px-4 font-semibold text-slate-400">Feature</th>
              <th className="text-center py-4 px-4 font-semibold text-teal-400 border-l border-slate-800">ShiftSync ✓</th>
              <th className="text-center py-4 px-4 font-semibold text-slate-400 border-l border-slate-800">Spreadsheets</th>
              <th className="text-center py-4 px-4 font-semibold text-slate-400 border-l border-slate-800">Manual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-800/70 hover:bg-slate-900/40 transition-colors">
                <td className="py-4 px-4 text-slate-300">{row.feature}</td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.shiftsync === "boolean"
                    ? row.shiftsync ? <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" /> : <span className="text-red-400/60">✕</span>
                    : <span className="text-teal-400 font-medium">{row.shiftsync}</span>}
                </td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.sheets === "boolean"
                    ? row.sheets ? <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" /> : <span className="text-red-400/60">✕</span>
                    : <span className="text-amber-400 font-medium">{row.sheets}</span>}
                </td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.manual === "boolean"
                    ? row.manual ? <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" /> : <span className="text-red-400/60">✕</span>
                    : <span className="text-amber-400 font-medium">{row.manual}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      quote: "We reduced our timetable planning from 3 weeks to 45 minutes. The conflict detection alone saved us from 200+ manual checks.",
      author: "Dr. Priya Sharma",
      role: "HOD Computer Engineering, SATIS College Nashik",
      avatarGradient: "from-sky-400 to-blue-500",
    },
    {
      quote: "The ghost room feature is a lifesaver. Generation never crashes — it just flags what needs manual attention.",
      author: "Prof. Rakesh Joshi",
      role: "Senior Faculty, VIT-style Institution",
      avatarGradient: "from-teal-400 to-emerald-500",
    },
    {
      quote: "The Google Calendar sync means every faculty member has their schedule on their phone the same day we generate.",
      author: "Ms. Anjali Mehta",
      role: "Academic Coordinator, NIT-style Institution",
      avatarGradient: "from-violet-400 to-purple-500",
    },
  ];

  return (
    <div className="mt-32">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-4"
        >
          What scheduling teams are saying
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400"
        >
          Real feedback from real institutions.
        </motion.p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, rotateX: 8, rotateY: -4, y: 20 }}
            whileInView={{ opacity: 1, rotateX: 0, rotateY: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-6 hover:border-slate-600/70 transition-colors relative overflow-hidden"
            style={{ perspective: 800 }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
            <svg className="w-8 h-8 text-sky-500/60 mb-4" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
            </svg>
            <p className="text-slate-300 mb-6 leading-relaxed">{t.quote}</p>
            <div className="flex items-center gap-3 pt-5 border-t border-slate-800">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarGradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {t.author.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-200">{t.author}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <div id="pricing" className="mt-32">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-4"
        >
          Simple, transparent pricing
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400"
        >
          Start free. Scale when you&apos;re ready.
        </motion.p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-900/50 border border-sky-500/40 rounded-2xl p-8"
        >
          <Badge className="mb-4 bg-sky-500/20 text-sky-300 border-sky-500/50">🎉 Free During Beta</Badge>
          <h3 className="text-2xl font-bold mb-2">Free</h3>
          <p className="text-4xl font-black mb-2">₹0</p>
          <p className="text-slate-400 text-sm mb-6">Forever, during beta</p>
          <ul className="space-y-3 mb-8 text-sm">
            {[
              "1 institution, unlimited departments",
              "Unlimited timetable generations",
              "CSV import & full export suite",
              "Google Calendar sync",
              "Conflict refiner & substitution system",
            ].map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/register">
            <Button className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
              Get Started Free
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-700/60 rounded-2xl p-8"
        >
          <Badge className="mb-4 bg-slate-700/60 text-slate-300 border-slate-600">Coming Soon</Badge>
          <h3 className="text-2xl font-bold mb-2">Pro</h3>
          <p className="text-4xl font-black mb-2">TBA</p>
          <p className="text-slate-400 text-sm mb-6">Per institution / year</p>
          <ul className="space-y-3 mb-8 text-sm">
            {[
              "Everything in Free",
              "Multiple institution management",
              "Priority solver queue",
              "Multi-department support",
              "Dedicated onboarding & SLA support",
            ].map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full border-slate-700 text-slate-400" disabled>
            Join Waitlist
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    { question: "Is ShiftSync free?", answer: "Yes, completely free during the beta period." },
    { question: "What does 'Ghost Room' mean?", answer: "When no physical room matches a workload's required tags, the solver assigns it to a ghost room (TBD slot) instead of crashing. You see it highlighted in amber." },
    { question: "How does the AI solver work?", answer: "We use Google OR-Tools CP-SAT, a constraint programming solver that encodes all your scheduling rules as mathematical constraints and finds a valid assignment." },
    { question: "Can I import existing data?", answer: "Yes. Upload CSV files for faculty, rooms, and workloads. We validate the data before passing it to the solver." },
    { question: "Is my institution's data private?", answer: "Absolutely. Row Level Security (RLS) in Supabase ensures each institution's data is completely isolated." },
    { question: "What export formats are supported?", answer: "Excel (.xlsx), PDF, iCal (.ics), and Google Calendar push via OAuth." },
  ];

  return (
    <div id="faq" className="mt-32">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold"
        >
          Frequently asked questions
        </motion.h2>
      </div>
      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
            >
              <p className="font-semibold">{faq.question}</p>
              <motion.span
                animate={{ rotate: openIdx === idx ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 flex-shrink-0 ml-4"
              >
                ↓
              </motion.span>
            </button>
            <AnimatePresence>
              {openIdx === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-slate-400 border-t border-slate-800 pt-3 leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPhrase, setCurrentPhrase]   = useState(0);

  // §7 — Blur-swap typewriter rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % typewriterPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // §5 — Parallax hero layers
  const { scrollY } = useScroll();
  const orb1Y = useTransform(scrollY, [0, 800], [0, -120]);
  const orb2Y = useTransform(scrollY, [0, 800], [0, -180]);
  const orb3Y = useTransform(scrollY, [0, 800], [0,  -60]);
  const dotGridY = useTransform(scrollY, [0, 800], [0, -20]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
      {/* §8 Cursor Glow */}
      <CursorGlow />
      {/* §1 Grain Overlay */}
      <GrainOverlay />

      <Toaster position="top-right" richColors />

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full border-b border-slate-800/70 bg-slate-950/85 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.3)]">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-400">
              ShiftSync
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[
              { name: "Features",    href: "#features" },
              { name: "How It Works", href: "#how-it-works" },
              { name: "Pricing",     href: "#pricing" },
              { name: "FAQ",         href: "#faq" },
            ].map((link) => (
              <a key={link.name} href={link.href}
                className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link href="/login">
              <Button className="relative h-9 px-5 rounded-full text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]">
                Get Started Free <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-800 bg-slate-950"
            >
              <div className="px-4 py-4 space-y-2">
                {[
                  { name: "Features",    href: "#features" },
                  { name: "How It Works", href: "#how-it-works" },
                  { name: "Pricing",     href: "#pricing" },
                  { name: "FAQ",         href: "#faq" },
                ].map((link) => (
                  <a key={link.name} href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-slate-400 hover:text-slate-100">
                    {link.name}
                  </a>
                ))}
                <div className="pt-4 space-y-2 border-t border-slate-800">
                  <Link href="/login" className="block py-2 text-slate-400 hover:text-slate-100">Sign In</Link>
                  <Link href="/login">
                    <Button className="w-full rounded-full bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

          {/* §5 Parallax background orbs */}
          <motion.div
            style={{ y: orb1Y }}
            aria-hidden
            className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-sky-600/10 blur-[150px] rounded-full -z-10 pointer-events-none"
          />
          <motion.div
            style={{ y: orb2Y }}
            aria-hidden
            className="absolute top-20 right-[-80px] w-[400px] h-[400px] bg-violet-600/8 blur-[140px] rounded-full -z-10 pointer-events-none"
          />
          <motion.div
            style={{ y: orb3Y }}
            aria-hidden
            className="absolute bottom-0 left-[-60px] w-[300px] h-[300px] bg-blue-700/8 blur-[130px] rounded-full -z-10 pointer-events-none"
          />
          <motion.div
            style={{ y: dotGridY }}
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.025)_1px,_transparent_1px)] bg-[length:48px_48px] -z-10 pointer-events-none"
          />

          {/* Hero content */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              {/* §4 Scroll entrance + §7 Blur-swap typewriter */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-tight">
                Build Perfect Timetables.
                <br />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentPhrase}
                    initial={{ opacity: 0, filter: "blur(12px)", y: 10 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    exit={{ opacity: 0, filter: "blur(12px)", y: -10 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="gradient-sky-text inline-block"
                  >
                    {typewriterPhrases[currentPhrase]}
                  </motion.span>
                </AnimatePresence>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-slate-400 max-w-2xl mx-auto mb-12"
            >
              ShiftSync uses Google OR-Tools CP-SAT to generate mathematically optimal,
              constraint-aware weekly timetables for your institution — in under 60 seconds.
            </motion.p>

            {/* CTA buttons — §6 Magnetic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Link href="/login">
                <MagneticButton>
                  <Button
                    size="lg"
                    className="relative h-14 px-10 text-base font-bold rounded-full overflow-hidden
                      bg-white text-slate-900 hover:bg-slate-50
                      shadow-[0_0_40px_rgba(14,165,233,0.3)] hover:shadow-[0_0_60px_rgba(14,165,233,0.5)]
                      transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] tracking-tight"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-sky-100/40 via-white/0 to-blue-100/40 pointer-events-none" />
                    <span className="relative z-10 flex items-center gap-2">
                      Generate Your Timetable
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </MagneticButton>
              </Link>

              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold rounded-full border border-slate-700 bg-transparent text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/60 transition-all duration-200 tracking-tight"
              >
                <Play className="mr-2 w-4 h-4 fill-slate-400" /> Watch Demo
              </Button>
            </motion.div>
          </div>

          {/* §10 Morphing Timetable Demo */}
          <MorphingTimetable />

          {/* Stats */}
          <LiveStats />

          {/* Marquee */}
          <Marquee />

          {/* §2 Sticky Scroll Showcase */}
          <StickyShowcase />

          {/* §9 Bento Features */}
          <BentoFeatures />

          {/* How It Works */}
          <HowItWorks />

          {/* Comparison */}
          <ComparisonTable />

          {/* §4 3D-tilt Testimonials */}
          <Testimonials />

          {/* Pricing */}
          <Pricing />

          {/* FAQ */}
          <FAQ />
        </div>
      </main>

      {/* §3 Grain Footer Brand */}
      <GrainFooter />
    </div>
  );
}
