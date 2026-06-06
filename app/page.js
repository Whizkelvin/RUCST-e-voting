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
import PublicElectionResults from '@/components/PublicElectionResults';
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
  FaCheckCircle,
  FaHistory,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showVoterList, setShowVoterList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchBy, setSearchBy] = useState('name');
  const [isSearching, setIsSearching] = useState(false);
  const [currentElectionId, setCurrentElectionId] = useState(null);

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

  // Get current election ID from votingProgress
  useEffect(() => {
    if (votingProgress && votingProgress.length > 0 && votingProgress[0].id) {
      setCurrentElectionId(votingProgress[0].id);
    }
  }, [votingProgress]);

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

  // ── Search for voter in CURRENT ELECTION only ──────────────────────────────
  const handleSearchVoter = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    if (!currentElectionId) {
      toast.error('No active election found');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    
    try {
      // First, find the voter in the voters table
      let voterQuery = supabase.from('voters').select('id, name, school_id');
      
      if (searchBy === 'name') {
        voterQuery = voterQuery.ilike('name', `%${searchTerm.trim()}%`);
      } else if (searchBy === 'school_id') {
        voterQuery = voterQuery.ilike('school_id', `%${searchTerm.trim()}%`);
      } else if (searchBy === 'email') {
        voterQuery = voterQuery.ilike('email', `%${searchTerm.trim()}%`);
      }
      
      const { data: matchedVoters, error: searchError } = await voterQuery.limit(10);
      
      if (searchError) throw searchError;
      
      if (!matchedVoters || matchedVoters.length === 0) {
        setSearchResult([]);
        toast.info('No voters found matching your search');
        setIsSearching(false);
        return;
      }
      
      // Get the voter IDs
      const voterIds = matchedVoters.map(v => v.id);
      
      // Check which of these voters are eligible for the CURRENT election
      const { data: eligibleVoters, error: eligibleError } = await supabase
        .from('election_voters')
        .select('voter_id, has_voted')
        .eq('election_id', currentElectionId)
        .eq('status', 'active')
        .in('voter_id', voterIds);
      
      if (eligibleError) throw eligibleError;
      
      const eligibleVoterIds = new Set(eligibleVoters?.map(ev => ev.voter_id) || []);
      const votedStatus = new Map(eligibleVoters?.map(ev => [ev.voter_id, ev.has_voted]) || []);
      
      // Filter and combine results
      const results = matchedVoters
        .filter(voter => eligibleVoterIds.has(voter.id))
        .map(voter => ({
          id: voter.id,
          name: voter.name,
          school_id: voter.school_id,
          has_voted: votedStatus.get(voter.id) || false
        }));
      
      if (results.length > 0) {
        setSearchResult(results);
        toast.success(`Found ${results.length} eligible voter(s)`);
      } else {
        setSearchResult([]);
        toast.info('You are not registered for this election. Please contact the electoral commission.');
      }
    } catch (err) {
      console.error('Error searching voters:', err);
      toast.error('Failed to search voters');
      setSearchResult([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, searchBy, currentElectionId]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResult(null);
  }, []);

  const handleOpenVoterList = useCallback(() => {
    setShowVoterList(true);
    setSearchResult(null);
    setSearchTerm('');
  }, []);

  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-gray-700' : 'text-gray-300';
  };

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

      {/* ── Voter Search Modal (Search Only, No Full List) ─────────────────── */}
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
            className={`rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl ${
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
                  Verify Voter Eligibility
                </h2>
                <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Search by name or school ID to check if you're registered for this election
                </p>
              </div>
              <button
                onClick={() => setShowVoterList(false)}
                aria-label="Close voter list"
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-700 text-gray-400'
                }`}
              >
                <FaTimes aria-hidden="true" className={getIconColor()} />
              </button>
            </div>

            {/* Search Controls */}
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
              {/* Search Type Selection */}
              <div className="flex gap-2 mb-4">
                {['name', 'school_id'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchBy(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      searchBy === type
                        ? 'bg-emerald-600 text-white'
                        : theme === 'light'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type === 'name' ? 'Name' : 'School ID'}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <FaSearch
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${getIconColor()}`}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder={`Search by ${searchBy === 'name' ? 'name' : 'school ID'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchVoter()}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  />
                </div>
                <button
                  onClick={handleSearchVoter}
                  disabled={isSearching}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? <FaSync className="animate-spin" /> : 'Search'}
                </button>
                {searchResult && (
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Search Results - Only shows name and school ID */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              {isSearching ? (
                <div className="flex justify-center py-12">
                  <FaSync className={`animate-spin text-3xl ${getIconColor()}`} aria-label="Loading" />
                </div>
              ) : searchResult === null ? (
                <div className="text-center py-12">
                  <FaUserGraduate className={`text-4xl mx-auto mb-3 ${getIconColor()} opacity-50`} />
                  <p className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Enter your name or school ID to check your voter registration status
                  </p>
                </div>
              ) : searchResult.length === 0 ? (
                <div className="text-center py-12">
                  <FaTimes className={`text-4xl mx-auto mb-3 ${getIconColor()} opacity-50`} />
                  <p className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    No registered voter found matching "{searchTerm}"
                  </p>
                  <p className={`text-sm mt-2 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Please contact the electoral commission if you believe this is an error.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className={`text-sm mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Found {searchResult.length} voter(s)
                  </p>
                  {searchResult.map((voter) => (
                    <div
                      key={voter.id}
                      className={`p-4 rounded-lg border ${
                        theme === 'light'
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FaUserGraduate className={getIconColor()} />
                            <span className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {voter.name}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                              <span className="font-medium">School ID:</span> {voter.school_id}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4">
                          {voter.has_voted ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <FaCheckCircle />
                              <span className="text-sm font-medium">Voted</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <FaCheckCircle />
                              <span className="text-sm font-medium">Eligible to Vote</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900'}`}>
              <p className={`text-xs text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Only registered voters for the current election will appear. Contact your election administrator if you need assistance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page top accent bar */}
      <div
        className={`fixed top-0 left-0 right-0 h-0.5 z-50 bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900`}
        aria-hidden="true"
      />

      {/* Ambient background blobs */}
      <div
        className={`fixed -top-32 -right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 hidden sm:block ${
          theme === 'light' ? 'bg-gray-400/10' : 'bg-gray-500/5'
        }`}
        aria-hidden="true"
      />
      <div
        className={`fixed bottom-10 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none z-0 hidden sm:block ${
          theme === 'light' ? 'bg-gray-400/8' : 'bg-gray-500/5'
        }`}
        aria-hidden="true"
      />

      {/* Mobile theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 md:hidden"
        style={{
          backgroundColor: theme === 'light' ? '#1f2937' : '#fbbf24',
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
                ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                : 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600'
            }`}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'light' ? 'bg-gray-600/10 text-gray-600' : 'bg-gray-500/20 text-gray-400'
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
                    theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <FaClock size={10} />
                  2 minutes
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-300'
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
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
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
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
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
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 rounded-bl-full opacity-5 ${
                        theme === 'light' ? 'bg-gray-600' : 'bg-gray-400'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                          theme === 'light'
                            ? 'bg-gray-200 text-black'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" className={getIconColor()} />
                      </div>
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-500 animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-bold tracking-tight leading-none ${
                        theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                        {stat.value}
                      </p>
                      <p className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-widest mt-1 ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── VIEW VOTERS BUTTON (Search Only) ── */}
          <div data-aos="fade-up" className="mb-8">
            <button
              onClick={handleOpenVoterList}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl w-full justify-between transition-all duration-300 group ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:shadow-md'
                  : 'bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 hover:shadow-lg'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === 'light' ? 'bg-gray-200 text-gray-800' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <FaSearch size={16} aria-hidden="true" className={getIconColor()} />
                </div>
                <div className="text-left">
                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    Verify Voter Registration
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Search by name or school ID to check your voter status for this election
                  </p>
                </div>
              </div>
              <FaEye
                className={`group-hover:translate-x-1 transition-transform ${getIconColor()}`}
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
                  theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                }`}
                aria-live="polite"
              >
                <FaClock size={10} className={getIconColor()} aria-hidden="true" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-gray-800/25 hover:-translate-y-0.5 hover:shadow-gray-800/35 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
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
            className={`h-px bg-gradient-to-r from-transparent via-gray-500/20 to-transparent my-6 sm:my-10 ${
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
                ? 'bg-gray-50 border-gray-200'
                : 'bg-gray-800/20 border-gray-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-9">
              <div data-aos="fade-right">
                <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Participate Now
                </p>
                <h2
                  id="elections-heading"
                  className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Current Elections
                </h2>
                <p className={`mt-1 sm:mt-2 text-xs sm:text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Cast your vote for the leaders who will shape our future
                </p>
              </div>

              <div data-aos="fade-left">
                <div
                  className={`flex items-center gap-2 border rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm text-xs sm:text-sm font-semibold whitespace-nowrap ${
                    theme === 'light'
                      ? 'bg-white border-gray-200 text-gray-800'
                      : 'bg-gray-800 border-gray-700 text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      isVotingActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'
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
                        ? 'bg-white border-gray-200 hover:border-gray-300'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="h-0.5 sm:h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
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
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                    theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                  }`}
                >
                  <FaVoteYea
                    size={20}
                    className={`${theme === 'light' ? 'text-gray-600 opacity-60' : 'text-gray-400 opacity-60'}`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className={`text-base sm:text-lg font-bold mb-1 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  No Active Elections
                </h3>
                <p className={`text-xs sm:text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
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
            className={`h-px bg-gradient-to-r from-transparent via-gray-500/15 to-transparent my-6 sm:my-10 ${
              theme === 'dark' ? 'opacity-30' : ''
            }`}
            aria-hidden="true"
          />

          {/* ── PAST ELECTION RESULTS SECTION (Public View) ── */}
          <section className="mb-8" aria-labelledby="past-results-heading">
            <div data-aos="fade-up" className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FaHistory className={`text-xl ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-xs sm:text-sm font-semibold uppercase tracking-widest ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Historical Data
                </p>
              </div>
              <h2
                id="past-results-heading"
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                Past Election Results
              </h2>
              <p className={`mt-1 sm:mt-2 text-xs sm:text-sm ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                View historical election statistics and past winners
              </p>
            </div>

            <PublicElectionResults theme={theme} />
          </section>

          {/* Divider */}
          <div
            className={`h-px bg-gradient-to-r from-transparent via-gray-500/15 to-transparent my-6 sm:my-10 ${
              theme === 'dark' ? 'opacity-30' : ''
            }`}
            aria-hidden="true"
          />

          {/* ── SUMMARY STATS ── */}
          <section className="mb-8" aria-labelledby="summary-heading">
            <div data-aos="fade-up" className="mb-4 sm:mb-6 lg:mb-8">
              <p className={`text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                At a Glance
              </p>
              <h2
                id="summary-heading"
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
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
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left"
                      aria-hidden="true"
                    />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                      <Icon size={24} className={getIconColor()} aria-hidden="true" />
                    </div>
                    <p className={`text-lg sm:text-2xl font-bold tracking-tight ${
                      theme === 'light'
                        ? 'text-gray-800'
                        : 'text-white'
                    }`}>
                      {item.value}
                    </p>
                    <p className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-widest mt-1 ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
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