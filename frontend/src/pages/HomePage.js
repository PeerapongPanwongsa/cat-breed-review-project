import React, { useState, useEffect } from 'react';
import { getCats } from '../api/catApi.js';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import { Link } from 'react-router-dom';

// 💡 Helper Function: คำนวณคะแนนเฉลี่ยรวม (Overall Average Rating)
const calculateOverallRating = (cat) => {
    const ratings = cat.ratings;
    if (!ratings || Object.keys(ratings).length === 0) {
        return 0;
    }
    
    const totalRatings = Object.values(ratings).reduce((sum, val) => sum + val, 0);
    const numRatings = Object.keys(ratings).length;
    
    // ป้องกันการหารด้วยศูนย์
    if (numRatings === 0) {
        return 0;
    }
    
    // คืนค่าคะแนนเฉลี่ยรวม
    return totalRatings / numRatings;
};

const HomePage = () => {
    const [allCats, setAllCats] = useState([]); // เปลี่ยนชื่อ state เพื่อสื่อถึงการดึงทั้งหมด
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllCats = async () => {
            try {
                setLoading(true);
                // ✅ ดึงข้อมูลทั้งหมด (หรือจำนวนมากพอ) เพื่อนำมาจัดเรียงความนิยม
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

    // 💡 Logic การจัดเรียง: หา 5 สายพันธุ์ที่มีคะแนนรวมเฉลี่ยสูงที่สุด
    const sortedCats = [...allCats]
        // 1. คำนวณคะแนนเฉลี่ยรวมสำหรับแต่ละตัว (Overall Rating)
        .map(cat => ({
            ...cat,
            overallRating: calculateOverallRating(cat)
        }))
        // 2. เรียงลำดับจากคะแนนรวมเฉลี่ยมากไปน้อย
        .sort((a, b) => b.overallRating - a.overallRating)
        // 3. เลือก 5 ตัวแรก
        .slice(0, 3);
        
    const renderFeaturedCats = () => {
        if (loading) return <LoadingSpinner />;
        if (error) return <div className="text-red-500 text-center col-span-full">Error: {error}</div>;
        
        // ถ้าไม่มีข้อมูล หรือ 5 อันดับแรกมี Overall Rating เป็น 0 (เพราะยังไม่มีรีวิว)
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
                    // ส่ง 'breed' prop ที่มีข้อมูลครบถ้วน
                    <BreedCard key={cat.id} breed={cat} />
                ))}
            </>
        );
    };

    return (
        <div className="text-center">
            {/* Hero Section */}
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

            {/* Featured Breeds */}
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