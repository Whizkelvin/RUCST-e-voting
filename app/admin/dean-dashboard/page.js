// app/admin/dean-dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  FaSpinner, 
  FaUsers, 
  FaUserCheck, 
  FaUserClock,
  FaVoteYea,
  FaChartLine,
  FaCalendarAlt,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle
} from 'react-icons/fa';

export default function DeanOverview() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    pendingApprovals: 0,
    approvedCandidates: 0,
    totalVotes: 0,
    activeElections: 0,
    voterTurnout: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [activeElection, setActiveElection] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch candidates stats
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('status');
      
      if (!candidatesError) {
        const pending = candidates.filter(c => c.status === 'pending').length;
        const approved = candidates.filter(c => c.status === 'approved').length;
        
        setStats(prev => ({
          ...prev,
          totalCandidates: candidates.length,
          pendingApprovals: pending,
          approvedCandidates: approved
        }));
      }
      
      // Fetch active elections
      const { data: elections, error: electionsError } = await supabase
        .from('elections')
        .select('*, votes(count)')
        .eq('is_active', true);
      
      if (!electionsError && elections.length > 0) {
        const election = elections[0];
        setActiveElection(election);
        
        // Fetch total votes for this election
        const { count: voteCount, error: voteError } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('election_id', election.id);
        
        if (!voteError) {
          setStats(prev => ({
            ...prev,
            totalVotes: voteCount || 0,
            activeElections: elections.length
          }));
        }
        
        // Calculate voter turnout (assuming we have total registered students)
        // You'll need to adjust this based on your actual data
        const totalStudents = 1000; // Replace with actual count from your database
        const turnout = voteCount ? ((voteCount / totalStudents) * 100).toFixed(1) : 0;
        setStats(prev => ({ ...prev, voterTurnout: turnout }));
      }
      
      // Fetch recent candidate approvals
      const { data: approvals, error: approvalsError } = await supabase
        .from('candidates')
        .select('*, profiles(full_name), elections(title)')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (!approvalsError) {
        setRecentActivities(approvals || []);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dean of Students Dashboard</h1>
        <p className="text-gray-300 mt-2">
          Overview of election activities, candidate approvals, and voting statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FaUsers className="text-blue-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.totalCandidates}</span>
          </div>
          <h3 className="text-gray-300 text-sm">Total Candidates</h3>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <FaUserClock className="text-yellow-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.pendingApprovals}</span>
          </div>
          <h3 className="text-gray-300 text-sm">Pending Approvals</h3>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FaUserCheck className="text-green-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.approvedCandidates}</span>
          </div>
          <h3 className="text-gray-300 text-sm">Approved Candidates</h3>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FaVoteYea className="text-purple-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.totalVotes}</span>
          </div>
          <h3 className="text-gray-300 text-sm">Total Votes Cast</h3>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="text-green-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.activeElections}</span>
          </div>
          <h3 className="text-gray-300 text-sm">Active Elections</h3>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <FaChartLine className="text-indigo-400 text-xl" />
            </div>
            <span className="text-2xl font-bold text-white">{stats.voterTurnout}%</span>
          </div>
          <h3 className="text-gray-300 text-sm">Voter Turnout</h3>
        </div>
      </div>

      {/* Active Election Card */}
      {activeElection && (
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-500/30 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <FaCalendarAlt className="text-green-400 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Active Election</h2>
                <p className="text-green-400 text-sm">{activeElection.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white text-sm">
                Ends: {new Date(activeElection.end_time).toLocaleString()}
              </p>
              <p className="text-yellow-400 text-sm font-medium mt-1">
                {stats.totalVotes} votes cast so far
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Recent Candidate Approvals</h2>
        </div>
        <div className="divide-y divide-white/10">
          {recentActivities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No recent approvals</p>
            </div>
          ) : (
            recentActivities.map((candidate) => (
              <div key={candidate.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{candidate.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-gray-400 text-sm">{candidate.elections?.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Approved
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(candidate.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}