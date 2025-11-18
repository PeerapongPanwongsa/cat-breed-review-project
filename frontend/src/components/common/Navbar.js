import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HeartIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          Cat<span className="font-light">Breed</span>
        </Link>

        <div className="hidden md:flex space-x-6 items-center">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-indigo-600 font-semibold' : 'text-gray-600 hover:text-indigo-500'
            }
          >
            หน้าหลัก
          </NavLink>
          <NavLink
            to="/cats"
            className={({ isActive }) =>
              isActive ? 'text-indigo-600 font-semibold' : 'text-gray-600 hover:text-indigo-500'
            }
          >
            สายพันธุ์แมว
          </NavLink>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/profile" className="text-gray-700 hover:text-indigo-600 font-medium">
                สวัสดี, {user.username}
              </Link>

              {user.role === 'admin' && (
                <Link to="/admin" className="text-sm text-red-500 hover:underline">
                  (Admin)
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-500">
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/register"
                className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm hover:bg-indigo-600"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}

          <Link to="/favorites" className="relative text-gray-600 hover:text-indigo-500">
            <HeartIcon className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;