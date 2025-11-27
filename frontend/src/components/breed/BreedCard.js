import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../hooks/useAuth';

// (ส่วน StarRating และ AspectRatings เหมือนเดิมเป๊ะๆ ขอละไว้นะครับ)
const StarRating = ({ rating = 0 }) => { /* ...โค้ดเดิม... */ };
const AspectRatings = ({ ratings }) => { /* ...โค้ดเดิม... */ };

/**
 * การ์ดแสดงข้อมูลแมว 1 ใบ
 */
const BreedCard = ({ breed }) => {
  const { id, name, image_url, description, ratings } = breed;
  
  // (ดึงฟังก์ชันและ state จาก AuthContext)
  // สังเกต: เราใช้ isFavorited (ที่เป็นฟังก์ชันเช็ค array) และ toggleFavorite (ที่เป็น API)
  const { user, isFavorited, addFavorite, removeFavorite } = useAuth();
  const navigate = useNavigate(); 
  
  // เช็คว่าแมวตัวนี้ (id) อยู่ในรายการโปรดไหม
  const isLiked = isFavorited(id);

  const handleLikeClick = async (e) => { // (เพิ่ม async)
    e.preventDefault();
    e.stopPropagation();
    
    if (user) {
      // (เรียกฟังก์ชัน toggle ใน Context ซึ่งจะยิง API)
      if (isLiked) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-2xl">
      {/* 1. รูปภาพ */}
      <div className="relative">
        <img
          src={image_url || 'https://placehold.co/600x400/gray/white?text=No+Image'}
          alt={name}
          className="w-full h-56 object-cover"
          onError={(e) => { e.target.src = 'https://placehold.co/600x400/gray/white?text=Error'; }}
        />
        <button
          onClick={handleLikeClick}
          className="absolute top-3 right-3 p-1.5 bg-white/70 rounded-full text-indigo-600 hover:bg-white transition"
          aria-label="Like"
        >
          {isLiked ? (
            <HeartIconSolid className="w-6 h-6 text-red-500" />
          ) : (
            <HeartIconOutline className="w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* ... (ส่วนเนื้อหาและการ์ด เหมือนเดิม) ... */}
       <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {description || 'ไม่มีคำอธิบายสำหรับสายพันธุ์นี้'}
        </p>

        <div className="mb-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">ค่าเฉลี่ยคุณสมบัติ:</h4>
          <AspectRatings ratings={ratings} />
        </div>

        <div className="mt-auto">
          <Link
            to={`/cats/${id}`}
            className="block w-full text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            ดูรายละเอียด & รีวิว
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BreedCard;