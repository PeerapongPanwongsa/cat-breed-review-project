import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import { HandThumbUpIcon as ThumbUpOutline, HandThumbDownIcon as ThumbDownOutline } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolid, HandThumbDownIcon as ThumbDownSolid } from '@heroicons/react/24/solid';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatDate';

const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => (
        <StarIcon
          key={index}
          className={`w-4 h-4 ${
            index < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const AspectRatingsDisplay = ({ ratings }) => {
  if (!ratings) return null;
  const aspectLabels = {
    friendliness: 'ความเป็นมิตร',
    adaptability: 'การปรับตัว',
    energyLevel: 'พลังงาน',
    grooming: 'การดูแลขน',
  };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3 border-b pb-3">
      {Object.entries(ratings).map(([key, value]) => (
        <div key={key} className="flex justify-between items-center">
          <span>{aspectLabels[key] || key}:</span>
          <StarRating rating={value} />
        </div>
      ))}
    </div>
  );
};

const ReviewItem = ({ review }) => {
  const { authorName, date, comment, ratings, tags = [], upVotes, downVotes } = review;

  const [voteStatus, setVoteStatus] = useState(null);

  const [upCount, setUpCount] = useState(upVotes || 0);
  const [downCount, setDownCount] = useState(downVotes || 0);

  const handleVoteUp = () => {
    if (voteStatus === 'up') {
      setVoteStatus(null);
      setUpCount(upCount - 1);
    } else if (voteStatus === 'down') {
      setVoteStatus('up');
      setUpCount(upCount + 1);
      setDownCount(downCount - 1);
    } else {
      setVoteStatus('up');
      setUpCount(upCount + 1);
    }
  };

  const handleVoteDown = () => {
    if (voteStatus === 'down') {
      setVoteStatus(null);
      setDownCount(downCount - 1);
    } else if (voteStatus === 'up') {
      setVoteStatus('down');
      setDownCount(downCount + 1);
      setUpCount(upCount - 1);
    } else {
      setVoteStatus('down');
      setDownCount(downCount + 1);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-indigo-700">{authorName}</span>
        <span className="text-sm text-gray-500">{formatDate(date)}</span>
      </div>
      <AspectRatingsDisplay ratings={ratings} />
      <p className="text-gray-700 leading-relaxed mb-4">{comment}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span key={tag} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleVoteUp}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            voteStatus === 'up'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {voteStatus === 'up' ? <ThumbUpSolid className="w-5 h-5" /> : <ThumbUpOutline className="w-5 h-5" />}
          {upCount}
        </button>

        <button
          onClick={handleVoteDown}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            voteStatus === 'down'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {voteStatus === 'down' ? <ThumbDownSolid className="w-5 h-5" /> : <ThumbDownOutline className="w-5 h-5" />}
          {downCount}
        </button>
      </div>
    </div>
  );
};

const ReviewList = ({ reviews = [] }) => {
  const sortedReviews = [...reviews].sort(
    (a, b) => (b.upVotes || 0) - (a.upVotes || 0)
  );

  return (
    <section className="mt-10">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        รีวิวจากผู้เลี้ยงจริง ({reviews.length})
      </h3>

      {reviews.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border rounded-lg bg-gray-50">
          <p>ยังไม่มีรีวิวสำหรับสายพันธุ์นี้</p>
          <p className="text-sm mt-1">
            (คุณสามารถเป็นคนแรกที่รีวิวได้ หากคุณล็อกอินแล้ว)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedReviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewList;