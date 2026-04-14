// app/admin/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  FaSpinner, 
  FaUsers, 
  FaUserGraduate, 
  FaUniversity, 
  FaClock, 
  FaChartBar,
  FaCheckCircle,
  FaHourglassHalf,
  FaVoteYea,
  FaCalendarAlt,
  FaShieldAlt,
  FaEye,
  FaUserPlus,
  FaVoteYea as FaVote,
  FaChartLine
} from 'react-icons/fa';
import Link from 'next/link';

export default function AdminDashboard() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalCandidates: 0,
    totalElections: 0,
    activeElections: 0,
    totalVotes: 0,
    participationRate: 0,
    totalAdmins: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [currentElection, setCurrentElection] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    } else if (!authLoading && isAuthenticated) {
      fetchDashboardData();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current active election
      const { data: election } = await supabase
        .from('elections')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      setCurrentElection(election);
      
      // Get total voters
      const { count: voterCount } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });
      
      // Get total candidates
      const { count: candidateCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });
      
      // Get total elections
      const { count: electionCount } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true });
      
      // Get active elections
      const { count: activeElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Get total votes
      const { count: voteCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });
      
      // Get total admins
      const { count: adminCount } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });
      
      // Calculate participation rate
      const participationRate = voterCount > 0 
        ? ((voteCount / voterCount) * 100).toFixed(1) 
        : 0;
      
      // Get recent votes (last 5)
      const { data: recentVotes } = await supabase
        .from('votes')
        .select(`
          *,
          voters (name, email),
          candidates (name, position_id, positions (title))
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentActivity(recentVotes || []);
      
      setStats({
        totalVoters: voterCount || 0,
        totalCandidates: candidateCount || 0,
        totalElections: electionCount || 0,
        activeElections: activeElections || 0,
        totalVotes: voteCount || 0,
        participationRate: parseFloat(participationRate),
        totalAdmins: adminCount || 0
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { name: "Manage Voters", href: "/admin/manage-voters", icon: FaUsers, color: "emerald", description: "Add, edit, or remove voters" },
    { name: "Manage Candidates", href: "/admin/manage-candidates", icon: FaUserGraduate, color: "blue", description: "Manage election aspirants" },
    { name: "Manage Elections", href: "/admin/manage-elections", icon: FaUniversity, color: "purple", description: "Create and configure elections" },
    { name: "Set Voting Period", href: "/admin/voting-period", icon: FaClock, color: "orange", description: "Configure voting dates and times" },
    { name: "View Results", href: "/admin/election-results", icon: FaChartBar, color: "teal", description: "Monitor election results" },
    { name: "Manage Admins", href: "/admin/manage-roles", icon: FaShieldAlt, color: "red", description: "Add or remove admin users" },
  ];

  const statCards = [
    { label: "Total Voters", value: stats.totalVoters, icon: FaUsers, color: "emerald" },
    { label: "Total Candidates", value: stats.totalCandidates, icon: FaUserGraduate, color: "blue" },
    { label: "Total Elections", value: stats.totalElections, icon: FaUniversity, color: "purple" },
    { label: "Active Elections", value: stats.activeElections, icon: FaClock, color: "orange" },
    { label: "Votes Cast", value: stats.totalVotes, icon: FaVoteYea, color: "teal" },
    { label: "Participation", value: `${stats.participationRate}%`, icon: FaChartLine, color: "cyan" },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-orange-500 dark:text-orange-400">
          Welcome back, {admin?.name?.split(" ")[0] || "Admin"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Admin Dashboard - System Overview & Management
        </p>
      </div>

      {/* Current Election Status */}
      {currentElection && (
        <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FaShieldAlt className="text-xl" />
                <span className="text-sm font-semibold uppercase tracking-wider">Current Active Election</span>
              </div>
              <h2 className="text-2xl font-bold">{currentElection.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
                <span className="flex items-center gap-1">
                  <FaCalendarAlt /> 
                  {new Date(currentElection.start_time).toLocaleDateString()}
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <FaCalendarAlt />
                  {new Date(currentElection.end_time).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Link 
              href="/admin/election-results"
              className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 hover:bg-white/30 transition"
            >
              <FaEye className="text-xl" />
              <span className="font-semibold">View Results</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mt-1`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={`text-3xl text-${stat.color}-500 opacity-50`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/20`}>
                    <Icon className={`text-${action.color}-600 dark:text-${action.color}-400 text-lg`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-gray-900 dark:text-white group-hover:text-${action.color}-600 transition`}>
                      {action.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Voting Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Voter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No recent voting activity
                  </td>
                </tr>
              ) : (
                recentActivity.map((vote) => (
                  <tr key={vote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {vote.voters?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {vote.voters?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {vote.candidates?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {vote.candidates?.positions?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(vote.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}