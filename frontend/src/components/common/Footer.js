import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">CatBreed Review</h3>
            <p className="text-sm">
              เว็บไซต์ศูนย์รวมข้อมูลและรีวิวสายพันธุ์แมว
              จากประสบการณ์ผู้เลี้ยงจริง
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white">หน้าหลัก</a></li>
              <li><a href="/cats" className="hover:text-white">สายพันธุ์แมว</a></li>
              <li><a href="/login" className="hover:text-white">เข้าสู่ระบบ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Follow Us</h3>
            <p className="text-sm">
              Project for Full-Stack Course
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          <p>&copy; 2025 CatBreed Review Project. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;