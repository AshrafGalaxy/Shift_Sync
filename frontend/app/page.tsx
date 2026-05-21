"use client";

import { useState, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Brain,
  AlertTriangle,
  Search,
  Download,
  Building2,
  UserCheck,
  CheckCircle2,
  Star,
  Menu,
  X,
  Play,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";

// Typewriter effect phrases
const typewriterPhrases = [
  "Instantly.",
  "Conflict-Free.",
  "Intelligently.",
  "Automatically.",
];

// Animated Timetable Grid Component
function AnimatedTimetableGrid() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const times = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"];

  // Mock timetable cells with random pattern
  const generateCells = () => {
    const cells = [];
    let cellId = 0;
    for (let day = 0; day < 5; day++) {
      for (let time = 0; time < 8; time++) {
        const rand = Math.random();
        const isEmpty = rand > 0.7;
        if (!isEmpty) {
          const types = [
            { code: "CS301", faculty: "DR", color: "from-blue-500 to-blue-600" },
            { code: "ML_LAB", faculty: "PR", color: "from-teal-500 to-teal-600" },
            { code: "DMS_TUT", faculty: "MS", color: "from-purple-500 to-purple-600" },
          ];
          const type = types[Math.floor(Math.random() * types.length)];
          cells.push({
            id: cellId++,
            day,
            time,
            ...type,
          });
        }
      }
    }
    return cells;
  };

  const [cells, setCells] = useState<ReturnType<typeof generateCells>>([]);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    // generateCells() uses Math.random() — must only run client-side to avoid
    // an SSR/hydration mismatch where server and client produce different grids.
    setCells(generateCells());

    const timer = setTimeout(() => setShowBadge(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (delay: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: delay * 0.03, duration: 0.4 },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-20 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 max-w-4xl mx-auto"
    >
      <div className="flex gap-1 overflow-x-auto pb-4">
        {/* Grid headers */}
        <div className="flex-shrink-0" />
        {days.map((day) => (
          <div key={day} className="w-24 text-center text-xs font-semibold text-slate-400 flex-shrink-0">
            {day}
          </div>
        ))}
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: "auto repeat(5, minmax(96px, 1fr))" }}>
        {times.map((time, timeIdx) => (
          <React.Fragment key={time}>
            <div className="text-xs font-semibold text-slate-400 h-12 flex items-center">
              {time}
            </div>
            {days.map((day, dayIdx) => {
              const cell = cells.find((c) => c.day === dayIdx && c.time === timeIdx);
              return (
                <motion.div
                  key={`${day}-${time}`}
                  custom={timeIdx * 5 + dayIdx}
                  variants={cellVariants}
                  initial="hidden"
                  animate="visible"
                  className="h-12"
                >
                  {cell ? (
                    <div
                      className={`h-full rounded-lg bg-gradient-to-br ${cell.color} border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)] flex items-center justify-center text-xs font-semibold text-white`}
                    >
                      {cell.code}
                    </div>
                  ) : (
                    <div className="h-full rounded-lg bg-slate-800/30 border border-slate-700/50" />
                  )}
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-sm text-teal-400 font-medium"
          >
            Generated in 42s ✓
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Marquee component
function Marquee() {
  const institutions = [
    "SATIS Engineering",
    "Tech University",
    "NIT Surathkal",
    "VJTI Mumbai",
    "COEP Pune",
    "MIT Manipal",
    "VIT Vellore",
    "BITS Pilani",
  ];

  return (
    <div className="mt-32 py-12 border-y border-slate-800">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">
          Trusted by Institutions Across India
        </p>
      </div>
      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-4"
          animate={{ x: [-1000, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...institutions, ...institutions].map((inst, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-sm text-slate-400 flex-shrink-0 whitespace-nowrap"
            >
              {inst}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Live Stats with counter animation
function LiveStats() {
  const stats = [
    { label: "Timetables Generated", value: 500, suffix: "+" },
    { label: "Institutions Onboarded", value: 30, suffix: "+" },
    { label: "Avg. Generation Time", value: 42, suffix: "s" },
    { label: "Constraint Conflicts Resolved", value: 10000, suffix: "+" },
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
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all"
        >
          <motion.div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            <Counter value={stat.value} suffix={stat.suffix} />
          </motion.div>
          <p className="text-slate-400 text-sm mt-2">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// Counter component
function Counter({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / 50;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

// Feature cards
function FeatureCards() {
  const features = [
    {
      title: "AI Constraint Solver",
      description: "Google OR-Tools CP-SAT engine solves thousands of constraint variables in seconds.",
      icon: Brain,
      color: "text-blue-500",
    },
    {
      title: "Ghost Resource Layer",
      description: "Never get a failed generation. Overflow slots use ghost rooms and flag them amber for manual resolution.",
      icon: AlertTriangle,
      color: "text-amber-500",
    },
    {
      title: "Conflict Refiner",
      description: "When generation fails, the Conflict Refiner diagnoses exactly which constraint is impossible.",
      icon: Search,
      color: "text-purple-500",
    },
    {
      title: "Multi-Format Export",
      description: "Export to Excel (.xlsx), PDF, iCal (.ics) or push directly to Google Calendar.",
      icon: Download,
      color: "text-teal-500",
    },
    {
      title: "Multi-Tenant Architecture",
      description: "Row Level Security ensures each institution sees only its own data. Register and go.",
      icon: Building2,
      color: "text-blue-500",
    },
    {
      title: "Real-Time Substitution",
      description: "Faculty absent? The substitute finder checks conflicts in real-time and notifies via the bell system.",
      icon: UserCheck,
      color: "text-purple-500",
    },
  ];

  return (
    <div id="features" className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Everything your scheduling team needs</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          From faculty shifts to lab continuity — every constraint, handled.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 ${feature.color}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// How It Works
function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Configure",
      description: "Upload your faculty, rooms, and workloads via CSV or the web form",
      icon: Upload,
    },
    {
      number: "2",
      title: "Generate",
      description: "Click Generate. The CP-SAT engine applies every constraint and produces a conflict-free timetable",
      icon: Play,
    },
    {
      number: "3",
      title: "Export & Share",
      description: "Export to Excel, PDF, or push to Google Calendar. Done.",
      icon: ArrowRight,
    },
  ];

  return (
    <div id="how-it-works" className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">From setup to schedule in 3 steps</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-2xl mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.description}</p>
              </div>
              {idx < 2 && (
                <div className="hidden md:block absolute -right-4 top-8">
                  <ArrowRight className="w-8 h-8 text-slate-700" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Comparison Table
function ComparisonTable() {
  return (
    <div className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Why not just use a spreadsheet?</h2>
      </div>
      <div className="overflow-x-auto">
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
            {[
              { feature: "Conflict detection", shiftsync: true, sheets: false, manual: false },
              { feature: "Room assignment", shiftsync: true, sheets: false, manual: false },
              { feature: "Faculty shift compliance", shiftsync: true, sheets: false, manual: false },
              { feature: "Lab continuity (2hr blocks)", shiftsync: true, sheets: false, manual: false },
              { feature: "Export to Google Calendar", shiftsync: true, sheets: false, manual: false },
              { feature: "Generation time", shiftsync: "42s", sheets: "Days", manual: "Weeks" },
              { feature: "Free to use", shiftsync: true, sheets: true, manual: true },
            ].map((row, idx) => (
              <tr key={idx} className="border-b border-slate-800">
                <td className="py-4 px-4 text-slate-300">{row.feature}</td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.shiftsync === "boolean" ? (
                    row.shiftsync ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    ) : (
                      <span className="text-red-400/60">❌</span>
                    )
                  ) : (
                    <span className="text-teal-400 font-medium">{row.shiftsync}</span>
                  )}
                </td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.sheets === "boolean" ? (
                    row.sheets ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    ) : (
                      <span className="text-red-400/60">❌</span>
                    )
                  ) : (
                    <span className="text-amber-400 font-medium">{row.sheets}</span>
                  )}
                </td>
                <td className="text-center py-4 px-4 border-l border-slate-800">
                  {typeof row.manual === "boolean" ? (
                    row.manual ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-400 mx-auto" />
                    ) : (
                      <span className="text-red-400/60">❌</span>
                    )
                  ) : (
                    <span className="text-amber-400 font-medium">{row.manual}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Testimonials
function Testimonials() {
  const testimonials = [
    {
      quote:
        "We reduced our timetable planning from 3 weeks to 45 minutes. The conflict detection alone saved us from 200+ manual checks.",
      author: "Dr. Priya Sharma",
      role: "HOD Computer Engineering, SATIS College Nashik",
    },
    {
      quote:
        "The ghost room feature is a lifesaver. Generation never crashes — it just flags what needs manual attention.",
      author: "Prof. Rakesh Joshi",
      role: "Senior Faculty, VIT-style Institution",
    },
    {
      quote:
        "The Google Calendar sync means every faculty member has their schedule on their phone the same day we generate.",
      author: "Ms. Anjali Mehta",
      role: "Academic Coordinator, NIT-style Institution",
    },
  ];

  return (
    <div className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">What scheduling teams are saying</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          >
            <div className="text-4xl text-purple-500 mb-4">"</div>
            <p className="text-slate-300 mb-6 italic">{testimonial.quote}</p>
            <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" />
              <div>
                <p className="font-semibold text-sm">{testimonial.author}</p>
                <p className="text-xs text-slate-400">{testimonial.role}</p>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Pricing
function Pricing() {
  return (
    <div id="pricing" className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-slate-400">Start free. Scale when you're ready.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        {/* Free Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-900/50 border border-blue-500/40 rounded-2xl p-8"
        >
          <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/50">
            🎉 Free During Beta
          </Badge>
          <div className="text-4xl font-bold mb-2">
            $0 <span className="text-lg text-slate-400 font-normal">/ forever</span>
          </div>
          <ul className="space-y-3 my-8 text-slate-300">
            <li className="flex gap-2 items-start">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>Unlimited timetable generations</span>
            </li>
            <li className="flex gap-2 items-start">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>Up to 50 faculty</span>
            </li>
            <li className="flex gap-2 items-start">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>Up to 20 rooms</span>
            </li>
            <li className="flex gap-2 items-start">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>All export formats</span>
            </li>
            <li className="flex gap-2 items-start">
              <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>Email support</span>
            </li>
          </ul>
          <Link href="/login">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started Free
            </Button>
          </Link>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700 rounded-2xl p-8 relative overflow-hidden lg:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
          <div className="relative z-10">
            <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/50">
              🚀 Coming Soon
            </Badge>
            <div className="text-4xl font-bold mb-2">
              $29 <span className="text-lg text-slate-400 font-normal">/ month per institution</span>
            </div>
            <ul className="space-y-3 my-8 text-slate-300">
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Everything in Free</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Unlimited faculty & rooms</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Priority solver queue</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Multi-department support</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>Dedicated onboarding & SLA support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Join Waitlist
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// FAQ
function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      question: "Is ShiftSync free?",
      answer: "Yes, completely free during the beta period.",
    },
    {
      question: "What does 'Ghost Room' mean?",
      answer:
        "When no physical room matches a workload's required tags, the solver assigns it to a ghost room (TBD slot) instead of crashing. You see it highlighted in amber.",
    },
    {
      question: "How does the AI solver work?",
      answer:
        "We use Google OR-Tools CP-SAT, a constraint programming solver that encodes all your scheduling rules as mathematical constraints and finds a valid assignment.",
    },
    {
      question: "Can I import existing data?",
      answer:
        "Yes. Upload CSV files for faculty, rooms, and workloads. We validate the data before passing it to the solver.",
    },
    {
      question: "Is my institution's data private?",
      answer:
        "Absolutely. Row Level Security (RLS) in Supabase ensures each institution's data is completely isolated.",
    },
    {
      question: "What export formats are supported?",
      answer:
        "Excel (.xlsx), PDF, iCal (.ics), and Google Calendar push via OAuth.",
    },
  ];

  return (
    <div id="faq" className="mt-32">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold">Frequently asked questions</h2>
      </div>
      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, idx) => (
          <motion.div
            key={idx}
            className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
            >
              <p className="font-semibold">{faq.question}</p>
              <motion.div
                animate={{ rotate: openIdx === idx ? 180 : 0 }}
                className="text-slate-400"
              >
                ↓
              </motion.div>
            </button>
            <AnimatePresence>
              {openIdx === idx && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-4 text-slate-400 border-t border-slate-800">{faq.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Footer
function Footer() {
  return (
    <footer className="mt-32 py-16 border-t border-slate-800 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">ShiftSync</span>
            </div>
            <p className="text-sm text-slate-400">Built with ❤️ for Indian engineering colleges</p>
          </div>

          {/* Product */}
          <div>
            <p className="font-semibold mb-4 text-sm">Product</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#features" className="hover:text-slate-100 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-slate-100 transition-colors">
                  How it Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-100 transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="font-semibold mb-4 text-sm">Resources</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-slate-100 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-slate-100 transition-colors">
                  Guide
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-slate-100 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-semibold mb-4 text-sm">Legal</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-slate-100 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-slate-100 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-slate-400">© 2025 ShiftSync. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-slate-400 hover:text-slate-100 transition-colors">
              GitHub
            </a>
            <a href="#" className="text-slate-400 hover:text-slate-100 transition-colors">
              Twitter
            </a>
            <a href="#" className="text-slate-400 hover:text-slate-100 transition-colors">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Home Page Component
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % typewriterPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
      <Toaster position="top-right" richColors />

      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              ShiftSync
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { name: "Features", href: "#features" },
              { name: "How It Works", href: "#how-it-works" },
              { name: "Pricing", href: "#pricing" },
              { name: "FAQ", href: "#faq" },
            ].map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">
              Sign In
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
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
                  { name: "Features", href: "#features" },
                  { name: "How It Works", href: "#how-it-works" },
                  { name: "Pricing", href: "#pricing" },
                  { name: "FAQ", href: "#faq" },
                ].map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-slate-400 hover:text-slate-100"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="pt-4 space-y-2 border-t border-slate-800">
                  <Link href="/login" className="block py-2 text-slate-400 hover:text-slate-100">
                    Sign In
                  </Link>
                  <Link href="/login">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Background Orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-blue-600/20 blur-[120px] rounded-full -z-10" />
          <div className="absolute top-32 right-0 w-[400px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full -z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[length:50px_50px] -z-10" />

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-tight">
                Build Perfect Timetables.
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {typewriterPhrases[currentPhrase]}
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-slate-400 max-w-2xl mx-auto mb-12"
            >
              ShiftSync uses Google OR-Tools CP-SAT to generate mathematically optimal, constraint-aware weekly
              timetables for your institution — in under 60 seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-600/30">
                  Generate Your Timetable <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-2xl border-slate-700 hover:bg-slate-800"
              >
                <Play className="mr-2 w-5 h-5" /> Watch Demo
              </Button>
            </motion.div>
          </div>

          {/* Animated Timetable Grid */}
          <AnimatedTimetableGrid />

          {/* Stats */}
          <LiveStats />

          {/* Marquee */}
          <Marquee />

          {/* Features */}
          <FeatureCards />

          {/* How It Works */}
          <HowItWorks />

          {/* Comparison */}
          <ComparisonTable />

          {/* Testimonials */}
          <Testimonials />

          {/* Pricing */}
          <Pricing />

          {/* FAQ */}
          <FAQ />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
