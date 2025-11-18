import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../hooks/useAuth';

const StarRating = ({ rating = 0 }) => {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const percentage = (clampedRating / 5) * 100;

  return (
    <div className="relative flex">
      <div className="flex text-gray-300">
        {[...Array(5)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="w-4 h-4" />
        ))}
      </div>

      <div
        className="absolute top-0 left-0 flex overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        {[...Array(5)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        ))}
      </div>
    </div>
  );
};

const AspectRatings = ({ ratings }) => {
  if (!ratings) return null;

  const aspectLabels = {
    friendliness: 'ความเป็นมิตร',
    adaptability: 'การปรับตัว',
    energyLevel: 'พลังงาน',
    grooming: 'การดูแลขน',
  };

  return (
    <div className="space-y-1 text-xs text-gray-600">
      {Object.entries(ratings).map(([key, value]) => (
        <div key={key} className="flex justify-between items-center">
          <span>{aspectLabels[key] || key}:</span>

          <div className="flex items-center gap-1.5">
            <StarRating rating={value} />
            <span className="text-xs text-gray-500 font-medium w-6 text-left">
              ({(value || 0).toFixed(1)})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const BreedCard = ({ breed }) => {
  const { id, name, image_url, description, ratings } = breed;
  const { user, addFavorite, removeFavorite, isFavorited } = useAuth();
  const navigate = useNavigate();
  const isLiked = isFavorited(id);

  const handleLikeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      if (isLiked) {
        removeFavorite(id);
      } else {
        addFavorite(id);
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-2xl">
      <div className="relative">
        <img
          src={image_url || 'https://placehold.co/600x400/gray/white?text=No+Image'}
          alt={name}
          className="w-full h-56 object-cover"
          onError={(e) => {
            e.target.src = 'https://placehold.co/600x400/gray/white?text=Error';
          }}
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