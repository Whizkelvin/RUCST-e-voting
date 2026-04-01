// hooks/useAdminAuth.js
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      // Check if admin session exists in localStorage
      const adminSession = localStorage.getItem('admin_session');
      
      if (adminSession) {
        const session = JSON.parse(adminSession);
        
        // Check if session is still valid (not expired)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          setAdmin(session.admin);
          setIsAuthenticated(true);
        } else {
          // Session expired, logout
          localStorage.removeItem('admin_session');
        }
      }
    } catch (error) {
      console.error('Admin auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, schoolId) => {
    try {
      console.log('Attempting admin login for:', email);
      
      // Query the admins table in Supabase
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('school_id', schoolId.trim().padStart(8, '0'))
        .maybeSingle();

      console.log('Admin query result:', { adminData, adminError });

      if (adminError) {
        console.error('Database error:', adminError);
        return { success: false, error: 'Database error occurred' };
      }

      if (!adminData) {
        return { success: false, error: 'Invalid admin credentials. Please check your email and school ID.' };
      }

      // Create session (valid for 24 hours)
      const adminSession = {
        admin: adminData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        loggedInAt: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem('admin_session', JSON.stringify(adminSession));
      
      setAdmin(adminData);
      setIsAuthenticated(true);
      
      console.log('Admin login successful:', adminData.email);
      
      return { success: true, admin: adminData };
      
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session');
    setAdmin(null);
    setIsAuthenticated(false);
    router.push('/');
  };

  const requireAuth = () => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return false;
    }
    return true;
  };

  return (
    <AdminAuthContext.Provider value={{
      admin,
      loading,
      isAuthenticated,
      login,
      logout,
      requireAuth
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};