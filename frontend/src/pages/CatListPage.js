import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import { getCats } from '../api/catApi.js';
import useApi from '../hooks/useApi.js';
import SearchBar from '../components/common/SearchBar.js';

const CatListPage = () => {
  const { data: cats, loading, error, request: fetchCats } = useApi(getCats);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const query = searchParams.get('q');
    
    if (query) {
      fetchCats({ q: query });
    } else {
      fetchCats(); 
    }
  }, [fetchCats, searchParams]);

  const handleSearchSubmit = (query) => {
    fetchCats({ q: query }); 
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">สายพันธุ์แมวทั้งหมด</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
        <SearchBar
          onSearch={handleSearchSubmit}
          placeholder="ค้นหาสายพันธุ์ (เช่น Scottish Fold)..."
        />
      </div>

      {loading && <LoadingSpinner />}
      
      {error && <div className="text-center text-red-500 p-4 bg-red-100 rounded-lg">{error}</div>}
      
      {!loading && !error && cats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cats.length > 0 ? (
            cats.map((breed) => (
              <BreedCard key={breed.id} breed={breed} />
            ))
          ) : (
            <p className="text-gray-600 col-span-full text-center">ไม่พบสายพันธุ์แมวที่ตรงเงื่อนไข</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CatListPage;