import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.js';
import { getCats } from '../api/catApi.js';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import SearchBar from '../components/common/SearchBar.js';

const HomePage = () => {
  const [featuredCats, setFeaturedCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedCats = async () => {
      try {
        setLoading(true);
        const response = await getCats({ _limit: 3 }); 
        setFeaturedCats(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedCats();
  }, []);

  const handleSearchSubmit = (query) => {
    if (query) {
      navigate(`/cats?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/cats');
    }
  };

  const renderFeaturedCats = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    if (error) {
      return <div className="text-red-500 text-center col-span-full">Error: {error}</div>;
    }
    return (
      <>
        {featuredCats.map((cat) => (
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

        <div className="mt-8 mb-6 max-w-lg mx-auto">
          <SearchBar
            onSearch={handleSearchSubmit}
            placeholder="ค้นหาสายพันธุ์ที่คุณสนใจ..."
            className="shadow-lg"
          />
        </div>
        
        <Link to="/cats">
          <Button variant="primary" className="text-lg px-8 py-3">
            ดูสายพันธุ์แมวทั้งหมด
          </Button>
        </Link>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">สายพันธุ์ยอดนิยม</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {renderFeaturedCats()}
        </div>
      </section>
    </div>
  );
};

export default HomePage;