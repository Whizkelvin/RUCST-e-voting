// app/admin/voting-period/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaCalendarAlt, 
  FaClock, 
  FaSave, 
  FaEdit, 
  FaPlus,
  FaTrash,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaPlay,
  FaStop,
  FaSync
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
    start_time: '',
    end_date: '',
    end_time: '',
    year: new Date().getFullYear(),
    is_active: false
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
      
      // Find active voting period
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
    if (!formData.title) {
      toast.error('Please enter a title');
      return false;
    }
    
    if (!formData.start_date || !formData.start_time) {
      toast.error('Please select start date and time');
      return false;
    }
    
    if (!formData.end_date || !formData.end_time) {
      toast.error('Please select end date and time');
      return false;
    }
    
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
    const now = new Date();
    
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
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`).toISOString();
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`).toISOString();
      
      const periodData = {
        title: formData.title,
        description: formData.description,
        start_date: startDateTime,  // Changed from start_time
        end_date: endDateTime,      // Changed from end_time
        year: parseInt(formData.year),
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };
      
      if (editingPeriod) {
        // Update existing period
        const { error } = await supabase
          .from('voting_periods')
          .update(periodData)
          .eq('id', editingPeriod.id);
        
        if (error) throw error;
        toast.success('Voting period updated successfully!');
      } else {
        // Create new period
        const { error } = await supabase
          .from('voting_periods')
          .insert([{
            ...periodData,
            created_at: new Date().toISOString()
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
        .update({ is_active: false })
        .neq('id', period.id);
      
      // Activate selected period
      const { error } = await supabase
        .from('voting_periods')
        .update({ is_active: true })
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
        .update({ is_active: false })
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
    if (!confirm('Are you sure you want to delete this voting period? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('voting_periods')
        .delete()
        .eq('id', periodId);
      
      if (error) throw error;
      
      toast.success('Voting period deleted successfully');
      fetchVotingPeriods();
      
    } catch (error) {
      console.error('Error deleting period:', error);
      toast.error('Failed to delete voting period');
    }
  };

  const editPeriod = (period) => {
    // Fix: Use start_date and end_date consistently
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    setFormData({
      title: period.title,
      description: period.description || '',
      start_date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: endDate.toTimeString().slice(0, 5),
      year: period.year || new Date().getFullYear(),
      is_active: period.is_active
    });
    setEditingPeriod(period);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      year: new Date().getFullYear(),
      is_active: false
    });
    setEditingPeriod(null);
  };

  // Improved formatDateTime function with error handling
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
    const start = new Date(period.start_date);  // Fixed: use start_date
    const end = new Date(period.end_date);      // Fixed: use end_date
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { label: 'Invalid Dates', color: 'gray', icon: FaTimesCircle };
    }
    
    if (period.is_active) {
      if (now < start) return { label: 'Upcoming', color: 'blue', icon: FaHourglassHalf };
      if (now >= start && now <= end) return { label: 'Active', color: 'green', icon: FaPlay };
      if (now > end) return { label: 'Ended', color: 'gray', icon: FaStop };
    }
    return { label: 'Inactive', color: 'red', icon: FaTimesCircle };
  };

  const getTimeRemaining = (period) => {
    const now = new Date();
    const end = new Date(period.end_date);  // Fixed: use end_date
    
    if (isNaN(end.getTime())) return 'Invalid Date';
    
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
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading voting periods...</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Voting Period Manager</h1>
            <p className="text-gray-300 mt-2">
              Configure and manage election voting periods
            </p>
            <p className="text-green-400 text-sm mt-1">
              Logged in as: {admin?.email}
            </p>
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
                
                return (
                  <div key={period.id} className="p-6 hover:bg-white/5 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{period.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-${status.color}-500/20 text-${status.color}-400`}>
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
                        </div>
                        
                        {!period.is_active && new Date(period.end_date) > new Date() && (
                          <p className="text-yellow-400 text-xs mt-2">
                            {getTimeRemaining(period)}
                          </p>
                        )}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Start Time *</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">End Time *</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Election Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="2024"
                  />
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