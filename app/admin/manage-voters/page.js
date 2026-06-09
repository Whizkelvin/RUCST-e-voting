// app/admin/manage-voters/page.js - Updated for proper schema
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaUserPlus, 
  FaTrash, 
  FaEdit, 
  FaSpinner, 
  FaSearch, 
  FaDownload, 
  FaUpload,
  FaEnvelope,
  FaIdCard,
  FaGraduationCap,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaSun,
  FaMoon,
  FaUsers,
  FaVoteYea,
  FaClock,
  FaUserGraduate,
  FaChartLine,
  FaFileExcel,
  FaUniversity,
  FaCalendarAlt,
  FaTrashAlt,
  FaLink,
  FaUnlink
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

// Department and Programs Data
const departmentsData = {
  FECAS: {
    name: 'FECAS - Faculty of Engineering, Computing and Applied Sciences',
    programs: [
      'BSc. Computer Science',
      'BSc. Information Technology',
      'BEng. Applied Electronics & Systems Engineering'
    ]
  },
  SBLL: {
    name: 'SBLL - School of Business, Law and Languages',
    programs: [
      'BSc. Accounting and Information Systems',
      'Bachelor of Business Administration (e-commerce Option)',
      'BSc. Management with Computing (Human Resource Management and Marketing Management Options)'
    ]
  },
  FAS: {
    name: 'FAS - Faculty of Arts and Sciences',
    programs: [
      'BSc. Psychology',
      'Bachelor of Theology with Management'
    ]
  }
};

