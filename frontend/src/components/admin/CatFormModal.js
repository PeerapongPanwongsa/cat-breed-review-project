import React, { useState, useEffect } from 'react';
import { addCatBreed, updateCatBreed } from '../../api/catApi';
import Button from '../common/Button';
import { XMarkIcon } from '@heroicons/react/24/solid';

const CatFormModal = ({ isOpen, onClose, catToEdit, onSaveSuccess }) => {
  // State สำหรับฟอร์ม
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    description: '',
    care_instructions: '', // (ตรงกับ JSON ของ Backend: care_instructions หรือ care) *เช็ค Backend ใช้ care แต่ DB ใช้ care_instructions เดี๋ยวเราแมพให้
    image_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ถ้ามี catToEdit ส่งมา (โหมดแก้ไข) ให้เติมข้อมูลลงฟอร์ม
  useEffect(() => {
    if (catToEdit) {
      setFormData({
        name: catToEdit.name || '',
        origin: catToEdit.origin || '',
        description: catToEdit.description || '',
        care_instructions: catToEdit.care || catToEdit.care_instructions || '', // (รับค่าจาก backend)
        image_url: catToEdit.image_url || ''
      });
    } else {
      // โหมดเพิ่มใหม่: ล้างฟอร์ม
      setFormData({ name: '', origin: '', description: '', care_instructions: '', image_url: '' });
    }
  }, [catToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // เตรียมข้อมูลส่ง Backend
    // (Backend struct: Name, Origin, Description, Care, ImageURL)
    const payload = {
      name: formData.name,
      origin: formData.origin,
      description: formData.description,
      care: formData.care_instructions, // (Mapping ให้ตรงกับ Backend Request Struct)
      image_url: formData.image_url
    };

    try {
      if (catToEdit) {
        // Update
        await updateCatBreed(catToEdit.id, payload);
        alert('แก้ไขข้อมูลเรียบร้อย!');
      } else {
        // Create
        await addCatBreed(payload);
        alert('เพิ่มสายพันธุ์ใหม่เรียบร้อย!');
      }
      
      onSaveSuccess(); // แจ้งแม่ว่าเสร็จแล้ว
      onClose();       // ปิด Modal
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="relative bg-white w-full max-w-2xl p-6 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {catToEdit ? 'แก้ไขข้อมูลสายพันธุ์' : 'เพิ่มสายพันธุ์ใหม่'}
        </h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ชื่อสายพันธุ์ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสายพันธุ์ *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="เช่น Scottish Fold"
            />
          </div>

          {/* ถิ่นกำเนิด */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ถิ่นกำเนิด</label>
            <input
              type="text"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="เช่น Scotland"
            />
          </div>

          {/* รูปภาพ URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL รูปภาพ</label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="https://example.com/cat.jpg"
            />
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" className="mt-2 h-32 w-auto object-cover rounded border" />
            )}
          </div>

          {/* คำอธิบาย */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="ลักษณะนิสัยทั่วไป..."
            ></textarea>
          </div>

          {/* วิธีเลี้ยงดู */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">การดูแลรักษา</label>
            <textarea
              name="care_instructions"
              value={formData.care_instructions}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="การดูแลขน, อาหาร, ข้อควรระวัง..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatFormModal;