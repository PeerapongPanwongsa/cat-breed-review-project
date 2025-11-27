import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getReviewsByUserId, deleteReview } from '../../api/reviewApi';
import LoadingSpinner from '../common/LoadingSpinner';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import EditReviewModal from './EditReviewModal';
import { StarIcon } from '@heroicons/react/20/solid'; // (Import ดาว)

// (Component ย่อยแสดงดาว - ใช้โค้ดเดิม)
const StarRating = ({ rating }) => (
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const MyReviewItem = ({ review, onDelete, onEdit }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  // (ป้องกัน error กรณีค่าว่าง)
  const commentText = review.comment || review.message || "";
  const ratings = review.ratings || {};
  const tags = review.tags || [];

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้? การดำเนินการนี้จะอัปเดตค่าเฉลี่ยดาวของสายพันธุ์นี้ด้วย")) {
      setIsDeleting(true);
      try {
        await onDelete(review.id, review.breed_id);
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบ");
        setIsDeleting(false);
      }
    }
  };

  // 🚩 คำนวณค่าเฉลี่ยรวม 4 คุณสมบัติ
  const validRatings = Object.values(ratings).filter(r => r > 0);
  const averageRating = validRatings.length > 0 
    ? validRatings.reduce((sum, current) => sum + current, 0) / validRatings.length 
    : 0;

  return (
    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
            {/* 🚩 ใช้ชื่อสายพันธุ์ที่มาจาก Back-end (review.breed_name) */}
            <h4 className="font-bold text-indigo-700 text-lg">
                {review.breed_name || `Cat ID: ${review.breed_id}`}
            </h4>
            <p className="text-xs text-gray-500">{formatDate(review.date)}</p>
        </div>
        {/* (ปุ่มจัดการ) */}
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs px-3 py-1" onClick={() => onEdit(review)}>แก้ไข</Button>
          <Button variant="danger" className="text-xs px-3 py-1" onClick={handleDeleteClick} disabled={isDeleting}>
            {isDeleting ? '...' : 'ลบ'}
          </Button>
        </div>
      </div>

      {/* (แสดงดาว - ค่าเฉลี่ยรวม) */}
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
         <span>คะแนนรวม: {averageRating.toFixed(1)}</span>
         <StarRating rating={averageRating} />
      </div>

      {/* (แสดงคอมเมนต์) */}
      <p className="text-gray-800 mb-3">{commentText}</p>

      {/* (แสดงแท็ก) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, index) => (
                <span key={index} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                    #{tag.replace(/^#/, '')}
                </span>
            ))}
        </div>
      )}

      <Link to={`/cats/${review.breed_id}`} className="text-sm text-indigo-600 hover:underline">
        ดูรีวิวเต็มในหน้าสายพันธุ์ &rarr;
      </Link>
    </div>
  );
};

const MyReviewList = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  // 🚩 ลบ state catsMap และโค้ดดึง getCats ที่ไม่มีประสิทธิภาพออกไป

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);

  const fetchReviews = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. ดึงรีวิว (ตอนนี้ Back-end ส่ง BreedName มาแล้ว)
      const reviewsRes = await getReviewsByUserId(user.id);
      const rawDiscussions = reviewsRes.data.data || reviewsRes.data || [];
      const mappedReviews = rawDiscussions.map(item => ({
         ...item,
         comment: item.comment || item.message || "",
         breed_id: item.breed_id, // ใช้ breed_id แทน catId
         date: item.date || item.created_at,
         ratings: item.ratings || {},
         tags: item.tags || []
      }));
      setReviews(mappedReviews);

    } catch (error) {
      console.error("Failed to fetch user reviews", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  // (ส่วน Delete/Edit - Logic ปรับปรุง)
  const handleDeleteReview = async (reviewId, breedId) => {
    try {
      await deleteReview(reviewId);
      // อัปเดต UI ใน Profile Page
      setReviews(prev => prev.filter(r => r.id !== reviewId)); 
      
      // 🚩 บังคับรีโหลดหน้าเว็บเพื่ออัปเดตค่าเฉลี่ยดาวในหน้า Cat Detail/Cat List
      window.location.reload(); 
    } catch (err) { throw err; }
  };

  const handleReviewUpdated = (updatedReview) => {
    // อัปเดต UI ใน Profile Page
    setReviews(prev => prev.map(r => {
        if (r.id === updatedReview.id) {
             return { 
                 ...r, // เก็บ breed_name เดิมไว้
                 ...updatedReview, 
                 comment: updatedReview.message,
                 breed_id: updatedReview.breed_id,
             };
        }
        return r;
    }));
    
    // 🚩 บังคับรีโหลดหน้าเว็บเพื่ออัปเดตค่าเฉลี่ยดาวในหน้า Cat Detail/Cat List
    window.location.reload();
  };
  
  const handleEditRequest = (review) => {
    // แมปฟิลด์เพื่อให้เข้ากับ EditReviewModal ที่ใช้ 'comment' แทน 'message'
    setReviewToEdit({...review, comment: review.message || review.comment});
    setIsModalOpen(true);
  };


  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map(review => (
              <MyReviewItem 
                key={review.id} 
                review={review} 
                onDelete={handleDeleteReview}
                onEdit={handleEditRequest}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">คุณยังไม่ได้เขียนรีวิวใดๆ</p>
        )}
      </div>
      <EditReviewModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        reviewToEdit={reviewToEdit} onReviewUpdated={handleReviewUpdated} 
      />
    </>
  );
};

export default MyReviewList;