export default function ManageVoters() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [voters, setVoters] = useState([]);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkLinkConfirm, setShowBulkLinkConfirm] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [theme, setTheme] = useState('light');
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [selectedVoters, setSelectedVoters] = useState(new Set());
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    school_id: '',
    department: '',
    program: '',
    year_of_study: '',
    election_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    voted: 0,
    notVoted: 0,
    turnout: 0
  });
  const router = useRouter();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('voterTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('voterTheme', theme);
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
      fetchElections();
      fetchVoters();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchElections = async () => {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('id, title, status, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElections(data || []);
    } catch (error) {
      console.error('Error fetching elections:', error);
      toast.error('Failed to load elections');
    }
  };

  const fetchVoters = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('voters')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: allVoters, error: votersError } = await query;

      if (votersError) throw votersError;

      // If an election is selected, get the linked voters from election_voters
      if (selectedElection) {
        const { data: linkedVoters, error: linkError } = await supabase
          .from('election_voters')
          .select('voter_id, has_voted, voted_at')
          .eq('election_id', selectedElection)
          .eq('status', 'active');

        if (linkError) throw linkError;

        const linkedVoterIds = new Set(linkedVoters?.map(lv => lv.voter_id) || []);
        const votedMap = new Map(linkedVoters?.map(lv => [lv.voter_id, { has_voted: lv.has_voted, voted_at: lv.voted_at }]) || []);

        // Filter voters linked to this election and add voting status
        const filteredVoters = allVoters
          .filter(v => linkedVoterIds.has(v.id))
          .map(v => ({
            ...v,
            has_voted: votedMap.get(v.id)?.has_voted || false,
            voted_at: votedMap.get(v.id)?.voted_at || null
          }));

        setVoters(filteredVoters);
        
        const voted = filteredVoters.filter(v => v.has_voted === true).length;
        const notVoted = filteredVoters.filter(v => v.has_voted === false).length;
        const turnout = filteredVoters?.length > 0 ? ((voted / filteredVoters.length) * 100).toFixed(1) : 0;
        
        setStats({
          total: filteredVoters.length,
          voted,
          notVoted,
          turnout
        });
      } else {
        // Show all voters with a flag indicating if they're linked to any election
        setVoters(allVoters);
        setStats({
          total: allVoters.length,
          voted: 0,
          notVoted: allVoters.length,
          turnout: 0
        });
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
      toast.error('Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVoters();
    }
  }, [selectedElection]);

  const capitalizeName = (name) => {
    let cleanedName = name.replace(/[0-9]/g, '');
    return cleanedName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const validateNameNoNumbers = (name) => {
    const hasNumbers = /\d/.test(name);
    if (hasNumbers) {
      return { isValid: false, error: 'Name cannot contain numbers. Please use letters only.' };
    }
    return { isValid: true, error: null };
  };

  const handleDepartmentChange = (deptKey) => {
    setFormData({ 
      ...formData, 
      department: deptKey,
      program: ''
    });
    
    if (deptKey && departmentsData[deptKey]) {
      setAvailablePrograms(departmentsData[deptKey].programs);
    } else {
      setAvailablePrograms([]);
    }
  };

  const handleNameChange = (e) => {
    const rawName = e.target.value;
    const capitalized = capitalizeName(rawName);
    setFormData({ ...formData, name: capitalized });
    
    const validation = validateNameNoNumbers(capitalized);
    if (!validation.isValid && capitalized) {
      setFormErrors({ ...formErrors, name: validation.error });
    } else {
      setFormErrors({ ...formErrors, name: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@regent\.edu\.gh$/i.test(formData.email)) {
      errors.email = 'Must be a valid @regent.edu.gh email';
    }
    
    if (!formData.name) {
      errors.name = 'Name is required';
    } else {
      const nameValidation = validateNameNoNumbers(formData.name);
      if (!nameValidation.isValid) {
        errors.name = nameValidation.error;
      }
    }
    
    if (!formData.school_id) {
      errors.school_id = 'School ID is required';
    } else if (!/^[0-9]{8}$/.test(formData.school_id)) {
      errors.school_id = 'School ID must be 8 digits';
    }
    
    if (!formData.department) {
      errors.department = 'Department is required';
    }
    
    if (!formData.program) {
      errors.program = 'Program of study is required';
    }
    
    if (!formData.year_of_study) {
      errors.year_of_study = 'Year of study is required';
    }
    
    if (!formData.election_id && selectedElection) {
      errors.election_id = 'Please select an election';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // First, check if voter already exists in voters table (unique by email)
      let voterId;
      const { data: existingVoter, error: findError } = await supabase
        .from('voters')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();
      
      if (existingVoter) {
        voterId = existingVoter.id;
      } else {
        // Create new voter in voters table
        const { data: newVoter, error: createError } = await supabase
          .from('voters')
          .insert({
            email: formData.email.toLowerCase(),
            name: formData.name,
            school_id: formData.school_id,
            department: formData.department,
            program: formData.program,
            year_of_study: parseInt(formData.year_of_study),
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        voterId = newVoter.id;
      }
      
      // Now link the voter to the selected election
      const electionId = formData.election_id || selectedElection;
      
      if (!electionId) {
        toast.error('Please select an election');
        setSubmitting(false);
        return;
      }
      
      const { error: linkError } = await supabase
        .from('election_voters')
        .insert({
          election_id: electionId,
          voter_id: voterId,
          has_voted: false,
          status: 'active',
          created_at: new Date().toISOString()
        });
      
      if (linkError) {
        if (linkError.code === '23505') {
          toast.error('Voter is already registered for this election');
        } else {
          throw linkError;
        }
      } else {
        toast.success('Voter added successfully to election!');
      }
      
      setShowAddModal(false);
      resetForm();
      fetchVoters();
      
    } catch (error) {
      console.error('Error adding voter:', error);
      toast.error('Failed to add voter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditVoter = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Update the voter in voters table
      const { error } = await supabase
        .from('voters')
        .update({
          name: formData.name,
          school_id: formData.school_id,
          department: formData.department,
          program: formData.program,
          year_of_study: parseInt(formData.year_of_study),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingVoter.id);
      
      if (error) throw error;
      
      toast.success('Voter updated successfully!');
      setShowEditModal(false);
      setEditingVoter(null);
      resetForm();
      fetchVoters();
      
    } catch (error) {
      console.error('Error updating voter:', error);
      toast.error('Failed to update voter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVoter = async (voterId) => {
    try {
      if (selectedElection) {
        // Only remove from current election, don't delete the voter entirely
        const { error } = await supabase
          .from('election_voters')
          .delete()
          .eq('election_id', selectedElection)
          .eq('voter_id', voterId);
        
        if (error) throw error;
        toast.success('Voter removed from this election');
      } else {
        // Delete voter entirely (only if not linked to any election)
        const { error } = await supabase
          .from('voters')
          .delete()
          .eq('id', voterId);
        
        if (error) throw error;
        toast.success('Voter deleted successfully');
      }
      
      setShowDeleteConfirm(null);
      fetchVoters();
      
    } catch (error) {
      console.error('Error deleting voter:', error);
      toast.error('Failed to delete voter');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVoters.size === 0) {
      toast.error('No voters selected');
      return;
    }

    try {
      const selectedVotersList = Array.from(selectedVoters);
      
      if (selectedElection) {
        // Remove from current election only
        const { error: deleteError } = await supabase
          .from('election_voters')
          .delete()
          .eq('election_id', selectedElection)
          .in('voter_id', selectedVotersList);

        if (deleteError) throw deleteError;
        toast.success(`Successfully removed ${selectedVoters.size} voters from this election`);
      } else {
        // Delete voters entirely
        const { error: deleteError } = await supabase
          .from('voters')
          .delete()
          .in('id', selectedVotersList);

        if (deleteError) throw deleteError;
        toast.success(`Successfully deleted ${selectedVoters.size} voters`);
      }
      
      setSelectedVoters(new Set());
      setShowBulkDeleteConfirm(false);
      fetchVoters();
    } catch (error) {
      console.error('Error bulk deleting voters:', error);
      toast.error('Failed to delete voters');
    }
  };

  const handleBulkLink = async () => {
    if (selectedVoters.size === 0) {
      toast.error('No voters selected');
      return;
    }

    if (!selectedElection) {
      toast.error('Please select an election first');
      return;
    }

    try {
      const selectedVotersList = Array.from(selectedVoters);
      let successCount = 0;
      let errorCount = 0;

      for (const voterId of selectedVotersList) {
        const { error } = await supabase
          .from('election_voters')
          .insert({
            election_id: selectedElection,
            voter_id: voterId,
            has_voted: false,
            status: 'active',
            created_at: new Date().toISOString()
          });
        
        if (error) {
          if (error.code !== '23505') { // Not a duplicate error
            errorCount++;
          }
        } else {
          successCount++;
        }
      }
      
      toast.success(`Linked ${successCount} voters to election. ${errorCount} failed or already linked`);
      setSelectedVoters(new Set());
      setShowBulkLinkConfirm(false);
      fetchVoters();
    } catch (error) {
      console.error('Error bulk linking voters:', error);
      toast.error('Failed to link voters');
    }
  };

  const handleSelectAll = () => {
    if (selectedVoters.size === filteredVoters.length) {
      setSelectedVoters(new Set());
    } else {
      const newSelected = new Set();
      filteredVoters.forEach(voter => {
        newSelected.add(voter.id);
      });
      setSelectedVoters(newSelected);
    }
  };

  const handleSelectVoter = (voterId) => {
    const newSelected = new Set(selectedVoters);
    if (newSelected.has(voterId)) {
      newSelected.delete(voterId);
    } else {
      newSelected.add(voterId);
    }
    setSelectedVoters(newSelected);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      school_id: '',
      department: '',
      program: '',
      year_of_study: '',
      election_id: selectedElection || ''
    });
    setAvailablePrograms([]);
    setFormErrors({});
  };

  const openEditModal = (voter) => {
    setEditingVoter(voter);
    setFormData({
      email: voter.email,
      name: voter.name,
      school_id: voter.school_id,
      department: voter.department || '',
      program: voter.program || '',
      year_of_study: voter.year_of_study?.toString() || '',
      election_id: selectedElection || ''
    });
    
    if (voter.department && departmentsData[voter.department]) {
      setAvailablePrograms(departmentsData[voter.department].programs);
    }
    
    setShowEditModal(true);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Name': 'John Doe',
        'Email': 'john.doe@regent.edu.gh',
        'School ID': '12345678',
        'Department': 'FECAS',
        'Program': 'BSc. Computer Science',
        'Year of Study': 100
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 35 },
      { wch: 15 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voters_Template');
    XLSX.writeFile(wb, `voter_upload_template_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Template downloaded!');
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedElection) {
      toast.error('Please select an election first');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of jsonData) {
          try {
            const name = row.Name || row.name;
            const email = row.Email || row.email;
            const school_id = row['School ID'] || row.school_id;
            const department = row.Department || row.department;
            const program = row.Program || row.program;
            const year_of_study = row['Year of Study'] || row.year_of_study;
            
            if (!name || !email || !school_id || !department || !program) {
              errorCount++;
              continue;
            }
            
            if (/\d/.test(name)) {
              errorCount++;
              continue;
            }
            
            if (!email.toLowerCase().endsWith('@regent.edu.gh')) {
              errorCount++;
              continue;
            }
            
            const schoolIdStr = school_id.toString().padStart(8, '0');
            if (!/^[0-9]{8}$/.test(schoolIdStr)) {
              errorCount++;
              continue;
            }
            
            // Find or create voter
            let voterId;
            const { data: existingVoter } = await supabase
              .from('voters')
              .select('id')
              .eq('email', email.toLowerCase())
              .maybeSingle();
            
            if (existingVoter) {
              voterId = existingVoter.id;
            } else {
              const { data: newVoter, error: createError } = await supabase
                .from('voters')
                .insert({
                  email: email.toLowerCase(),
                  name: name,
                  school_id: schoolIdStr,
                  department: department,
                  program: program,
                  year_of_study: parseInt(year_of_study) || 100,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (createError) throw createError;
              voterId = newVoter.id;
            }
            
            // Link to election
            const { error: linkError } = await supabase
              .from('election_voters')
              .insert({
                election_id: selectedElection,
                voter_id: voterId,
                has_voted: false,
                status: 'active',
                created_at: new Date().toISOString()
              });
            
            if (linkError && linkError.code !== '23505') throw linkError;
            successCount++;
            
          } catch (err) {
            errorCount++;
          }
        }
        
        toast.success(`✅ Added ${successCount} voters to election. ❌ Failed: ${errorCount}`);
        fetchVoters();
        
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Failed to process file');
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const exportToExcel = () => {
    const exportData = voters.map(voter => ({
      'Name': voter.name,
      'Email': voter.email,
      'School ID': voter.school_id,
      'Department': voter.department,
      'Program': voter.program,
      'Year': voter.year_of_study,
      'Has Voted': voter.has_voted ? 'Yes' : 'No',
      'Voted At': voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'Not voted'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voters');
    XLSX.writeFile(wb, `voters_${selectedElection || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export successful!');
  };

  const filteredVoters = voters.filter(voter =>
    (voter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.school_id?.includes(searchTerm))
  );

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>Loading voters...</p>
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

      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: theme === 'light' ? '#166534' : '#fbbf24',
          color: theme === 'light' ? '#ffffff' : '#1f2937',
        }}
      >
        {theme === 'light' ? <FaMoon size={20} /> : <FaSun size={20} />}
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            Manage Voters
          </h1>
          <p className={`mt-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
            Add, edit, or remove voters from specific elections
          </p>
          <p className="text-green-700 dark:text-green-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Election Selector */}
        <div className={`rounded-xl p-4 border mb-8 ${
          theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <label className={`block mb-2 font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            <FaCalendarAlt className="inline mr-2" /> Select Election
          </label>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className={`w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-white/5 border-white/20 text-white'
            }`}
          >
            <option value="">All Voters (View Only)</option>
            {elections.map(election => (
              <option key={election.id} value={election.id}>
                {election.title} ({election.status}) {election.is_active ? '- Active' : ''}
              </option>
            ))}
          </select>
          {!selectedElection && (
            <p className={`text-xs mt-2 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}>
              ⚠️ Select an election to add, edit, or remove voters. "All Voters" is view-only.
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${
            theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-white/70'}`}>Total Voters</p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{stats.total}</p>
              </div>
              <FaUsers className="text-2xl text-green-600" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-white/70'}`}>Have Voted</p>
                <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{stats.voted}</p>
              </div>
              <FaCheckCircle className="text-2xl text-green-600" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-white/70'}`}>Not Voted</p>
                <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{stats.notVoted}</p>
              </div>
              <FaTimesCircle className="text-2xl text-green-600" />
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${
            theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-white/70'}`}>Turnout</p>
                <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{stats.turnout}%</p>
              </div>
              <FaChartLine className="text-2xl text-green-600" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-8 ${
          theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                <input
                  type="text"
                  placeholder="Search by name, email, or school ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-white/5 border-white/20 text-white'
                  }`}
                />
              </div>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={() => {
                  if (!selectedElection) {
                    toast.error('Please select an election first');
                    return;
                  }
                  setShowAddModal(true);
                  setFormData({...formData, election_id: selectedElection});
                }} 
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition"
              >
                <FaUserPlus /> Add Voter
              </button>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition">
                <FaFileExcel /> Download Template
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition cursor-pointer">
                <FaUpload /> Bulk Upload
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} className="hidden" disabled={!selectedElection} />
              </label>
              {selectedVoters.size > 0 && selectedElection && (
                <button 
                  onClick={() => setShowBulkLinkConfirm(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
                >
                  <FaLink /> Link Selected ({selectedVoters.size})
                </button>
              )}
              {selectedVoters.size > 0 && (
                <button 
                  onClick={() => setShowBulkDeleteConfirm(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
                >
                  <FaTrashAlt /> {selectedElection ? 'Remove from Election' : 'Delete'} ({selectedVoters.size})
                </button>
              )}
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition">
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Voters Table */}
        <div className={`rounded-xl border overflow-hidden ${
          theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className={`border-b ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedVoters.size === filteredVoters.length && filteredVoters.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">School ID</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden md:table-cell">Department</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden lg:table-cell">Program</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">Year</th>
                  {selectedElection && (
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                  )}
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-100' : 'divide-white/10'}`}>
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={selectedElection ? 9 : 8} className="px-6 py-12 text-center text-gray-400">
                      {selectedElection ? 'No voters found for this election' : 'No voters found'}
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter) => (
                    <tr key={voter.id} className={`transition ${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedVoters.has(voter.id)}
                          onChange={() => handleSelectVoter(voter.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaUserGraduate className="text-green-600 text-sm" />
                          <div className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{voter.name}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaEnvelope className="text-green-600 text-xs" />
                          <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{voter.email}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaIdCard className="text-green-600 text-xs" />
                          <code className={`text-sm font-mono ${theme === 'light' ? 'text-green-700' : 'text-green-400'}`}>{voter.school_id}</code>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-green-600 text-xs" />
                          <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            {voter.department || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <FaUniversity className="text-green-600 text-xs" />
                          <div className={`text-sm truncate max-w-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            {voter.program || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <FaGraduationCap className="text-green-600 text-xs" />
                          <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            Level {voter.year_of_study}
                          </div>
                        </div>
                      </td>
                      {selectedElection && (
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {voter.has_voted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                              <FaCheckCircle size={10} /> Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                              <FaClock size={10} /> Not Voted
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(voter)} className="text-green-700 dark:text-green-400 hover:text-green-600 transition" title="Edit voter">
                            <FaEdit />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(voter.id)} className={`text-red-500 transition hover:text-red-600`} title="Delete voter">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`rounded-xl max-w-md w-full p-6 my-8 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Add New Voter</h2>
            
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Election *</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.election_id}
                    onChange={(e) => setFormData({...formData, election_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.id} value={election.id}>
                        {election.title} ({election.status})
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.election_id && <p className="text-red-500 text-xs mt-1">{formErrors.election_id}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Full Name *</label>
                <div className="relative">
                  <FaUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 capitalize ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Email *</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="john.doe@regent.edu.gh"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>School ID *</label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>
                {formErrors.school_id && <p className="text-red-500 text-xs mt-1">{formErrors.school_id}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Department *</label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {Object.entries(departmentsData).map(([key, dept]) => (
                      <option key={key} value={key}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Program of Study *</label>
                <div className="relative">
                  <FaUniversity className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({...formData, program: e.target.value})}
                    disabled={!formData.department}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      !formData.department ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">{formData.department ? 'Select Program' : 'Select Department First'}</option>
                    {availablePrograms.map((program, idx) => (
                      <option key={idx} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                {formErrors.program && <p className="text-red-500 text-xs mt-1">{formErrors.program}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Year of Study *</label>
                <div className="relative">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Year</option>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                  </select>
                </div>
                {formErrors.year_of_study && <p className="text-red-500 text-xs mt-1">{formErrors.year_of_study}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className={`flex-1 px-4 py-2 rounded-lg transition ${
                  theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}>Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition disabled:opacity-50">
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Add Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Voter Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`rounded-xl max-w-md w-full p-6 my-8 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Edit Voter</h2>
            
            <form onSubmit={handleEditVoter} className="space-y-4">
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Full Name *</label>
                <div className="relative">
                  <FaUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 capitalize ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Email *</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>School ID *</label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    maxLength="8"
                  />
                </div>
                {formErrors.school_id && <p className="text-red-500 text-xs mt-1">{formErrors.school_id}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Department *</label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {Object.entries(departmentsData).map(([key, dept]) => (
                      <option key={key} value={key}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                {formErrors.department && <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Program of Study *</label>
                <div className="relative">
                  <FaUniversity className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({...formData, program: e.target.value})}
                    disabled={!formData.department}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      !formData.department ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">{formData.department ? 'Select Program' : 'Select Department First'}</option>
                    {availablePrograms.map((program, idx) => (
                      <option key={idx} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                {formErrors.program && <p className="text-red-500 text-xs mt-1">{formErrors.program}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Year of Study *</label>
                <div className="relative">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select Year</option>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                  </select>
                </div>
                {formErrors.year_of_study && <p className="text-red-500 text-xs mt-1">{formErrors.year_of_study}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingVoter(null); resetForm(); }} className={`flex-1 px-4 py-2 rounded-lg transition ${
                  theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}>Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg text-white transition disabled:opacity-50">
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Update Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Confirm Delete</h2>
            <p className={`mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              {selectedElection 
                ? 'Are you sure you want to remove this voter from the current election?' 
                : 'Are you sure you want to delete this voter? This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className={`flex-1 px-4 py-2 rounded-lg transition ${
                theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}>Cancel</button>
              <button onClick={() => handleDeleteVoter(showDeleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Confirm Bulk Action</h2>
            <p className={`mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              {selectedElection 
                ? `Are you sure you want to remove ${selectedVoters.size} voters from this election?`
                : `Are you sure you want to delete ${selectedVoters.size} voters? This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className={`flex-1 px-4 py-2 rounded-lg transition ${
                theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}>Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Link Confirmation Modal */}
      {showBulkLinkConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Confirm Bulk Link</h2>
            <p className={`mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              Are you sure you want to link {selectedVoters.size} voters to the selected election?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkLinkConfirm(false)} className={`flex-1 px-4 py-2 rounded-lg transition ${
                theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}>Cancel</button>
              <button onClick={handleBulkLink} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition">Confirm Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}