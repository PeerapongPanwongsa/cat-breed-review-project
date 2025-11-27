import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { getCats } from '../api/catApi'; // ต้องใช้ API นี้เพื่อดึงข้อมูลแมว
import BreedCard from '../components/breed/BreedCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HeartIcon } from '@heroicons/react/24/solid';

const FavoritesPage = () => {
  // 1. ดึง favorites (รายการ ID ที่กด Like ไว้) มาจาก Context
  const { user, favorites } = useAuth();
  
  const [favoriteCats, setFavoriteCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavoriteCats = async () => {
      setLoading(true);
      try {
        // 2. ดึงข้อมูลแมวทั้งหมดจาก API (เพื่อให้ได้รายละเอียดแมว เช่น รูป, ชื่อ)
        // (ในอนาคต ถ้า Backend มี API /cats/favorites โดยเฉพาะ ก็จะดีกว่านี้)
        const response = await getCats({ limit: 100 }); // ดึงมาเยอะๆ ไว้ก่อน
        const allCats = response.data.data || response.data || [];

        // 3. กรองเอาเฉพาะตัวที่ ID อยู่ใน favorites array
        // (favorites คือ [1, 5, 7] อะไรแบบนี้)
        const filteredCats = allCats.filter(cat => favorites.includes(cat.id));
        
        setFavoriteCats(filteredCats);
      } catch (err) {
        console.error("Failed to fetch favorite cats:", err);
        setError("ไม่สามารถโหลดข้อมูลรายการโปรดได้");
      } finally {
        setLoading(false);
      }
    };

    // (โหลดข้อมูลเฉพาะเมื่อ User ล็อกอิน และมีรายการโปรดอย่างน้อย 1 ตัว)
    if (user) {
      if (favorites.length > 0) {
        fetchFavoriteCats();
      } else {
        setFavoriteCats([]); // ถ้าไม่มี Favorites ก็ให้เป็นว่างๆ
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, favorites]); // (รันใหม่ทุกครั้งที่ favorites เปลี่ยน)

  // (กรณีไม่ได้ล็อกอิน - เหมือนเดิม)
  if (!user) {
    return (
      <div className="text-center mt-20">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg inline-block shadow-sm">
          <h2 className="text-xl font-bold mb-2">กรุณาเข้าสู่ระบบ</h2>
          <p>คุณต้องเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ</p>
          <Link to="/login" className="text-indigo-600 hover:underline mt-4 inline-block font-semibold">
            ไปที่หน้าเข้าสู่ระบบ &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <HeartIcon className="w-8 h-8 text-red-500" />
        <h1 className="text-3xl font-bold text-gray-800">
          รายการโปรดของฉัน ({favorites.length})
        </h1>
      </div>

      {loading && <LoadingSpinner />}
      
      {error && <div className="text-center text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          {favoriteCats.length > 0 ? (
            // (แสดงรายการแมวที่ชอบ)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteCats.map((cat) => (
                <BreedCard key={cat.id} breed={cat} />
              ))}
            </div>
          ) : (
            // (ถ้ายังไม่กด Like อะไรเลย)
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <HeartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">ยังไม่มีรายการโปรด</h3>
              <p className="text-gray-500 mt-2">
                คุณยังไม่ได้กดถูกใจแมวสายพันธุ์ไหนเลย
              </p>
              <Link to="/cats" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                ไปเลือกดูแมวทั้งหมด
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FavoritesPage;