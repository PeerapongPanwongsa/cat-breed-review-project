import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getReviewsByUserId, deleteReview } from '../../api/reviewApi';
import { getCats } from '../../api/catApi'; // (1. Import API ดึงแมว)
import LoadingSpinner from '../common/LoadingSpinner';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import EditReviewModal from './EditReviewModal';
import { StarIcon } from '@heroicons/react/20/solid'; // (Import ดาว)

// (Component ย่อยแสดงดาว - ก๊อปปี้มาใช้)
const StarRating = ({ rating }) => (
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const MyReviewItem = ({ review, onDelete, onEdit, catName }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  // (ป้องกัน error กรณีค่าว่าง)
  const commentText = review.comment || review.message || "";
  const ratings = review.ratings || {};
  const tags = review.tags || [];

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?")) {
      setIsDeleting(true);
      try {
        await onDelete(review.id);
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบ");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
            {/* (แสดงชื่อสายพันธุ์) */}
            <h4 className="font-bold text-indigo-700 text-lg">
                {catName || `Cat ID: ${review.catId}`}
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

      {/* (แสดงดาว - เอาค่าเฉลี่ยคร่าวๆ หรือแสดงสัก 1 หัวข้อ) */}
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
         <span>ความพึงพอใจ:</span>
         <StarRating rating={(ratings.friendliness + ratings.adaptability + ratings.energyLevel + ratings.grooming) / 4 || 0} />
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

      <Link to={`/cats/${review.catId}`} className="text-sm text-indigo-600 hover:underline">
        ดูรีวิวเต็มในหน้าสายพันธุ์ &rarr;
      </Link>
    </div>
  );
};

const MyReviewList = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [catsMap, setCatsMap] = useState({}); // (เก็บชื่อแมว { 1: 'Persian', 2: 'Siamese' })
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // 1. ดึงรีวิว
          const reviewsRes = await getReviewsByUserId(user.id);
          const rawReviews = reviewsRes.data.data || reviewsRes.data || [];
          const mappedReviews = rawReviews.map(item => ({
             ...item,
             comment: item.comment || item.message || "",
             catId: item.catId || item.breed_id,
             date: item.date || item.created_at,
             ratings: item.ratings || {},
             tags: item.tags || []
          }));
          setReviews(mappedReviews);

          // 2. ดึงข้อมูลแมวทั้งหมดเพื่อเอาชื่อมาเทียบ
          const catsRes = await getCats({ limit: 100 });
          const catsData = catsRes.data.data || catsRes.data || [];
          const map = {};
          catsData.forEach(cat => { map[cat.id] = cat.name; });
          setCatsMap(map);

        } catch (error) {
          console.error("Failed to fetch data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  // (ส่วน Delete/Edit - Logic เดิม)
  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) { throw err; }
  };

  const handleReviewUpdated = (updatedReview) => {
    setReviews(prev => prev.map(r => {
        if (r.id === updatedReview.id) {
             return { 
                 ...updatedReview, 
                 comment: updatedReview.comment || updatedReview.message,
                 catId: updatedReview.catId || updatedReview.breed_id,
                 date: updatedReview.date || updatedReview.created_at,
                 ratings: updatedReview.ratings,
                 tags: updatedReview.tags
             };
        }
        return r;
    }));
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
                catName={catsMap[review.catId]} // ส่งชื่อแมวไป
                onDelete={handleDeleteReview}
                onEdit={(r) => { setReviewToEdit(r); setIsModalOpen(true); }}
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