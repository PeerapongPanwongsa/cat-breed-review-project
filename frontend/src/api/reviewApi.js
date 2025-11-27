import apiClient from './axiosConfig.js';

export const postReview = (reviewData) => {
  const payload = {
    breed_id: parseInt(reviewData.catId),
    message: reviewData.comment,
    ratings: reviewData.ratings, 
    tags: reviewData.tags,       
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

export const updateReview = (reviewId, reviewData) => {
  const payload = {
    message: reviewData.comment,
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