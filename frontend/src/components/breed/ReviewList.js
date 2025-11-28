import { StarIcon } from '@heroicons/react/20/solid';
import {
  PencilSquareIcon,
  HandThumbDownIcon as ThumbDownOutline,
  HandThumbUpIcon as ThumbUpOutline,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  HandThumbDownIcon as ThumbDownSolid,
  HandThumbUpIcon as ThumbUpSolid
} from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { toggleReaction } from '../../api/reviewApi';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatDate';
import Button from '../common/Button';

const StarRating = ({ rating }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, index) => (
      <StarIcon key={index} className={`w-4 h-4 ${index < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const AspectRatingsDisplay = ({ ratings }) => {
  if (!ratings) return null;
  const aspectLabels = { friendliness: 'ความเป็นมิตร', adaptability: 'การปรับตัว', energyLevel: 'พลังงาน', grooming: 'การดูแลขน' };
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

const ReplyItem = ({ review, onEdit, onDelete }) => {
  const { user } = useAuth();
  const { id, userId, authorName, date, comment, upVotes, downVotes, userReaction } = review;

  const isOwner = user && user.id === userId;

  const [voteStatus, setVoteStatus] = useState(userReaction || null);
  const [upCount, setUpCount] = useState(upVotes || 0);
  const [downCount, setDownCount] = useState(downVotes || 0);

  const handleReaction = async (type) => {
    if (!user) return alert("กรุณาเข้าสู่ระบบเพื่อโหวต");
    const previousStatus = voteStatus;
    setVoteStatus(type === voteStatus ? null : type);
    try {
      const response = await toggleReaction(id, type);
      const data = response.data;
      setVoteStatus(data.user_reaction);
      setUpCount(data.like_count);
      setDownCount(data.dislike_count);
    } catch (error) {
      setVoteStatus(previousStatus);
      console.error('Error toggling reaction:', error);
    }
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-indigo-600 text-sm">{authorName}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{formatDate(date)}</span>
          {isOwner && (
            <div className="flex gap-0.5">
              <button
                onClick={() => onEdit(review)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="แก้ไข"
              >
                <PencilSquareIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="ลบ"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comment */}
      <p className="text-gray-700 text-sm leading-relaxed mb-2.5">
        {comment || '[Deleted]'}
      </p>

      {/* Vote buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleReaction('like')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${voteStatus === 'like'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
        >
          {voteStatus === 'like' ? (
            <ThumbUpSolid className="w-3.5 h-3.5" />
          ) : (
            <ThumbUpOutline className="w-3.5 h-3.5" />
          )}
          {upCount}
        </button>

        <button
          onClick={() => handleReaction('dislike')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${voteStatus === 'dislike'
              ? 'bg-red-100 text-red-700'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
        >
          {voteStatus === 'dislike' ? (
            <ThumbDownSolid className="w-3.5 h-3.5" />
          ) : (
            <ThumbDownOutline className="w-3.5 h-3.5" />
          )}
          {downCount}
        </button>

        <button className="text-xs text-gray-500 font-medium hover:text-indigo-600 transition-colors">
          ตอบกลับ
        </button>
      </div>
    </div>
  );
};

const ReviewItem = ({ review, onEdit, onDelete, onReply }) => {
  const { user } = useAuth();
  const { id, userId, authorName, date, comment, ratings, tags = [], upVotes, downVotes, userReaction, replies = [] } = review;

  const isOwner = user && user.id === userId;

  const [voteStatus, setVoteStatus] = useState(userReaction || null);
  const [upCount, setUpCount] = useState(upVotes || 0);
  const [downCount, setDownCount] = useState(downVotes || 0);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReaction = async (type) => {
    if (!user) return alert("กรุณาเข้าสู่ระบบเพื่อโหวต");
    const previousStatus = voteStatus;
    setVoteStatus(type === voteStatus ? null : type);
    try {
      const response = await toggleReaction(id, type);
      const data = response.data;
      setVoteStatus(data.user_reaction);
      setUpCount(data.like_count);
      setDownCount(data.dislike_count);
    } catch (error) {
      setVoteStatus(previousStatus);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    if (!onReply) return;
    await onReply(id, replyText);
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 relative group">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-indigo-700">{authorName}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{formatDate(date)}</span>
          {isOwner && (
            <div className="flex gap-1 ml-2">
              <button onClick={() => onEdit(review)} className="p-1 text-gray-400 hover:text-blue-600" title="แก้ไข">
                <PencilSquareIcon className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(id)} className="p-1 text-gray-400 hover:text-red-600" title="ลบ">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ แสดง ratings เฉพาะ top-level review */}
      {ratings && <AspectRatingsDisplay ratings={ratings} />}

      {/* ✅ แสดงข้อความ comment */}
      <p className="text-gray-700 leading-relaxed mb-4">{comment || 'ไม่มีข้อความ'}</p>

      {/* ✅ แสดง tags เฉพาะ top-level review */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => handleReaction('like')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${voteStatus === 'like' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {voteStatus === 'like' ? <ThumbUpSolid className="w-5 h-5" /> : <ThumbUpOutline className="w-5 h-5" />}
          {upCount}
        </button>
        <button onClick={() => handleReaction('dislike')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${voteStatus === 'dislike' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {voteStatus === 'dislike' ? <ThumbDownSolid className="w-5 h-5" /> : <ThumbDownOutline className="w-5 h-5" />}
          {downCount}
        </button>

        {/* ปุ่ม Reply */}
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          ตอบกลับ
        </button>
      </div>

      {/* Input Reply */}
      {showReplyInput && (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
            placeholder="เขียนคำตอบของคุณ..."
            rows={2}
          />
          <div className="flex justify-end mt-1 gap-2">
            <Button onClick={() => setShowReplyInput(false)} type="button" variant="outline">ยกเลิก</Button>
            <Button onClick={handleReplySubmit}>ส่ง</Button>
          </div>
        </div>
      )}

      {/* ✅ Nested Replies */}
      {replies.length > 0 && (
        <div className="mt-3 pl-6 border-l-2 border-gray-300 space-y-3">
          {replies.map((rep) => (
            <ReplyItem
              key={rep.id}
              review={rep}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewList = ({ reviews = [], onEdit, onDelete, onReply }) => {
  const [localReviews, setLocalReviews] = useState(reviews);
  
  useEffect(() => {
    setLocalReviews(reviews);
  }, [reviews]);

  const sortedReviews = [...localReviews].sort((a, b) => (b.upVotes || 0) - (a.upVotes || 0));

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือว่าต้องการลบรีวิวนี้?')) return;
    
    try {
      await onDelete(id);
      // ลบออกจาก state ทันที
      const removeById = (list, targetId) => {
        return list
          .filter(r => r.id !== targetId)
          .map(r => ({ ...r, replies: r.replies ? removeById(r.replies, targetId) : [] }));
      };
      setLocalReviews(prev => removeById(prev, id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <section className="mt-10">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">รีวิวจากผู้เลี้ยงจริง ({reviews.length})</h3>
      {reviews.length === 0 ? (
        <div className="text-center text-gray-500 p-8 border rounded-lg bg-gray-50">
          <p>ยังไม่มีรีวิวสำหรับสายพันธุ์นี้</p>
          <p className="text-sm mt-1">(คุณสามารถเป็นคนแรกที่รีวิวได้ หากคุณล็อกอินแล้ว)</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedReviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              onEdit={onEdit}
              onDelete={handleDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewList;