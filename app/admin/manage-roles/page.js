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
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaIdCard,
  FaBuilding,
  FaGraduationCap,
  FaTimes,
  FaDownload,
  FaUpload,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaSun,
  FaMoon,
  FaChartLine
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
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const roleTypes = [
    { value: 'ec', label: 'Electoral Commission', icon: FaUsers, color: 'teal' },
    { value: 'dean', label: 'Dean', icon: FaUniversity, color: 'teal' },
    { value: 'hod', label: 'Head of Department', icon: FaChalkboardTeacher, color: 'teal' },
    { value: 'it_admin', label: 'IT Admin', icon: FaUserTie, color: 'teal' }
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

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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

  const handleAddRole = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .eq('role', formData.role)
        .maybeSingle();
      
      if (existing) {
        toast.error(`${formData.name} already has this role assigned`);
        setSubmitting(false);
        return;
      }

      const { data: existingAuth, error: authCheckError } = await supabase.auth.admin.getUserByEmail(formData.email.toLowerCase());
      
      let authUserId = null;
      
      if (!existingAuth || existingAuth.error) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.toLowerCase(),
          password: formData.password,
          options: {
            data: {
              role: formData.role,
              name: formData.name,
              department: formData.department,
              faculty: formData.faculty
            }
          }
        });
        
        if (authError) throw authError;
        authUserId = authData.user?.id;
      } else {
        authUserId = existingAuth.user.id;
        toast.info(`${formData.email} already has an account. Assigning role only.`);
      }
      
      const insertData = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        role: formData.role,
        is_active: true,
        created_by: admin?.id,
        user_id: authUserId
      };
      
      if (formData.role === 'hod') {
        insertData.department = formData.department;
      }
      
      if (formData.role === 'dean') {
        insertData.faculty = formData.faculty;
      }
      
      const { error } = await supabase
        .from('user_roles')
        .insert(insertData);
      
      if (error) throw error;
      
      toast.success(`${formData.name} added as ${getRoleLabel(formData.role)} successfully!`);
      
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

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        updated_at: new Date().toISOString()
      };
      
      if (formData.role === 'hod') {
        updateData.department = formData.department;
      }
      
      if (formData.role === 'dean') {
        updateData.faculty = formData.faculty;
      }
      
      const { error } = await supabase
        .from('user_roles')
        .update(updateData)
        .eq('id', editingRole.id);
      
      if (error) throw error;
      
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingRole.user_id,
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
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const roleToDelete = roles.find(r => r.id === roleId);
      
      const { data: otherRoles, error: otherRolesError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('email', roleToDelete.email)
        .neq('id', roleId);
      
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
      
      if (!otherRoles || otherRoles.length === 0) {
        toast.info(`${roleToDelete.name} has no other roles. Auth account remains active.`);
      }
      
      toast.success('Role removed successfully');
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
        .from('user_roles')
        .update({ is_active: !role.is_active })
        .eq('id', role.id);
      
      if (error) throw error;
      
      toast.success(`${role.name} ${!role.is_active ? 'activated' : 'deactivated'} successfully`);
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
      password: ''
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
      password: ''
    });
    setShowAddModal(true);
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
    return 'bg-teal-500/20 text-teal-600 dark:text-teal-400';
  };

  const exportToExcel = () => {
    const exportData = roles.map(role => ({
      'Name': role.name,
      'Email': role.email,
      'Role': getRoleLabel(role.role),
      'Department': role.department || 'N/A',
      'Faculty': role.faculty || 'N/A',
      'Status': role.is_active ? 'Active' : 'Inactive',
      'Created At': new Date(role.created_at).toLocaleString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roles');
    XLSX.writeFile(wb, `roles_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    ec: roles.filter(r => r.role === 'ec').length,
    dean: roles.filter(r => r.role === 'dean').length,
    hod: roles.filter(r => r.role === 'hod').length,
    it_admin: roles.filter(r => r.role === 'it_admin').length
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === 'light' ? 'text-gray-600' : 'text-white'}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
            Manage User Roles
          </h1>
          <p className={`mt-2 ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
          }`}>
            Manage Electoral Commission, Deans, Heads of Department, and IT Admins
          </p>
          <p className="text-teal-600 dark:text-teal-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${
            theme === 'light'
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-white/10 backdrop-blur-lg border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/70'
                }`}>Total</p>
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
                }`}>EC</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.ec}</p>
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
                }`}>Deans</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.dean}</p>
              </div>
              <FaUniversity className="text-2xl text-teal-500" />
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
                }`}>HODs</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.hod}</p>
              </div>
              <FaChalkboardTeacher className="text-2xl text-teal-500" />
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
                }`}>IT Admins</p>
                <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">{stats.it_admin}</p>
              </div>
              <FaUserTie className="text-2xl text-teal-500" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-6 ${
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
                  placeholder="Search by name, email, or role..."
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
            
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-white/5 border-white/20 text-white'
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
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
              >
                <FaPlus /> Add Role
              </button>
              
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Roles Table */}
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
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Details</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-gray-100' : 'divide-white/10'
              }`}>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <FaSpinner className="animate-spin text-3xl text-teal-500 mx-auto" />
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      No roles found
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const RoleIcon = getRoleIcon(role.role);
                    return (
                      <tr
                        key={role.id}
                        className={`transition ${
                          theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                            }`}>
                              <FaUsers className={`text-sm ${
                                theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                              }`} />
                            </div>
                            <div>
                              <div className={`font-medium ${
                                theme === 'light' ? 'text-gray-900' : 'text-white'
                              }`}>
                                {role.name}
                              </div>
                              <div className={`text-sm ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {role.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getRoleColor(role.role)}`}>
                            <RoleIcon className="text-sm" />
                            <span>{getRoleLabel(role.role)}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {role.role === 'hod' && role.department && (
                            <div className={`text-sm flex items-center gap-1 ${
                              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                            }`}>
                              <FaBuilding className="text-teal-500 text-xs" />
                              <span>{role.department}</span>
                            </div>
                          )}
                          {role.role === 'dean' && role.faculty && (
                            <div className={`text-sm flex items-center gap-1 ${
                              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                            }`}>
                              <FaGraduationCap className="text-teal-500 text-xs" />
                              <span>{role.faculty}</span>
                            </div>
                          )}
                          {role.role === 'ec' && (
                            <div className={`text-sm ${
                              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              Electoral Commission Member
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(role)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                              role.is_active
                                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 hover:bg-teal-500/30'
                                : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                            }`}
                          >
                            {role.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => editRole(role)}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-500 transition"
                              title="Edit role"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(role)}
                              className="text-red-500 hover:text-red-600 transition"
                              title="Remove role"
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

      {/* Add/Edit Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRole(null);
                  resetForm();
                }}
                className={`transition ${
                  theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={editingRole ? handleUpdateRole : handleAddRole} className="space-y-4">
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Full Name *
                </label>
                <div className="relative">
                  <FaUsers className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
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
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Email *
                </label>
                <div className="relative">
                  <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
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
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Role *
                </label>
                <div className="relative">
                  <FaUserTie className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    disabled={!!editingRole}
                  >
                    <option value="">Select Role</option>
                    <option value="ec">Electoral Commission</option>
                    <option value="dean">Dean</option>
                    <option value="hod">Head of Department</option>
                    <option value="it_admin">IT Admin</option>
                  </select>
                </div>
                {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
              </div>
              
              {!editingRole && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Temporary Password *
                  </label>
                  <div className="relative">
                    <FaKey className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                    }`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="Enter temporary password"
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
                    className="mt-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-500"
                  >
                    Generate Random Password
                  </button>
                  {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  <p className={`text-xs mt-1 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    User will need this to login for the first time
                  </p>
                </div>
              )}
              
              {editingRole && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Reset Password (Optional)
                  </label>
                  <div className="relative">
                    <FaKey className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                    }`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
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
                    className="mt-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-500"
                  >
                    Generate Random Password
                  </button>
                  <p className={`text-xs mt-1 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Only fill this if you want to reset the user's password
                  </p>
                </div>
              )}
              
              {formData.role === 'hod' && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Department *
                  </label>
                  <div className="relative">
                    <FaBuilding className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                    }`} />
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
              )}
              
              {formData.role === 'dean' && (
                <div>
                  <label className={`block mb-2 text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    Faculty *
                  </label>
                  <div className="relative">
                    <FaGraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                    }`} />
                    <input
                      type="text"
                      value={formData.faculty}
                      onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                      placeholder="Faculty of Science and Technology"
                    />
                  </div>
                  {formErrors.faculty && <p className="text-red-500 text-xs mt-1">{formErrors.faculty}</p>}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRole(null);
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
          <div className={`rounded-xl max-w-md w-full p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Confirm Remove
            </h2>
            <p className={`mb-6 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              Are you sure you want to remove <strong className={theme === 'light' ? 'text-gray-900' : 'text-white'}>{showDeleteConfirm.name}</strong> from the <strong className={theme === 'light' ? 'text-gray-900' : 'text-white'}>{getRoleLabel(showDeleteConfirm.role)}</strong> role?
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