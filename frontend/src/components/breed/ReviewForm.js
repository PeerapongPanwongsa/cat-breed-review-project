import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import RatingInput from './RatingInput';
import TagInput from './TagInput';

const ReviewForm = ({ catId, onSubmitReview }) => {
  const { user } = useAuth();

  const [ratings, setRatings] = useState({
    friendliness: 0,
    adaptability: 0,
    energyLevel: 0,
    grooming: 0,
  });
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (Object.values(ratings).some((r) => r === 0)) {
      alert('กรุณาให้คะแนนให้ครบทุกหัวข้อครับ');
      return;
    }
    if (!comment.trim()) {
      alert('กรุณาเขียนคอมเมนต์รีวิวของคุณ');
      return;
    }

    const reviewData = {
      catId: catId,
      userId: user.id,
      authorName: user.username,
      date: new Date().toISOString(),
      message: comment,
      ratings: ratings,
      tags: tags,
      upVotes: 0,
      downVotes: 0,
    };

    onSubmitReview(reviewData);

    setRatings({ friendliness: 0, adaptability: 0, energyLevel: 0, grooming: 0 });
    setComment('');
    setTags([]);
  };

  return (
    <section className="mt-10">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        เขียนรีวิวของคุณ
      </h3>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md border border-gray-200 space-y-6"
      >
        <div>
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            ให้คะแนนแบบแยกแง่มุม:
          </label>
          <RatingInput ratings={ratings} onChange={setRatings} />
        </div>

        <div>
          <label
            htmlFor="comment"
            className="block text-lg font-semibold text-gray-700 mb-2"
          >
            ประสบการณ์ของคุณ:
          </label>
          <textarea
            id="comment"
            rows="5"
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-base"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="แบ่งปันประสบการณ์การเลี้ยง, นิสัย, หรือข้อควรระวัง..."
            required
          ></textarea>
        </div>

        <div>
          <label
            htmlFor="tags"
            className="block text-lg font-semibold text-gray-700 mb-2"
          >
            แท็ก (#)
          </label>
          <TagInput
            selectedTags={tags}
            onChange={setTags}
          />
        </div>

        <div className="text-right">
          <Button type="submit" variant="primary" className="text-lg px-6 py-2">
            ส่งรีวิว
          </Button>
        </div>
      </form>
    </section>
  );
};

export default ReviewForm;