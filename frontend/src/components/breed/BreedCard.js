// frontend/src/components/breed/BreedCard.js

import { StarIcon } from '@heroicons/react/20/solid';
import { Link, useNavigate } from 'react-router-dom';
// 💡 เพิ่ม MapPinIcon
import { MapPinIcon } from '@heroicons/react/24/solid';

const StarRating = ({ rating = 0, size = 'w-4 h-4' }) => { 
    const roundedRating = Math.round(rating);
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, index) => (
                <StarIcon 
                    key={index} 
                    className={`${size} ${index < roundedRating ? 'text-yellow-400' : 'text-gray-300'}`} 
                />
            ))}
        </div>
    );
};

const AspectRatings = ({ ratings }) => { 
    const safeRatings = ratings && Object.keys(ratings).length > 0 ? ratings : {
        friendliness: 0, 
        adaptability: 0, 
        energyLevel: 0, 
        grooming: 0
    };
    
    const aspectLabels = { 
        friendliness: 'ความเป็นมิตร', 
        adaptability: 'การปรับตัว', 
        energyLevel: 'พลังงาน', 
        grooming: 'การดูแลขน' 
    };

    return (
        <div className="text-xs space-y-1">
            {Object.entries(safeRatings).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                    <span className="text-gray-600">{aspectLabels[key] || key}:</span>
                    <span className="flex items-center gap-1">
                        <span className="font-bold text-gray-800">{Number(value).toFixed(1)}</span>
                        <StarRating rating={value} size="w-3 h-3" />
                    </span>
                </div>
            ))}
        </div>
    );
};

/**
 * การ์ดแสดงข้อมูลแมว 1 ใบ
 */
const BreedCard = ({ breed }) => {
    // ✅ เพิ่ม 'origin' ใน Destructuring
    const { id, name, image_url, history, ratings, origin } = breed;
    
    const navigate = useNavigate(); 

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-2xl">
            {/* 1. รูปภาพ */}
            <Link to={`/cats/${id}`} className="relative">
                <img
                    src={image_url || 'https://placehold.co/600x400/gray/white?text=No+Image'}
                    alt={name}
                    className="w-full h-56 object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/gray/white?text=Error'; }}
                />
            </Link>
            
            <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
                
                {/* ✅ แสดงถิ่นกำเนิด */}
                <p className="text-sm text-gray-500 flex items-center mb-4">
                    <MapPinIcon className="w-4 h-4 mr-1 text-red-500" />
                    {origin || 'ไม่ระบุถิ่นกำเนิด'}
                </p>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
                    {history || 'ไม่มีคำอธิบายสำหรับสายพันธุ์นี้'}
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