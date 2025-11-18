import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

import MyReviewList from '../components/profile/MyReviewList';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <section className="mb-8 p-6 bg-white rounded-lg shadow-md border flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            โปรไฟล์ของฉัน
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            ยินดีต้อนรับ, <span className="font-semibold text-indigo-600">{user.username}</span>!
          </p>
          <p className="text-sm text-gray-500">
            Email: {user.email} (Role: {user.role})
          </p>
        </div>
        <div>
          <Button variant="danger" onClick={handleLogout}>
            ออกจากระบบ
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          จัดการรีวิวของฉัน 📝
        </h2>
        <MyReviewList />
      </section>

    </div>
  );
};

export default ProfilePage;