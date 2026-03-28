// app/vote-process/page.js
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FaVoteYea, FaCheckCircle, FaChevronRight, FaEnvelope,
  FaKey, FaFileSignature, FaFlagCheckered, FaShieldAlt, FaLock,
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

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-800 to-slate-800 py-24 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-rose-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2.5 bg-white/4 border border-white/10 text-white/70 px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-6">
            <GiStairsGoal className="text-emerald-400" />
            Secure Voting Process
            <FaLock className="text-rose-400 text-[10px]" />
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">
            How{" "}
            <span className="bg-gradient-to-r from-rose-400 to-emerald-400 bg-clip-text text-transparent">
              Voting
            </span>{" "}
            Works
          </h2>

          <p className="mt-5 text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            A secure, transparent, and student-friendly electronic voting process
            designed exclusively for Regent University.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-5">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <FaShieldAlt /> End-to-End Encryption
            </div>
            <div className="w-px h-4 bg-white/10 self-center hidden sm:block" />
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <FaLock /> Secure Authentication
            </div>
          </div>
        </div>

        {/* ── TIMELINE ── */}
        <div className="relative">

          {/* Centre line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

          <div className="space-y-16">
            {votingSteps.map((step, index) => {
              const isRight = index % 2 === 0;
              return (
                <div
                  key={step.step}
                  className={`relative flex flex-col items-center gap-6 md:gap-0 md:flex-row ${isRight ? "" : "md:flex-row-reverse"}`}
                >
                  {/* ── Card side ── */}
                  <div className={`w-full md:w-5/12 ${isRight ? "md:pr-12" : "md:pl-12"}`}>
                    <div className="group relative bg-white/4 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-2xl p-6 shadow-xl transition-all duration-300">

                      {/* Step pill */}
                      <div className={`absolute -top-3 ${isRight ? 'left-6' : 'right-6'} bg-gradient-to-r ${step.accent} text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-lg`}>
                        Step {step.step}
                      </div>

                      {/* Icon + title */}
                      <div className="flex items-start gap-4 mb-5 mt-1">
                        <div className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${step.accent} text-white flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          {step.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-snug">{step.title}</h3>
                          <p className="text-white/45 text-sm mt-1 leading-relaxed">{step.description}</p>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="bg-white/3 border border-white/6 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3 flex items-center gap-2">
                          <FaCheckCircle className="text-emerald-500" /> Requirements
                        </p>
                        <ul className="space-y-2">
                          {step.requirements.map((req, i) => (
                            <li key={i} className="flex items-center gap-2.5 text-white/55 text-sm">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.dot}`} />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* ── Centre node ── */}
                  <div className="z-10 shrink-0 relative md:absolute md:left-1/2 md:-translate-x-1/2">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${step.accent} text-white flex items-center justify-center text-xl font-bold shadow-2xl border-4 border-slate-950 ring-2 ring-white/10`}>
                      {step.step}
                    </div>
                  </div>

                  {/* ── Empty side (spacer) ── */}
                  <div className="hidden md:block md:w-5/12" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="mt-28">
          <div className="relative bg-white/4 border border-white/8 rounded-3xl p-10 sm:p-14 text-center overflow-hidden">

            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-rose-600/6 via-transparent to-emerald-600/6 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <h3 className="relative text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to{" "}
              <span className="bg-gradient-to-r from-rose-400 to-emerald-400 bg-clip-text text-transparent">
                Cast Your Vote?
              </span>
            </h3>
            <p className="relative text-white/45 max-w-xl mx-auto text-base leading-relaxed mb-10">
              Ensure you have access to your Regent University email and Student ID
              before starting the secure voting process.
            </p>

            <div className="relative flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.push("/login")}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-10 py-4 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <FaVoteYea />
                Begin Voting Process
                <FaChevronRight className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              <button
                onClick={() => router.push("/")}
                className="group inline-flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-10 py-4 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5"
              >
                Back to Home
                <FaChevronRight className="group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>

            <div className="relative mt-10 pt-8 border-t border-white/8">
              <p className="text-white/30 text-sm">
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
        <div className="mt-14 flex flex-wrap justify-center items-center gap-6">
          {[
            { icon: <FaLock className="text-emerald-500" />, label: "256-bit SSL Encryption" },
            { icon: <FaShieldAlt className="text-rose-400" />, label: "GDPR Compliant" },
            { icon: <FaCheckCircle className="text-emerald-500" />, label: "ISO 27001 Certified" },
          ].map(({ icon, label }, i, arr) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2 text-white/35 text-sm">
                {icon} {label}
              </div>
              {i < arr.length - 1 && <div className="w-1 h-1 rounded-full bg-white/15" />}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
};

export default VoteProcess;