'use client';

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const inactivityTimerRef = useRef(null);
  const router = useRouter();

  // Session timeout duration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  
  // Rate limiting: 5 attempts per 15 minutes
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000;

  // Check rate limit
  const checkRateLimit = useCallback(() => {
    if (lockoutUntil && new Date() < new Date(lockoutUntil)) {
      const remainingMinutes = Math.ceil((new Date(lockoutUntil) - new Date()) / 60000);
      throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`);
    }
    return true;
  }, [lockoutUntil]);

  // Reset login attempts on successful login
  const resetLoginAttempts = useCallback(() => {
    setLoginAttempts(0);
    setLockoutUntil(null);
  }, []);

  // Increment login attempts
  const incrementLoginAttempts = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION);
      setLockoutUntil(lockoutTime);
      toast.error(`Too many failed attempts. Account locked for 15 minutes.`, {
        position: "top-center",
        autoClose: 5000
      });
    }
  }, [loginAttempts]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(() => {
        toast.warning('Session expired due to inactivity. Please login again.', {
          position: "top-center",
          autoClose: 3000
        });
        logout();
      }, SESSION_TIMEOUT);
    }
  }, [isAuthenticated]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      resetInactivityTimer();
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    resetInactivityTimer();
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const isAuthenticatedLocal = localStorage.getItem('is_authenticated');
      const userRole = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');
      const lastActivity = localStorage.getItem('last_activity');
      const isDebugSession = localStorage.getItem('is_debug_session');
      
      // Skip if debug session
      if (isDebugSession === 'true') {
        setAdmin({
          email: userEmail,
          role: userRole,
          isDebug: true
        });
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
      
      // Check session timeout
      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity);
        if (inactiveTime > SESSION_TIMEOUT) {
          // Session expired
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_details');
          localStorage.removeItem('last_activity');
          localStorage.removeItem('is_debug_session');
          toast.info('Session expired. Please login again.', {
            position: "top-center",
            autoClose: 3000
          });
          setLoading(false);
          return;
        }
      }
      
      if (isAuthenticatedLocal === 'true' && userRole && userEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Session is valid, restore admin state
          const roleData = localStorage.getItem('user_details');
          
          setAdmin({
            email: userEmail,
            id: session.user.id,
            role: userRole,
            ...(roleData ? JSON.parse(roleData) : {})
          });
          setIsAuthenticated(true);
          
          // Update last activity
          localStorage.setItem('last_activity', Date.now().toString());
        } else {
          // Invalid session, clear localStorage
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_details');
          localStorage.removeItem('last_activity');
          localStorage.removeItem('is_debug_session');
        }
      }
      setLoading(false);
    };
    
    checkExistingSession();
  }, []);

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

    return () => {
      subscription.unsubscribe();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
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
      console.log('Fetching profile for user:', user.email);
      
      // First check admins table (since you don't have user_roles)
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (adminData && !adminError) {
        console.log('Admin found in admins table:', adminData);
        const adminInfo = {
          ...adminData,
          id: user.id,
          email: user.email,
          role: adminData.role || 'admin'
        };
        setAdmin(adminInfo);
        setIsAuthenticated(true);
        
        // Store in localStorage for quick access
        localStorage.setItem('user_role', adminData.role || 'admin');
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('user_details', JSON.stringify(adminData));
        localStorage.setItem('is_authenticated', 'true');
        localStorage.setItem('last_activity', Date.now().toString());
        localStorage.removeItem('is_debug_session'); // Clear debug flag if exists
        
        resetLoginAttempts();
        return;
      }

      // If not found in admins, check if it's a debug session
      const isDebugSession = localStorage.getItem('is_debug_session');
      if (isDebugSession === 'true') {
        console.log('Using debug session');
        setAdmin({
          email: user.email,
          id: user.id,
          role: 'admin',
          isDebug: true
        });
        setIsAuthenticated(true);
        return;
      }

      // If authenticated but not admin, sign out
      console.log('User not found in admins table, signing out...');
      await supabase.auth.signOut();
      setAdmin(null);
      setIsAuthenticated(false);
      
      // Clear localStorage
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_details');
      localStorage.removeItem('is_authenticated');
      localStorage.removeItem('last_activity');
      localStorage.removeItem('is_debug_session');
      
      throw new Error('Unauthorized: Not an admin user. Please contact system administrator to grant admin access.');

    } catch (error) {
      console.error('Error fetching admin profile:', error);
      setAdmin(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const login = async (email, schoolId) => {
    try {
      // Check rate limit
      checkRateLimit();
      
      // Validate inputs
      if (!email || !schoolId) {
        throw new Error('Email and School ID are required');
      }

      // Email format validation
      const emailRegex = /^[A-Z0-9._%+-]+@regent\.edu\.gh$/i;
      if (!emailRegex.test(email)) {
        throw new Error('Only @regent.edu.gh emails are allowed');
      }

      // School ID validation (8 digits)
      const schoolIdRegex = /^[0-9]{8}$/;
      if (!schoolIdRegex.test(schoolId.trim())) {
        throw new Error('School ID must be 8 digits');
      }

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: schoolId.trim()
      });

      if (error) {
        incrementLoginAttempts();
        
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid email or School ID');
        } else if (error.message === 'Email not confirmed') {
          throw new Error('Please confirm your email before logging in');
        }
        throw error;
      }

      // After successful login, fetch the profile
      await fetchAdminProfile(data.user);
      
      // Reset login attempts on success
      resetLoginAttempts();
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      await supabase.auth.signOut();
      setAdmin(null);
      setIsAuthenticated(false);
      
      // Clear localStorage
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_details');
      localStorage.removeItem('is_authenticated');
      localStorage.removeItem('last_activity');
      localStorage.removeItem('is_debug_session');
      
      router.push('/');
      toast.info('Logged out successfully', {
        position: "top-center",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update last activity periodically
  const updateLastActivity = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem('last_activity', Date.now().toString());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const activityInterval = setInterval(() => {
      updateLastActivity();
    }, 60000); // Update every minute
    
    return () => clearInterval(activityInterval);
  }, [updateLastActivity]);

  const value = {
    admin,
    isAuthenticated,
    loading,
    login,
    logout,
    loginAttempts,
    lockoutUntil,
    remainingLockoutTime: lockoutUntil ? Math.max(0, Math.ceil((new Date(lockoutUntil) - new Date()) / 60000)) : 0
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