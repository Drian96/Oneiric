// ============================================================================
// AUTHENTICATION CONTEXT
// Manages user authentication state throughout the React application
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  RegisterRequest,
  LoginRequest,
  ProfileUpdateRequest,
  ChangePasswordRequest,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  getMe,
  getShopSlugFromPath,
  ShopMembership,
} from '../services/api';
import { supabase } from '../services/supabase/client';
import { signOut as supabaseSignOut } from '../services/supabase/auth';

// ============================================================================
// CONTEXT INTERFACES
// ============================================================================

// Authentication context interface
interface AuthContextType {
  // User state
  user: User | null;
  memberships: ShopMembership[];
  lastShopSlug: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Authentication functions
  register: (userData: RegisterRequest) => Promise<void>;
  login: (credentials: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  
  // Profile functions
  updateProfile: (profileData: ProfileUpdateRequest) => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  
  // Utility functions
  clearUser: () => void;
  refreshAuth: () => Promise<void>;
}

// Provider props interface
interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// CREATE CONTEXT
// ============================================================================

// Create the authentication context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTHENTICATION PROVIDER COMPONENT
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<ShopMembership[]>([]);
  const [lastShopSlug, setLastShopSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // INITIALIZATION EFFECT
  // Check for existing token and validate it on app startup
  // ============================================================================
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const me = await getMe();
          setUser(me.user);
          setMemberships(me.memberships || []);
          setLastShopSlug(me.lastShopSlug || null);
          console.log('✅ Supabase session loaded:', me.user.email);
        } else {
          console.log('❌ No Supabase session found');
        }
      } catch (error) {
        console.error('❌ Authentication initialization failed:', error);
        setUser(null);
        setMemberships([]);
        setLastShopSlug(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ============================================================================
  // AUTHENTICATION FUNCTIONS
  // ============================================================================

  /**
   * Register a new user account
   * @param userData - User registration data
   */
  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('📝 Registering new user:', userData.email);
      await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      });
      const { data } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });
      if (data.session) {
        const me = await getMe();
        setUser(me.user);
        setMemberships(me.memberships || []);
        setLastShopSlug(me.lastShopSlug || null);
      }
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user with email and password
   * @param credentials - Login credentials
   */
  const login = async (credentials: LoginRequest): Promise<User> => {
    try {
      setIsLoading(true);
      console.log('🔐 Logging in user:', credentials.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw error;
      if (!data.session) {
        throw new Error('No session found after login.');
      }
      const me = await getMe();
      setUser(me.user);
      setMemberships(me.memberships || []);
      setLastShopSlug(me.lastShopSlug || null);
      console.log('✅ Login successful:', me.user.email);
      return me.user;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user and clear authentication state
   */
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('🚪 Logging out user...');
      await supabaseSignOut();
      setUser(null);
      setMemberships([]);
      setLastShopSlug(null);
      
      console.log('✅ Logout successful');
      
      // Redirect to home page after logout
      const shopSlug = getShopSlugFromPath();
      window.location.href = shopSlug ? `/${shopSlug}` : '/';
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if API call fails, clear local state
      setUser(null);
      setMemberships([]);
      setLastShopSlug(null);
      // Still redirect to home page
      const shopSlug = getShopSlugFromPath();
      window.location.href = shopSlug ? `/${shopSlug}` : '/';
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user's profile information
   * @param profileData - Profile data to update
   */
  const updateProfile = async (profileData: ProfileUpdateRequest): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('📝 Updating user profile...');
      
      const updatedUser = await apiUpdateProfile(profileData);
      setUser(updatedUser);
      
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Profile update failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change user's password
   * @param passwordData - Password change data
   */
  const changePassword = async (passwordData: ChangePasswordRequest): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('🔒 Changing password...');
      
      await apiChangePassword(passwordData);
      
      console.log('✅ Password changed successfully');
    } catch (error) {
      console.error('❌ Password change failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear user data (for manual logout or error handling)
   */
  const clearUser = (): void => {
    console.log('🧹 Clearing user data...');
    setUser(null);
    setMemberships([]);
    setLastShopSlug(null);
  };

  /**
   * Refresh authentication state by verifying the current token
   * Useful after OAuth callbacks or token updates
   */
  const refreshAuth = async (): Promise<void> => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const me = await getMe();
        setUser(me.user);
        setMemberships(me.memberships || []);
        setLastShopSlug(me.lastShopSlug || null);
        console.log('✅ Auth refreshed, user authenticated:', me.user.email);
      } else {
        setUser(null);
        setMemberships([]);
        setLastShopSlug(null);
      }
    } catch (error) {
      console.error('❌ Auth refresh failed:', error);
      setUser(null);
      setMemberships([]);
      setLastShopSlug(null);
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: AuthContextType = {
    // State
    user,
    memberships,
    lastShopSlug,
    isAuthenticated: !!user,
    isLoading,
    
    // Functions
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    clearUser,
    refreshAuth,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// CUSTOM HOOK
// Hook to use the authentication context
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// ============================================================================
// EXPORT
// ============================================================================

export default AuthContext; 