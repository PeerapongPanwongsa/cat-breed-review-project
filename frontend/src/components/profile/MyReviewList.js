import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getReviewsByUserId, deleteReview } from '../../api/reviewApi';
import LoadingSpinner from '../common/LoadingSpinner';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import EditReviewModal from './EditReviewModal';

const MyReviewItem = ({ review, onDelete, onEdit }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    const confirmed = window.confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?\nการกระทำนี้ไม่สามารถย้อนกลับได้"
    );
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDelete(review.id);
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบรีวิว");
        setIsDeleting(false);
      }
    }
  };
  
  const handleEditClick = () => {
    onEdit(review);
  };

  return (
    <div className="p-4 border rounded-lg flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">{formatDate(review.date)}</p>
        <p className="text-gray-700 mt-1">
          {review.comment.length > 100
            ? `${review.comment.substring(0, 100)}...`
            : review.comment
          }
        </p>
        <Link
          to={`/cats/${review.catId}`}
          className="text-xs text-indigo-600 hover:underline"
        >
          (ดูรีวิวเต็มในหน้าสายพันธุ์)
        </Link>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="text-sm px-3 py-1"
          onClick={handleEditClick}
        >
          แก้ไข
        </Button>
        <Button
          variant="danger"
          className="text-sm px-3 py-1"
          onClick={handleDeleteClick}
          disabled={isDeleting}
        >
          {isDeleting ? 'กำลังลบ...' : 'ลบ'}
        </Button>
      </div>
    </div>
  );
};


const MyReviewList = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);

  useEffect(() => {
    if (user) {
      getReviewsByUserId(user.id)
        .then(response => {
          setReviews(response.data);
        })
        .catch(error => {
          console.error("Failed to fetch user reviews", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== reviewId)
      );
    } catch (err) {
      console.error("Failed to delete review:", err);
      throw err;
    }
  };

  const handleOpenEditModal = (review) => {
    setReviewToEdit(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReviewToEdit(null);
  };

  const handleReviewUpdated = (updatedReview) => {
    setReviews((prevReviews) =>
      prevReviews.map((review) =>
        review.id === updatedReview.id ? updatedReview : review
      )
    );
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
                onEdit={handleOpenEditModal}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">คุณยังไม่ได้เขียนรีวิวใดๆ</p>
        )}
      </div>

      <EditReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reviewToEdit={reviewToEdit}
        onReviewUpdated={handleReviewUpdated}
      />
    </>
  );
};

export default MyReviewList;