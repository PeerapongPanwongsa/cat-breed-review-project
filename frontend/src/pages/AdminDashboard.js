import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';

const AdminDashboard = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center text-red-500">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        หน้าจัดการสำหรับ Admin
      </h1>

      <section className="bg-white p-6 rounded-lg shadow-md border mb-8">
        <h2 className="text-xl font-semibold mb-4">จัดการสายพันธุ์แมว</h2>
        <Button variant="primary">เพิ่มสายพันธุ์แมวใหม่</Button>
        <div className="mt-4">
          <p>ตารางข้อมูลแมว...</p>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4">จัดการรีวิว (รีวิวที่ถูกรายงาน)</h2>
        <div className="mt-4">
          <p>รายการรีวิวที่รอการตรวจสอบ...</p>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;