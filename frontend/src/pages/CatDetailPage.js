import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCatById, getCatDiscussions } from '../api/catApi';
import { postReview, deleteReview } from '../api/reviewApi'; // เพิ่ม deleteReview
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Tag from '../components/breed/Tag';
import Button from '../components/common/Button';
import ReviewList from '../components/breed/ReviewList';
import ReviewForm from '../components/breed/ReviewForm';
import EditReviewModal from '../components/profile/EditReviewModal'; // Import Modal

const getPopularTags = (reviews) => {
  // ... (ใช้โค้ดเดิม)
  if (!reviews || reviews.length === 0) return [];
  const allTags = reviews.flatMap(review => review.tags || []);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 5);
};


const CatDetailPage = () => {
  const { id: catId } = useParams();
  const { user } = useAuth();
  const [catData, setCatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State สำหรับ Modal แก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);

  const fetchCat = async (id) => {
    // ... (Logic เดิมใน fetchCat เหมือนเดิม)
    setLoading(true);
    setError(null);
    try {
      const [catResponse, discussionsResponse] = await Promise.all([
        getCatById(id),
        getCatDiscussions(id)
      ]);
      const cat = catResponse.data;
      const rawDiscussions = discussionsResponse.data.data || [];
      const mappedReviews = rawDiscussions.filter(d => !d.is_deleted).map(d => ({
        id: d.id,
        catId: d.breed_id,
        userId: d.user_id,
        authorName: d.username,
        date: d.created_at,
        comment: d.message,
        upVotes: d.like_count,
        downVotes: d.dislike_count,
        ratings: d.ratings || null,
        tags: d.tags || [],
        userReaction: d.user_reaction
      }));
      setCatData({ ...cat, reviews: mappedReviews });
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (catId) fetchCat(catId);
  }, [catId]);
  const handleReviewSubmit = async (reviewData) => {
    try {
      // 1. ส่งรีวิวไป Back-end
      await postReview(reviewData);

      // 2. 🚩 (แก้ไข) แทนที่จะคำนวณเอง ให้ดึงข้อมูลแมวใหม่ทั้งหมด
      //    (Back-end ได้คำนวณและอัปเดต average_ratings ใน DB แล้ว)
      await fetchCat(catId);

      alert('ขอบคุณสำหรับรีวิวครับ!');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งรีวิว');
    }
  };

  // (เพิ่ม) ฟังก์ชันลบรีวิว
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("ต้องการลบรีวิวนี้?")) return;
    try {
      await deleteReview(reviewId);
      setCatData(prev => ({
        ...prev,
        reviews: prev.reviews.filter(r => r.id !== reviewId)
      }));
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  // (เพิ่ม) ฟังก์ชันเปิด Modal แก้ไข
  const handleEditReview = (review) => {
    setReviewToEdit(review);
    setIsModalOpen(true);
  };

  // (เพิ่ม) ฟังก์ชันอัปเดตหลังจากแก้ไขเสร็จ
  const onReviewUpdated = (updatedReview) => {
    // แปลงข้อมูลกลับมาเป็น format ของ frontend
    const mappedUpdated = {
      ...updatedReview,
      comment: updatedReview.comment || updatedReview.message,
      catId: updatedReview.catId || updatedReview.breed_id,
      ratings: updatedReview.ratings,
      tags: updatedReview.tags
    };

    setCatData(prev => ({
      ...prev,
      reviews: prev.reviews.map(r => r.id === mappedUpdated.id ? { ...r, ...mappedUpdated } : r)
    }));
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;
  if (!catData) return <div className="text-center text-gray-600">ไม่พบข้อมูล</div>;

  const { reviews = [], ...breedDetails } = catData;
  const popularTags = getPopularTags(reviews);

  return (
    <div className="max-w-4xl mx-auto">
      {/* (ส่วนแสดงรายละเอียดแมว - เหมือนเดิม) */}
      <section className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">{breedDetails.name}</h1>
        <img src={breedDetails.image_url || 'https://placehold.co/800'} alt={breedDetails.name} className="w-full h-96 object-cover rounded-lg shadow-lg mb-6" />
        <div className="flex flex-wrap gap-2 mb-4">
          {popularTags.length > 0 ? popularTags.map(tag => <Tag key={tag} tag={tag.replace(/^#/, '')} clickable={false} />) : <span className="text-gray-400 text-sm">ยังไม่มีแท็ก</span>}
        </div>
        <p className="text-gray-700 text-lg mb-4">{breedDetails.description}</p>
      </section>

      {/* (Review List - ส่ง props onEdit, onDelete ไปเพิ่ม) */}
      <ReviewList
        reviews={reviews}
        onEdit={handleEditReview}
        onDelete={handleDeleteReview}
      />

      {user ? (
        <ReviewForm catId={catId} onSubmitReview={handleReviewSubmit} />
      ) : (
        <div className="text-center p-6 bg-gray-100 rounded-lg mt-10">
          <p className="text-gray-600 mb-2">กรุณาเข้าสู่ระบบเพื่อรีวิว</p>
          <Link to="/login"><Button variant="primary">เข้าสู่ระบบ</Button></Link>
        </div>
      )}

      {/* (Modal แก้ไข) */}
      <EditReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reviewToEdit={reviewToEdit}
        onReviewUpdated={onReviewUpdated}
      />
    </div>
  );
};

export default CatDetailPage;