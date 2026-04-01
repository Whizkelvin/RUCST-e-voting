// app/admin/dean-dashboard/pending-approvals/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaUserClock, 
  FaCheck, 
  FaTimes, 
  FaEye,
  FaGraduationCap,
  FaEnvelope,
  FaCalendarAlt
} from 'react-icons/fa';

export default function PendingApprovals() {
  const [loading, setLoading] = useState(true);
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPendingCandidates();
  }, []);

  const fetchPendingCandidates = async () => {
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
            year_level,
            avatar_url
          ),
          elections (
            id,
            title,
            start_time,
            end_time
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingCandidates(data || []);
    } catch (error) {
      console.error('Error fetching pending candidates:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidate) => {
    if (!confirm(`Approve ${candidate.profiles?.full_name} as a candidate?`)) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      toast.success(`${candidate.profiles?.full_name} has been approved!`);
      fetchPendingCandidates();
      
    } catch (error) {
      console.error('Error approving candidate:', error);
      toast.error('Failed to approve candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (candidate) => {
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
      fetchPendingCandidates();
      
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      toast.error('Failed to reject candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!confirm(`Approve all ${pendingCandidates.length} pending candidates?`)) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .in('id', pendingCandidates.map(c => c.id));
      
      if (error) throw error;
      
      toast.success(`${pendingCandidates.length} candidates have been approved!`);
      fetchPendingCandidates();
      
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Failed to bulk approve candidates');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
          <p className="text-gray-300 mt-2">
            Review and approve candidate applications
          </p>
        </div>
        {pendingCandidates.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={processing}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition disabled:opacity-50"
          >
            <FaCheck className="inline mr-2" /> Approve All ({pendingCandidates.length})
          </button>
        )}
      </div>

      {pendingCandidates.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
          <FaUserClock className="text-6xl text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Approvals</h3>
          <p className="text-gray-400">All candidate applications have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingCandidates.map((candidate) => (
            <div key={candidate.id} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {candidate.profiles?.avatar_url ? (
                      <img 
                        src={candidate.profiles.avatar_url} 
                        alt={candidate.profiles.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {candidate.profiles?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {candidate.profiles?.full_name}
                        </h3>
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          Pending Review
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <FaGraduationCap className="text-gray-500" />
                          <span>{candidate.profiles?.department} - Year {candidate.profiles?.year_level}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <FaEnvelope className="text-gray-500" />
                          <span>{candidate.profiles?.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <FaCalendarAlt className="text-gray-500" />
                          <span>Applied: {new Date(candidate.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {candidate.manifesto && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                          <p className="text-gray-400 text-xs mb-1">Manifesto</p>
                          <p className="text-gray-300 text-sm line-clamp-2">{candidate.manifesto}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 transition"
                  >
                    <FaEye className="inline mr-1" /> Review
                  </button>
                  <button
                    onClick={() => handleApprove(candidate)}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-green-400 transition"
                  >
                    <FaCheck className="inline mr-1" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(candidate)}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 transition"
                  >
                    <FaTimes className="inline mr-1" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Details Modal */}
      {showDetailsModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Application Details</h2>
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
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleApprove(selectedCandidate)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition"
                >
                  <FaCheck className="inline mr-2" /> Approve Candidate
                </button>
                <button
                  onClick={() => handleReject(selectedCandidate)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition"
                >
                  <FaTimes className="inline mr-2" /> Reject Candidate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}