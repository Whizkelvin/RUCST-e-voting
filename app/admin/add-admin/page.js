// app/admin/add-admin/page.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { FaUserPlus, FaSpinner } from 'react-icons/fa';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AddAdmin() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    school_id: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Check if admin already exists
      const { data: existing, error: checkError } = await supabase
        .from('admins')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();
      
      if (existing) {
        toast.error('Admin with this email already exists');
        return;
      }
      
      // Insert new admin
      const { error } = await supabase
        .from('admins')
        .insert({
          email: formData.email.toLowerCase(),
          school_id: formData.school_id,
          name: formData.name
        });
      
      if (error) throw error;
      
      toast.success('Admin added successfully!');
      setFormData({ email: '', school_id: '', name: '' });
      
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">Add New Admin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
            placeholder="admin@regent.edu.gh"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">School ID</label>
          <input
            type="text"
            value={formData.school_id}
            onChange={(e) => setFormData({...formData, school_id: e.target.value})}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
            placeholder="00000001"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white transition disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin mx-auto" /> : (
            <span className="flex items-center justify-center gap-2">
              <FaUserPlus /> Add Admin
            </span>
          )}
        </button>
      </form>
    </div>
  );
}