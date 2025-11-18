import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';

/**
 * Custom Hook สั้นๆ เพื่อให้เรียกใช้ AuthContext ได้ง่ายขึ้น
 * แทนที่จะต้อง import useContext และ AuthContext ทุกครั้ง
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};