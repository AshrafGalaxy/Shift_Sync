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
  UserRound,
  UserPlus,
  GraduationCap,
  Sparkles,
  XCircle,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";

// New premium landing components

import { GrainOverlay }     from "@/components/landing/GrainOverlay";
import { PremiumButton }      from "@/components/landing/PremiumButton";
import { MorphingTimetable } from "@/components/landing/MorphingTimetable";
import { BentoFeatures }    from "@/components/landing/BentoFeatures";
import { StickyShowcase }   from "@/components/landing/StickyShowcase";
import { GrainFooter }      from "@/components/landing/GrainFooter";
import { PremiumLink }      from "@/components/landing/PremiumLink";
import { PremiumLiveStats } from "@/components/landing/PremiumLiveStats";
import { IntelligenceEngine } from "@/components/landing/IntelligenceEngine";

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
    <div className="mt-32 py-12 border-y border-slate-800/70 relative">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Trusted by Institutions Across India
        </p>
      </div>
      <div 
        className="marquee-container overflow-hidden relative"
        style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}
      >
        <div className="animate-marquee gap-4">
          {doubled.map((inst, idx) => (
            <div
              key={idx}
              className="mx-2 px-5 py-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-700/60 text-sm text-slate-300 flex-shrink-0 whitespace-nowrap hover:border-sky-500/60 hover:text-white hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] hover:bg-slate-800/80 transition-all cursor-default"
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

function StatCard({ stat, idx }: { stat: any, idx: number }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
      className="relative bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 transition-all overflow-hidden group"
    >
      <div 
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(14,165,233,0.15), transparent 40%)`
        }}
      />
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.accent} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className={`text-3xl font-bold bg-gradient-to-r ${stat.accent} bg-clip-text text-transparent relative z-10`}>
        <Counter value={stat.value} suffix={stat.suffix} />
      </div>
      <p className="text-slate-400 text-sm mt-2 relative z-10">{stat.label}</p>
    </motion.div>
  );
}

function LiveStats() {
  const stats = [
    { label: "Timetables Generated",        value: 500,   suffix: "+", accent: "from-sky-400 to-blue-500" },
    { label: "Institutions Onboarded",      value: 30,    suffix: "+", accent: "from-teal-400 to-cyan-500" },
    { label: "Avg. Generation Time",        value: 42,    suffix: "s", accent: "from-violet-400 to-purple-500" },
    { label: "Constraint Conflicts Resolved", value: 10000, suffix: "+", accent: "from-amber-400 to-orange-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-32">
      {stats.map((stat, idx) => (
        <StatCard key={idx} stat={stat} idx={idx} />
      ))}
    </div>
  );
}


// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable() {
  const rows = [
    { 
      title: "Generation Engine", 
      desc: "How the schedule is actually built.",
      shiftsync: { text: "CP-SAT AI Solver", icon: <Sparkles className="w-4 h-4 mr-1.5" /> },
      sheets: "Manual Formulas",
      manual: "Human Guesswork"
    },
    { 
      title: "Conflict Detection", 
      desc: "Flagging overlapping rooms and professors.",
      shiftsync: { text: "Real-time automated", icon: <CheckCircle2 className="w-4 h-4 mr-1.5" /> },
      sheets: "Formula-based",
      manual: "Post-creation checks" 
    },
    { 
      title: "Smart Room Assignment", 
      desc: "Routing based on capacity and lab equipment.",
      shiftsync: { text: "Intelligent Auto-routing", icon: <CheckCircle2 className="w-4 h-4 mr-1.5" /> },
      sheets: "Manual assignment",
      manual: "Manual assignment" 
    },
    { 
      title: "Continuous Lab Blocks", 
      desc: "Ensuring practicals stay contiguous.",
      shiftsync: { text: "Guaranteed Blocks", icon: <CheckCircle2 className="w-4 h-4 mr-1.5" /> },
      sheets: "Highly error-prone",
      manual: "Easily fragmented" 
    },
    { 
      title: "Distribution", 
      desc: "Getting the schedule to faculty/students.",
      shiftsync: { text: "Calendar Auto-sync", icon: <CheckCircle2 className="w-4 h-4 mr-1.5" /> },
      sheets: "Share PDF / Link",
      manual: "Print to Noticeboard" 
    },
    { 
      title: "Generation Time", 
      desc: "Time taken from data import to final schedule.",
      shiftsync: { text: "Under 45 seconds", icon: <Sparkles className="w-4 h-4 mr-1.5" /> },
      sheets: "Days of tweaking",
      manual: "Weeks of planning" 
    },
  ];

  return (
    <div id="comparison" className="mt-32 scroll-mt-24 relative">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
        >
          Why not just use a spreadsheet?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto"
        >
          Because human brains aren't built to solve 10,000-variable math problems.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto relative"
      >
        {/* Glow behind ShiftSync column */}
        <div className="absolute top-0 bottom-0 left-[40%] md:left-[50%] w-[30%] md:w-[25%] bg-sky-500/10 blur-[60px] rounded-full pointer-events-none" />

        {/* Persistent Glass Pillar for ShiftSync */}
        <div className="absolute top-0 bottom-0 left-[40%] md:left-[50%] w-[30%] md:w-[25%] bg-slate-900/40 backdrop-blur-md border-x border-t rounded-t-3xl border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.05)] -z-10" />

        <div className="grid grid-cols-4 md:grid-cols-5 text-sm md:text-base mb-6 px-4">
          <div className="col-span-2 md:col-span-2 text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Capabilities</div>
          <div className="text-center font-black text-sky-400 uppercase tracking-widest text-sm drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]">ShiftSync</div>
          <div className="text-center font-bold text-slate-600 uppercase tracking-widest text-xs">Spreadsheets</div>
          <div className="hidden md:block text-center font-bold text-slate-600 uppercase tracking-widest text-xs">Manual</div>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="grid grid-cols-4 md:grid-cols-5 items-center p-4 md:p-5 rounded-2xl bg-slate-900/20 border border-slate-800/40 hover:bg-slate-800/40 hover:border-slate-700/60 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Highlight bar for ShiftSync cell - activates on row hover */}
              <div className="absolute top-0 bottom-0 left-[40%] md:left-[50%] w-[30%] md:w-[25%] bg-sky-950/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

              <div className="col-span-2 md:col-span-2 pr-4">
                <p className="font-semibold text-slate-200 mb-1 group-hover:text-white transition-colors">{row.title}</p>
                <p className="text-xs text-slate-500 hidden md:block group-hover:text-slate-400 transition-colors">{row.desc}</p>
              </div>

              <div className="text-center flex justify-center z-10">
                <div className="flex items-center font-bold text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 text-xs md:text-sm shadow-[0_0_15px_rgba(14,165,233,0.15)] group-hover:bg-sky-500/20 group-hover:border-sky-400/30 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all">
                  {row.shiftsync.icon}
                  {row.shiftsync.text}
                </div>
              </div>

              <div className="text-center flex justify-center items-center opacity-40 group-hover:opacity-20 transition-opacity duration-300 mix-blend-luminosity">
                <XCircle className="w-3.5 h-3.5 mr-1.5 text-slate-500 hidden xl:block" />
                <span className="font-medium text-slate-400 text-xs md:text-sm line-through decoration-slate-600/50">{row.sheets}</span>
              </div>

              <div className="hidden md:flex text-center justify-center items-center opacity-30 group-hover:opacity-10 transition-opacity duration-300 mix-blend-luminosity">
                <XCircle className="w-3.5 h-3.5 mr-1.5 text-slate-500 hidden xl:block" />
                <span className="font-medium text-slate-500 text-xs md:text-sm line-through decoration-slate-700/50">{row.manual}</span>
              </div>
            </motion.div>
          ))}
          
          {/* Bottom cap for the glass pillar */}
          <div className="absolute -bottom-4 left-[40%] md:left-[50%] w-[30%] md:w-[25%] h-4 bg-slate-900/40 backdrop-blur-md border-x border-b rounded-b-3xl border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.05)] -z-10" />
        </div>
      </motion.div>
    </div>
  );
}

function TestimonialCard({ t, idx }: { t: any, idx: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotX = ((mouseY / height) - 0.5) * -20;
    const rotY = ((mouseX / width) - 0.5) * 20;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({ x: (mouseX / width) * 100, y: (mouseY / height) * 100 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, rotateX: 8, rotateY: -4, y: 20 }}
      whileInView={{ opacity: 1, rotateX: 0, rotateY: 0, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1, duration: 0.5 }}
      style={{ perspective: 1000 }}
      className="relative z-10"
    >
      <motion.div
        animate={{ rotateX: isHovered ? rotateX : 0, rotateY: isHovered ? rotateY : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-6 h-full relative overflow-hidden"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Specular Glare */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-screen"
          style={{
            opacity: isHovered ? 0.3 : 0,
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
        <svg className="w-8 h-8 text-sky-500/60 mb-4" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
        </svg>
        <p className="text-slate-300 mb-6 leading-relaxed relative z-10">{t.quote}</p>
        <div className="flex items-center gap-4 pt-5 border-t border-slate-800 relative z-10">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.avatarGradient} border border-slate-700/50 flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden`}>
            <img src={t.avatarUrl} alt={t.author} className="w-full h-full object-cover scale-110 mt-1" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-200">{t.author}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 relative z-10">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      quote: "We reduced our timetable planning from 3 weeks to 45 minutes. The conflict detection alone saved us from 200+ manual checks.",
      author: "Dr. Priya Sharma",
      role: "HOD Computer Engineering, SATIS College Nashik",
      avatarGradient: "from-sky-400/20 to-blue-500/20",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Priya&backgroundColor=transparent"
    },
    {
      quote: "The ghost room feature is a lifesaver. Generation never crashes — it just flags what needs manual attention.",
      author: "Prof. Rakesh Joshi",
      role: "Senior Faculty, VIT-style Institution",
      avatarGradient: "from-teal-400/20 to-emerald-500/20",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Rakesh&backgroundColor=transparent"
    },
    {
      quote: "The Google Calendar sync means every faculty member has their schedule on their phone the same day we generate.",
      author: "Ms. Anjali Mehta",
      role: "Academic Coordinator, NIT-style Institution",
      avatarGradient: "from-violet-400/20 to-purple-500/20",
      avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Anjali&backgroundColor=transparent"
    },
  ];

  return (
    <div id="testimonials" className="mt-32 scroll-mt-24">
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
          <TestimonialCard key={idx} t={t} idx={idx} />
        ))}
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <div id="pricing" className="mt-32 scroll-mt-24 relative">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
        >
          Simple, transparent pricing
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto"
        >
          Start free. Scale when you&apos;re ready.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 max-w-5xl mx-auto px-4">
        {/* FREE TIER - GLOWING BENTO */}
        <div className="relative group flex flex-col">
          {/* Breathing pulse glow behind the Free Tier card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/30 to-blue-500/30 rounded-[2.2rem] blur-xl opacity-40 animate-pulse group-hover:opacity-80 transition-opacity duration-700" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-slate-900/60 backdrop-blur-xl border border-sky-500/40 rounded-[2rem] p-8 lg:p-10 shadow-[0_0_40px_rgba(14,165,233,0.15)] hover:shadow-[0_0_60px_rgba(14,165,233,0.25)] hover:border-sky-400/60 transition-all duration-500 overflow-hidden flex flex-col flex-grow z-10"
          >
            <div className="absolute top-0 right-0 p-8">
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50 backdrop-blur-md px-3 py-1 font-semibold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                🎉 Free During Beta
              </Badge>
            </div>
            
            <h3 className="text-3xl font-black mb-2 tracking-tight">Free</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">₹0</p>
            </div>
            <p className="text-slate-400 text-sm mb-8 font-medium">Forever, during beta phase</p>
            
            <ul className="space-y-4 mb-10 text-slate-300 flex-grow">
              {[
                { title: "1 Institution, unlimited departments", desc: "No caps on your organizational structure." },
                { title: "Unlimited timetable generations", desc: "Run the AI solver as many times as you need." },
                { title: "CSV import & full export suite", desc: "Export to Excel, PDF, and iCal instantly." },
                { title: "Google Calendar sync", desc: "Direct integration for faculty and students." },
                { title: "Conflict refiner & substitution system", desc: "Resolve absences and ghost rooms easily." },
              ].map((f, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-6 h-6 text-sky-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                  <div>
                    <span className="font-semibold text-slate-200 block">{f.title}</span>
                    <span className="text-sm text-slate-500 block mt-0.5">{f.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
            
            <Link href="/register" className="mt-auto">
              <PremiumButton icon={<ArrowRight className="w-5 h-5" />} className="w-full py-6 text-lg shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transition-shadow">
                Get Started Free
              </PremiumButton>
            </Link>
          </motion.div>
        </div>

        {/* PRO TIER - BLURRED / MYSTERY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="relative bg-slate-900/30 border border-slate-700/50 rounded-[2rem] p-8 lg:p-10 overflow-hidden flex flex-col items-center text-center justify-center min-h-[500px]"
        >
          {/* Heavy blur overlay */}
          <div className="absolute inset-0 backdrop-blur-[6px] bg-slate-950/50 z-10 flex flex-col items-center justify-center p-8 group/pro">
             <Badge className="mb-4 bg-slate-800/90 text-slate-300 border-slate-600 px-4 py-1.5 font-bold tracking-widest uppercase text-xs shadow-xl flex items-center gap-2">
               <Lock className="w-3.5 h-3.5 text-slate-400 group-hover/pro:animate-bounce" />
               Coming Soon
             </Badge>
             <h3 className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500">Pro Tier</h3>
             <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
               For university conglomerates requiring multi-campus synchronization, priority solver queues, and dedicated SLA support.
             </p>
             <PremiumButton variant="secondary" className="px-8 border-slate-600 hover:bg-slate-800 text-slate-300">
               Join Waitlist
             </PremiumButton>
          </div>

          {/* Faint background skeleton structure to look like content is behind the blur */}
          <div className="opacity-20 blur-[2px] w-full text-left pointer-events-none select-none" aria-hidden="true">
            <h3 className="text-3xl font-black mb-2">Pro</h3>
            <p className="text-6xl font-black tracking-tighter mb-8">₹X,XXX</p>
            <ul className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <li key={i} className="flex gap-3 items-center">
                  <div className="w-6 h-6 rounded-full bg-slate-600" />
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                </li>
              ))}
            </ul>
          </div>
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
    <div id="faq" className="mt-32 pb-32">
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
      <div className="max-w-2xl mx-auto space-y-3 px-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-slate-900/50 border rounded-xl overflow-hidden relative transition-colors duration-300 ${isOpen ? 'border-sky-500/40' : 'border-slate-800'}`}
          >
            {/* Active glow indicator line */}
            <div 
              className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-sky-400 to-blue-600 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
              style={{ boxShadow: isOpen ? '0 0 15px rgba(14,165,233,0.5)' : 'none' }}
            />
            <button
              onClick={() => setOpenIdx(isOpen ? -1 : idx)}
              className={`w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left ${isOpen ? 'bg-slate-800/30' : ''}`}
            >
              <p className={`font-semibold transition-colors duration-300 ${isOpen ? 'text-sky-300' : 'text-slate-200'}`}>{faq.question}</p>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`flex-shrink-0 ml-4 transition-colors duration-300 ${isOpen ? 'text-sky-400' : 'text-slate-500'}`}
              >
                ↓
              </motion.span>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-slate-400 pt-3 leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          );
        })}
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
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-clip">

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

          <div className="hidden md:flex items-center gap-5 lg:gap-8">
            {[
              { name: "Features",     href: "#features" },
              { name: "How It Works", href: "#how-it-works" },
              { name: "Engine",       href: "#intelligence-engine" },
              { name: "Comparison",   href: "#comparison" },
              { name: "Feedback",     href: "#testimonials" },
              { name: "Pricing",      href: "#pricing" },
              { name: "FAQ",          href: "#faq" },
            ].map((link) => (
              <PremiumLink key={link.name} href={link.href} className="text-sm">
                {link.name}
              </PremiumLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link href="/login">
              <PremiumButton icon={<ArrowRight className="w-3.5 h-3.5" />} className="h-9 px-4 text-xs">
                Get Started Free
              </PremiumButton>
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
                  { name: "Features",     href: "#features" },
                  { name: "How It Works", href: "#how-it-works" },
                  { name: "Engine",       href: "#intelligence-engine" },
                  { name: "Comparison",   href: "#comparison" },
                  { name: "Feedback",     href: "#testimonials" },
                  { name: "Pricing",      href: "#pricing" },
                  { name: "FAQ",          href: "#faq" },
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
                <span className="inline-block min-h-[1.2em] relative">
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
                </span>
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
              <Link href="/register">
                <PremiumButton icon={<ArrowRight className="w-4 h-4" />}>
                  Generate Your Timetable
                </PremiumButton>
              </Link>

              <PremiumButton
                variant="secondary"
                icon={<Play className="w-4 h-4 fill-current" />}
              >
                Watch Demo
              </PremiumButton>
            </motion.div>
          </div>

          {/* §10 Morphing Timetable Demo */}
          <MorphingTimetable />

          {/* Stats */}
          <PremiumLiveStats />

          {/* Marquee */}
          <Marquee />

          {/* §2 Sticky Scroll Showcase */}
          <StickyShowcase />

          {/* §9 Bento Features */}
          <BentoFeatures />

          {/* The Intelligence Engine */}
          <IntelligenceEngine />

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
