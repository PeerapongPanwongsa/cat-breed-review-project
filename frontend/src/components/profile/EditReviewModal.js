import React, { useState, useEffect } from 'react';
import { updateReview } from '../../api/reviewApi';
import Button from '../common/Button';
import RatingInput from '../breed/RatingInput';
import TagInput from '../breed/TagInput';
import { XMarkIcon } from '@heroicons/react/24/solid';

const EditReviewModal = ({ isOpen, onClose, reviewToEdit, onReviewUpdated }) => {
  const [ratings, setRatings] = useState({ friendliness: 0, adaptability: 0, energyLevel: 0, grooming: 0 });
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reviewToEdit) {
      setRatings(reviewToEdit.ratings || { friendliness: 0, adaptability: 0, energyLevel: 0, grooming: 0 });
      setComment(reviewToEdit.comment || '');
      setTags(reviewToEdit.tags || []);
    }
  }, [reviewToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const updatedReviewData = {
      ...reviewToEdit,
      ratings: ratings,
      comment: comment,
      tags: tags,
    };

    try {
      const response = await updateReview(reviewToEdit.id, updatedReviewData);
      
      onReviewUpdated(response.data);
      setLoading(false);
      onClose();

    } catch (err) {
      setError("Failed to update review: " + err.message);
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-2xl p-6 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          แก้ไขรีวิว
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              ให้คะแนนแบบแยกแง่มุม:
            </label>
            <RatingInput ratings={ratings} onChange={setRatings} />
          </div>

          <div>
            <label htmlFor="edit-comment" className="block text-lg font-semibold text-gray-700 mb-2">
              ประสบการณ์ของคุณ:
            </label>
            <textarea
              id="edit-comment"
              rows="5"
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-base"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              แท็ก (#)
            </label>
            <TagInput
              selectedTags={tags}
              onChange={setTags}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" className="text-lg px-6 py-2" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReviewModal;