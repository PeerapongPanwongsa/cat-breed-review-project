import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { getCats } from '../api/catApi';
import BreedCard from '../components/breed/BreedCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const FavoritesPage = () => {
  const { user, favorites } = useAuth();
  
  const [favoriteCats, setFavoriteCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteCats = async () => {
      setLoading(true);
      try {
        const response = await getCats();
        const allCats = response.data;
        
        const likedCats = allCats.filter((cat) => favorites.includes(cat.id));
        
        setFavoriteCats(likedCats);
      } catch (error) {
        console.error("Failed to fetch favorite cats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && favorites.length >= 0) {
      fetchFavoriteCats();
    } else {
      setLoading(false);
    }
  }, [user, favorites]);

  if (!user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">กรุณาเข้าสู่ระบบ</h1>
        <p className="text-gray-600">
          คุณต้องเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ
        </p>
        <Link to="/login" className="text-indigo-600 hover:underline mt-4 inline-block">
          ไปที่หน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        รายการโปรดของฉัน ({favorites.length} รายการ)
      </h1>

      {loading && <LoadingSpinner />}
      
      {!loading && (
        <>
          {favoriteCats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteCats.map((cat) => (
                <BreedCard key={cat.id} breed={cat} />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-8 border rounded-lg">
              <p>(ยังไม่มีรายการโปรดที่บันทึกไว้)</p>
              <Link to="/cats" className="text-indigo-600 hover:underline mt-2 inline-block">
                ไปที่หน้าสายพันธุ์แมวเพื่อเริ่มกดถูกใจ
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FavoritesPage;