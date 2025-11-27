import React, { createContext, useState, useEffect } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import apiClient from '../api/axiosConfig.js';

const LOGIN_EXPIRATION_MS = 30 * 60 * 1000;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ฟังก์ชันช่วยเช็ค Admin ---
  const checkIsAdmin = (userData) => {
    if (!userData) return false;
    if (userData.roles && Array.isArray(userData.roles)) {
      return userData.roles.includes('admin');
    }
    return userData.role === 'admin';
  };

  // --- ฟังก์ชันดึงข้อมูล Favorites จาก API ---
  const fetchFavorites = async () => {
    try {
      const response = await apiClient.get('/favorites');
      // ถ้าไม่มี favorite backend อาจส่ง null หรือ [], กันไว้ก่อน
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error("Failed to fetch favorites", error);
      setFavorites([]);
    }
  };

  // --- useEffect: ตรวจสอบ Session เมื่อเปิดหน้าเว็บ ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. เช็ค User
        const response = await apiClient.get('/auth/me');
        setUser(response.data.user);
        
        // 2. ถ้ามี User ให้ดึง Favorites ต่อเลย
        await fetchFavorites();

      } catch (e) {
        setUser(null);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // --- ฟังก์ชันจัดการ Favorites (ยิง API) ---
  const toggleFavoriteApi = async (catId) => {
    try {
        const response = await apiClient.post(`/favorites/${catId}`);
        const isFavorited = response.data.favorited;
        
        // อัปเดต State ทันทีตามผลลัพธ์จาก Server
        setFavorites(prev => {
            if (isFavorited) {
                // ถ้า Server บอกว่าชอบแล้ว -> เพิ่ม ID เข้าไป (ถ้ายังไม่มี)
                return prev.includes(catId) ? prev : [...prev, catId];
            } else {
                // ถ้า Server บอกว่าเลิกชอบแล้ว -> ลบ ID ออก
                return prev.filter(id => id !== catId);
            }
        });
    } catch (err) {
        console.error("Failed to toggle favorite", err);
    }
  };

  // เชื่อมโยงฟังก์ชันที่ Component เรียกใช้ เข้ากับ API ของเรา
  const addFavorite = (catId) => toggleFavoriteApi(catId);
  const removeFavorite = (catId) => toggleFavoriteApi(catId);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password
      });

      if (response.data && response.data.user) {
        setUser(response.data.user);
        // ล็อกอินเสร็จ ดึงรายการโปรดทันที
        await fetchFavorites(); 
        return true;
      }
      return false;

    } catch (error) {
      console.error("Login API error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
        await apiClient.post('/auth/logout');
    } catch (e) { console.error(e); }
    setUser(null);
    setFavorites([]);
  };

  const isFavorited = (catId) => favorites.includes(catId);

  const value = {
    user,
    isLoggedIn: !!user,
    isAdmin: checkIsAdmin(user), 
    login,
    logout,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorited,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};