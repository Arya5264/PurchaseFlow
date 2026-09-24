import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('purchaseflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('purchaseflow_token'));
  const [loading, setLoading] = useState(true);

  // Validate token and fetch fresh user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('purchaseflow_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('purchaseflow_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('[Auth Check Failed]:', err.message);
          localStorage.removeItem('purchaseflow_token');
          localStorage.removeItem('purchaseflow_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data && res.data.success) {
      const { token: newToken, user: newUser } = res.data.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('purchaseflow_token', newToken);
      localStorage.setItem('purchaseflow_user', JSON.stringify(newUser));
      return newUser;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('purchaseflow_token');
    localStorage.removeItem('purchaseflow_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const getDefaultRouteForRole = (role) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'PURCHASE_MANAGER':
        return '/purchase/dashboard';
      case 'APPROVER':
        return '/approver/dashboard';
      case 'VENDOR':
        return '/vendor/dashboard';
      case 'WAREHOUSE':
        return '/warehouse/dashboard';
      case 'FINANCE':
        return '/finance/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        hasRole,
        getDefaultRouteForRole,
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
