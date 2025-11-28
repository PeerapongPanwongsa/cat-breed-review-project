import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BreedCard from '../components/breed/BreedCard.js';
import LoadingSpinner from '../components/common/LoadingSpinner.js';
import { getCats } from '../api/catApi.js';
import useApi from '../hooks/useApi.js';
import SearchBar from '../components/common/SearchBar.js';

const CatListPage = () => {
  const { data: responseData, loading, error, request: fetchCats } = useApi(getCats);
  const [searchParams] = useSearchParams();

  // 1. ดึงข้อมูลดิบ
  const rawCats = responseData?.data || (Array.isArray(responseData) ? responseData : []);

  // 2. ใช้ข้อมูลที่เรียงตาม A-Z มาจาก Backend แล้ว (ลบ Client-side sorting)
  const cats = rawCats;

  useEffect(() => {
    const query = searchParams.get('q');
    
    if (query) {
      // ใช้ q เพื่อค้นหา (Backend ต้องรองรับ)
      fetchCats({ q: query, limit: 1000, offset: 0 }); 
    } else {
      // ดึงข้อมูลทั้งหมดโดยไม่มีการจำกัด limit/offset เพื่อแสดงรายการทั้งหมด
      fetchCats({ limit: 1000, offset: 0 }); 
    }
  }, [fetchCats, searchParams]);

  const handleSearchSubmit = (query) => {
    fetchCats({ q: query, limit: 1000, offset: 0 }); 
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
      
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cats.length > 0 ? (
            cats.map((breed) => (
              <BreedCard key={breed.id} breed={breed} />
            ))
          ) : (
            <p className="text-gray-600 col-span-full text-center">
              ไม่พบข้อมูลสายพันธุ์แมว
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CatListPage;