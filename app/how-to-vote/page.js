// app/vote-process/page.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from 'sonner';
import {
  FaVoteYea, FaCheckCircle, FaChevronRight, FaEnvelope,
  FaKey, FaFileSignature, FaFlagCheckered, FaShieldAlt, FaLock,
  FaSun, FaMoon
} from "react-icons/fa";
import { GiStairsGoal } from "react-icons/gi";

const votingSteps = [
  {
    step: 1,
    title: "Login with School Credentials",
    description: "Access the system using your official Regent University email and Student ID.",
    icon: <FaEnvelope />,
    accent: "from-rose-500 to-red-700",
    dot: "bg-rose-500",
    requirements: ["@regent.edu.gh email", "Valid Student ID"],
  },
  {
    step: 2,
    title: "Email Verification",
    description: "A One-Time Password (OTP) is sent to your school email to confirm identity.",
    icon: <FaKey />,
    accent: "from-violet-500 to-purple-700",
    dot: "bg-violet-500",
    requirements: ["OTP valid for 10 minutes", "Single-use code"],
  },
  {
    step: 3,
    title: "Select Candidates",
    description: "Carefully choose one candidate per position before proceeding.",
    icon: <FaVoteYea />,
    accent: "from-emerald-500 to-teal-700",
    dot: "bg-emerald-500",
    requirements: ["One candidate per position", "Review before submit"],
  },
  {
    step: 4,
    title: "Submit Vote",
    description: "Confirm and securely submit your vote. This action is final.",
    icon: <FaFileSignature />,
    accent: "from-amber-500 to-orange-700",
    dot: "bg-amber-500",
    requirements: ["Final confirmation", "No edits allowed"],
  },
  {
    step: 5,
    title: "View Results",
    description: "Election results are published after the voting period ends.",
    icon: <FaFlagCheckered />,
    accent: "from-sky-500 to-blue-700",
    dot: "bg-sky-500",
    requirements: ["End of voting", "Public announcement"],
  },
];

const VoteProcess = () => {
  const router = useRouter();
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // Theme management
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`);
  };

  // Theme styles
  const themeStyles = {
    dark: {
      background: 'from-slate-900 via-slate-800 to-slate-900',
      cardBg: 'bg-white/4',
      cardBorder: 'border-white/8',
      cardHoverBorder: 'hover:border-white/15',
      textPrimary: 'text-white',
      textSecondary: 'text-white/50',
      textMuted: 'text-white/45',
      textLight: 'text-white/70',
      badgeBg: 'bg-white/4',
      badgeBorder: 'border-white/10',
      requirementBg: 'bg-white/3',
      requirementBorder: 'border-white/6',
      ctaBg: 'bg-white/4',
      ctaBorder: 'border-white/8',
      buttonPrimary: 'from-emerald-600 to-teal-600',
      buttonPrimaryHover: 'hover:from-emerald-500 hover:to-teal-500',
      buttonSecondary: 'bg-white/5 hover:bg-white/10',
      buttonSecondaryBorder: 'border-white/10 hover:border-white/20',
      glow: 'from-rose-600/6 via-transparent to-emerald-600/6',
    },
    light: {
      background: 'from-gray-50 via-white to-gray-100',
      cardBg: 'bg-gray-50',
      cardBorder: 'border-gray-200',
      cardHoverBorder: 'hover:border-gray-300',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-500',
      textMuted: 'text-gray-500',
      textLight: 'text-gray-600',
      badgeBg: 'bg-gray-100',
      badgeBorder: 'border-gray-200',
      requirementBg: 'bg-gray-100',
      requirementBorder: 'border-gray-200',
      ctaBg: 'bg-white',
      ctaBorder: 'border-gray-200',
      buttonPrimary: 'from-emerald-600 to-teal-600',
      buttonPrimaryHover: 'hover:from-emerald-500 hover:to-teal-500',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200',
      buttonSecondaryBorder: 'border-gray-200 hover:border-gray-300',
      glow: 'from-emerald-600/6 via-transparent to-teal-600/6',
    }
  };

  const currentTheme = themeStyles[theme];

  if (!mounted) {
    return null;
  }

  return (
    <section className={`min-h-screen bg-gradient-to-br ${currentTheme.background} py-16 sm:py-24 relative overflow-hidden transition-all duration-300`}>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          duration: 3000,
          className: 'text-sm font-medium',
        }}
      />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <FaSun className="text-yellow-400 text-xl" />
        ) : (
          <FaMoon className="text-gray-700 text-xl" />
        )}
      </button>

      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-rose-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="text-center mb-12 sm:mb-20">
          <div className={`inline-flex items-center gap-2.5 ${currentTheme.badgeBg} border ${currentTheme.badgeBorder} ${currentTheme.textLight} px-4 sm:px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-6`}>
            <GiStairsGoal className="text-emerald-400" />
            Secure Voting Process
            <FaLock className="text-rose-400 text-[10px]" />
          </div>

          <h2 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${currentTheme.textPrimary} tracking-tight leading-tight`}>
            How{" "}
            <span className="bg-gradient-to-r from-rose-400 to-emerald-400 bg-clip-text text-transparent">
              Voting
            </span>{" "}
            Works
          </h2>

          <p className={`mt-4 sm:mt-5 text-base sm:text-lg ${currentTheme.textSecondary} max-w-2xl mx-auto leading-relaxed`}>
            A secure, transparent, and student-friendly electronic voting process
            designed exclusively for Regent University.
          </p>

          <div className="mt-6 sm:mt-7 flex flex-wrap justify-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm">
              <FaShieldAlt /> End-to-End Encryption
            </div>
            <div className={`w-px h-4 ${currentTheme.textMuted} self-center hidden sm:block`} />
            <div className="flex items-center gap-2 text-rose-400 text-xs sm:text-sm">
              <FaLock /> Secure Authentication
            </div>
          </div>
        </div>

        {/* ── TIMELINE ── */}
        <div className="relative">

          {/* Centre line - hidden on mobile */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

          <div className="space-y-12 sm:space-y-16">
            {votingSteps.map((step, index) => {
              const isRight = index % 2 === 0;
              return (
                <div
                  key={step.step}
                  className={`relative flex flex-col items-center gap-6 lg:gap-0 lg:flex-row ${isRight ? "" : "lg:flex-row-reverse"}`}
                >
                  {/* ── Card side ── */}
                  <div className={`w-full lg:w-5/12 ${isRight ? "lg:pr-12" : "lg:pl-12"}`}>
                    <div className={`group relative ${currentTheme.cardBg} ${currentTheme.cardBorder} ${currentTheme.cardHoverBorder} rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-300`}>

                      {/* Step pill */}
                      <div className={`absolute -top-3 ${isRight ? 'left-4 sm:left-6' : 'right-4 sm:right-6'} bg-gradient-to-r ${step.accent} text-white text-[10px] font-bold tracking-widest uppercase px-2.5 sm:px-3 py-1 rounded-full shadow-lg`}>
                        Step {step.step}
                      </div>

                      {/* Icon + title */}
                      <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5 mt-1">
                        <div className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${step.accent} text-white flex items-center justify-center text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          {step.icon}
                        </div>
                        <div>
                          <h3 className={`text-base sm:text-lg font-bold ${currentTheme.textPrimary} leading-snug`}>{step.title}</h3>
                          <p className={`${currentTheme.textMuted} text-xs sm:text-sm mt-1 leading-relaxed`}>{step.description}</p>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className={`${currentTheme.requirementBg} border ${currentTheme.requirementBorder} rounded-xl p-3 sm:p-4`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest ${currentTheme.textMuted} mb-2 sm:mb-3 flex items-center gap-2`}>
                          <FaCheckCircle className="text-emerald-500" /> Requirements
                        </p>
                        <ul className="space-y-1.5 sm:space-y-2">
                          {step.requirements.map((req, i) => (
                            <li key={i} className={`flex items-center gap-2 sm:gap-2.5 ${currentTheme.textLight} text-xs sm:text-sm`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.dot}`} />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* ── Centre node ── */}
                  <div className="z-10 shrink-0 relative lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${step.accent} text-white flex items-center justify-center text-lg sm:text-xl font-bold shadow-2xl border-4 ${theme === 'dark' ? 'border-slate-900' : 'border-white'} ring-2 ring-white/10`}>
                      {step.step}
                    </div>
                  </div>

                  {/* ── Empty side (spacer) ── */}
                  <div className="hidden lg:block lg:w-5/12" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="mt-16 sm:mt-20 lg:mt-28">
          <div className={`relative ${currentTheme.ctaBg} border ${currentTheme.ctaBorder} rounded-2xl sm:rounded-3xl p-8 sm:p-10 lg:p-14 text-center overflow-hidden`}>

            {/* Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.glow} pointer-events-none`} />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <h3 className={`relative text-2xl sm:text-3xl lg:text-4xl font-bold ${currentTheme.textPrimary} tracking-tight mb-3 sm:mb-4`}>
              Ready to{" "}
              <span className="bg-gradient-to-r from-rose-400 to-emerald-400 bg-clip-text text-transparent">
                Cast Your Vote?
              </span>
            </h3>
            <p className={`relative ${currentTheme.textMuted} max-w-xl mx-auto text-sm sm:text-base leading-relaxed mb-8 sm:mb-10`}>
              Ensure you have access to your Regent University email and Student ID
              before starting the secure voting process.
            </p>

            <div className="relative flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => router.push("/login")}
                className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 bg-gradient-to-r ${currentTheme.buttonPrimary} ${currentTheme.buttonPrimaryHover} text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-sm sm:text-base`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <FaVoteYea />
                Begin Voting Process
                <FaChevronRight className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              <button
                onClick={() => router.push("/")}
                className={`group inline-flex items-center justify-center gap-2 ${currentTheme.buttonSecondary} border ${currentTheme.buttonSecondaryBorder} ${currentTheme.textLight} hover:text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 text-sm sm:text-base`}
              >
                Back to Home
                <FaChevronRight className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>

            <div className={`relative mt-8 sm:mt-10 pt-6 sm:pt-8 border-t ${currentTheme.requirementBorder}`}>
              <p className={`${currentTheme.textMuted} text-xs sm:text-sm`}>
                Need assistance? Contact{" "}
                <a href="mailto:support@regent.edu.gh" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  support@regent.edu.gh
                </a>
                {" "}or call{" "}
                <span className="text-rose-400 font-medium">+233 30 123 4567</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── SECURITY BADGES ── */}
        <div className="mt-10 sm:mt-14 flex flex-wrap justify-center items-center gap-4 sm:gap-6">
          {[
            { icon: <FaLock className="text-emerald-500" />, label: "256-bit SSL Encryption" },
            { icon: <FaShieldAlt className="text-rose-400" />, label: "GDPR Compliant" },
            { icon: <FaCheckCircle className="text-emerald-500" />, label: "ISO 27001 Certified" },
          ].map(({ icon, label }, i, arr) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 ${currentTheme.textMuted} text-xs sm:text-sm`}>
                {icon} {label}
              </div>
              {i < arr.length - 1 && <div className={`w-1 h-1 rounded-full ${currentTheme.textMuted} opacity-30`} />}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
};

export default VoteProcess;