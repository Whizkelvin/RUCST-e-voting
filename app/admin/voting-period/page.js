// app/admin/voting-period/page.js

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, FaCalendarAlt, FaClock, FaSave, FaEdit, FaPlus,
  FaTrash, FaCheckCircle, FaTimesCircle, FaPlay, FaStop,
  FaSun, FaMoon, FaChartLine, FaUsers, FaCalendarCheck
} from 'react-icons/fa';

export default function VotingPeriodManager() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [votingPeriods, setVotingPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    year: new Date().getFullYear(),
    is_active: false,
    total_eligible_voters: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('votingPeriodTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('votingPeriodTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    } else if (isAuthenticated) {
      fetchVotingPeriods();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchVotingPeriods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voting_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVotingPeriods(data || []);
      
      const active = data?.find(period => period.is_active === true);
      setActivePeriod(active || null);
      
    } catch (error) {
      console.error('Error fetching voting periods:', error);
      toast.error('Failed to load voting periods');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.title?.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    
    if (!formData.start_date) {
      toast.error('Please select start date and time');
      return false;
    }
    
    if (!formData.end_date) {
      toast.error('Please select end date and time');
      return false;
    }
    
    const startDateTime = new Date(formData.start_date);
    const endDateTime = new Date(formData.end_date);
    
    if (startDateTime >= endDateTime) {
      toast.error('End time must be after start time');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const periodData = {
        title: formData.title.trim(),
        description: formData.description || null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        year: parseInt(formData.year),
        is_active: formData.is_active,
        total_eligible_voters: formData.total_eligible_voters || 0,
        total_votes_cast: editingPeriod?.total_votes_cast || 0,
        updated_at: new Date().toISOString().split('T')[0]
      };
      
      if (editingPeriod) {
        const { error } = await supabase
          .from('voting_periods')
          .update(periodData)
          .eq('id', editingPeriod.id);
        
        if (error) throw error;
        toast.success('Voting period updated successfully!');
      } else {
        const { error } = await supabase
          .from('voting_periods')
          .insert([{
            ...periodData,
            created_at: new Date().toISOString(),
            total_votes_cast: 0,
            voter_turnout_percentage: 0
          }]);
        
        if (error) throw error;
        toast.success('Voting period created successfully!');
      }
      
      resetForm();
      setShowForm(false);
      fetchVotingPeriods();
      
    } catch (error) {
      console.error('Error saving voting period:', error);
      toast.error('Failed to save voting period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivatePeriod = async (period) => {
    try {
      await supabase
        .from('voting_periods')
        .update({ is_active: false, updated_at: new Date().toISOString().split('T')[0] })
        .neq('id', period.id);
      
      const { error } = await supabase
        .from('voting_periods')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString().split('T')[0]
        })
        .eq('id', period.id);
      
      if (error) throw error;
      
      toast.success(`${period.title} is now active!`);
      fetchVotingPeriods();
      
    } catch (error) {
      console.error('Error activating period:', error);
      toast.error('Failed to activate voting period');
    }
  };

  const handleDeactivatePeriod = async (period) => {
    try {
      const { error } = await supabase
        .from('voting_periods')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString().split('T')[0]
        })
        .eq('id', period.id);
      
      if (error) throw error;
      
      toast.success(`${period.title} has been deactivated`);
      fetchVotingPeriods();
      
    } catch (error) {
      console.error('Error deactivating period:', error);
      toast.error('Failed to deactivate voting period');
    }
  };

  const handleDeletePeriod = async (periodId) => {
    toast.custom((t) => (
      <div className={`rounded-lg shadow-lg p-4 max-w-sm w-full ${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      }`}>
        <div className="mb-4">
          <h3 className={`font-semibold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>Confirm Delete</h3>
          <p className={`text-sm mt-1 ${
            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Are you sure you want to delete this voting period? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              theme === 'light'
                ? 'bg-gray-200 hover:bg-gray-300'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t);
              try {
                const { count: electionCount, error: electionError } = await supabase
                  .from('elections')
                  .select('*', { count: 'exact', head: true })
                  .eq('voting_period_id', periodId);
                
                if (electionError) throw electionError;
                
                if (electionCount && electionCount > 0) {
                  toast.error(`Cannot delete: This voting period has ${electionCount} election(s) linked to it. Delete the elections first.`);
                  return;
                }
                
                const { error } = await supabase
                  .from('voting_periods')
                  .delete()
                  .eq('id', periodId);
                
                if (error) throw error;
                
                toast.success('Voting period deleted successfully');
                fetchVotingPeriods();
              } catch (error) {
                console.error('Error deleting period:', error);
                toast.error(`Failed to delete: ${error.message}`);
              }
            }}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const editPeriod = (period) => {
    setFormData({
      title: period.title,
      description: period.description || '',
      start_date: period.start_date ? new Date(period.start_date).toISOString().slice(0, 16) : '',
      end_date: period.end_date ? new Date(period.end_date).toISOString().slice(0, 16) : '',
      year: period.year || new Date().getFullYear(),
      is_active: period.is_active,
      total_eligible_voters: period.total_eligible_voters || 0
    });
    setEditingPeriod(period);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      year: new Date().getFullYear(),
      is_active: false,
      total_eligible_voters: 0
    });
    setEditingPeriod(null);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Invalid Date';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getPeriodStatus = (period) => {
    const now = new Date();
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    
    if (period.is_active) {
      if (now < start) return { label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400', icon: FaClock };
      if (now >= start && now <= end) return { label: 'Active', color: 'bg-teal-500/20 text-teal-400', icon: FaPlay };
      if (now > end) return { label: 'Ended', color: 'bg-gray-500/20 text-gray-400', icon: FaStop };
    }
    return { label: 'Inactive', color: 'bg-red-500/20 text-red-400', icon: FaTimesCircle };
  };

  const getTimeRemaining = (period) => {
    const now = new Date();
    const end = new Date(period.end_date);
    
    if (now > end) return 'Ended';
    
    const diff = end - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // Calculate stats
  const stats = {
    total: votingPeriods.length,
    active: votingPeriods.filter(p => p.is_active === true).length,
    upcoming: votingPeriods.filter(p => !p.is_active && new Date(p.start_date) > new Date()).length,
    completed: votingPeriods.filter(p => !p.is_active && new Date(p.end_date) < new Date()).length
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>Loading voting periods...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
    }`}>
      <Toaster position="top-center" richColors closeButton />
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: theme === 'light' ? '#0f766e' : '#fbbf24',
          color: theme === 'light' ? '#ffffff' : '#1f2937',
        }}
      >
        {theme === 'light' ? <FaMoon size={20} /> : <FaSun size={20} />}
      </button>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Voting Period Manager
            </h1>
            <p className={`mt-2 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              Configure and manage election voting periods
            </p>
            <p className="text-teal-600 dark:text-teal-400 text-sm mt-1">
              Logged in as: {admin?.email}
            </p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
          >
            <FaPlus /> Create New Period
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Total Periods</p>
                <p className={`text-2xl font-bold mt-1 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>{stats.total}</p>
              </div>
              <FaCalendarCheck className="text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Active</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.active}</p>
              </div>
              <FaPlay className="text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Upcoming</p>
                <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.upcoming}</p>
              </div>
              <FaClock className="text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Completed</p>
                <p className="text-2xl font-bold mt-1 text-gray-600 dark:text-gray-400">{stats.completed}</p>
              </div>
              <FaCheckCircle className="text-2xl text-teal-500" />
            </div>
          </div>
        </div>

        {/* Active Period Card */}
        {activePeriod && (
          <div className={`rounded-xl p-6 border mb-8 ${
            theme === 'light'
              ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200'
              : 'bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border-teal-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === 'light' ? 'bg-teal-100' : 'bg-teal-500/20'
                }`}>
                  <FaPlay className={`text-xl ${
                    theme === 'light' ? 'text-teal-600' : 'text-teal-400'
                  }`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    Active Voting Period
                  </h2>
                  <p className="text-teal-600 dark:text-teal-400 text-sm">{activePeriod.title}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  {formatDateTime(activePeriod.start_date)} - {formatDateTime(activePeriod.end_date)}
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium mt-1">
                  {getTimeRemaining(activePeriod)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voting Periods List */}
        <div className={`rounded-xl border overflow-hidden ${
          theme === 'light'
            ? 'bg-white border-gray-200 shadow-sm'
            : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className={`px-4 sm:px-6 py-4 border-b ${
            theme === 'light' ? 'border-gray-200' : 'border-white/10'
          }`}>
            <h2 className={`text-lg font-semibold ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Voting Periods
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {votingPeriods.length === 0 ? (
              <div className="text-center py-12">
                <FaCalendarAlt className={`text-4xl mx-auto mb-4 ${
                  theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <p className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
                  No voting periods created yet
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 bg-teal-600 rounded-lg text-white hover:bg-teal-500 transition"
                >
                  Create First Voting Period
                </button>
              </div>
            ) : (
              votingPeriods.map((period) => {
                const status = getPeriodStatus(period);
                const StatusIcon = status.icon;
                
                return (
                  <div key={period.id} className="p-4 sm:p-6 hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className={`text-lg font-semibold ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}>
                            {period.title}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="text-xs" />
                            {status.label}
                          </span>
                          {period.is_active && (
                            <span className="px-2 py-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs rounded-full animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        
                        {period.description && (
                          <p className={`text-sm mb-2 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {period.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className={`flex items-center gap-2 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            <FaCalendarAlt className="text-teal-500 text-xs" />
                            <span>Start: {formatDateTime(period.start_date)}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            <FaClock className="text-teal-500 text-xs" />
                            <span>End: {formatDateTime(period.end_date)}</span>
                          </div>
                          {period.year && (
                            <div className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
                              Year: {period.year}
                            </div>
                          )}
                          {period.total_eligible_voters > 0 && (
                            <div className={`flex items-center gap-1 ${
                              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              <FaUsers className="text-teal-500 text-xs" />
                              Voters: {period.total_eligible_voters}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!period.is_active && new Date(period.start_date) <= new Date() && (
                          <button
                            onClick={() => handleActivatePeriod(period)}
                            className="p-2 bg-teal-600/20 hover:bg-teal-600/30 rounded-lg text-teal-600 dark:text-teal-400 transition"
                            title="Activate this voting period"
                          >
                            <FaPlay />
                          </button>
                        )}
                        
                        {period.is_active && (
                          <button
                            onClick={() => handleDeactivatePeriod(period)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-500 transition"
                            title="Deactivate this voting period"
                          >
                            <FaStop />
                          </button>
                        )}
                        
                        <button
                          onClick={() => editPeriod(period)}
                          className="p-2 bg-teal-600/20 hover:bg-teal-600/30 rounded-lg text-teal-600 dark:text-teal-400 transition"
                          title="Edit period"
                        >
                          <FaEdit />
                        </button>
                        
                        <button
                          onClick={() => handleDeletePeriod(period.id)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-500 transition"
                          title="Delete period"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            }`}>
              <div className={`sticky top-0 flex justify-between items-center p-4 sm:p-6 border-b ${
                theme === 'light' ? 'border-gray-200' : 'border-white/10'
              } ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                <h2 className={`text-xl sm:text-2xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                  {editingPeriod ? 'Edit Voting Period' : 'Create New Voting Period'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className={`transition ${
                    theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaTimesCircle />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="e.g., 2024 Student Elections"
                    required
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    rows="3"
                    placeholder="Brief description of this voting period..."
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="2024"
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                      Total Eligible Voters
                    </label>
                    <input
                      type="number"
                      value={formData.total_eligible_voters}
                      onChange={(e) => setFormData({...formData, total_eligible_voters: parseInt(e.target.value) || 0})}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="is_active" className={`text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Activate this voting period immediately
                  </label>
                </div>
                
                {formData.is_active && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                      ⚠️ Activating this period will automatically deactivate any currently active voting period.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition text-sm ${
                      theme === 'light'
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50 text-sm"
                  >
                    {submitting ? <FaSpinner className="animate-spin mx-auto" /> : (
                      <span className="flex items-center justify-center gap-2">
                        <FaSave /> {editingPeriod ? 'Update' : 'Create'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}