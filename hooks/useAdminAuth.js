// hooks/useAdminAuth.js
"use client"
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
      // Check cookie first (for middleware compatibility)
      const cookies = document.cookie.split(';');
      let adminSessionFromCookie = null;
      
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'admin_session') {
          try {
            adminSessionFromCookie = JSON.parse(decodeURIComponent(value));
          } catch (e) {
            console.error('Error parsing admin session cookie:', e);
          }
          break;
        }
      }
      
      if (adminSessionFromCookie) {
        const session = adminSessionFromCookie;
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          setAdmin(session.admin);
          setIsAuthenticated(true);
          return;
        }
      }
      
      // Check localStorage as fallback
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        const session = JSON.parse(adminSession);
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          setAdmin(session.admin);
          setIsAuthenticated(true);
          // Re-set cookie
          document.cookie = `admin_session=${JSON.stringify(session)}; path=/; max-age=86400; SameSite=Lax`;
          return;
        } else {
          await logout();
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
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('school_id', schoolId.trim())
        .maybeSingle();

      if (adminError || !adminData) {
        return { success: false, error: 'Invalid admin credentials' };
      }

      const adminSession = {
        admin: adminData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        loggedInAt: new Date().toISOString()
      };

      const sessionString = JSON.stringify(adminSession);
      
      // Store in localStorage
      localStorage.setItem('admin_session', sessionString);
      
      // Set cookie with proper encoding
      document.cookie = `admin_session=${encodeURIComponent(sessionString)}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_role=admin; path=/; max-age=86400; SameSite=Lax`;
      
      setAdmin(adminData);
      setIsAuthenticated(true);
      
      return { success: true, admin: adminData };
      
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    localStorage.removeItem('admin_session');
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setAdmin(null);
    setIsAuthenticated(false);
    
    router.push('/');
    
    return { success: true };
  };

  return (
    <AdminAuthContext.Provider value={{
      admin,
      loading,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};