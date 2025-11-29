import React, { useState, useEffect } from 'react';
import { getCats } from '../api/catApi.js';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import { Link } from 'react-router-dom';

const calculateOverallRating = (cat) => {
    const ratings = cat.ratings;
    if (!ratings || Object.keys(ratings).length === 0) {
        return 0;
    }
    
    const totalRatings = Object.values(ratings).reduce((sum, val) => sum + val, 0);
    const numRatings = Object.keys(ratings).length;
    
    if (numRatings === 0) {
        return 0;
    }
    
    return totalRatings / numRatings;
};

const HomePage = () => {
    const [allCats, setAllCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllCats = async () => {
            try {
                setLoading(true);
                const response = await getCats({ limit: 1000, offset: 0 }); 
                
                const catsData = response.data.data || response.data;
                
                setAllCats(Array.isArray(catsData) ? catsData : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAllCats();
    }, []);

    const sortedCats = [...allCats]
        .map(cat => ({
            ...cat,
            overallRating: calculateOverallRating(cat)
        }))
        .sort((a, b) => b.overallRating - a.overallRating)
        .slice(0, 3);
        
    const renderFeaturedCats = () => {
        if (loading) return <LoadingSpinner />;
        if (error) return <div className="text-red-500 text-center col-span-full">Error: {error}</div>;
        
        if (sortedCats.length === 0 || sortedCats[0].overallRating === 0) {
            return (
                <div className="col-span-full text-center p-6 bg-gray-50 rounded-lg text-gray-600">
                    ยังไม่มีข้อมูลสายพันธุ์ที่มีรีวิว/คะแนนเฉลี่ย
                </div>
            );
        }
        
        return (
            <>
                {sortedCats.map((cat) => (
                    <BreedCard key={cat.id} breed={cat} />
                ))}
            </>
        );
    };

    return (
        <div className="text-center">
            <section className="bg-indigo-50 rounded-lg p-12 md:p-20 mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                    ค้นหาสายพันธุ์แมวที่ใช่สำหรับคุณ
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    อ่านรีวิวจากผู้เลี้ยงจริง ค้นหาข้อมูลสายพันธุ์ และตัดสินใจ
                    <br />
                    ได้อย่างมั่นใจก่อนรับเลี้ยง
                </p>
            </section>

            <section className="mb-12">
                <h2 className="text-3xl font-semibold text-gray-800 mb-6">
                    สายพันธุ์ยอดนิยม (จากคะแนนเฉลี่ย)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {renderFeaturedCats()}
                </div>
            </section>
        </div>
    );
};

export default HomePage;