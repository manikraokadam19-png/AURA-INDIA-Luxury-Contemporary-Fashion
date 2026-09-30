import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setAuthToken, getAuthToken, getGuestSessionId } from '../lib/api.ts';
import { Address } from '../server/types.ts';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  addresses: Address[];
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (loginId: string, password: string) => Promise<any>;
  signup: (payload: { fullName: string; email: string; phone: string; password: string }) => Promise<any>;
  verifyOtp: (identifier: string, otp: string, purpose?: 'signup' | 'forgot_password') => Promise<any>;
  resendOtp: (identifier: string, purpose?: 'signup' | 'forgot_password') => Promise<any>;
  forgotPasswordRequest: (identifier: string) => Promise<any>;
  forgotPasswordReset: (identifier: string, otp: string, newPassword: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addAddress: (addressData: Omit<Address, 'id' | 'userId' | 'createdAt'>) => Promise<Address>;
  deleteAddress: (id: string) => Promise<void>;
  quickDemoLogin: (role: 'admin' | 'customer') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      setAddresses(data.addresses || []);
    } catch {
      setAuthToken(null);
      setUser(null);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (loginId: string, password: string) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    });

    if (data.token) {
      setAuthToken(data.token);
      await refreshProfile();
      // Merge guest cart if any
      const guestId = getGuestSessionId();
      await apiRequest('/api/cart/merge', {
        method: 'POST',
        body: JSON.stringify({ guestSessionId: guestId }),
      }).catch(() => {});
    }
    return data;
  };

  const signup = async (payload: { fullName: string; email: string; phone: string; password: string }) => {
    return await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const verifyOtp = async (identifier: string, otp: string, purpose: 'signup' | 'forgot_password' = 'signup') => {
    const data = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, purpose }),
    });

    if (data.token) {
      setAuthToken(data.token);
      await refreshProfile();
      // Merge guest cart
      const guestId = getGuestSessionId();
      await apiRequest('/api/cart/merge', {
        method: 'POST',
        body: JSON.stringify({ guestSessionId: guestId }),
      }).catch(() => {});
    }
    return data;
  };

  const resendOtp = async (identifier: string, purpose: 'signup' | 'forgot_password' = 'signup') => {
    return await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, purpose }),
    });
  };

  const forgotPasswordRequest = async (identifier: string) => {
    return await apiRequest('/api/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  };

  const forgotPasswordReset = async (identifier: string, otp: string, newPassword: string) => {
    return await apiRequest('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, newPassword }),
    });
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {}
    setAuthToken(null);
    setUser(null);
    setAddresses([]);
  };

  const addAddress = async (addressData: Omit<Address, 'id' | 'userId' | 'createdAt'>) => {
    const newAddr = await apiRequest<Address>('/api/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
    setAddresses((prev) => [...prev, newAddr]);
    return newAddr;
  };

  const deleteAddress = async (id: string) => {
    await apiRequest(`/api/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const quickDemoLogin = async (role: 'admin' | 'customer') => {
    if (role === 'admin') {
      await login('admin@auraindia.in', 'Admin@123');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        addresses,
        loading,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        login,
        signup,
        verifyOtp,
        resendOtp,
        forgotPasswordRequest,
        forgotPasswordReset,
        logout,
        refreshProfile,
        addAddress,
        deleteAddress,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
