import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { HandThumbUpIcon as ThumbUpOutline, HandThumbDownIcon as ThumbDownOutline } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolid, HandThumbDownIcon as ThumbDownSolid } from '@heroicons/react/24/solid';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'; // เพิ่มไอคอน
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import { toggleReaction } from '../../api/reviewApi';
import { useAuth } from '../../hooks/useAuth';

// (StarRating, AspectRatingsDisplay เหมือนเดิม...)
const StarRating = ({ rating }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, index) => (
      <StarIcon key={index} className={`w-4 h-4 ${index < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const AspectRatingsDisplay = ({ ratings }) => {
  if (!ratings) return null;
  const aspectLabels = { friendliness: 'ความเป็นมิตร', adaptability: 'การปรับตัว', energyLevel: 'พลังงาน', grooming: 'การดูแลขน' };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3 border-b pb-3">
      {Object.entries(ratings).map(([key, value]) => (
        <div key={key} className="flex justify-between items-center">
          <span>{aspectLabels[key] || key}:</span>
          <StarRating rating={value} />
        </div>
      ))}
    </div>
  );
};

const ReviewItem = ({ review, onEdit, onDelete }) => { // รับ props เพิ่ม
  const { user } = useAuth();
  const { id, userId, authorName, date, comment, ratings, tags = [], upVotes, downVotes, userReaction } = review;
  
  // เช็คว่าเป็นเจ้าของรีวิวหรือไม่?
  const isOwner = user && user.id === userId;

  const [voteStatus, setVoteStatus] = useState(userReaction || null);
  const [upCount, setUpCount] = useState(upVotes || 0);
  const [downCount, setDownCount] = useState(downVotes || 0);

  const handleReaction = async (type) => {
    if (!user) return alert("กรุณาเข้าสู่ระบบเพื่อโหวต");
    const previousStatus = voteStatus;
    setVoteStatus(type === voteStatus ? null : type);
    try {
      const response = await toggleReaction(id, type);
      const data = response.data;
      setVoteStatus(data.user_reaction);
      setUpCount(data.like_count);
      setDownCount(data.dislike_count);
    } catch (error) {
      setVoteStatus(previousStatus);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 relative group">
      {/* (ส่วนหัว) */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-indigo-700">{authorName}</span>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{formatDate(date)}</span>
            
            {/* --- ปุ่มแก้ไข/ลบ (แสดงเฉพาะเจ้าของ) --- */}
            {isOwner && (
                <div className="flex gap-1 ml-2">
                    <button onClick={() => onEdit(review)} className="p-1 text-gray-400 hover:text-blue-600" title="แก้ไข">
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(id)} className="p-1 text-gray-400 hover:text-red-600" title="ลบ">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>

      <AspectRatingsDisplay ratings={ratings} />
      <p className="text-gray-700 leading-relaxed mb-4">{comment}</p>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* (ปุ่มโหวต) */}
      <div className="flex items-center gap-3">
        <button onClick={() => handleReaction('like')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${voteStatus === 'like' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {voteStatus === 'like' ? <ThumbUpSolid className="w-5 h-5" /> : <ThumbUpOutline className="w-5 h-5" />}
          {upCount}
        </button>
        <button onClick={() => handleReaction('dislike')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${voteStatus === 'dislike' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {voteStatus === 'dislike' ? <ThumbDownSolid className="w-5 h-5" /> : <ThumbDownOutline className="w-5 h-5" />}
          {downCount}
        </button>
      </div>
    </div>
  );
};

const ReviewList = ({ reviews = [], onEdit, onDelete }) => { // รับ props เพิ่ม
  const sortedReviews = [...reviews].sort((a, b) => (b.upVotes || 0) - (a.upVotes || 0));

  return (
    <section className="mt-10">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">รีวิวจากผู้เลี้ยงจริง ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border rounded-lg bg-gray-50">
          <p>ยังไม่มีรีวิวสำหรับสายพันธุ์นี้</p>
          <p className="text-sm mt-1">(คุณสามารถเป็นคนแรกที่รีวิวได้ หากคุณล็อกอินแล้ว)</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedReviews.map((review) => (
            <ReviewItem key={review.id} review={review} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewList;