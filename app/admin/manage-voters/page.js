// app/admin/manage-voters/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'react-toastify';
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
  FaFileExcel
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ManageVoters() {
    const { admin, logout } = useAdminAuth();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
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
    notVoted: 0
  });
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
    fetchVoters();
  }, []);

  const checkAdminAccess = async () => {
    // Check if user is admin (you can implement your own logic)
    const isAdmin = localStorage.getItem('user_role') === 'admin';
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    }
  };

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
      
      setStats({
        total: (data || []).length,
        voted,
        notVoted
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Manage Voters</h1>
          <p className="text-gray-300 mt-2">Add, edit, or remove voters from the election database</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Voters</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
              </div>
              <FaUserPlus className="text-4xl text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Have Voted</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{stats.voted}</p>
              </div>
              <FaCheckCircle className="text-4xl text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Not Voted</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.notVoted}</p>
              </div>
              <FaTimesCircle className="text-4xl text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or school ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition"
              >
                <FaUserPlus /> Add Voter
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition cursor-pointer">
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
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition"
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Voters Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">School ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <FaSpinner className="animate-spin text-3xl text-green-500 mx-auto" />
                    </td>
                  </tr>
                ) : filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No voters found
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter) => (
                    <tr key={voter.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-white font-medium">{voter.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300 text-sm">{voter.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-green-400 text-sm">{voter.school_id}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300 text-sm">{voter.department || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300 text-sm">Level {voter.year_of_study}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {voter.has_voted ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                            Voted
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                            Not Voted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setShowDeleteConfirm(voter.id)}
                          disabled={voter.has_voted}
                          className={`text-red-400 hover:text-red-300 transition ${
                            voter.has_voted ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={voter.has_voted ? 'Cannot delete voters who have already voted' : 'Delete voter'}
                        >
                          <FaTrash />
                        </button>
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
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Add New Voter</h2>
            
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Full Name *</label>
                <div className="relative">
                  <FaUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="John Doe"
                  />
                </div>
                {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email *</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="john.doe@regent.edu.gh"
                  />
                </div>
                {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">School ID *</label>
                <div className="relative">
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>
                {formErrors.school_id && <p className="text-red-400 text-xs mt-1">{formErrors.school_id}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Department *</label>
                <div className="relative">
                  <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="Computer Science"
                  />
                </div>
                {formErrors.department && <p className="text-red-400 text-xs mt-1">{formErrors.department}</p>}
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Year of Study *</label>
                <div className="relative">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">Select Year</option>
                    <option value="100">Level 100 </option>
                    <option value="200">Level 200 </option>
                    <option value="300">Level 300 </option>
                    <option value="400">Level 400 </option>
                  </select>
                </div>
                {formErrors.year_of_study && <p className="text-red-400 text-xs mt-1">{formErrors.year_of_study}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
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
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Add Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this voter? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
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