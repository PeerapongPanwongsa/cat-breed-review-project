import React, { createContext, useState, useEffect } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import apiClient from '../api/axiosConfig.js';

const LOGIN_EXPIRATION_MS = 30 * 60 * 1000;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkIsAdmin = (userData) => {
    if (!userData) return false;
    if (userData.roles && Array.isArray(userData.roles)) {
      return userData.roles.includes('admin');
    }
    return userData.role === 'admin';
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);

      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password
      });

      if (response.data && response.data.user) {
        setUser(response.data.user);
        return true;
      }
      return false;

    }  catch (error) {
			console.error("Login API error:", error);
			if (error.response && error.response.data && error.response.data.error) {
				throw new Error(error.response.data.error); 
			}
			throw new Error("Network or Server error occurred");
		}
  };

  const logout = async () => {
    try {
        await apiClient.post('/auth/logout');
    } catch (e) { console.error(e); }
    setUser(null);
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isAdmin: checkIsAdmin(user), 
    login,
    logout,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};