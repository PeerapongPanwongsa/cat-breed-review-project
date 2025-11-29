import { StarIcon } from '@heroicons/react/20/solid';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteReview, getReviewsByUserId } from '../../api/reviewApi';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatDate';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import EditReviewModal from './EditReviewModal';


const StarRating = ({ rating }) => (
    <div className="flex">
        {[...Array(5)].map((_, i) => (
            <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
        ))}
    </div>
);

const MyReviewItem = ({ review, onDelete, onEdit }) => {
    const [isDeleting, setIsDeleting] = useState(false);
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


    const validRatings = Object.values(ratings).filter(r => r > 0);
    const averageRating = validRatings.length > 0
        ? validRatings.reduce((sum, current) => sum + current, 0) / validRatings.length
        : 0;

    return (
        <div className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>

                    <h4 className="font-bold text-indigo-700 text-lg">
                        {review.breed_name || `Cat ID: ${review.breed_id}`}
                    </h4>
                    <p className="text-xs text-gray-500">{formatDate(review.date)}</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs px-3 py-1" onClick={() => onEdit(review)}>แก้ไข</Button>
                    <Button variant="danger" className="text-xs px-3 py-1" onClick={handleDeleteClick} disabled={isDeleting}>
                        {isDeleting ? '...' : 'ลบ'}
                    </Button>
                </div>
            </div>


            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <span>คะแนนรวม: {averageRating.toFixed(1)}</span>
                <StarRating rating={averageRating} />
            </div>


            <p className="text-gray-800 mb-3">{commentText}</p>


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


    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState(null);

    const fetchReviews = async () => {
        if (!user) return;
        setLoading(true);
        try {

            const reviewsRes = await getReviewsByUserId(user.id);
            const rawDiscussions = reviewsRes.data.data || reviewsRes.data || [];
            const mappedReviews = rawDiscussions.map(item => ({
                ...item,
                comment: item.comment || item.message || "",
                breed_id: item.breed_id,
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


    const handleDeleteReview = async (reviewId, breedId) => {
        try {
            await deleteReview(reviewId);

            setReviews(prev => prev.filter(r => r.id !== reviewId));


            window.location.reload();
        } catch (err) { throw err; }
    };

    const handleReviewUpdated = (updatedReview) => {

        setReviews(prev => prev.map(r => {
            if (r.id === updatedReview.id) {
                return {
                    ...r,
                    ...updatedReview,
                    comment: updatedReview.message,
                    breed_id: updatedReview.breed_id,
                };
            }
            return r;
        }));


        window.location.reload();
    };

    const handleEditRequest = (review) => {

        setReviewToEdit({ ...review, comment: review.message || review.comment });
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