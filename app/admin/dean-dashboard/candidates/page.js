// app/admin/dean-dashboard/candidates/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaSearch, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaInfoCircle,
  FaCalendarAlt,
  FaEnvelope,
  FaGraduationCap,
  FaVoteYea
} from 'react-icons/fa';

export default function CandidatesManagement() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            student_id,
            department,
            year_level
          ),
          elections (
            id,
            title,
            start_time,
            end_time
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
      setFilteredCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCandidate = async (candidate) => {
    if (!confirm(`Approve ${candidate.profiles?.full_name} as a candidate?`)) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: candidate.user_id
        })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      toast.success(`${candidate.profiles?.full_name} has been approved!`);
      fetchCandidates();
      
    } catch (error) {
      console.error('Error approving candidate:', error);
      toast.error('Failed to approve candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCandidate = async (candidate) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      toast.info(`${candidate.profiles?.full_name} has been rejected`);
      fetchCandidates();
      
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      toast.error('Failed to reject candidate');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-green-500/20 text-green-400', label: 'Approved', icon: FaCheck };
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending', icon: FaInfoCircle };
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400', label: 'Rejected', icon: FaTimes };
      default:
        return { color: 'bg-gray-500/20 text-gray-400', label: 'Unknown', icon: FaInfoCircle };
    }
  };

  // Filter candidates
  useEffect(() => {
    let filtered = [...candidates];
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.profiles?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    setFilteredCandidates(filtered);
  }, [searchTerm, statusFilter, candidates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Candidates Management</h1>
        <p className="text-gray-300 mt-2">
          Review, approve, and manage election candidates
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
            <p className="text-gray-400">No candidates found</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const status = getStatusBadge(candidate.status);
            const StatusIcon = status.icon;
            
            return (
              <div key={candidate.id} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {candidate.profiles?.full_name || 'Unknown'}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {candidate.elections?.title}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                      <StatusIcon className="text-xs" />
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <FaGraduationCap className="text-gray-500" />
                      <span>{candidate.profiles?.department || 'N/A'} - Year {candidate.profiles?.year_level}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FaEnvelope className="text-gray-500" />
                      <span className="truncate">{candidate.profiles?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FaVoteYea className="text-gray-500" />
                      <span>Position: {candidate.position || 'Not specified'}</span>
                    </div>
                    {candidate.manifesto && (
                      <div className="mt-3 p-3 bg-white/5 rounded-lg">
                        <p className="text-gray-400 text-xs">Manifesto</p>
                        <p className="text-gray-300 text-sm line-clamp-2">{candidate.manifesto}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 transition text-sm"
                    >
                      <FaEye className="inline mr-1" /> Details
                    </button>
                    
                    {candidate.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveCandidate(candidate)}
                          disabled={processing}
                          className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-green-400 transition text-sm"
                        >
                          <FaCheck className="inline mr-1" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectCandidate(candidate)}
                          disabled={processing}
                          className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition text-sm"
                        >
                          <FaTimes className="inline mr-1" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Candidate Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Candidate Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Full Name</label>
                  <p className="text-white font-medium">{selectedCandidate.profiles?.full_name}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Student ID</label>
                  <p className="text-white">{selectedCandidate.profiles?.student_id}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Email</label>
                  <p className="text-white">{selectedCandidate.profiles?.email}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Department</label>
                  <p className="text-white">{selectedCandidate.profiles?.department}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Year Level</label>
                  <p className="text-white">Year {selectedCandidate.profiles?.year_level}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Position</label>
                  <p className="text-white">{selectedCandidate.position || 'Not specified'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Election</label>
                <p className="text-white">{selectedCandidate.elections?.title}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {new Date(selectedCandidate.elections?.start_time).toLocaleDateString()} - {new Date(selectedCandidate.elections?.end_time).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Manifesto</label>
                <div className="mt-2 p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedCandidate.manifesto || 'No manifesto provided'}</p>
                </div>
              </div>
              
              {selectedCandidate.rejection_reason && (
                <div>
                  <label className="text-gray-400 text-sm">Rejection Reason</label>
                  <div className="mt-2 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                    <p className="text-red-400">{selectedCandidate.rejection_reason}</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}