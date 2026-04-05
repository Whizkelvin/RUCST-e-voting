// app/admin/manage-voters/page.js
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
  FaChartLine
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ManageVoters() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingVoter, setEditingVoter] = useState(null);
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    school_id: '',
    department: '',
    year_of_study: ''
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
      fetchVoters();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchVoters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVoters(data || []);
      
      // Calculate stats
      const voted = (data || []).filter(v => v.has_voted === true).length;
      const notVoted = (data || []).filter(v => v.has_voted === false || !v.has_voted).length;
      const turnout = data?.length > 0 ? ((voted / data.length) * 100).toFixed(1) : 0;
      
      setStats({
        total: (data || []).length,
        voted,
        notVoted,
        turnout
      });
    } catch (error) {
      console.error('Error fetching voters:', error);
      toast.error('Failed to load voters');
    } finally {
      setLoading(false);
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
    }
    
    if (!formData.school_id) {
      errors.school_id = 'School ID is required';
    } else if (!/^[0-9]{8}$/.test(formData.school_id)) {
      errors.school_id = 'School ID must be 8 digits';
    }
    
    if (!formData.department) {
      errors.department = 'Department is required';
    }
    
    if (!formData.year_of_study) {
      errors.year_of_study = 'Year of study is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Check if voter already exists
      const { data: existing, error: checkError } = await supabase
        .from('voters')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();
      
      if (existing) {
        toast.error('Voter with this email already exists');
        setSubmitting(false);
        return;
      }
      
      // Check if school ID already exists
      const { data: existingSchoolId, error: schoolIdError } = await supabase
        .from('voters')
        .select('school_id')
        .eq('school_id', formData.school_id)
        .maybeSingle();
      
      if (existingSchoolId) {
        toast.error('School ID already registered');
        setSubmitting(false);
        return;
      }
      
      // Insert new voter
      const { data, error } = await supabase
        .from('voters')
        .insert({
          email: formData.email.toLowerCase(),
          name: formData.name,
          school_id: formData.school_id,
          department: formData.department,
          year_of_study: parseInt(formData.year_of_study),
          has_voted: false,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      toast.success('Voter added successfully!');
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
      // Check if email already exists (excluding current voter)
      const { data: existing, error: checkError } = await supabase
        .from('voters')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .neq('id', editingVoter.id)
        .maybeSingle();
      
      if (existing) {
        toast.error('Email already exists for another voter');
        setSubmitting(false);
        return;
      }
      
      // Check if school ID already exists (excluding current voter)
      const { data: existingSchoolId, error: schoolIdError } = await supabase
        .from('voters')
        .select('school_id')
        .eq('school_id', formData.school_id)
        .neq('id', editingVoter.id)
        .maybeSingle();
      
      if (existingSchoolId) {
        toast.error('School ID already registered to another voter');
        setSubmitting(false);
        return;
      }
      
      // Update voter
      const { error } = await supabase
        .from('voters')
        .update({
          email: formData.email.toLowerCase(),
          name: formData.name,
          school_id: formData.school_id,
          department: formData.department,
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
      // Check if voter has already voted
      const { data: voter, error: checkError } = await supabase
        .from('voters')
        .select('has_voted')
        .eq('id', voterId)
        .single();
      
      if (voter?.has_voted) {
        toast.error('Cannot delete a voter who has already voted');
        return;
      }
      
      const { error } = await supabase
        .from('voters')
        .delete()
        .eq('id', voterId);
      
      if (error) throw error;
      
      toast.success('Voter deleted successfully');
      setShowDeleteConfirm(null);
      fetchVoters();
      
    } catch (error) {
      console.error('Error deleting voter:', error);
      toast.error('Failed to delete voter');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      school_id: '',
      department: '',
      year_of_study: ''
    });
    setFormErrors({});
  };

  const openEditModal = (voter) => {
    setEditingVoter(voter);
    setFormData({
      email: voter.email,
      name: voter.name,
      school_id: voter.school_id,
      department: voter.department || '',
      year_of_study: voter.year_of_study.toString()
    });
    setShowEditModal(true);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
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
            const email = row.email || row.Email;
            const name = row.name || row.Name;
            const school_id = row.school_id || row.SchoolID;
            const department = row.department || row.Department;
            const year_of_study = row.year_of_study || row.Year;
            
            if (!email || !name || !school_id) continue;
            
            // Check if exists
            const { data: existing } = await supabase
              .from('voters')
              .select('id')
              .eq('email', email.toLowerCase())
              .maybeSingle();
            
            if (existing) {
              errorCount++;
              continue;
            }
            
            const { error } = await supabase
              .from('voters')
              .insert({
                email: email.toLowerCase(),
                name: name,
                school_id: school_id.toString().padStart(8, '0'),
                department: department || '',
                year_of_study: parseInt(year_of_study) || 100,
                has_voted: false
              });
            
            if (error) throw error;
            successCount++;
            
          } catch (err) {
            errorCount++;
            console.error('Error adding row:', err);
          }
        }
        
        toast.success(`Added ${successCount} voters. Failed: ${errorCount}`);
        fetchVoters();
        
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Failed to process file');
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset file input
  };

  const exportToExcel = () => {
    const exportData = voters.map(voter => ({
      'Name': voter.name,
      'Email': voter.email,
      'School ID': voter.school_id,
      'Department': voter.department,
      'Year': voter.year_of_study,
      'Has Voted': voter.has_voted ? 'Yes' : 'No',
      'Voted At': voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'Not voted',
      'Created At': new Date(voter.created_at).toLocaleString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voters');
    XLSX.writeFile(wb, `voters_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export successful!');
  };

  const filteredVoters = voters.filter(voter =>
    voter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.school_id?.includes(searchTerm)
  );

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>
            Loading voters...
          </p>
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
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Manage Voters
          </h1>
          <p className={`mt-2 ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
          }`}>
            Add, edit, or remove voters from the election database
          </p>
          <p className="text-teal-600 dark:text-teal-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Total Voters</p>
                <p className={`text-2xl font-bold mt-1 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>{stats.total}</p>
              </div>
              <FaUsers className="text-2xl text-teal-500" />
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
                }`}>Have Voted</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">
                  {stats.voted}
                </p>
              </div>
              <FaCheckCircle className="text-2xl text-teal-500" />
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
                }`}>Not Voted</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">
                  {stats.notVoted}
                </p>
              </div>
              <FaTimesCircle className="text-2xl text-teal-500" />
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
                }`}>Turnout</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">
                  {stats.turnout}%
                </p>
              </div>
              <FaChartLine className="text-2xl text-teal-500" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-8 ${
          theme === 'light'
            ? 'bg-white border-gray-200 shadow-sm'
            : 'bg-white/10 backdrop-blur-lg border-white/20'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, or school ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      : 'bg-white/5 border-white/20 text-white placeholder-gray-400'
                  }`}
                />
              </div>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
              >
                <FaUserPlus /> Add Voter
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition cursor-pointer">
                <FaUpload /> Bulk Upload
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Voters Table */}
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
                    Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                    Department
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                    Year
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
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No voters found
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter) => (
                    <tr
                      key={voter.id}
                      className={`transition ${
                        theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaUserGraduate className="text-teal-500 text-sm" />
                          <div className={`font-medium ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}>
                            {voter.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaEnvelope className="text-teal-500 text-xs" />
                          <div className={`text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {voter.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FaIdCard className="text-teal-500 text-xs" />
                          <code className={`text-sm font-mono ${
                            theme === 'light' ? 'text-teal-600' : 'text-teal-400'
                          }`}>
                            {voter.school_id}
                          </code>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-teal-500 text-xs" />
                          <div className={`text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {voter.department || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <FaGraduationCap className="text-teal-500 text-xs" />
                          <div className={`text-sm ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            Level {voter.year_of_study}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {voter.has_voted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs rounded-full">
                            <FaCheckCircle size={10} /> Voted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-full">
                            <FaClock size={10} /> Not Voted
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(voter)}
                            className="text-teal-600 dark:text-teal-400 hover:text-teal-500 transition"
                            title="Edit voter"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(voter.id)}
                            disabled={voter.has_voted}
                            className={`text-red-500 transition ${
                              voter.has_voted 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:text-red-600'
                            }`}
                            title={voter.has_voted ? 'Cannot delete voters who have already voted' : 'Delete voter'}
                          >
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Add New Voter
            </h2>
            
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Full Name *
                </label>
                <div className="relative">
                  <FaUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Email *
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="john.doe@regent.edu.gh"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  School ID *
                </label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>
                {formErrors.school_id && <p className="text-red-500 text-xs mt-1">{formErrors.school_id}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Department *
                </label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Year of Study *
                </label>
                <div className="relative">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                {formErrors.year_of_study && <p className="text-red-500 text-xs mt-1">{formErrors.year_of_study}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
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
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50"
                >
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Add Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Voter Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Edit Voter
            </h2>
            
            <form onSubmit={handleEditVoter} className="space-y-4">
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Full Name *
                </label>
                <div className="relative">
                  <FaUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Email *
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="john.doe@regent.edu.gh"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  School ID *
                </label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>
                {formErrors.school_id && <p className="text-red-500 text-xs mt-1">{formErrors.school_id}</p>}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Department *
                </label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                <label className={`block mb-2 ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Year of Study *
                </label>
                <div className="relative">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                {formErrors.year_of_study && <p className="text-red-500 text-xs mt-1">{formErrors.year_of_study}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingVoter(null);
                    resetForm();
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
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
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50"
                >
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
          <div className={`rounded-xl max-w-md w-full p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Confirm Delete
            </h2>
            <p className={`mb-6 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              Are you sure you want to delete this voter? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  theme === 'light'
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVoter(showDeleteConfirm)}
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