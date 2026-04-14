// app/admin/manage-roles/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaUsers, 
  FaUserTie, 
  FaUniversity, 
  FaChalkboardTeacher,
  FaSearch,
  FaSpinner,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaBuilding,
  FaGraduationCap,
  FaTimes,
  FaDownload,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaSun,
  FaMoon,
  FaCheckCircle,
  FaTimesCircle,
  FaUserShield
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ManageRoles() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: '',
    department: '',
    faculty: '',
    password: '',
    school_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const roleTypes = [
    { value: 'electoral_commission', label: 'Electoral Commission', icon: FaUniversity, color: 'emerald' },
    { value: 'dean', label: 'Dean', icon: FaUniversity, color: 'purple' },
    { value: 'hod', label: 'Head of Department', icon: FaChalkboardTeacher, color: 'blue' },
    { value: 'it_admin', label: 'IT Admin', icon: FaUserTie, color: 'cyan' },
    { value: 'admin', label: 'Super Admin', icon: FaUserShield, color: 'red' }
  ];

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('rolesTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('rolesTheme', theme);
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
      fetchRoles();
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch all admins from the admins table
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
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
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    if (!editingRole && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (!editingRole && formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.role === 'hod' && !formData.department) {
      errors.department = 'Department is required for HOD';
    }
    
    if (formData.role === 'dean' && !formData.faculty) {
      errors.faculty = 'Faculty is required for Dean';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getRoleLabel = (role) => {
    const roleType = roleTypes.find(r => r.value === role);
    return roleType?.label || role;
  };

  const getRoleIcon = (role) => {
    const roleType = roleTypes.find(r => r.value === role);
    const Icon = roleType?.icon || FaUsers;
    return Icon;
  };

  const getRoleColor = (role) => {
    const roleType = roleTypes.find(r => r.value === role);
    switch(roleType?.color) {
      case 'emerald': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'purple': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'blue': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'cyan': return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400';
      case 'red': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  // Add new admin - creates user in Supabase Auth AND adds to admins table
 const handleAddRole = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setSubmitting(true);
  try {
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.toLowerCase(),
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          role: formData.role,
          department: formData.department,
          faculty: formData.faculty
        }
      }
    });
    
    if (authError) throw authError;
    
    if (!authData.user) {
      throw new Error('Failed to create user');
    }
    
    // IMPORTANT: Get the admin's INTEGER ID from the admins table
    // First, find the current admin's record to get their INTEGER ID
    const { data: currentAdmin, error: currentAdminError } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', admin?.auth_user_id)  // Use auth_user_id if you have it
      .single();
    
    if (currentAdminError) {
      console.error('Error finding current admin:', currentAdminError);
    }
    
    // Step 2: Insert into admins table - CORRECT MAPPING
    const insertData = {
      email: formData.email.toLowerCase(),
      name: formData.name,
      role: formData.role,
      auth_user_id: authData.user.id,  // ← UUID goes to auth_user_id column
      school_id: formData.school_id || null,
      department: formData.role === 'hod' ? formData.department : null,
      faculty: formData.role === 'dean' ? formData.faculty : null,
      is_active: true,
      created_by: currentAdmin?.id || admin?.id,  // ← INTEGER goes to created_by
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting data:', insertData); // Debug log
    
    const { error: insertError } = await supabase
      .from('admins')
      .insert(insertData);
    
    if (insertError) {
      console.error('Insert error:', insertError);
      toast.error('Failed to add role: ' + insertError.message);
      setSubmitting(false);
      return;
    }
    
    toast.success(`${formData.name} added as ${getRoleLabel(formData.role)} successfully!`);
    toast.info(`Temporary password sent to ${formData.email}`);
    
    setShowAddModal(false);
    resetForm();
    fetchRoles();
    
  } catch (error) {
    console.error('Error adding role:', error);
    toast.error('Failed to add role: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};

  // Update existing admin
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Update admins table
      const updateData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        updated_at: new Date().toISOString()
      };
      
      if (formData.school_id) updateData.school_id = formData.school_id;
      if (formData.role === 'hod' && formData.department) updateData.department = formData.department;
      if (formData.role === 'dean' && formData.faculty) updateData.faculty = formData.faculty;
      
      const { error: updateError } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', editingRole.id);
      
      if (updateError) throw updateError;
      
      // Update password if provided
      if (formData.password && editingRole.auth_user_id) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingRole.auth_user_id,
          { password: formData.password }
        );
        
        if (passwordError) {
          console.error('Error updating password:', passwordError);
          toast.warning('Role updated but password could not be changed');
        } else {
          toast.info('Password has been updated');
        }
      }
      
      toast.success('Role updated successfully!');
      setShowAddModal(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
      
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setSubmitting(false);
    }

    const insertData = {
    email: formData.email.toLowerCase(),
    name: formData.name,
    role: formData.role,
    auth_user_id: authData.user.id,  // UUID from new user
    school_id: formData.school_id || null,
    department: formData.role === 'hod' ? formData.department : null,
    faculty: formData.role === 'dean' ? formData.faculty : null,
    is_active: true,
    created_by: admin?.id,  // ✅ Now this is INTEGER (e.g., 1, 2, 3)
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  };

  // Delete admin - removes from admins table (optionally from Auth)
  const handleDeleteRole = async (roleId) => {
    try {
      const roleToDelete = roles.find(r => r.id === roleId);
      
      // Delete from admins table
      const { error: deleteError } = await supabase
        .from('admins')
        .delete()
        .eq('id', roleId);
      
      if (deleteError) throw deleteError;
      
      // Optionally delete from Supabase Auth
      if (roleToDelete.auth_user_id) {
        // Note: This requires admin privileges and service role key
        // You might want to skip this or handle it separately
        console.log(`Auth user ${roleToDelete.auth_user_id} needs to be deleted manually or via API`);
      }
      
      toast.success(`Removed ${roleToDelete.name} from ${getRoleLabel(roleToDelete.role)}`);
      setShowDeleteConfirm(null);
      fetchRoles();
      
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to remove role');
    }
  };

  const handleToggleStatus = async (role) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ is_active: !role.is_active })
        .eq('id', role.id);
      
      if (error) throw error;
      
      toast.success(`${role.name} ${!role.is_active ? 'activated' : 'deactivated'}`);
      fetchRoles();
      
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: '',
      department: '',
      faculty: '',
      password: '',
      school_id: ''
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const editRole = (role) => {
    setEditingRole(role);
    setFormData({
      email: role.email,
      name: role.name,
      role: role.role,
      department: role.department || '',
      faculty: role.faculty || '',
      school_id: role.school_id || '',
      password: ''
    });
    setShowAddModal(true);
  };

  const exportToExcel = () => {
    const exportData = roles.map(role => ({
      'Name': role.name,
      'Email': role.email,
      'Role': getRoleLabel(role.role),
      'School ID': role.school_id || 'N/A',
      'Department': role.department || 'N/A',
      'Faculty': role.faculty || 'N/A',
      'Status': role.is_active ? 'Active' : 'Inactive',
      'Created At': new Date(role.created_at).toLocaleString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admin Roles');
    XLSX.writeFile(wb, `admin_roles_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export successful!');
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = 
      role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || role.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: roles.length,
    electoral_commission: roles.filter(r => r.role === 'electoral_commission').length,
    dean: roles.filter(r => r.role === 'dean').length,
    hod: roles.filter(r => r.role === 'hod').length,
    it_admin: roles.filter(r => r.role === 'it_admin').length,
    admin: roles.filter(r => r.role === 'admin').length
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-emerald-500 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>Loading...</p>
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

      {/* Theme Toggle */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            Manage Admin Roles
          </h1>
          <p className={`mt-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
            Manage Electoral Commission, Deans, HODs, IT Admins, and Super Admins
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">EC</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.electoral_commission}</p>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">Deans</p>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.dean}</p>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">HODs</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.hod}</p>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">IT Admins</p>
            <p className="text-2xl font-bold mt-1 text-cyan-600">{stats.it_admin}</p>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
            <p className="text-xs text-gray-500 dark:text-white/70">Super Admins</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.admin}</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className={`rounded-xl p-4 border mb-6 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/5 border-white/20 text-white'
                }`}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/5 border-white/20 text-white'
                }`}
              >
                <option value="all">All Roles</option>
                {roleTypes.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setEditingRole(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition"
              >
                <FaPlus /> Add Admin
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition"
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className={`rounded-xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white/10 backdrop-blur-lg border-white/20'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-100' : 'divide-white/10'}`}>
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      No admin roles found
                     </td>
                   </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const RoleIcon = getRoleIcon(role.role);
                    return (
                      <tr key={role.id} className={`transition ${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <RoleIcon className="text-emerald-500" />
                            </div>
                            <div>
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-gray-500">{role.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getRoleColor(role.role)}`}>
                            <RoleIcon className="text-sm" />
                            {getRoleLabel(role.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {role.department && <div className="text-sm">📚 {role.department}</div>}
                          {role.faculty && <div className="text-sm">🎓 {role.faculty}</div>}
                          {role.school_id && <div className="text-sm text-gray-400">ID: {role.school_id}</div>}
                          {!role.department && !role.faculty && <div className="text-sm text-gray-400">—</div>}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(role)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                              role.is_active
                                ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                            }`}
                          >
                            {role.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => editRole(role)} className="text-blue-500 hover:text-blue-600" title="Edit">
                              <FaEdit />
                            </button>
                            <button onClick={() => setShowDeleteConfirm(role)} className="text-red-500 hover:text-red-600" title="Delete">
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {editingRole ? 'Edit Admin' : 'Add New Admin'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingRole(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={editingRole ? handleUpdateRole : handleAddRole} className="space-y-4">
              <div>
                <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  placeholder="name@regent.edu.gh"
                  required
                />
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  School ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.school_id}
                  onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  placeholder="8-digit School ID"
                  maxLength={8}
                />
                <p className="text-xs text-gray-400 mt-1">Optional: For identification purposes</p>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="electoral_commission">Electoral Commission</option>
                  <option value="dean">Dean</option>
                  <option value="hod">Head of Department</option>
                  <option value="it_admin">IT Admin</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              
              {formData.role === 'hod' && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Department *
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="e.g., Computer Science"
                  />
                </div>
              )}
              
              {formData.role === 'dean' && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Faculty *
                  </label>
                  <input
                    type="text"
                    value={formData.faculty}
                    onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="e.g., Faculty of Science and Technology"
                  />
                </div>
              )}
              
              {!editingRole && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Temporary Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="Enter temporary password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                        theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, password: generateRandomPassword()})}
                    className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                  >
                    Generate Random Password
                  </button>
                  {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    User will need this to login for the first time
                  </p>
                </div>
              )}
              
              {editingRole && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Reset Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="Leave blank to keep current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                        theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, password: generateRandomPassword()})}
                    className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                  >
                    Generate Random Password
                  </button>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingRole(null); resetForm(); }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    theme === 'light' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition disabled:opacity-50"
                >
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : (editingRole ? 'Update' : 'Add')}
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
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              Confirm Remove
            </h2>
            <p className={`mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
              Are you sure you want to remove <strong>{showDeleteConfirm.name}</strong> from <strong>{getRoleLabel(showDeleteConfirm.role)}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  theme === 'light' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRole(showDeleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}