// hooks/useAdminAuth.js (updated version)

'use client';

import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  
  // Inactivity timeout (10 minutes = 10 * 60 * 1000)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  
  const router = useRouter();

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    
    if (isAuthenticated) {
      // Set warning timer (9 minutes - show warning)
      warningTimerRef.current = setTimeout(() => {
        toast.warning('⚠️ You will be logged out due to inactivity in 1 minute!', {
          position: "top-center",
          duration: 5000,
          closeButton: true,
        });
      }, INACTIVITY_TIMEOUT - 60 * 1000); // Show warning at 9 minutes
      
      // Set logout timer (10 minutes)
      inactivityTimerRef.current = setTimeout(() => {
        toast.error('Session expired due to inactivity. Please login again.', {
          position: "top-center",
          duration: 3000,
        });
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [isAuthenticated]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    const handleActivity = () => {
      resetInactivityTimer();
      // Update last activity in localStorage
      localStorage.setItem('last_activity', Date.now().toString());
    };
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Initial timer start
    resetInactivityTimer();
    
    // Check stored last activity on mount
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const inactiveTime = Date.now() - parseInt(lastActivity);
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        logout();
      } else {
        // Resume timer with remaining time
        const remainingTime = INACTIVITY_TIMEOUT - inactiveTime;
        if (remainingTime > 0) {
          setTimeout(() => logout(), remainingTime);
        }
      }
    }
    
    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [isAuthenticated]);

  // Rate limiting (5 attempts per 15 minutes)
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000;

  const checkRateLimit = useCallback(() => {
    if (lockoutUntil && new Date() < new Date(lockoutUntil)) {
      const remainingMinutes = Math.ceil((new Date(lockoutUntil) - new Date()) / 60000);
      throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`);
    }
    return true;
  }, [lockoutUntil]);

  const resetLoginAttempts = useCallback(() => {
    setLoginAttempts(0);
    setLockoutUntil(null);
  }, []);

  const incrementLoginAttempts = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION);
      setLockoutUntil(lockoutTime);
      toast.error(`Too many failed attempts. Account locked for 15 minutes.`);
    }
  }, [loginAttempts]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const isAuthenticatedLocal = localStorage.getItem('is_authenticated');
      const userRole = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');
      const lastActivity = localStorage.getItem('last_activity');
      
      // Check session timeout from stored activity
      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity);
        if (inactiveTime >= INACTIVITY_TIMEOUT) {
          // Session expired
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_details');
          localStorage.removeItem('last_activity');
          toast.info('Session expired. Please login again.');
          setLoading(false);
          return;
        }
      }
      
      if (isAuthenticatedLocal === 'true' && userRole && userEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Restore admin state
          const roleData = localStorage.getItem('user_details');
          setAdmin({
            email: userEmail,
            id: session.user.id,
            role: userRole,
            ...(roleData ? JSON.parse(roleData) : {})
          });
          setIsAuthenticated(true);
          localStorage.setItem('last_activity', Date.now().toString());
        } else {
          // Clear invalid session
          clearSession();
        }
      }
      setLoading(false);
    };
    
    checkExistingSession();
  }, []);

  const clearSession = () => {
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_details');
    localStorage.removeItem('last_activity');
  };

  const fetchAdminProfile = async (user) => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (adminData && !adminError) {
        const adminInfo = {
          ...adminData,
          auth_user_id: user.id,
          email: user.email,
          role: adminData.role || 'admin'
        };
        
        setAdmin(adminInfo);
        setIsAuthenticated(true);
        
        // Store in localStorage
        localStorage.setItem('user_role', adminData.role || 'admin');
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_id', adminData.id);
        localStorage.setItem('user_details', JSON.stringify(adminData));
        localStorage.setItem('is_authenticated', 'true');
        localStorage.setItem('last_activity', Date.now().toString());
        
        // Set cookies for middleware
        const maxAge = INACTIVITY_TIMEOUT / 1000; // 600 seconds
        document.cookie = `is_authenticated=true; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_role=${adminData.role || 'admin'}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_email=${encodeURIComponent(user.email)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user_id=${adminData.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        
        resetLoginAttempts();
        return;
      }

      throw new Error('Unauthorized: Not an admin user');
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      setAdmin(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const login = async (email, schoolId) => {
    try {
      checkRateLimit();
      
      if (!email || !schoolId) {
        throw new Error('Email and School ID are required');
      }

      const emailRegex = /^[A-Z0-9._%+-]+@regent\.edu\.gh$/i;
      if (!emailRegex.test(email)) {
        throw new Error('Only @regent.edu.gh emails are allowed');
      }

      const schoolIdRegex = /^[0-9]{8}$/;
      if (!schoolIdRegex.test(schoolId.trim())) {
        throw new Error('School ID must be 8 digits');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: schoolId.trim()
      });

      if (error) {
        incrementLoginAttempts();
        throw new Error('Invalid email or School ID');
      }

      await fetchAdminProfile(data.user);
      resetLoginAttempts();
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Clear timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      
      await supabase.auth.signOut();
      setAdmin(null);
      setIsAuthenticated(false);
      
      // Clear localStorage
      clearSession();
      
      // Clear cookies
      const cookieOptions = 'path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = `is_authenticated=; ${cookieOptions}`;
      document.cookie = `user_role=; ${cookieOptions}`;
      document.cookie = `user_email=; ${cookieOptions}`;
      document.cookie = `user_id=; ${cookieOptions}`;
      
      router.push('/');
      toast.info('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update last activity periodically
  useEffect(() => {
    const activityInterval = setInterval(() => {
      if (isAuthenticated) {
        localStorage.setItem('last_activity', Date.now().toString());
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(activityInterval);
  }, [isAuthenticated]);

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