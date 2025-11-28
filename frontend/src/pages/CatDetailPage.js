import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCatById, getCatDiscussions } from '../api/catApi';
import { postReview, deleteReview } from '../api/reviewApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Tag from '../components/breed/Tag';
import Button from '../components/common/Button';
import ReviewList from '../components/breed/ReviewList';
import ReviewForm from '../components/breed/ReviewForm';
import EditReviewModal from '../components/profile/EditReviewModal';
import RatingInput from '../components/breed/RatingInput';
import { MapPinIcon, HeartIcon, BoltIcon, PaintBrushIcon } from '@heroicons/react/24/solid';


const getPopularTags = (reviews) => {
    if (!reviews || reviews.length === 0) return [];
    const allTags = reviews.flatMap(review => review.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 5);
};

// 💡 ฟังก์ชันช่วยแสดงชื่อ Rating 
const getRatingLabel = (key) => {
    switch(key) {
      case 'friendliness': return { label: 'ความเป็นมิตร', icon: <HeartIcon className="w-5 h-5 text-red-500" /> };
      case 'adaptability': return { label: 'ความยืดหยุ่น', icon: <MapPinIcon className="w-5 h-5 text-blue-500" /> };
      case 'energyLevel': return { label: 'ระดับพลังงาน', icon: <BoltIcon className="w-5 h-5 text-yellow-500" /> };
      case 'grooming': return { label: 'การดูแลขน', icon: <PaintBrushIcon className="w-5 h-5 text-green-500" /> };
      default: return { label: key, icon: null };
    }
};


const CatDetailPage = () => {
    const { id: catId } = useParams();
    const { user } = useAuth();
    const [catData, setCatData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState(null);

    const fetchCat = async (id) => {
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
            await postReview(reviewData);
            // ดึงข้อมูลแมวใหม่ทั้งหมดเพื่อให้คะแนนเฉลี่ยอัปเดต
            await fetchCat(catId); 
            alert('ขอบคุณสำหรับรีวิวครับ!');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการส่งรีวิว');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("ต้องการลบรีวิวนี้?")) return;
        try {
            await deleteReview(reviewId);
            // ต้องเรียก fetchCat เพื่ออัปเดตคะแนนเฉลี่ยหลังจากลบด้วย
            await fetchCat(catId); 
        } catch (err) {
            alert("ลบไม่สำเร็จ");
        }
    };

    const handleEditReview = (review) => {
        setReviewToEdit(review);
        setIsModalOpen(true);
    };

    const onReviewUpdated = (updatedReview) => {
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
        // ต้องเรียก fetchCat เพื่ออัปเดตคะแนนเฉลี่ยหลังจากแก้ไขด้วย
        fetchCat(catId);
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-center text-red-500 p-4">{error}</div>;
    if (!catData) return <div className="text-center text-gray-600">ไม่พบข้อมูล</div>;

    const { reviews = [], ...breedDetails } = catData;
    const popularTags = getPopularTags(reviews);
    
    // แปลง ratings map ให้เป็น Array ของ Object: [{key, value, label}, ...]
    // ✅ FIX: ใช้ Optional Chaining (?.) เพื่อป้องกัน Error หาก breedDetails.ratings เป็น undefined
    const ratingsArray = breedDetails.ratings ? Object.entries(breedDetails.ratings).map(([key, value]) => ({
      key, 
      value, 
      label: key.charAt(0).toUpperCase() + key.slice(1)
    })) : [];

    return (
        <div className="max-w-6xl mx-auto">
            
            {/* ส่วนแสดงรายละเอียดแมว */}
            <section className="bg-white shadow-lg rounded-xl overflow-hidden md:flex mb-10">
                <div className="md:w-1/3">
                    <img 
                        src={breedDetails.image_url || 'https://placehold.co/400x400?text=Image Not Found'} 
                        alt={breedDetails.name} 
                        className="w-full h-96 md:h-full object-cover"
                        onError={(e) => e.target.src = 'https://placehold.co/400x400?text=Cat Image Not Found'}
                    />
                </div>
                
                <div className="md:w-2/3 p-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{breedDetails.name}</h1>
                    
                    {/* แสดงถิ่นกำเนิด */}
                    <p className="text-lg text-indigo-600 font-semibold mb-4 flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5 text-indigo-600" />
                        ถิ่นกำเนิด: {breedDetails.origin || 'ไม่ระบุ'}
                    </p>

                    <p className="text-gray-700 mb-6 leading-relaxed">{breedDetails.description}</p>
                    
                    {/* ส่วนการดูแลรักษา */}
                    <div className="mb-6 p-4 bg-gray-50 border-l-4 border-indigo-500 rounded">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">การดูแลรักษา</h3>
                        <p className="text-gray-600 whitespace-pre-line">{breedDetails.care || 'ยังไม่มีข้อมูลการดูแล'}</p> 
                    </div>

                    {/* คะแนนเฉลี่ย */}
                    <div className="mt-8 pt-4 border-t">
                        <h3 className="text-2xl font-bold text-indigo-700 mb-4">
                            คะแนนเฉลี่ย ({breedDetails.discussion_count} รีวิว)
                        </h3>
                        <div className="space-y-3">
                            {ratingsArray.length > 0 ? (
                                ratingsArray.map((item) => { 
                                    const ratingInfo = getRatingLabel(item.key);
                                    return (
                                        <div key={item.key} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                {ratingInfo.icon} 
                                                {ratingInfo.label}
                                            </div>
                                            <RatingInput
                                                // ❌ FIX: ใช้โหมด Display ตามที่ RatingInput ถูกแก้ไข
                                                name={item.key}
                                                value={item.value} 
                                                readOnly={true}
                                            />
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500">ยังไม่มีคะแนนเฉลี่ย</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ส่วน Popular Tags */}
            <section className="mb-10 p-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">แท็กยอดนิยม</h3>
                <div className="flex flex-wrap gap-2">
                    {popularTags.length > 0 ? popularTags.map(tag => (
                        <Tag key={tag} tag={tag.replace(/^#/, '')} clickable={false} />
                    )) : (
                        <span className="text-gray-400 text-sm">ยังไม่มีแท็กยอดนิยม</span>
                    )}
                </div>
            </section>

            {/* ส่วนรีวิว */}
            <h2 className="text-3xl font-bold text-gray-800 mb-6 mt-12">รีวิวจากผู้ใช้งาน</h2>
            
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

            {/* Modal แก้ไข */}
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