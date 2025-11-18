import React, { createContext, useState, useEffect } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import apiClient from '../api/axiosConfig.js';

const LOGIN_EXPIRATION_MS = 30 * 60 * 1000;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedFavs = localStorage.getItem('favorites');
      const storedTime = localStorage.getItem('loginTime');

      if (storedUser && storedTime) {
        const loginTime = parseInt(storedTime, 10);
        const now = new Date().getTime();

        if (now - loginTime > LOGIN_EXPIRATION_MS) {
          console.log("Login expired. Logging out.");
          localStorage.removeItem('user');
          localStorage.removeItem('favorites');
          localStorage.removeItem('loginTime');
        } else {
          console.log("Restoring session...");
          setUser(JSON.parse(storedUser));
          if (storedFavs) {
            setFavorites(JSON.parse(storedFavs));
          }
        }
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    console.log('Attempting login with API for:', username);
    
    try {
      const response = await apiClient.get('/users', {
        params: {
          username: username,
          password: password
        }
      });

      if (response.data && response.data.length > 0) {
        const userData = response.data[0];
        
        setUser(userData);
        setFavorites([]);

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('favorites', JSON.stringify([]));
        localStorage.setItem('loginTime', new Date().getTime().toString());

        return true;
      } else {
        console.warn("Login failed: Invalid username or password");
        return false;
      }

    } catch (error) {
      console.error("Login API error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setFavorites([]);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('favorites');
      localStorage.removeItem('loginTime');
    } catch (error) {
      console.error("Failed to clear localStorage", error);
    }
  };

  const addFavorite = (catId) => {
    setFavorites((prevFavorites) => {
      const newFavs = [...prevFavorites, catId];
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      return newFavs;
    });
    console.log("Added to favorites:", catId);
  };

  const removeFavorite = (catId) => {
    setFavorites((prevFavorites) => {
      const newFavs = prevFavorites.filter((id) => id !== catId);
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      return newFavs;
    });
    console.log("Removed from favorites:", catId);
  };

  const isFavorited = (catId) => {
    return favorites.includes(catId);
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorited,
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};