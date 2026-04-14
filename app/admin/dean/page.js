// app/admin/dean/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  FaSpinner, 
  FaUserGraduate, 
  FaChartBar, 
  FaKey,
  FaVoteYea,
  FaUsers,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';
import Link from 'next/link';

export default function DeanDashboard() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalVotes: 0,
    activeElections: 0,
    participationRate: 0
  });
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    } else if (!authLoading && isAuthenticated) {
      // Check if user is dean
      if (admin?.role !== 'dean') {
        router.push('/admin');
      } else {
        fetchDashboardData();
      }
    }
  }, [authLoading, isAuthenticated, admin, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get total candidates
      const { count: candidateCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });
      
      // Get total votes
      const { count: voteCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });
      
      // Get active elections
      const { count: activeElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Get total voters
      const { count: voterCount } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });
      
      // Calculate participation rate
      const participationRate = voterCount > 0 
        ? ((voteCount / voterCount) * 100).toFixed(1) 
        : 0;
      
      setStats({
        totalCandidates: candidateCount || 0,
        totalVotes: voteCount || 0,
        activeElections: activeElections || 0,
        participationRate: parseFloat(participationRate)
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { name: "Manage Candidates", href: "/admin/manage-candidates", icon: FaUserGraduate, color: "blue", description: "View and manage election candidates" },
    { name: "View Results", href: "/admin/election-results", icon: FaChartBar, color: "green", description: "Monitor election results" },
    { name: "Nomination Codes", href: "/admin/generate-nomination-codes", icon: FaKey, color: "purple", description: "Generate nomination codes for candidates" },
  ];

  const statCards = [
    { label: "Total Candidates", value: stats.totalCandidates, icon: FaUserGraduate, color: "blue" },
    { label: "Total Votes Cast", value: stats.totalVotes, icon: FaVoteYea, color: "green" },
    { label: "Active Elections", value: stats.activeElections, icon: FaClock, color: "orange" },
    { label: "Participation Rate", value: `${stats.participationRate}%`, icon: FaUsers, color: "purple" },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Dean Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, Dean {admin?.name?.split(" ")[1] || admin?.name || ""}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Dean's Portal - Monitor Candidates, Track Results, Manage Nominations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
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

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <FaCheckCircle className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Dean's Portal Access</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              As a Dean, you can:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>View all registered candidates for elections</li>
              <li>Monitor election results in real-time</li>
              <li>Generate nomination codes for potential candidates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}