'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, FaUserPlus, FaTrash, FaEdit, FaSearch, FaDownload, 
  FaEnvelope, FaIdCard, FaGraduationCap, FaBuilding, FaCheckCircle,
  FaTimesCircle, FaUserCheck, FaEye, FaEyeSlash, FaFileExcel,
  FaTimes, FaImage, FaCalendarAlt, FaUniversity, FaCamera, FaTrashAlt,
  FaSun, FaMoon, FaChartLine
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [theme, setTheme] = useState('light');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    school_id: '',
    position: '',
    department: '',
    year_of_study: '',
    manifesto: '',
    image_file: null,
    image_url: '',
    election_id: '',
    voting_period_id: '',
    is_approved: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [elections, setElections] = useState([]);
  const [votingPeriods, setVotingPeriods] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [positions, setPositions] = useState([]);
  const router = useRouter();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('candidatesTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('candidatesTheme', theme);
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
      fetchData();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchElections(),
        fetchCandidates(),
        fetchVotingPeriods()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVotingPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('voting_periods')
        .select('id, title, start_date, end_date, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVotingPeriods(data || []);
    } catch (error) {
      console.error('Error fetching voting periods:', error);
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

  const syncPositionToTable = async (electionId, positionTitle, orderNumber = null) => {
    if (!electionId || !positionTitle) return null;
    
    try {
      const { data: existingPosition } = await supabase
        .from('positions')
        .select('id')
        .eq('election_id', electionId)
        .eq('title', positionTitle)
        .maybeSingle();
      
      if (existingPosition) {
        return existingPosition.id;
      }
      
      const { data: newPosition, error } = await supabase
        .from('positions')
        .insert({
          election_id: electionId,
          title: positionTitle,
          description: `Candidates for ${positionTitle}`,
          order_number: orderNumber || 999,
          order_index: orderNumber || 999,
          max_votes: 1,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating position:', error);
        throw error;
      }
      
      toast.success(`Position "${positionTitle}" created automatically`);
      return newPosition.id;
      
    } catch (error) {
      console.error('Error syncing position:', error);
      toast.error(`Failed to create position: ${error.message}`);
      return null;
    }
  };

  const fetchCandidates = async () => {
    try {
      let query = supabase
        .from('candidates')
        .select(`
          *,
          positions!candidates_position_id_fkey (
            id,
            title,
            order_number
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedElection !== 'all') {
        query = query.eq('election_id', selectedElection);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCandidates(data || []);
      setFilteredCandidates(data || []);
      
      const uniquePositions = [...new Set((data || []).map(c => c.position).filter(p => p))];
      setPositions(uniquePositions);
      
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

  const uploadImage = async (file) => {
    if (!file) return null;
    
    setUploadingImage(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `candidates/${fileName}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('candidate-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('candidate-images')
        .getPublicUrl(filePath);
      
      toast.success('Image uploaded successfully!');
      return publicUrl;
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPEG, PNG, GIF, or WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setFormData({ ...formData, image_file: file, image_url: '' });
    
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.onerror = () => toast.error('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, image_file: null, image_url: '' });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Image removed');
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.position?.trim()) errors.position = 'Position is required';
    if (!formData.department?.trim()) errors.department = 'Department is required';
    if (!formData.manifesto?.trim()) {
      errors.manifesto = 'Manifesto is required';
    } else if (formData.manifesto.length < 100) {
      errors.manifesto = 'Manifesto must be at least 100 characters';
    }
    if (!formData.election_id) errors.election_id = 'Please select an election';
    if (!formData.voting_period_id) errors.voting_period_id = 'Please select a voting period';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleElectionChange = async (electionId) => {
    setFormData({ ...formData, election_id: electionId, voting_period_id: '' });
    
    if (electionId) {
      const selectedElectionObj = elections.find(e => e.id === electionId);
      if (selectedElectionObj && selectedElectionObj.voting_period_id) {
        setFormData(prev => ({ ...prev, voting_period_id: selectedElectionObj.voting_period_id }));
      } else {
        toast.warning('Selected election has no associated voting period');
      }
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    let imageUrl = formData.image_url;
    
    try {
      const positionId = await syncPositionToTable(
        formData.election_id,
        formData.position.trim()
      );
      
      if (!positionId) {
        toast.error('Failed to create/validate position');
        return;
      }
      
      if (formData.image_file) {
        const uploadedUrl = await uploadImage(formData.image_file);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }
      
      const candidateData = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        position_id: positionId,
        department: formData.department.trim(),
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        manifesto: formData.manifesto.trim(),
        image_url: imageUrl || null,
        election_id: formData.election_id,
        voting_period_id: formData.voting_period_id,
        is_approved: formData.is_approved,
        status: formData.is_approved ? 'approved' : 'pending',
        created_at: new Date().toISOString(),
        candidate_email: formData.email || null,
        candidate_school_id: formData.school_id || null
      };
      
      const { error } = await supabase.from('candidates').insert([candidateData]);
      if (error) throw error;
      
      toast.success('Candidate added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
      
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error(`Failed to add candidate: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    let imageUrl = formData.image_url;
    
    try {
      let positionId = editingCandidate.position_id;
      if (editingCandidate.position !== formData.position.trim() || 
          editingCandidate.election_id !== formData.election_id) {
        positionId = await syncPositionToTable(
          formData.election_id,
          formData.position.trim()
        );
      }
      
      if (formData.image_file) {
        const uploadedUrl = await uploadImage(formData.image_file);
        if (uploadedUrl) {
          if (editingCandidate?.image_url) {
            const oldImagePath = editingCandidate.image_url.split('/').pop();
            if (oldImagePath) {
              await supabase.storage
                .from('candidate-images')
                .remove([`candidates/${oldImagePath}`])
                .catch(err => console.warn('Could not delete old image:', err));
            }
          }
          imageUrl = uploadedUrl;
        }
      }
      
      const candidateData = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        position_id: positionId,
        department: formData.department.trim(),
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        manifesto: formData.manifesto.trim(),
        image_url: imageUrl || null,
        election_id: formData.election_id,
        voting_period_id: formData.voting_period_id,
        is_approved: formData.is_approved,
        status: formData.is_approved ? 'approved' : 'pending',
        updated_at: new Date().toISOString(),
        candidate_email: formData.email || null,
        candidate_school_id: formData.school_id || null
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
      toast.error(`Failed to update candidate: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    try {
      const { count, error: voteCheckError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId);
      
      if (voteCheckError) throw voteCheckError;
      
      if (count && count > 0) {
        toast.error('Cannot delete a candidate who has received votes');
        return;
      }
      
      const { data: candidate } = await supabase
        .from('candidates')
        .select('image_url')
        .eq('id', candidateId)
        .single();
      
      if (candidate?.image_url) {
        const imagePath = candidate.image_url.split('/').pop();
        if (imagePath) {
          await supabase.storage
            .from('candidate-images')
            .remove([`candidates/${imagePath}`])
            .catch(err => console.warn('Could not delete image:', err));
        }
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
      toast.error(`Failed to delete candidate: ${error.message}`);
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
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ 
          is_approved: false, 
          status: 'rejected',
          rejection_reason: rejectionReason.trim()
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
      image_file: null,
      image_url: '',
      election_id: '',
      voting_period_id: '',
      is_approved: false
    });
    setImagePreview(null);
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      image_file: null,
      image_url: candidate.image_url || '',
      election_id: candidate.election_id || '',
      voting_period_id: candidate.voting_period_id || '',
      is_approved: candidate.is_approved || false
    });
    setImagePreview(candidate.image_url || null);
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

  useEffect(() => {
    let filtered = [...candidates];
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedPosition !== 'all') {
      filtered = filtered.filter(c => c.position === selectedPosition);
    }
    
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCandidates();
    }
  }, [selectedElection, isAuthenticated]);

  const getStatusBadge = (candidate) => {
    if (candidate.is_approved) {
      return { label: 'Approved', color: 'bg-teal-500/20 text-teal-400', icon: FaCheckCircle };
    } else if (candidate.rejection_reason) {
      return { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: FaTimesCircle };
    } else {
      return { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: FaUserCheck };
    }
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>Loading candidates...</p>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-24">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Manage Candidates
          </h1>
          <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
          }`}>
            View, approve, and manage election candidates across all years
          </p>
          <p className="text-teal-600 dark:text-teal-400 text-xs sm:text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={`rounded-xl p-3 sm:p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Total Candidates</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>{stats.total}</p>
              </div>
              <FaUserPlus className="text-xl sm:text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-3 sm:p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Approved</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.approved}</p>
              </div>
              <FaCheckCircle className="text-xl sm:text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-3 sm:p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Pending</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
              </div>
              <FaUserCheck className="text-xl sm:text-2xl text-teal-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-3 sm:p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Rejected</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{stats.rejected}</p>
              </div>
              <FaTimesCircle className="text-xl sm:text-2xl text-teal-500" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-6 ${
          theme === 'light'
            ? 'bg-white border-gray-200 shadow-sm'
            : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label className={`block text-sm mb-2 ${
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              }`}>Filter by Election</label>
              <select
                value={selectedElection}
                onChange={(e) => setSelectedElection(e.target.value)}
                className={`w-full sm:w-80 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-white/5 border-white/20 text-white'
                }`}
              >
                <option value="all">All Elections</option>
                {elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title} ({election.election_year})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search by name, position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        : 'bg-white/5 border-white/20 text-white placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className={`flex-1 sm:flex-none px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-white/5 border-white/20 text-white'
                  }`}
                >
                  <option value="all">All Positions</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={`flex-1 sm:flex-none px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-white/5 border-white/20 text-white'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition text-sm"
                >
                  <FaUserPlus /> Add
                </button>
                
                <button
                  onClick={exportToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition text-sm"
                >
                  <FaFileExcel /> Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className={`rounded-xl border overflow-hidden ${
          theme === 'light'
            ? 'bg-white border-gray-200 shadow-sm'
            : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className={`border-b ${
                theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
              }`}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Dept
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                    Election
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-gray-100' : 'divide-white/10'
              }`}>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      No candidates found
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const status = getStatusBadge(candidate);
                    const StatusIcon = status.icon;
                    const election = elections.find(e => e.id === candidate.election_id);
                    
                    return (
                      <tr
                        key={candidate.id}
                        className={`transition ${
                          theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {candidate.image_url ? (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                <img 
                                  src={candidate.image_url} 
                                  alt={candidate.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                              }`}>
                                <FaUserCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                  theme === 'light' ? 'text-teal-500' : 'text-gray-400'
                                }`} />
                              </div>
                            )}
                            <div>
                              <div className={`font-medium text-sm sm:text-base ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                              }`}>
                                {candidate.name}
                              </div>
                              <div className={`text-xs hidden sm:block truncate max-w-[150px] ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {candidate.manifesto?.substring(0, 50)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className={`text-xs sm:text-sm ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}>
                            {candidate.position}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className={`text-xs sm:text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {candidate.department || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <div className={`flex items-center gap-1 text-xs sm:text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            <FaUniversity className="text-teal-500 text-xs" />
                            {election ? `${election.title.substring(0, 15)}...` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                            <StatusIcon className="text-xs" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!candidate.is_approved && !candidate.rejection_reason && (
                              <>
                                <button
                                  onClick={() => handleApproveCandidate(candidate)}
                                  className="text-teal-600 dark:text-teal-400 hover:text-teal-500 transition"
                                  title="Approve candidate"
                                >
                                  <FaCheckCircle />
                                </button>
                                <button
                                  onClick={() => handleRejectCandidate(candidate)}
                                  className="text-red-500 hover:text-red-600 transition"
                                  title="Reject candidate"
                                >
                                  <FaTimesCircle />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => editCandidate(candidate)}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-500 transition"
                              title="Edit candidate"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(candidate)}
                              className="text-red-500 hover:text-red-600 transition"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`rounded-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <div className={`sticky top-0 flex justify-between items-center p-4 sm:p-6 border-b ${
              theme === 'light' ? 'border-gray-200' : 'border-white/10'
            } ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
              <h2 className={`text-xl sm:text-2xl font-bold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCandidate(null);
                  resetForm();
                }}
                className={`transition ${
                  theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={editingCandidate ? handleUpdateCandidate : handleAddCandidate} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  placeholder="John Doe"
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Email (Optional)</label>
                <div className="relative">
                  <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="candidate@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>School ID (Optional)</label>
                <div className="relative">
                  <FaIdCard className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="STU-12345"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Position *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  placeholder="President"
                />
                {formErrors.position && <p className="text-red-500 text-xs mt-1">{formErrors.position}</p>}
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Department *</label>
                <div className="relative">
                  <FaBuilding className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="Computer Science"
                  />
                </div>
                {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Year of Study</label>
                <div className="relative">
                  <FaGraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Year</option>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Election *</label>
                <div className="relative">
                  <FaCalendarAlt className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <select
                    value={formData.election_id}
                    onChange={(e) => handleElectionChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.id} value={election.id}>
                        {election.title} ({election.election_year})
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.election_id && <p className="text-red-500 text-xs mt-1">{formErrors.election_id}</p>}
              </div>
              
              <input type="hidden" value={formData.voting_period_id} />
              {formErrors.voting_period_id && <p className="text-red-500 text-xs mt-1">{formErrors.voting_period_id}</p>}
              
              {/* Image Upload Section */}
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Candidate Photo</label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {imagePreview && (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 bg-red-600 rounded-full p-1 hover:bg-red-500 transition"
                      >
                        <FaTrashAlt className="text-white text-xs" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex-1 w-full">
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="candidate-image"
                      />
                      <label
                        htmlFor="candidate-image"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition group ${
                          theme === 'light'
                            ? 'border-gray-300 hover:border-teal-500 bg-gray-50'
                            : 'border-gray-600 hover:border-teal-500 bg-gray-700'
                        }`}
                      >
                        {uploadingImage ? (
                          <FaSpinner className="animate-spin text-teal-500" />
                        ) : (
                          <>
                            <FaCamera className={`transition ${
                              theme === 'light' ? 'text-gray-400 group-hover:text-teal-500' : 'text-gray-500 group-hover:text-teal-400'
                            }`} />
                            <span className={`text-sm transition ${
                              theme === 'light' ? 'text-gray-600 group-hover:text-teal-600' : 'text-gray-400 group-hover:text-teal-400'
                            }`}>
                              {imagePreview ? 'Change Photo' : 'Click to Upload Photo'}
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className={`text-xs mt-2 ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Supported: JPEG, PNG, GIF, WebP. Max 5MB
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>Manifesto *</label>
                <textarea
                  value={formData.manifesto}
                  onChange={(e) => setFormData({...formData, manifesto: e.target.value})}
                  rows={5}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  placeholder="Write your manifesto here... (minimum 100 characters)"
                />
                {formErrors.manifesto && <p className="text-red-500 text-xs mt-1">{formErrors.manifesto}</p>}
                <p className={`text-xs mt-1 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {formData.manifesto?.length || 0}/2000 characters (minimum 100)
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_approved"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({...formData, is_approved: e.target.checked})}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="is_approved" className={`text-sm ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
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
                  disabled={submitting || uploadingImage}
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting || uploadingImage ? <FaSpinner className="animate-spin mx-auto" /> : (editingCandidate ? 'Update Candidate' : 'Add Candidate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-4 sm:p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>Confirm Delete</h2>
            <p className={`text-sm sm:text-base mb-6 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              Are you sure you want to delete <strong className={theme === 'light' ? 'text-gray-900' : 'text-white'}>{showDeleteConfirm.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg transition text-sm ${
                  theme === 'light'
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCandidate(showDeleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition text-sm"
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