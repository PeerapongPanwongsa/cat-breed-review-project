import React from 'react';

const RatingInput = ({ ratings, onChange }) => {
  const aspects = [
    { id: 'friendly', label: 'ความเป็นมิตร' },
    { id: 'easy_to_care', label: 'ความง่ายในการเลี้ยง' },
    { id: 'energyLevel', label: ' ความขี้เล่น' },
    { id: 'Care', label: 'การดูแล' },
  ];

  const handleRatingChange = (aspectId, value) => {
    onChange({
      ...ratings,
      [aspectId]: parseInt(value, 10),
    });
  };

  const StarRating = ({ aspectId, value }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer">
            <input
              type="radio"
              name={aspectId}
              value={star}
              checked={value === star}
              onChange={() => handleRatingChange(aspectId, star)}
              className="sr-only"
            />
            <svg
              className={`w-6 h-6 ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.38 2.454a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.84-.197-1.54-1.118l1.287-3.97a1 1 0 00-.364-1.118L2.04 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
            </svg>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {aspects.map((aspect) => (
        <div key={aspect.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <label className="text-gray-600 mb-2 sm:mb-0">{aspect.label}:</label>
          <StarRating aspectId={aspect.id} value={ratings[aspect.id] || 0} />
        </div>
      ))}
    </div>
  );
};

export default RatingInput;