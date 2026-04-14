// app/admin/ec/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/lib/supabaseClient";
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
  FaShieldAlt
} from "react-icons/fa";
import Link from "next/link";

export default function ECDashboard() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalCandidates: 0,
    activeElections: 0,
    totalVotes: 0,
    participationRate: 0
  });
  const [currentElection, setCurrentElection] = useState(null);
  const router = useRouter();

  // Check if user has EC role
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    } else if (!authLoading && isAuthenticated) {
      const role = admin?.role;
      const allowedRoles = ["electoral_commission", "ec", "admin"];
      if (!allowedRoles.includes(role)) {
        router.push("/");
      } else {
        fetchDashboardData();
      }
    }
  }, [authLoading, isAuthenticated, admin, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current active election
      const { data: election } = await supabase
        .from("elections")
        .select("*")
        .eq("is_active", true)
        .single();
      
      setCurrentElection(election);
      
      // Get total voters
      const { count: voterCount } = await supabase
        .from("voters")
        .select("*", { count: "exact", head: true });
      
      // Get total candidates
      const { count: candidateCount } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true });
      
      // Get total votes
      const { count: voteCount } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true });
      
      // Calculate participation rate
      const participationRate = voterCount > 0 
        ? ((voteCount / voterCount) * 100).toFixed(1) 
        : 0;
      
      // Get active elections count
      const { count: activeElections } = await supabase
        .from("elections")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      setStats({
        totalVoters: voterCount || 0,
        totalCandidates: candidateCount || 0,
        activeElections: activeElections || 0,
        totalVotes: voteCount || 0,
        participationRate: parseFloat(participationRate)
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
  ];

  const statCards = [
    { label: "Total Voters", value: stats.totalVoters, icon: FaUsers, color: "emerald" },
    { label: "Total Candidates", value: stats.totalCandidates, icon: FaUserGraduate, color: "blue" },
    { label: "Active Elections", value: stats.activeElections, icon: FaUniversity, color: "purple" },
    { label: "Votes Cast", value: stats.totalVotes, icon: FaVoteYea, color: "orange" },
    { label: "Participation Rate", value: `${stats.participationRate}%`, icon: FaChartBar, color: "teal" },
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {admin?.name?.split(" ")[0] || "EC Member"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Electoral Commission Dashboard - Overview of the voting system
        </p>
      </div>

      {/* Current Election Status */}
      {currentElection && (
        <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FaShieldAlt className="text-xl" />
                <span className="text-sm font-semibold uppercase tracking-wider">Current Election</span>
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
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <FaCheckCircle className="text-xl" />
              <span className="font-semibold">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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

      {/* Recent Activity / Tips */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
            <FaShieldAlt className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Electoral Commission Guidelines</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Ensure all voters are properly registered before elections</li>
              <li>• Verify candidate nominations meet all requirements</li>
              <li>• Monitor voting period for any irregularities</li>
              <li>• Publish results promptly after voting ends</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}