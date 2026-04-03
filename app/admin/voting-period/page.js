// app/admin/voting-period/page.js (UPDATED with sonner)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, FaCalendarAlt, FaClock, FaSave, FaEdit, FaPlus,
  FaTrash, FaCheckCircle, FaTimesCircle, FaPlay, FaStop
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
      // Deactivate all periods first
      await supabase
        .from('voting_periods')
        .update({ is_active: false, updated_at: new Date().toISOString().split('T')[0] })
        .neq('id', period.id);
      
      // Activate selected period
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

 // Fix for Voting Period Manager - handleDeletePeriod
const handleDeletePeriod = async (periodId) => {
  // Use sonner's custom toast for confirmation
  toast.custom((t) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Are you sure you want to delete this voting period? This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => toast.dismiss(t)}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            toast.dismiss(t);
            try {
              // First check if this voting period has any elections
              const { count: electionCount, error: electionError } = await supabase
                .from('elections')
                .select('*', { count: 'exact', head: true })
                .eq('voting_period_id', periodId);
              
              if (electionError) throw electionError;
              
              if (electionCount && electionCount > 0) {
                toast.error(`Cannot delete: This voting period has ${electionCount} election(s) linked to it. Delete the elections first.`);
                return;
              }
              
              // Delete the voting period
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
      if (now < start) return { label: 'Upcoming', color: 'blue', icon: FaClock };
      if (now >= start && now <= end) return { label: 'Active', color: 'green', icon: FaPlay };
      if (now > end) return { label: 'Ended', color: 'gray', icon: FaStop };
    }
    return { label: 'Inactive', color: 'red', icon: FaTimesCircle };
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading voting periods...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Toaster position="top-center" richColors closeButton />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Voting Period Manager</h1>
            <p className="text-gray-300 mt-2">Configure and manage election voting periods</p>
            <p className="text-green-400 text-sm mt-1">Logged in as: {admin?.email}</p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition"
          >
            <FaPlus /> Create New Period
          </button>
        </div>

        {/* Active Period Card */}
        {activePeriod && (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-500/30 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <FaPlay className="text-green-400 text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Active Voting Period</h2>
                  <p className="text-green-400 text-sm">{activePeriod.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm">
                  {formatDateTime(activePeriod.start_date)} - {formatDateTime(activePeriod.end_date)}
                </p>
                <p className="text-yellow-400 text-sm font-medium mt-1">
                  {getTimeRemaining(activePeriod)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voting Periods List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Voting Periods</h2>
          </div>
          
          <div className="divide-y divide-white/10">
            {votingPeriods.length === 0 ? (
              <div className="text-center py-12">
                <FaCalendarAlt className="text-4xl text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No voting periods created yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition"
                >
                  Create First Voting Period
                </button>
              </div>
            ) : (
              votingPeriods.map((period) => {
                const status = getPeriodStatus(period);
                const StatusIcon = status.icon;
                const statusColor = {
                  green: 'bg-green-500/20 text-green-400',
                  blue: 'bg-blue-500/20 text-blue-400',
                  red: 'bg-red-500/20 text-red-400',
                  gray: 'bg-gray-500/20 text-gray-400'
                }[status.color];
                
                return (
                  <div key={period.id} className="p-6 hover:bg-white/5 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{period.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColor}`}>
                            <StatusIcon className="text-xs" />
                            {status.label}
                          </span>
                          {period.is_active && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        
                        {period.description && (
                          <p className="text-gray-400 text-sm mb-2">{period.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <FaCalendarAlt className="text-gray-500" />
                            <span>Start: {formatDateTime(period.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <FaClock className="text-gray-500" />
                            <span>End: {formatDateTime(period.end_date)}</span>
                          </div>
                          {period.year && (
                            <div className="text-gray-400">Year: {period.year}</div>
                          )}
                          {period.total_eligible_voters > 0 && (
                            <div className="text-gray-400">
                              Voters: {period.total_eligible_voters}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!period.is_active && new Date(period.start_date) <= new Date() && (
                          <button
                            onClick={() => handleActivatePeriod(period)}
                            className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-green-400 transition"
                            title="Activate this voting period"
                          >
                            <FaPlay />
                          </button>
                        )}
                        
                        {period.is_active && (
                          <button
                            onClick={() => handleDeactivatePeriod(period)}
                            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition"
                            title="Deactivate this voting period"
                          >
                            <FaStop />
                          </button>
                        )}
                        
                        <button
                          onClick={() => editPeriod(period)}
                          className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 transition"
                          title="Edit period"
                        >
                          <FaEdit />
                        </button>
                        
                        <button
                          onClick={() => handleDeletePeriod(period.id)}
                          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition"
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
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">
                  {editingPeriod ? 'Edit Voting Period' : 'Create New Voting Period'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <FaTimesCircle />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-gray-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="e.g., 2024 Student Elections"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    rows="3"
                    placeholder="Brief description of this voting period..."
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Year</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      placeholder="2024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Total Eligible Voters</label>
                    <input
                      type="number"
                      value={formData.total_eligible_voters}
                      onChange={(e) => setFormData({...formData, total_eligible_voters: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
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
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-gray-300">
                    Activate this voting period immediately
                  </label>
                </div>
                
                {formData.is_active && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
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
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition disabled:opacity-50"
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