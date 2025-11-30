import { XMarkIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { addCatBreed, updateCatBreed } from '../../api/catApi';
import Button from '../common/Button';

const CatFormModal = ({ isOpen, onClose, catToEdit, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    history: '',
    appearance: '',
    temperament: '',
    care_instructions: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  useEffect(() => {
    if (catToEdit) {
      setFormData({
        name: catToEdit.name || '',
        origin: catToEdit.origin || '',
        history: catToEdit.history || '',
        appearance: catToEdit.appearance || '',
        temperament: catToEdit.temperament || '',
        care_instructions: catToEdit.care || catToEdit.care_instructions || '',
        image_url: catToEdit.image_url || ''
      });
    } else {
      
      setFormData({ name: '', origin: '', history: '', appearance: '', temperament: '', care_instructions: '', image_url: '' });
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

    
    const payload = {
      name: formData.name,
      origin: formData.origin,
      history: formData.history,
      appearance: formData.appearance,
      temperament: formData.temperament,
      care: formData.care_instructions,
      image_url: formData.image_url
    };

    try {
      if (catToEdit) {
        await updateCatBreed(catToEdit.id, payload);
        alert('แก้ไขข้อมูลเรียบร้อย!');
      } else {
        await addCatBreed(payload);
        alert('เพิ่มสายพันธุ์ใหม่เรียบร้อย!');
      }
      
      onSaveSuccess();
      onClose();
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


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประวัติความเป็นมา</label>
            <textarea
              name="history"
              value={formData.history}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="ประวัติความเป็นมา..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ลักษณะเด่น</label>
            <textarea
              name="appearance"
              value={formData.appearance}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="ลักษณะเด่น..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">นิสัย</label>
            <textarea
              name="temperament"
              value={formData.temperament}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="ลักษณะนิสัยทั่วไป..."
            ></textarea>
          </div>


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