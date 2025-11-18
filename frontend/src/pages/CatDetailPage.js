import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCatById } from '../api/catApi';
import { postReview } from '../api/reviewApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Tag from '../components/breed/Tag';
import Button from '../components/common/Button';
import ReviewList from '../components/breed/ReviewList';
import ReviewForm from '../components/breed/ReviewForm';

const calculateNewAverages = (oldReviews, newReview) => {
  const allReviews = [...oldReviews, newReview];
  const reviewCount = allReviews.length;

  if (reviewCount === 0) {
    return { friendliness: 0, adaptability: 0, energyLevel: 0, grooming: 0 };
  }

  const totalRatings = { friendliness: 0, adaptability: 0, energyLevel: 0, grooming: 0 };
  
  for (const review of allReviews) {
    totalRatings.friendliness += review.ratings.friendliness;
    totalRatings.adaptability += review.ratings.adaptability;
    totalRatings.energyLevel += review.ratings.energyLevel;
    totalRatings.grooming += review.ratings.grooming;
  }

  return {
    friendliness: totalRatings.friendliness / reviewCount,
    adaptability: totalRatings.adaptability / reviewCount,
    energyLevel: totalRatings.energyLevel / reviewCount,
    grooming: totalRatings.grooming / reviewCount,
  };
};


const CatDetailPage = () => {
  const { id: catId } = useParams();
  const { user } = useAuth();
  const [catData, setCatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCat = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCatById(id);
      setCatData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (catId) {
      fetchCat(catId);
    }
  }, [catId]);

  const handleReviewSubmit = async (reviewData) => {
    try {
      const response = await postReview(reviewData);
      const newReview = response.data;

      setCatData((prevData) => {
        
        const newAverages = calculateNewAverages(
          prevData.reviews || [],
          newReview
        );

        return {
          ...prevData,
          ratings: newAverages,
          reviews: [...(prevData.reviews || []), newReview],
        };
      });

      alert('ขอบคุณสำหรับรีวิวครับ!');
      
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert('เกิดข้อผิดพลาดในการส่งรีวิว');
    }
  };


  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 p-4 bg-red-100 rounded-lg">{error}</div>;
  if (!catData) return <div className="text-center text-gray-600">ไม่พบข้อมูลสายพันธุ์แมว</div>;

  const { reviews = [], qas = [], ...breedDetails } = catData;

  return (
    <div className="max-w-4xl mx-auto">
      <section className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">{breedDetails.name}</h1>
        <img
          src={breedDetails.image_url || 'https://placehold.co/800x400/indigo/white?text=Cat'}
          alt={breedDetails.name}
          className="w-full h-96 object-cover rounded-lg shadow-lg mb-6"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          <Tag tag="เลี้ยงง่าย" clickable={false} />
          <Tag tag="มือใหม่หัดเลี้ยง" clickable={false} />
        </div>
        <p className="text-gray-700 text-lg leading-relaxed mb-4">
          {breedDetails.description || 'รายละเอียดของสายพันธุ์นี้...'}
        </p>
        
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold text-gray-700 mb-2">ข้อมูลเพิ่มเติม (Admin-Managed):</h4>
          <p className="text-sm text-gray-600">ค่าใช้จ่ายโดยประมาณ: (เร็วๆ นี้)</p>
          <p className="text-sm text-gray-600">นิสัย: (เร็วๆ นี้)</p>
        </div>
      </section>

      <ReviewList reviews={reviews} />

      {user ? (
        <ReviewForm catId={catId} onSubmitReview={handleReviewSubmit} />
      ) : (
        <div className="text-center p-6 bg-gray-100 rounded-lg mt-10 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">คุณอยากแบ่งปันประสบการณ์?</h4>
          <p className="text-gray-600 my-2">
            กรุณาเข้าสู่ระบบเพื่อเขียนรีวิวของคุณ
          </p>
          <Link to="/login">
            <Button variant="primary">
              เข้าสู่ระบบเพื่อเขียนรีวิว
            </Button>
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          ถาม-ตอบ ประจำสายพันธุ์ ({qas.length})
        </h3>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-gray-500">(ฟีเจอร์ ถาม-ตอบ เร็วๆ นี้)</p>
        </div>
      </section>
    </div>
  );
};

export default CatDetailPage;