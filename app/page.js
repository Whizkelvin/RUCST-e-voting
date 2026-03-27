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
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  const stats = [
    { value: loading ? "..." : `${totalStats.totalVoters.toLocaleString()}+`, label: "Registered Voters", icon: FaUsers, color: "teal" },
    { value: loading ? "..." : `${totalStats.participationRate.toFixed(1)}%`, label: "Live Participation", icon: FaChartBar, color: "amber" },
    { value: "24/7", label: "System Uptime", icon: FaClock, color: "teal" },
    { value: "100%", label: "Secure Votes", icon: FaLock, color: "amber" }
  ];

  const handleRefresh = () => {
    fetchElectionData();
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

        :root {
          --teal-deep: #042f2e;
          --teal-dark: #064e3b;
          --teal-mid: #0f766e;
          --teal-light: #14b8a6;
          --teal-pale: #ccfbf1;
          --amber: #f59e0b;
          --amber-light: #fcd34d;
          --amber-pale: #fffbeb;
          --bg: #f0faf9;
          --surface: #ffffff;
          --border: rgba(15, 118, 110, 0.12);
          --text-primary: #042f2e;
          --text-secondary: #4b7f79;
          --text-muted: #94a3b8;
        }

        * { box-sizing: border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg);
        }

        .space-grotesk { font-family: 'Space Grotesk', sans-serif; }

        /* Noise texture overlay */
        .noise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Stat card */
        .stat-card {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 2px 16px rgba(4, 47, 46, 0.06);
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(4, 47, 46, 0.12);
        }
        .stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(15,118,110,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .stat-card .corner-accent {
          position: absolute;
          top: 0; right: 0;
          width: 80px; height: 80px;
          border-radius: 0 20px 0 80px;
          opacity: 0.07;
        }
        .stat-card.teal .corner-accent { background: var(--teal-mid); }
        .stat-card.amber .corner-accent { background: var(--amber); }

        .stat-icon-wrap {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
        }
        .stat-card.teal .stat-icon-wrap { background: rgba(15,118,110,0.1); color: var(--teal-mid); }
        .stat-card.amber .stat-icon-wrap { background: rgba(245,158,11,0.1); color: var(--amber); }

        .stat-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--teal-deep);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .stat-label {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-top: 0.35rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .pulse-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--teal-light);
          animation: pulseRing 2s ease infinite;
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(20,184,166,0); }
        }

        /* Section header */
        .section-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--teal-mid);
          margin-bottom: 0.5rem;
        }
        .section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 700;
          color: var(--teal-deep);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        /* Election card */
        .election-card {
          background: var(--surface);
          border-radius: 24px;
          border: 1px solid var(--border);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 2px 16px rgba(4,47,46,0.06);
          position: relative;
        }
        .election-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(4,47,46,0.14);
          border-color: rgba(15,118,110,0.25);
        }
        .election-card-top-bar {
          height: 4px;
          background: linear-gradient(90deg, var(--teal-mid), var(--amber), var(--teal-dark));
          transform-origin: left;
          transform: scaleX(0);
          transition: transform 0.5s ease;
        }
        .election-card:hover .election-card-top-bar {
          transform: scaleX(1);
        }

        /* Summary card */
        .summary-card {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          padding: 1.75rem 1.5rem;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 2px 16px rgba(4,47,46,0.05);
          position: relative;
          overflow: hidden;
        }
        .summary-card::before {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--teal-mid), var(--amber));
          transform: scaleX(0);
          transition: transform 0.4s ease;
        }
        .summary-card:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(4,47,46,0.12); }
        .summary-card:hover::before { transform: scaleX(1); }

        .summary-icon {
          width: 52px; height: 52px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
          transition: transform 0.3s ease;
        }
        .summary-card:hover .summary-icon { transform: scale(1.1) rotate(-4deg); }
        .summary-icon.teal { background: linear-gradient(135deg, var(--teal-mid), var(--teal-dark)); }
        .summary-icon.amber { background: linear-gradient(135deg, var(--amber), #d97706); }

        .summary-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--teal-mid), var(--teal-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }
        .summary-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-top: 0.3rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Divider */
        .fancy-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
          margin: 3rem 0;
        }

        /* Status badge */
        .status-badge {
          display: flex; align-items: center; gap: 8px;
          padding: 0.45rem 1rem;
          border-radius: 100px;
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(4,47,46,0.06);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--teal-deep);
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .status-dot-active {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--amber);
          animation: amberPulse 1.5s ease infinite;
        }
        .status-dot-inactive {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #94a3b8;
        }
        @keyframes amberPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }

        /* Refresh button */
        .refresh-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 0.6rem 1.4rem;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--teal-mid), var(--teal-dark));
          color: white;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          box-shadow: 0 4px 16px rgba(15,118,110,0.35);
        }
        .refresh-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,118,110,0.4); }
        .refresh-btn:active { transform: translateY(0); }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Error banner */
        .error-banner {
          display: flex; align-items: center; gap: 12px;
          padding: 1rem 1.25rem;
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-left: 4px solid #ef4444;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(239,68,68,0.08);
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--surface);
          border-radius: 24px;
          border: 1px dashed rgba(15,118,110,0.2);
        }
        .empty-icon {
          width: 72px; height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(15,118,110,0.08), rgba(15,118,110,0.04));
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
        }

        /* Decorative background shapes */
        .bg-blob-1 {
          position: fixed;
          top: -120px; right: -80px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .bg-blob-2 {
          position: fixed;
          bottom: 10%; left: -100px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Last updated */
        .last-updated {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 400;
          font-family: 'Inter', sans-serif;
        }

        /* Thin top accent bar on page */
        .page-top-bar {
          height: 3px;
          background: linear-gradient(90deg, var(--teal-dark), var(--teal-light), var(--amber), var(--teal-mid));
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
        }
      `}</style>

      <div className="noise-bg" style={{ minHeight: '100vh', position: 'relative' }}>
        <div className="bg-blob-1" />
        <div className="bg-blob-2" />
        <div className="page-top-bar" />

        <ToastContainer
          position="top-right"
          autoClose={5000}
          toastClassName="rounded-xl shadow-lg"
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
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

          <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem', position: 'relative', zIndex: 1 }}>

            {/* ── STATS SECTION ── */}
            <section style={{ marginBottom: '2.5rem' }}>
              <div data-aos="fade-up" style={{ marginBottom: '2rem' }}>
                <p className="section-label">Live Overview</p>
                <h2 className="section-title">Election Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem', maxWidth: '480px', fontFamily: 'Inter, sans-serif' }}>
                  Real-time voting statistics and participation metrics
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      data-aos="fade-up"
                      data-aos-delay={index * 80}
                      className={`stat-card ${stat.color}`}
                    >
                      <div className="corner-accent" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="stat-icon-wrap">
                          <Icon size={18} />
                        </div>
                        <div className="pulse-dot" />
                      </div>
                      <StatsCard stat={stat} loading={loading} />
                      <div style={{ marginTop: '0.25rem' }}>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── REFRESH / LAST UPDATED ── */}
            <div
              data-aos="fade-up"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              {lastUpdated && (
                <p className="last-updated">
                  <FaClock size={12} style={{ color: 'var(--teal-mid)' }} />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}

              <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
                <FaSync size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh Data
              </button>
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div data-aos="fade-up" className="error-banner" style={{ marginBottom: '1.5rem' }}>
                <FaExclamationCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#991b1b', fontWeight: 600, margin: 0, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>{error}</p>
                  <button
                    onClick={fetchElectionData}
                    style={{ fontSize: '0.8rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
                  >
                    Try again →
                  </button>
                </div>
              </div>
            )}

            <div className="fancy-divider" />

            {/* ── ELECTIONS SECTION ── */}
            <section id="elections" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div data-aos="fade-right">
                  <p className="section-label">Participate Now</p>
                  <h2 className="section-title">Current Elections</h2>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.92rem', fontFamily: 'Inter, sans-serif' }}>
                    Cast your vote for the leaders who will shape our future
                  </p>
                </div>

                <div data-aos="fade-left">
                  <div className="status-badge">
                    <div className={isVotingActive ? 'status-dot-active' : 'status-dot-inactive'} />
                    {isVotingActive ? 'Voting Active' : 'Voting Closed'}
                  </div>
                </div>
              </div>

              {votingProgress.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {votingProgress.map((election, index) => (
                    <div
                      key={index}
                      data-aos="fade-up"
                      data-aos-delay={index * 80}
                      className="election-card"
                    >
                      <div className="election-card-top-bar" />
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
                <div data-aos="fade-up" className="empty-state">
                  <div className="empty-icon">
                    <FaVoteYea size={28} style={{ color: 'var(--teal-mid)', opacity: 0.5 }} />
                  </div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: 'var(--teal-deep)', margin: '0 0 0.4rem' }}>
                    No Active Elections
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    Check back later for upcoming elections
                  </p>
                </div>
              )}
            </section>

            <div data-aos="fade-up">
              <VotingStatusBanner isVotingActive={isVotingActive} />
            </div>

            <div className="fancy-divider" />

            {/* ── SUMMARY STATS ── */}
            <section style={{ marginBottom: '2rem' }}>
              <div data-aos="fade-up" style={{ marginBottom: '2rem' }}>
                <p className="section-label">At a Glance</p>
                <h2 className="section-title">Election Summary</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                {[
                  { label: "Registered Voters", value: loading ? '...' : `${totalStats.totalVoters.toLocaleString()}+`, icon: FaUsers, color: 'teal' },
                  { label: "Votes Cast", value: loading ? '...' : totalStats.totalVotes.toLocaleString(), icon: FaVoteYea, color: 'amber' },
                  { label: "Participation Rate", value: loading ? '...' : `${totalStats.participationRate.toFixed(1)}%`, icon: FaChartBar, color: 'teal' },
                  { label: "Security Level", value: "100%", icon: FaLock, color: 'amber' }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      data-aos="fade-up"
                      data-aos-delay={i * 80}
                      className="summary-card"
                    >
                      <div className={`summary-icon ${item.color}`}>
                        <Icon size={20} style={{ color: 'white' }} />
                      </div>
                      <div className="summary-value">{item.value}</div>
                      <div className="summary-label">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </section>

          </main>

          <Footer />
        </div>

       
      </div>
    </>
  );
}