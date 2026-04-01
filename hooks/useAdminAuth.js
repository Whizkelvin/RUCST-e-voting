// hooks/useAdminAuth.js
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchAdminProfile(session.user);
      } else {
        setAdmin(null);
        setIsAuthenticated(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await fetchAdminProfile(session.user);
      } else {
        setAdmin(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAdmin(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfile = async (user) => {
    try {
      // First check user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle();
      
      if (roleData && !roleError) {
        setAdmin({
          ...roleData,
          id: user.id,
          email: user.email
        });
        setIsAuthenticated(true);
        return;
      }
      
      // Then check admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (adminData && !adminError) {
        setAdmin({
          ...adminData,
          id: user.id,
          email: user.email
        });
        setIsAuthenticated(true);
        return;
      }
      
      // If no role found but user is authenticated, they might be a voter
      // Don't set as admin
      setAdmin(null);
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      setAdmin(null);
      setIsAuthenticated(false);
    }
  };

  const login = async (email, schoolId) => {
    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: schoolId.trim()
      });
      
      if (error) throw error;
      
      // After successful login, fetch the profile
      await fetchAdminProfile(data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAdmin(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_details');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    admin,
    isAuthenticated,
    loading,
    login,
    logout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};