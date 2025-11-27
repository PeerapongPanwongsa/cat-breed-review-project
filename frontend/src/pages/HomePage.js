import React, { useState, useEffect } from 'react';
import { getCats } from '../api/catApi.js';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';

const HomePage = () => {
  const [featuredCats, setFeaturedCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedCats = async () => {
      try {
        setLoading(true);
        // (Backend ใช้ query param: limit)
        const response = await getCats({ limit: 3 });
        
        // --- (จุดที่แก้): รองรับโครงสร้างข้อมูลจาก Backend ---
        // ถ้า backend ส่ง { data: [...] } ให้ใช้ .data
        // ถ้า backend ส่ง [...] (array ตรงๆ) ให้ใช้ตัวมันเอง
        const catsData = response.data.data || response.data;
        
        // (ป้องกัน error กรณีข้อมูลไม่ใช่ array)
        setFeaturedCats(Array.isArray(catsData) ? catsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedCats();
  }, []);

  const renderFeaturedCats = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 text-center col-span-full">Error: {error}</div>;
    
    return (
      <>
        {featuredCats.map((cat) => (
          <BreedCard key={cat.id} breed={cat} />
        ))}
      </>
    );
  };

  return (
    <div className="text-center">
      {/* Hero Section (แบบย่อ - ลบ Search/Button ออกแล้ว) */}
      <section className="bg-indigo-50 rounded-lg p-12 md:p-20 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          ค้นหาสายพันธุ์แมวที่ใช่สำหรับคุณ
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          อ่านรีวิวจากผู้เลี้ยงจริง ค้นหาข้อมูลสายพันธุ์ และตัดสินใจ
          <br />
          ได้อย่างมั่นใจก่อนรับเลี้ยง
        </p>
      </section>

      {/* Featured Breeds */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">สายพันธุ์ยอดนิยม</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {renderFeaturedCats()}
        </div>
      </section>
    </div>
  );
};

export default HomePage;