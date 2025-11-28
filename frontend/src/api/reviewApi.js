import apiClient from './axiosConfig.js';

export const postReview = (reviewData) => {
  const payload = {
    breed_id: parseInt(reviewData.catId),
    message: reviewData.message || "",
    ratings: reviewData.ratings || {},
    tags: reviewData.tags || [],
    parent_id: reviewData.parentId || null,
  };

  return apiClient.post('/discussions', payload);
};

export const getReviewsByUserId = (userId) => {
  return apiClient.get('/discussions/me');
};

export const registerUser = (userData) => {
  const dataToPost = { ...userData, role: 'member' };
  return apiClient.post('/users', dataToPost);
};

export const deleteReview = (reviewId) => {
  return apiClient.delete(`/discussions/${reviewId}`);
};

// 🚩 แก้ไข: ใช้ reviewData.message แทน reviewData.comment
export const updateReview = (reviewId, reviewData) => {
  const payload = {
    message: reviewData.message, 
    ratings: reviewData.ratings,
    tags: reviewData.tags,
  };
  return apiClient.put(`/discussions/${reviewId}`, payload);
};

export const toggleReaction = (reviewId, reactionType) => {
  return apiClient.post(`/discussions/${reviewId}/react`, { 
    reaction_type: reactionType 
  });
};