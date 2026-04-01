// app/admin/audit-report/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaSearch, 
  FaDownload, 
  FaFileExcel, 
  FaFilePdf,
  FaCalendarAlt,
  FaUser,
  FaUserCheck,
  FaVoteYea,
  FaKey,
  FaUserPlus,
  FaUserMinus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSignInAlt,
  FaSignOutAlt,
  FaDatabase,
  FaChartLine,
  FaFilter,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AuditReport() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    byAction: {},
    byUser: {},
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    } else if (isAuthenticated) {
      fetchAuditLogs();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch audit logs from various tables
      const [otpLogs, nominationLogs, voteLogs, userLogs, adminLogs] = await Promise.all([
        // OTP generation logs
        supabase.from('otp_codes').select('*').order('created_at', { ascending: false }),
        
        // Nomination audit logs
        supabase.from('nomination_audit_logs').select('*').order('created_at', { ascending: false }),
        
        // Votes table (for vote casting)
        supabase.from('votes').select('*, voters(name, email)').order('created_at', { ascending: false }),
        
        // Voters table changes
        supabase.from('voters').select('*').order('created_at', { ascending: false }),
        
        // Admins table changes
        supabase.from('admins').select('*').order('created_at', { ascending: false })
      ]);

      // Process and combine all logs
      const allLogs = [];
      
      // OTP Logs
      (otpLogs.data || []).forEach(log => {
        allLogs.push({
          id: `otp_${log.id}`,
          timestamp: log.created_at,
          action: 'OTP_GENERATED',
          user: log.email,
          details: `OTP generated for ${log.email}`,
          ip_address: log.ip_address || 'N/A',
          status: 'success',
          metadata: log
        });
      });
      
      // Nomination Logs
      (nominationLogs.data || []).forEach(log => {
        allLogs.push({
          id: `nom_${log.id}`,
          timestamp: log.created_at,
          action: log.action,
          user: log.performed_by || 'System',
          details: JSON.stringify(log.action_details),
          ip_address: log.ip_address || 'N/A',
          status: 'success',
          metadata: log
        });
      });
      
      // Vote Logs
      (voteLogs.data || []).forEach(log => {
        allLogs.push({
          id: `vote_${log.id}`,
          timestamp: log.created_at,
          action: 'VOTE_CAST',
          user: log.voters?.email || log.voter_id,
          details: `Vote cast for candidate ID: ${log.candidate_id}`,
          ip_address: log.ip_address || 'N/A',
          status: 'success',
          metadata: log
        });
      });
      
      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setAuditLogs(allLogs);
      setFilteredLogs(allLogs);
      
      // Calculate statistics
      calculateStats(allLogs);
      
      // Extract unique users and action types
      const uniqueUsers = [...new Set(allLogs.map(log => log.user).filter(u => u))];
      const uniqueActions = [...new Set(allLogs.map(log => log.action))];
      setUsers(uniqueUsers);
      setActionTypes(uniqueActions);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs) => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const byAction = {};
    const byUser = {};
    let todayCount = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      
      // Count by user
      if (log.user) {
        byUser[log.user] = (byUser[log.user] || 0) + 1;
      }
      
      // Time-based counts
      if (logDate >= today) todayCount++;
      if (logDate >= thisWeekStart) thisWeekCount++;
      if (logDate >= thisMonthStart) thisMonthCount++;
    });
    
    setStats({
      total: logs.length,
      byAction,
      byUser,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount
    });
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }
    
    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.user === selectedUser);
    }
    
    setFilteredLogs(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setSelectedAction('all');
    setSelectedUser('all');
    setFilteredLogs(auditLogs);
  };

  const exportToExcel = () => {
    const exportData = filteredLogs.map(log => ({
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'Action': log.action,
      'User': log.user || 'System',
      'Details': log.details,
      'IP Address': log.ip_address,
      'Status': log.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, `audit_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Audit report exported successfully!');
  };

  const getActionIcon = (action) => {
    const icons = {
      'OTP_GENERATED': FaKey,
      'SUBMITTED': FaUserPlus,
      'VOTE_CAST': FaVoteYea,
      'INSERT': FaUserPlus,
      'UPDATE': FaEdit,
      'DELETE': FaTrash,
      'LOGIN': FaSignInAlt,
      'LOGOUT': FaSignOutAlt
    };
    const Icon = icons[action] || FaDatabase;
    return Icon;
  };

  const getActionColor = (action) => {
    if (action.includes('OTP')) return 'text-purple-400';
    if (action.includes('VOTE')) return 'text-green-400';
    if (action.includes('INSERT') || action === 'SUBMITTED') return 'text-blue-400';
    if (action.includes('UPDATE')) return 'text-yellow-400';
    if (action.includes('DELETE')) return 'text-red-400';
    return 'text-gray-400';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Audit Report</h1>
          <p className="text-gray-300 mt-2">
            Comprehensive audit trail of all system activities
          </p>
          <p className="text-green-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Total Events</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total.toLocaleString()}</p>
              </div>
              <FaDatabase className="text-2xl text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Today</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.today}</p>
              </div>
              <FaCalendarAlt className="text-2xl text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">This Week</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.thisWeek}</p>
              </div>
              <FaClock className="text-2xl text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">This Month</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.thisMonth}</p>
              </div>
              <FaChartLine className="text-2xl text-purple-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Unique Users</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{users.length}</p>
              </div>
              <FaUser className="text-2xl text-orange-400" />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2">
              <FaFilter />
              <span className="font-medium">Filters</span>
            </div>
            <span>{showFilters ? 'Hide' : 'Show'}</span>
          </button>
          
          {showFilters && (
            <div className="p-6 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Search</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by user, action..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Action Type</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="all">All Actions</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="all">All Users</option>
                    {users.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition"
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                >
                  Reset
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition ml-auto"
                >
                  <FaFileExcel className="inline mr-2" />
                  Export to Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    const ActionIcon = getActionIcon(log.action);
                    const actionColor = getActionColor(log.action);
                    
                    return (
                      <tr key={index} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-300 text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-2 ${actionColor}`}>
                            <ActionIcon className="text-sm" />
                            <span className="text-sm font-medium">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300 text-sm">{log.user || 'System'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400 text-sm max-w-md truncate" title={log.details}>
                            {log.details}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-gray-400 text-xs">{log.ip_address}</code>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer with count */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/5">
            <p className="text-gray-400 text-sm">
              Showing {filteredLogs.length} of {auditLogs.length} events
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}