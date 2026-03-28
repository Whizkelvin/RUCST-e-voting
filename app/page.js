'use client';

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NavigationBar from '@/components/home/NavigationBar';
import CountdownTimer from '@/components/home/CountdownTimer';
import StatsCard from '@/components/home/StatsCard';
import ElectionCard from '@/components/home/ElectionCard';
import VotingStatusBanner from '@/components/home/VotingStatusBanner';
import Footer from '@/components/footer';
import { useElectionData } from '@/hooks/useElectionData';
import { FaSync, FaExclamationCircle, FaVoteYea, FaUsers, FaChartBar, FaClock, FaLock } from 'react-icons/fa';

export default function Home() {
  const {
    loading,
    error,
    totalStats,
    votingProgress,
    isVotingActive,
    votingPeriod,
    votingStartsIn,
    timeLeft,
    fetchElectionData,
    lastUpdated
  } = useElectionData();

  useEffect(() => {
    AOS.init({ duration: 1000, once: true, offset: 100 });
  }, []);

  const stats = [
    { value: loading ? '...' : `${totalStats.totalVoters.toLocaleString()}+`, label: 'Registered Voters', icon: FaUsers,    color: 'teal' },
    { value: loading ? '...' : `${totalStats.participationRate.toFixed(1)}%`, label: 'Live Participation', icon: FaChartBar, color: 'amber' },
    { value: '24/7',  label: 'System Uptime', icon: FaClock, color: 'teal' },
    { value: '100%',  label: 'Secure Votes',  icon: FaLock,  color: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-teal-50 relative overflow-x-hidden">

      {/* Page top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-900 via-teal-400 to-amber-400 z-50" />

      {/* Ambient background blobs */}
      <div className="fixed -top-32 -right-20 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-10 -left-24 w-80 h-80 rounded-full bg-amber-400/8 blur-3xl pointer-events-none z-0" />

      <ToastContainer position="top-right" autoClose={5000} />

      <div className="relative z-10">
        <NavigationBar isVotingActive={isVotingActive} />

        <div data-aos="fade-down">
          <CountdownTimer
            timeLeft={timeLeft}
            votingPeriod={votingPeriod}
            isVotingActive={isVotingActive}
            votingStartsIn={votingStartsIn}
            totalStats={totalStats}
            loading={loading}
          />
        </div>

        <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">

          {/* ── STATS SECTION ── */}
          <section className="mb-10">
            <div data-aos="fade-up" className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 mb-1">Live Overview</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-teal-950 tracking-tight leading-tight">Election Dashboard</h2>
              <p className="text-teal-700/70 mt-2 text-sm max-w-md">Real-time voting statistics and participation metrics</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const isTeal = stat.color === 'teal';
                return (
                  <div
                    key={index}
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                    className="relative bg-white rounded-2xl border border-teal-600/10 p-5 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                  >
                    {/* Corner accent */}
                    <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5 ${isTeal ? 'bg-teal-600' : 'bg-amber-400'}`} />

                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTeal ? 'bg-teal-600/10 text-teal-600' : 'bg-amber-400/10 text-amber-500'}`}>
                        <Icon size={17} />
                      </div>
                      {/* Pulse dot */}
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    </div>

                    <StatsCard stat={stat} loading={loading} />
                    <div className="mt-1">
                      <p className="text-2xl font-bold text-teal-950 tracking-tight leading-none">{stat.value}</p>
                      <p className="text-[11px] font-medium text-teal-600/70 uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── REFRESH / LAST UPDATED ── */}
          <div
            data-aos="fade-up"
            className="flex flex-wrap items-center justify-between gap-3 mb-6"
          >
            {lastUpdated && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <FaClock size={11} className="text-teal-600" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchElectionData}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-teal-600 to-teal-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-teal-600/25 hover:-translate-y-0.5 hover:shadow-teal-600/35 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              <FaSync size={12} className={loading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div data-aos="fade-up" className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 border-l-4 border-l-red-500 rounded-2xl mb-6 shadow-sm">
              <FaExclamationCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-semibold text-sm">{error}</p>
                <button onClick={fetchElectionData} className="text-xs text-red-500 font-medium mt-1 hover:text-red-700 transition-colors">
                  Try again →
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-teal-600/9  to-transparent my-10" />

          {/* ── ELECTIONS SECTION ── */}
          <section id="elections" className="mb-8 bg-green-900/30 p-6 rounded-3xl border border-teal-600/20">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-9">
              <div data-aos="fade-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-950 mb-1">Participate Now</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-teal-950 tracking-tight leading-tight">Current Elections</h2>
                <p className="text-green-950  mt-2 text-sm">Cast your vote for the leaders who will shape our future</p>
              </div>

              <div data-aos="fade-left">
                <div className="flex items-center gap-2 bg-white border border-teal-600/12 rounded-full px-4 py-2 shadow-sm text-sm font-semibold text-teal-950">
                  <span className={`w-2 h-2 rounded-full ${isVotingActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                  {isVotingActive ? 'Voting Active' : 'Voting Closed'}
                </div>
              </div>
            </div>

            {votingProgress.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {votingProgress.map((election, index) => (
                  <div
                    key={index}
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                    className="bg-white rounded-3xl border border-teal-600/10 overflow-hidden shadow-sm hover:-translate-y-1.5 hover:shadow-xl hover:border-teal-600/25 transition-all duration-300 group"
                  >
                    {/* Top bar on hover */}
                    <div className="h-1 bg-gradient-to-r from-teal-600 via-amber-400 to-teal-800 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    <ElectionCard
                      election={election}
                      index={index}
                      isVotingActive={isVotingActive}
                      votingPeriod={votingPeriod}
                      loading={loading}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div data-aos="fade-up" className="text-center py-16 px-8 bg-white rounded-3xl border border-dashed border-teal-600/20">
                <div className="w-16 h-16 bg-teal-600/6 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaVoteYea size={26} className="text-teal-600 opacity-40" />
                </div>
                <h3 className="text-lg font-bold text-teal-950 mb-1">No Active Elections</h3>
                <p className="text-teal-700/60 text-sm">Check back later for upcoming elections</p>
              </div>
            )}
          </section>

          <div data-aos="fade-up">
            <VotingStatusBanner isVotingActive={isVotingActive} />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-teal-600/15 to-transparent my-10" />

          {/* ── SUMMARY STATS ── */}
          <section className="mb-8">
            <div data-aos="fade-up" className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 mb-1">At a Glance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-teal-950 tracking-tight leading-tight">Election Summary</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Registered Voters',  value: loading ? '...' : `${totalStats.totalVoters.toLocaleString()}+`, icon: FaUsers,    color: 'teal' },
                { label: 'Votes Cast',          value: loading ? '...' : totalStats.totalVotes.toLocaleString(),       icon: FaVoteYea,  color: 'amber' },
                { label: 'Participation Rate',  value: loading ? '...' : `${totalStats.participationRate.toFixed(1)}%`, icon: FaChartBar, color: 'teal' },
                { label: 'Security Level',      value: '100%',                                                         icon: FaLock,     color: 'amber' },
              ].map((item, i) => {
                const Icon = item.icon;
                const isTeal = item.color === 'teal';
                return (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 80}
                    className="relative bg-white rounded-2xl border border-teal-600/10 p-5 text-center overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                  >
                    {/* Bottom bar on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-600 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left" />

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ${isTeal ? 'bg-gradient-to-br from-teal-600 to-teal-800' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                      <Icon size={18} className="text-white" />
                    </div>

                    <p className="text-2xl font-bold tracking-tight bg-gradient-to-br from-teal-600 to-teal-900 bg-clip-text text-transparent">
                      {item.value}
                    </p>
                    <p className="text-[11px] font-medium text-teal-600/70 uppercase tracking-widest mt-1">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  );
}