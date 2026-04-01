// app/admin/manage-candidates/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaUserPlus, 
  FaTrash, 
  FaEdit, 
  FaSearch, 
  FaDownload, 
  FaUpload,
  FaEnvelope,
  FaIdCard,
  FaGraduationCap,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaEye,
  FaEyeSlash,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaTimes,
  FaImage,
  FaCalendarAlt,
  FaUniversity
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ManageCandidates() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedElection, setSelectedElection] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    school_id: '',
    position: '',
    department: '',
    year_of_study: '',
    manifesto: '',
    image_url: '',
    election_id: '',
    is_approved: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [elections, setElections] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [positions, setPositions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    } else if (isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchElections(),
        fetchCandidates(),
        fetchPositions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('election_year', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out invalid elections and ensure we have valid data
      const validElections = (data || []).filter(e => 
        e.title && 
        e.title !== 'src2026' && 
        e.title !== 'sorth' &&
        !e.title.includes('src') &&
        e.election_year
      );
      
      setElections(validElections);
    } catch (error) {
      console.error('Error fetching elections:', error);
      setElections([]);
    }
  };

  const fetchCandidates = async () => {
    try {
      let query = supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply election filter if selected
      if (selectedElection !== 'all') {
        query = query.eq('election_id', selectedElection);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCandidates(data || []);
      setFilteredCandidates(data || []);
      
      // Calculate stats based on filtered candidates
      const approved = (data || []).filter(c => c.is_approved === true).length;
      const pending = (data || []).filter(c => c.is_approved === false && !c.rejection_reason).length;
      const rejected = (data || []).filter(c => c.rejection_reason && c.rejection_reason !== '').length;
      
      setStats({
        total: (data || []).length,
        approved,
        pending,
        rejected
      });
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    }
  };

  const fetchPositions = async () => {
    try {
      // Get unique positions from candidates
      let query = supabase
        .from('candidates')
        .select('position')
        .not('position', 'is', null);

      // Apply election filter if selected
      if (selectedElection !== 'all') {
        query = query.eq('election_id', selectedElection);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const uniquePositions = [...new Set((data || []).map(c => c.position).filter(p => p))];
      setPositions(uniquePositions);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name) {
      errors.name = 'Name is required';
    }
    
    if (!formData.position) {
      errors.position = 'Position is required';
    }
    
    if (!formData.department) {
      errors.department = 'Department is required';
    }
    
    if (!formData.manifesto) {
      errors.manifesto = 'Manifesto is required';
    } else if (formData.manifesto.length < 100) {
      errors.manifesto = 'Manifesto must be at least 100 characters';
    }
    
    if (!formData.election_id) {
      errors.election_id = 'Please select an election';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const candidateData = {
        name: formData.name,
        position: formData.position,
        department: formData.department,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        manifesto: formData.manifesto,
        image_url: formData.image_url || null,
        election_id: formData.election_id,
        is_approved: formData.is_approved,
        status: formData.is_approved ? 'approved' : 'pending',
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('candidates')
        .insert([candidateData]);
      
      if (error) throw error;
      
      toast.success('Candidate added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
      
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error('Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const candidateData = {
        name: formData.name,
        position: formData.position,
        department: formData.department,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        manifesto: formData.manifesto,
        image_url: formData.image_url || null,
        election_id: formData.election_id,
        is_approved: formData.is_approved,
        status: formData.is_approved ? 'approved' : 'pending',
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('candidates')
        .update(candidateData)
        .eq('id', editingCandidate.id);
      
      if (error) throw error;
      
      toast.success('Candidate updated successfully!');
      setShowAddModal(false);
      setEditingCandidate(null);
      resetForm();
      fetchData();
      
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    try {
      // Check if candidate has votes
      const { count, error: voteCheckError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId);
      
      if (count > 0) {
        toast.error('Cannot delete a candidate who has received votes');
        return;
      }
      
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);
      
      if (error) throw error;
      
      toast.success('Candidate deleted successfully');
      setShowDeleteConfirm(null);
      fetchData();
      
    } catch (error) {
      console.error('Error deleting candidate:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const handleApproveCandidate = async (candidate) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          is_approved: true, 
          status: 'approved',
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      toast.success(`${candidate.name} has been approved as a candidate!`);
      fetchData();
      
    } catch (error) {
      console.error('Error approving candidate:', error);
      toast.error('Failed to approve candidate');
    }
  };

  const handleRejectCandidate = async (candidate) => {
    const rejectionReason = prompt('Enter reason for rejection:', candidate.rejection_reason || '');
    if (rejectionReason === null) return;
    
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          is_approved: false, 
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', candidate.id);
      
      if (error) throw error;
      
      toast.info(`${candidate.name} has been rejected. Reason: ${rejectionReason}`);
      fetchData();
      
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      toast.error('Failed to reject candidate');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      school_id: '',
      position: '',
      department: '',
      year_of_study: '',
      manifesto: '',
      image_url: '',
      election_id: '',
      is_approved: false
    });
    setFormErrors({});
  };

  const editCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name || '',
      email: candidate.candidate_email || '',
      school_id: candidate.candidate_school_id || '',
      position: candidate.position || '',
      department: candidate.department || '',
      year_of_study: candidate.year_of_study || '',
      manifesto: candidate.manifesto || '',
      image_url: candidate.image_url || '',
      election_id: candidate.election_id || '',
      is_approved: candidate.is_approved || false
    });
    setShowAddModal(true);
  };

  const exportToExcel = () => {
    const selectedElectionData = elections.find(e => e.id === selectedElection);
    const exportData = filteredCandidates.map(candidate => ({
      'Name': candidate.name,
      'Position': candidate.position,
      'Department': candidate.department,
      'Year': candidate.year_of_study || 'N/A',
      'Election': elections.find(e => e.id === candidate.election_id)?.title || 'N/A',
      'Election Year': elections.find(e => e.id === candidate.election_id)?.election_year || 'N/A',
      'Status': candidate.is_approved ? 'Approved' : (candidate.rejection_reason ? 'Rejected' : 'Pending'),
      'Manifesto': candidate.manifesto?.substring(0, 200) + '...',
      'Created At': new Date(candidate.created_at).toLocaleString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const fileName = selectedElection !== 'all' && selectedElectionData 
      ? `candidates_${selectedElectionData.title}_${selectedElectionData.election_year}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `candidates_all_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Export successful!');
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...candidates];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Position filter
    if (selectedPosition !== 'all') {
      filtered = filtered.filter(c => c.position === selectedPosition);
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'approved') {
        filtered = filtered.filter(c => c.is_approved === true);
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter(c => c.is_approved === false && !c.rejection_reason);
      } else if (selectedStatus === 'rejected') {
        filtered = filtered.filter(c => c.rejection_reason);
      }
    }
    
    setFilteredCandidates(filtered);
  }, [searchTerm, selectedPosition, selectedStatus, candidates]);

  // Refresh positions and candidates when election filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCandidates();
      fetchPositions();
    }
  }, [selectedElection]);

  const handleElectionFilterChange = async (electionId) => {
    setSelectedElection(electionId);
  };

  const getStatusBadge = (candidate) => {
    if (candidate.is_approved) {
      return { label: 'Approved', color: 'bg-green-500/20 text-green-400', icon: FaCheckCircle };
    } else if (candidate.rejection_reason) {
      return { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: FaTimesCircle };
    } else {
      return { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: FaUserCheck };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading candidates...</p>
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
          <h1 className="text-3xl font-bold text-white">Manage Candidates</h1>
          <p className="text-gray-300 mt-2">
            View, approve, and manage election candidates across all years
          </p>
          <p className="text-green-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Total Candidates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <FaUserPlus className="text-2xl text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Approved</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.approved}</p>
              </div>
              <FaCheckCircle className="text-2xl text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Pending</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
              </div>
              <FaUserCheck className="text-2xl text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Rejected</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.rejected}</p>
              </div>
              <FaTimesCircle className="text-2xl text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 border border-white/20 mb-6">
          <div className="flex flex-col gap-4">
            {/* First Row - Election Filter */}
            <div className="w-full">
              <label className="block text-gray-300 text-sm mb-2">Filter by Election</label>
              <select
                value={selectedElection}
                onChange={(e) => handleElectionFilterChange(e.target.value)}
                className="w-full sm:w-96 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All Elections</option>
                {elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title} ({election.election_year})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Second Row - Search and other filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, position, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Positions</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition"
                >
                  <FaUserPlus /> Add Candidate
                </button>
                
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition"
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Election</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No candidates found
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const status = getStatusBadge(candidate);
                    const StatusIcon = status.icon;
                    const election = elections.find(e => e.id === candidate.election_id);
                    
                    return (
                      <tr key={candidate.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {candidate.image_url ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                <img 
                                  src={candidate.image_url} 
                                  alt={candidate.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg></div>';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <FaUserCheck className="text-gray-400 w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="text-white font-medium">{candidate.name}</div>
                              <div className="text-gray-400 text-xs truncate max-w-[200px]">
                                {candidate.manifesto?.substring(0, 60)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white text-sm">{candidate.position}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300 text-sm">{candidate.department || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-300 text-sm">
                            {candidate.year_of_study ? `Level ${candidate.year_of_study}` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-gray-300 text-sm">
                            <FaUniversity className="text-xs" />
                            {election ? `${election.title} (${election.election_year})` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                            <StatusIcon className="text-xs" />
                            {status.label}
                          </span>
                          {candidate.rejection_reason && (
                            <div className="text-red-400 text-xs mt-1 truncate max-w-[150px]" title={candidate.rejection_reason}>
                              {candidate.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {!candidate.is_approved && !candidate.rejection_reason && (
                              <>
                                <button
                                  onClick={() => handleApproveCandidate(candidate)}
                                  className="text-green-400 hover:text-green-300 transition"
                                  title="Approve candidate"
                                >
                                  <FaCheckCircle />
                                </button>
                                <button
                                  onClick={() => handleRejectCandidate(candidate)}
                                  className="text-red-400 hover:text-red-300 transition"
                                  title="Reject candidate"
                                >
                                  <FaTimesCircle />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => editCandidate(candidate)}
                              className="text-blue-400 hover:text-blue-300 transition"
                              title="Edit candidate"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(candidate)}
                              className="text-red-400 hover:text-red-300 transition"
                              title="Delete candidate"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCandidate(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={editingCandidate ? handleUpdateCandidate : handleAddCandidate} className="p-6 space-y-5">
              <div>
                <label className="block text-gray-300 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="John Doe"
                  required
                />
                {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Position *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="President"
                  required
                />
                {formErrors.position && <p className="text-red-400 text-xs mt-1">{formErrors.position}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Department *</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="Computer Science"
                  required
                />
                {formErrors.department && <p className="text-red-400 text-xs mt-1">{formErrors.department}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Year of Study</label>
                <select
                  value={formData.year_of_study}
                  onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select Year</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Election *</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.election_id}
                    onChange={(e) => setFormData({...formData, election_id: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.id} value={election.id}>
                        {election.title} ({election.election_year})
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.election_id && <p className="text-red-400 text-xs mt-1">{formErrors.election_id}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Manifesto *</label>
                <textarea
                  value={formData.manifesto}
                  onChange={(e) => setFormData({...formData, manifesto: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="Write your manifesto here... (minimum 100 characters)"
                  required
                />
                {formErrors.manifesto && <p className="text-red-400 text-xs mt-1">{formErrors.manifesto}</p>}
                <p className="text-gray-400 text-xs mt-1">
                  {formData.manifesto?.length || 0}/2000 characters
                </p>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Image URL (Optional)</label>
                <div className="relative">
                  <FaImage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_approved"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({...formData, is_approved: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="is_approved" className="text-gray-300">
                  Approve this candidate immediately
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCandidate(null);
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
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : (editingCandidate ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{showDeleteConfirm.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCandidate(showDeleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}