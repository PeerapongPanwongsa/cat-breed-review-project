import React from 'react';
import { StarIcon } from '@heroicons/react/20/solid';

/**
 * Component Helper: แสดงผลดาวตามค่าที่กำหนด (ใช้สำหรับโหมด Display ใน CatDetailPage)
 * รับ props: value (คะแนน), readOnly
 */
const StarRatingDisplay = ({ value, readOnly = true }) => {
    const roundedRating = Math.round(value);
    
    return (
        <div className="flex space-x-1">
            {[...Array(5)].map((_, index) => (
                <StarIcon 
                    key={index} 
                    className={`w-5 h-5 ${index < roundedRating ? 'text-yellow-400' : 'text-gray-300'} 
                                ${!readOnly ? 'cursor-pointer' : ''}`}
                />
            ))}
            {/* แสดงค่าตัวเลขด้วย */}
            <span className="text-sm font-semibold text-gray-700 ml-1">{value ? value.toFixed(1) : '0.0'}</span>
        </div>
    );
};


/**
 * Main Component: RatingInput (ใช้ได้ทั้งโหมด Input และ Display)
 * โหมด Input: รับ ratings, onChange (ใช้ใน ReviewForm)
 * โหมด Display: รับ name, value, readOnly (ใช้ใน CatDetailPage สำหรับคะแนนเฉลี่ย)
 */
const RatingInput = ({ ratings, onChange, name, value, readOnly = false }) => {
    // 💡 หากมี name/value/readOnly แสดงว่าอยู่ในโหมด Display (สำหรับคะแนนเฉลี่ย)
    if (readOnly) {
        // ใช้ StarRatingDisplay ในโหมด Display
        return <StarRatingDisplay value={value || 0} readOnly={true} />;
    }
    
    // โหมด Input (ใช้ใน ReviewForm)
    const aspects = [
        { id: 'friendliness', label: 'ความเป็นมิตร:' },
        { id: 'adaptability', label: 'ความง่ายในการเลี้ยง:' },
        { id: 'energyLevel', label: 'ความขี้เล่น:' },
        { id: 'grooming', label: 'การดูแล:' },
    ];

    const handleRatingChange = (aspectId, newValue) => {
        onChange({
            ...ratings,
            [aspectId]: parseInt(newValue, 10),
        });
    };

    // Sub-component สำหรับการรับ Input ดาว
    const StarRatingInput = ({ aspectId, currentValue }) => {
        return (
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer">
                        <input
                            type="radio"
                            name={aspectId}
                            value={star}
                            checked={currentValue === star}
                            onChange={() => handleRatingChange(aspectId, star)}
                            className="sr-only"
                        />
                        <svg
                            className={`w-6 h-6 ${star <= currentValue ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.38 2.454a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.84-.197-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.04 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                        </svg>
                    </label>
                ))}
            </div>
        );
    };

    // โหมด Input: แสดงหัวข้อทั้งหมดพร้อมช่องกรอก
    return (
        <div className="space-y-4">
            {aspects.map((aspect) => (
                <div key={aspect.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-gray-600 mb-2 sm:mb-0">{aspect.label}</label>
                    {/* ✅ ใช้ Optional Chaining และ Default Value (|| 0) เพื่อป้องกัน Error */}
                    <StarRatingInput aspectId={aspect.id} currentValue={ratings?.[aspect.id] || 0} /> 
                </div>
            ))}
        </div>
    );
};

export default RatingInput;