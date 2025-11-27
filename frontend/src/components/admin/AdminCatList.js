import React, { useState, useEffect } from 'react';
import { getCats, deleteCatBreed } from '../../api/catApi';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import CatFormModal from './CatFormModal';
import { PencilSquareIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const AdminCatList = () => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // (1. เพิ่ม State สำหรับคำค้นหา)
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState(null);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const response = await getCats({ limit: 1000 }); // (ดึงมาให้หมดเพื่อเรียงเอง)
      const catsData = response.data.data || response.data || [];
      setCats(Array.isArray(catsData) ? catsData : []);
    } catch (error) {
      console.error("Failed to fetch cats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสายพันธุ์ "${name}"?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        await deleteCatBreed(id);
        setCats(prev => prev.filter(cat => cat.id !== id));
      } catch (error) {
        alert('ลบไม่สำเร็จ: ' + error.message);
      }
    }
  };

  const handleEdit = (cat) => {
    setCatToEdit(cat);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setCatToEdit(null); 
    setIsModalOpen(true);
  };

  const handleSaveSuccess = () => {
    fetchCats(); 
  };

  // --- (2. Logic การเรียงลำดับและค้นหา) ---
  
  // 2.1 กรองตามคำค้นหา
  const filteredCats = cats.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2.2 เรียงลำดับตามชื่อ (A-Z)
  const sortedCats = [...filteredCats].sort((a, b) => 
    a.name.localeCompare(b.name, 'th', { sensitivity: 'base' })
  );
  // ----------------------------------------

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-700 whitespace-nowrap">
          รายการสายพันธุ์ ({sortedCats.length})
        </h3>
        
        <div className="flex w-full sm:w-auto gap-3">
          {/* (3. ช่องค้นหา) */}
          <div className="relative flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="ค้นหาชื่อสายพันธุ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button onClick={handleAdd} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <PlusIcon className="w-4 h-4" /> เพิ่มสายพันธุ์
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
              <th className="p-4 border-b w-16">#</th> {/* เปลี่ยนจาก ID เป็น # (ลำดับ) */}
              <th className="p-4 border-b w-24">รูปภาพ</th>
              <th className="p-4 border-b">ชื่อสายพันธุ์</th>
              <th className="p-4 border-b">ถิ่นกำเนิด</th>
              <th className="p-4 border-b text-center w-32">จัดการ</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {sortedCats.length > 0 ? (
              sortedCats.map((cat, index) => (
                <tr key={cat.id} className="hover:bg-gray-50 border-b last:border-none">
                  {/* (4. ใช้ index + 1 เพื่อแสดงลำดับ 1, 2, 3... สวยงาม) */}
                  <td className="p-4 font-mono text-gray-500">{index + 1}</td>
                  
                  <td className="p-4">
                    <img 
                      src={cat.image_url || 'https://placehold.co/50'} 
                      alt={cat.name} 
                      className="w-12 h-12 object-cover rounded border"
                      onError={(e) => e.target.src = 'https://placehold.co/50?text=?'}
                    />
                  </td>
                  <td className="p-4 font-medium text-indigo-900">{cat.name}</td>
                  <td className="p-4 text-gray-500">{cat.origin || '-'}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="แก้ไข"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="ลบ"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500 bg-gray-50">
                  {searchTerm ? `ไม่พบข้อมูลที่ตรงกับ "${searchTerm}"` : 'ไม่มีข้อมูลสายพันธุ์แมว'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <CatFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        catToEdit={catToEdit}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
};

export default AdminCatList;