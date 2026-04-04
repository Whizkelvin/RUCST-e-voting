'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, FaCalendarAlt, FaClock, FaSave, FaEdit, FaPlus,
  FaTrash, FaCheckCircle, FaTimesCircle, FaPlay, FaStop, FaX
} from 'react-icons/fa';

export default function VotingPeriodManager() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [votingPeriods, setVotingPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-700">
        <div className="mb-5">
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Delete Voting Period?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            This action cannot be undone. Please confirm you want to delete this voting period.
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => toast.dismiss(t)}
            className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
      if (now < start) return { label: 'Upcoming', color: 'slate', icon: FaClock };
      if (now >= start && now <= end) return { label: 'Active', color: 'emerald', icon: FaPlay };
      if (now > end) return { label: 'Ended', color: 'slate', icon: FaStop };
    }
    return { label: 'Inactive', color: 'slate', icon: FaTimesCircle };
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FaSpinner className="animate-spin text-3xl text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading voting periods...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Toaster position="top-center" richColors closeButton />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Voting Periods</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">Manage and configure election voting periods</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm mt-2 font-medium">Admin: {admin?.email}</p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <FaPlus className="text-sm" />
            <span>Create Period</span>
          </button>
        </div>

        {/* Active Period Card */}
        {activePeriod && (
          <div className="mb-8 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-200 dark:bg-emerald-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaPlay className="text-emerald-600 dark:text-emerald-400 text-lg" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Active Voting Period</h2>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium truncate">{activePeriod.title}</p>
                </div>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm line-clamp-2">
                  {formatDateTime(activePeriod.start_date)} - {formatDateTime(activePeriod.end_date)}
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  {getTimeRemaining(activePeriod)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voting Periods List */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Voting Periods</h2>
          </div>
          
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {votingPeriods.length === 0 ? (
              <div className="text-center py-12 px-4 sm:px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <FaCalendarAlt className="text-3xl text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No voting periods created yet</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create First Period
                </button>
              </div>
            ) : (
              votingPeriods.map((period) => {
                const status = getPeriodStatus(period);
                const StatusIcon = status.icon;
                
                const statusColorMap = {
                  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
                  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                  orange: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                };
                
                return (
                  <div key={period.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white break-words">{period.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${statusColorMap[status.color]}`}>
                              <StatusIcon className="text-xs" />
                              {status.label}
                            </span>
                            {period.is_active && (
                              <span className="px-2.5 py-1 bg-emerald-200 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {period.description && (
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{period.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <FaCalendarAlt className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                            <span className="truncate">Start: {formatDateTime(period.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <FaClock className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                            <span className="truncate">End: {formatDateTime(period.end_date)}</span>
                          </div>
                          {period.year && (
                            <div className="text-slate-600 dark:text-slate-400">
                              Year: <span className="font-medium text-slate-900 dark:text-white">{period.year}</span>
                            </div>
                          )}
                          {period.total_eligible_voters > 0 && (
                            <div className="text-slate-600 dark:text-slate-400">
                              Voters: <span className="font-medium text-slate-900 dark:text-white">{period.total_eligible_voters}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 pt-4 lg:pt-0 flex-wrap lg:flex-nowrap lg:flex-col">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap lg:flex-nowrap lg:w-full">
                          {!period.is_active && new Date(period.start_date) <= new Date() && (
                            <button
                              onClick={() => handleActivatePeriod(period)}
                              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center justify-center gap-1"
                              title="Activate this voting period"
                            >
                              <FaPlay className="text-xs" />
                              <span className="hidden sm:inline">Activate</span>
                            </button>
                          )}
                          
                          {period.is_active && (
                            <button
                              onClick={() => handleDeactivatePeriod(period)}
                              className="flex-1 sm:flex-none px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center justify-center gap-1"
                              title="Deactivate this voting period"
                            >
                              <FaStop className="text-xs" />
                              <span className="hidden sm:inline">Stop</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => editPeriod(period)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center justify-center gap-1"
                            title="Edit period"
                          >
                            <FaEdit className="text-xs" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeletePeriod(period.id)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors font-medium text-xs sm:text-sm flex items-center justify-center gap-1"
                            title="Delete period"
                          >
                            <FaTrash className="text-xs" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {editingPeriod ? 'Edit Voting Period' : 'Create New Voting Period'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <FaX className="text-lg" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors"
                    placeholder="e.g., 2024 Student Elections"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors resize-none"
                    rows="3"
                    placeholder="Brief description of this voting period..."
                  />
                </div>
                
                {/* Start Date */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors"
                    required
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors"
                    required
                  />
                </div>
                
                {/* Year & Voters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Year</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors"
                      placeholder="2024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-2 text-sm">Total Eligible Voters</label>
                    <input
                      type="number"
                      value={formData.total_eligible_voters}
                      onChange={(e) => setFormData({...formData, total_eligible_voters: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Active Checkbox */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-slate-700 dark:text-slate-300 font-medium text-sm cursor-pointer">
                    Activate this voting period immediately
                  </label>
                </div>
                
                {formData.is_active && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      ⚠️ Activating this period will automatically deactivate any currently active voting period.
                    </p>
                  </div>
                )}
                
                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" />
                        <span>{editingPeriod ? 'Updating...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span>{editingPeriod ? 'Update Period' : 'Create Period'}</span>
                      </>
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
