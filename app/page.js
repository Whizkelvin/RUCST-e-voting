'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Toaster, toast } from 'sonner';
import NavigationBar from '@/components/home/NavigationBar';
import CountdownTimer from '@/components/home/CountdownTimer';
import ElectionCard from '@/components/home/ElectionCard';
import VotingStatusBanner from '@/components/home/VotingStatusBanner';
import Footer from '@/components/footer';
import { useElectionData } from '@/hooks/useElectionData';
import {
  FaSync,
  FaExclamationCircle,
  FaVoteYea,
  FaUsers,
  FaChartBar,
  FaClock,
  FaSun,
  FaMoon,
  FaSearch,
  FaIdCard,
  FaUserGraduate,
  FaEye,
  FaTimes,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showVoterList, setShowVoterList] = useState(false);
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [voterLoading, setVoterLoading] = useState(false);
  const [voterStats, setVoterStats] = useState({ total: 0, voted: 0, notVoted: 0, turnout: 0 });

  const modalRef = useRef(null);

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
    lastUpdated,
  } = useElectionData();

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // ── AOS init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AOS.init({ duration: 1000, once: true, offset: 100 });
  }, []);

  // ── Body scroll lock when mobile menu is open ─────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // ── Close modal on Escape key ─────────────────────────────────────────────
  useEffect(() => {
    if (!showVoterList) return;
    const handleKey = (e) => { if (e.key === 'Escape') setShowVoterList(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showVoterList]);

  // ── Voter list ────────────────────────────────────────────────────────────
  const fetchVoters = useCallback(async () => {
    setVoterLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('voters')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      const list = data || [];
      setVoters(list);
      setFilteredVoters(list);

      const voted    = list.filter((v) => v.has_voted === true).length;
      const notVoted = list.filter((v) => v.has_voted === false).length;
      const turnout  = list.length > 0 ? ((voted / list.length) * 100).toFixed(1) : 0;
      setVoterStats({ total: list.length, voted, notVoted, turnout });
    } catch (err) {
      console.error('Error fetching voters:', err);
      toast.error('Failed to load voters list');
    } finally {
      setVoterLoading(false);
    }
  }, []);

  const handleOpenVoterList = useCallback(() => {
    setShowVoterList(true);
    fetchVoters();
  }, [fetchVoters]);

  // Filter voters by search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVoters(voters);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredVoters(
        voters.filter(
          (v) =>
            v.name?.toLowerCase().includes(q) ||
            v.email?.toLowerCase().includes(q) ||
            v.school_id?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, voters]);

  // ── Stats (memoised) ──────────────────────────────────────────────────────
  const stats = useMemo(() => [
    {
      value: loading ? '…' : `${totalStats.totalVoters.toLocaleString()}+`,
      label: 'Registered Voters',
      icon: FaUsers,
    },
    {
      value: loading ? '…' : `${totalStats.participationRate.toFixed(1)}%`,
      label: 'Live Participation',
      icon: FaChartBar,
    },
    { value: '24/7', label: 'System Uptime', icon: FaClock },
  ], [loading, totalStats]);

  const summaryStats = useMemo(() => [
    { label: 'Registered Voters',  value: loading ? '…' : `${totalStats.totalVoters.toLocaleString()}+`,         icon: FaUsers },
    { label: 'Votes Cast',          value: loading ? '…' : totalStats.totalVotes.toLocaleString(),                icon: FaVoteYea },
    { label: 'Participation Rate',  value: loading ? '…' : `${totalStats.participationRate.toFixed(1)}%`,         icon: FaChartBar },
  ], [loading, totalStats]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchElectionData();
    toast.info('Refreshing election data…', { duration: 2000 });
  }, [fetchElectionData]);

  const handleRetry = useCallback(() => {
    fetchElectionData();
    toast.info('Retrying…', { duration: 2000 });
  }, [fetchElectionData]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen relative overflow-x-hidden transition-colors duration-300 ${
        theme === 'light' ? 'bg-white' : 'bg-gray-900'
      }`}
    >
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 4000, className: 'text-sm font-medium' }}
        theme={theme === 'light' ? 'light' : 'dark'}
      />

      {/* ── Voter List Modal ──────────────────────────────────────────────── */}
      {showVoterList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voter-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowVoterList(false); }}
        >
          <div
            ref={modalRef}
            className={`rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl ${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex justify-between items-center p-6 border-b ${
                theme === 'light' ? 'border-gray-200' : 'border-gray-700'
              }`}
            >
              <div>
                <h2
                  id="voter-modal-title"
                  className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
                >
                  Registered Voters
                </h2>
                <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Total: {voterStats.total} voters
                </p>
              </div>
              <button
                onClick={() => setShowVoterList(false)}
                aria-label="Close voter list"
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'
                }`}
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            {/* Search Bar */}
            <div
              className={`p-6 border-b ${
                theme === 'light' ? 'border-gray-200' : 'border-gray-700'
              }`}
            >
              <label htmlFor="voter-search" className="sr-only">
                Search voters
              </label>
              <div className="relative">
                <FaSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-green-950 text-sm"
                  aria-hidden="true"
                />
                <input
                  id="voter-search"
                  type="text"
                  placeholder="Search by name, email or school ID…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}

                  
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300'
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                />
              </div>
            </div>

            

            {/* Voters Table */}
            <div className="overflow-y-auto max-h-[60vh]">
              {voterLoading ? (
                <div className="flex justify-center py-12">
                  <FaSync className="animate-spin text-3xl text-green-950" aria-label="Loading" />
                </div>
              ) : filteredVoters.length === 0 ? (
                <p className="text-center py-12 text-gray-500">No voters found</p>
              ) : (
                <table className="w-full">
                  <thead
                    className={`sticky top-0 ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}`}
                  >
                    <tr>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        School ID
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      theme === 'light' ? 'divide-gray-200' : 'divide-gray-700'
                    }`}
                  >
                    {filteredVoters.map((voter) => (
                      <tr
                        key={voter.id}
                        className={`transition-colors ${
                          theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FaUserGraduate className="text-green-950" aria-hidden="true" />
                            <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {voter.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FaIdCard className="text-green-950 text-xs" aria-hidden="true" />
                            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                              {voter.school_id}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className={`p-4 border-t text-center text-xs ${
                theme === 'light'
                  ? 'border-gray-200 text-gray-500'
                  : 'border-gray-700 text-gray-400'
              }`}
            >
              Showing {filteredVoters.length} of {voterStats.total} registered voters
            </div>
          </div>
        </div>
      )}

      {/* Page top accent bar */}
      <div
        className={`fixed top-0 left-0 right-0 h-0.5 z-50 bg-gradient-to-r from-green-950 via-green-400 to-green-950`}
        aria-hidden="true"
      />

      {/* Ambient background blobs */}
      <div
        className={`fixed -top-32 -right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 hidden sm:block ${
          theme === 'light' ? 'bg-teal-400/10' : 'bg-teal-500/5'
        }`}
        aria-hidden="true"
      />
      <div
        className={`fixed bottom-10 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none z-0 hidden sm:block ${
          theme === 'light' ? 'bg-teal-400/8' : 'bg-teal-500/5'
        }`}
        aria-hidden="true"
      />

      {/* Mobile theme toggle (desktop toggle lives in NavigationBar) */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 md:hidden"
        style={{
          backgroundColor: theme === 'light' ? '#006400' : '#fbbf24',
          color: theme === 'light' ? '#ffffff' : '#1f2937',
        }}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <FaMoon size={20} aria-hidden="true" /> : <FaSun size={20} aria-hidden="true" />}
      </button>

      <div className="relative z-10">
        <NavigationBar
          isVotingActive={isVotingActive}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          theme={theme}
          toggleTheme={toggleTheme}
        />

{/* ── HOW TO VOTE VIDEO SECTION ── */}
<div data-aos="fade-up" className="md:hidden pt-14">
  <div
    className={`rounded-xl overflow-hidden border transition-all duration-300 ${
      theme === 'light'
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        : 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600'
    }`}
  >
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            theme === 'light' ? 'bg-blue-600/10 text-blue-600' : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <div>
          <h3 className={`font-semibold text-lg ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            How to Vote
          </h3>
          <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Watch this quick guide to understand the voting process
          </p>
        </div>
      </div>
      
      {/* YouTube Video Container */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
          title="How to Vote Guide"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/50 text-blue-300'
          }`}
        >
          <FaClock size={10} />
          2 minutes
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900/50 text-green-300'
          }`}
        >
          <FaVoteYea size={10} />
          Step-by-step guide
        </span>
      </div>
    </div>
  </div>
</div>

        <div data-aos="fade-down">
          <CountdownTimer
            timeLeft={timeLeft}
            votingPeriod={votingPeriod}
            isVotingActive={isVotingActive}
            votingStartsIn={votingStartsIn}
            totalStats={totalStats}
            loading={loading}
            theme={theme}
          />
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6 relative z-10">

          {/* ── STATS SECTION ── */}
          <section className="mb-8 sm:mb-10" aria-labelledby="stats-heading">
            <div data-aos="fade-up" className="mb-4 sm:mb-6 lg:mb-8">
              <p className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1 ${
                theme === 'light' ? 'text-green-950' : 'text-green-400'
              }`}>
                Live Overview
              </p>
              <h2
                id="stats-heading"
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                  theme === 'light' ? 'text-black' : 'text-white'
                }`}
              >
                Election Dashboard
              </h2>
              <p className={`mt-1 sm:mt-2 text-xs sm:text-sm max-w-md ${
                theme === 'light' ? 'text-green-700/90' : 'text-gray-400'
              }`}>
                Real-time voting statistics and participation metrics
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                    className={`relative rounded-xl sm:rounded-2xl border p-4 sm:p-5 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group ${
                      theme === 'light'
                        ? 'bg-green-500/10 border-teal-600/10'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 rounded-bl-full opacity-5 ${
                        theme === 'light' ? 'bg-teal-600' : 'bg-teal-400'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                          theme === 'light'
                            ? 'bg-teal-600/10 text-black'
                            : 'bg-teal-500/20 text-green-400'
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" />
                      </div>
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-400 animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-bold tracking-tight leading-none ${
                        theme === 'light' ? 'text-green-950' : 'text-white'
                      }`}>
                        {stat.value}
                      </p>
                      <p className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-widest mt-1 ${
                        theme === 'light' ? 'text-green-600/70' : 'text-gray-400'
                      }`}>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── VIEW VOTERS BUTTON ── */}
          <div data-aos="fade-up" className="mb-8">
            <button
              onClick={handleOpenVoterList}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl w-full justify-between transition-all duration-300 group ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-green-50 to-green-100 border border-teal-200 hover:shadow-md'
                  : 'bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 hover:shadow-lg'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === 'light' ? 'bg-teal-600/10 text-green-950' : 'bg-teal-500/20 text-green-400'
                  }`}
                >
                  <FaUsers size={16} aria-hidden="true" />
                </div>
                <div className="text-left">
                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    View Registered Voters
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    See complete list of all registered voters
                  </p>
                </div>
              </div>
              <FaEye
                className="text-green-950 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* ── REFRESH / LAST UPDATED ── */}
          <div
            data-aos="fade-up"
            className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6"
          >
            {lastUpdated && (
              <p
                className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${
                  theme === 'light' ? 'text-slate-400' : 'text-gray-500'
                }`}
                aria-live="polite"
              >
                <FaClock size={10} className="text-green-950" aria-hidden="true" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-br from-green-600 to-green-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-teal-600/25 hover:-translate-y-0.5 hover:shadow-teal-600/35 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              <FaSync
                size={11}
                className={loading ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              Refresh Data
            </button>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div
              data-aos="fade-up"
              role="alert"
              className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border border-l-4 border-l-red-500 rounded-xl sm:rounded-2xl mb-6 shadow-sm ${
                theme === 'light'
                  ? 'bg-red-50 border-red-100'
                  : 'bg-red-950/20 border-red-900'
              }`}
            >
              <FaExclamationCircle
                size={14}
                className="text-red-500 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className={`font-semibold text-xs sm:text-sm ${
                  theme === 'light' ? 'text-red-800' : 'text-red-300'
                }`}>
                  {error}
                </p>
                <button
                  onClick={handleRetry}
                  className="text-[11px] sm:text-xs text-red-500 font-medium mt-1 hover:text-red-700 transition-colors"
                >
                  Try again →
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div
            className={`h-px bg-gradient-to-r from-transparent via-green-600/9 to-transparent my-6 sm:my-10 ${
              theme === 'dark' ? 'opacity-30' : ''
            }`}
            aria-hidden="true"
          />

          {/* ── ELECTIONS SECTION ── */}
          <section
            id="elections"
            aria-labelledby="elections-heading"
            className={`mb-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border ${
              theme === 'light'
                ? 'bg-green-950 border-teal-600/20'
                : 'bg-green-900/20 border-teal-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-9">
              <div data-aos="fade-right">
                <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${
                  theme === 'light' ? 'text-[#f59e0b]' : 'text-green-400'
                }`}>
                  Participate Now
                </p>
                <h2
                  id="elections-heading"
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-[#f59e0b]"
                >
                  Current Elections
                </h2>
                <p className={`mt-1 sm:mt-2 text-xs sm:text-sm ${
                  theme === 'light' ? 'text-[#f59e0b]' : 'text-gray-400'
                }`}>
                  Cast your vote for the leaders who will shape our future
                </p>
              </div>

              <div data-aos="fade-left">
                <div
                  className={`flex items-center gap-2 border rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm text-xs sm:text-sm font-semibold whitespace-nowrap ${
                    theme === 'light'
                      ? 'bg-white border-teal-600/12 text-green-950'
                      : 'bg-gray-800 border-gray-700 text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      isVotingActive ? 'bg-teal-400 animate-pulse' : 'bg-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  {isVotingActive ? 'Voting Active' : 'Voting Closed'}
                </div>
              </div>
            </div>

            {votingProgress.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {votingProgress.map((election, index) => (
                  <div
                    key={election.id ?? index}
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                    className={`rounded-2xl sm:rounded-3xl border overflow-hidden shadow-sm hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group ${
                      theme === 'light'
                        ? 'bg-white border-teal-600/10 hover:border-teal-600/25'
                        : 'bg-gray-800 border-gray-700 hover:border-teal-600/50'
                    }`}
                  >
                    <div
                      className="h-0.5 sm:h-1 bg-gradient-to-r from-green-600 via-teal-400 to-green-800 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                      aria-hidden="true"
                    />
                    <ElectionCard
                      election={election}
                      index={index}
                      isVotingActive={isVotingActive}
                      votingPeriod={votingPeriod}
                      loading={loading}
                      theme={theme}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                data-aos="fade-up"
                className={`text-center py-12 sm:py-16 px-4 sm:px-8 rounded-2xl sm:rounded-3xl border border-dashed ${
                  theme === 'light'
                    ? 'bg-white border-teal-600/20'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                    theme === 'light' ? 'bg-teal-600/6' : 'bg-teal-500/10'
                  }`}
                >
                  <FaVoteYea
                    size={20}
                    className={`${theme === 'light' ? 'text-green-950 opacity-40' : 'text-green-400 opacity-60'}`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className={`text-base sm:text-lg font-bold mb-1 ${
                  theme === 'light' ? 'text-green-950' : 'text-white'
                }`}>
                  No Active Elections
                </h3>
                <p className={`text-xs sm:text-sm ${
                  theme === 'light' ? 'text-green-800/70' : 'text-gray-400'
                }`}>
                  Check back later for upcoming elections
                </p>
              </div>
            )}
          </section>

          <div data-aos="fade-up">
            <VotingStatusBanner isVotingActive={isVotingActive} theme={theme} />
          </div>

          {/* Divider */}
          <div
            className={`h-px bg-gradient-to-r from-transparent via-teal-600/15 to-transparent my-6 sm:my-10 ${
              theme === 'dark' ? 'opacity-30' : ''
            }`}
            aria-hidden="true"
          />

          {/* ── SUMMARY STATS ── */}
          <section className="mb-8" aria-labelledby="summary-heading">
            <div data-aos="fade-up" className="mb-4 sm:mb-6 lg:mb-8">
              <p className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1 ${
                theme === 'light' ? 'text-green-950' : 'text-green-400'
              }`}>
                At a Glance
              </p>
              <h2
                id="summary-heading"
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                  theme === 'light' ? 'text-green-950' : 'text-white'
                }`}
              >
                Election Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {summaryStats.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    data-aos="fade-up"
                    data-aos-delay={i * 80}
                    className={`relative rounded-xl sm:rounded-2xl border p-4 sm:p-5 text-center overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group ${
                      theme === 'light'
                        ? 'bg-white border-teal-600/10'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 to-green-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left"
                      aria-hidden="true"
                    />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                      <Icon size={24} className={theme === 'light' ? 'text-green-950' : 'text-green-400'} aria-hidden="true" />
                    </div>
                    <p className={`text-lg sm:text-2xl font-bold tracking-tight ${
                      theme === 'light'
                        ? 'bg-gradient-to-br from-green-600 to-green-900 bg-clip-text text-transparent'
                        : 'text-white'
                    }`}>
                      {item.value}
                    </p>
                    <p className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-widest mt-1 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

        </main>

        <Footer theme={theme} />
      </div>
    </div>
  );
}
