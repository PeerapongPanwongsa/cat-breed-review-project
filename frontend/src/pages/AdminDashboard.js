import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminCatList from '../components/admin/AdminCatList';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin) {
    return (
      <div className="text-center text-red-500 mt-10">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Dashboard ผู้ดูแลระบบ
      </h1>
      <p className="text-gray-600 mb-8">
        จัดการข้อมูลสายพันธุ์แมวและตรวจสอบความเรียบร้อย
      </p>

      <section className="mb-12">
        <AdminCatList />
      </section>
      
    </div>
  );
};

export default AdminDashboard;