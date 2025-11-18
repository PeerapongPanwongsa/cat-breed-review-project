import apiClient from './axiosConfig.js';

export const postReview = (reviewData) => {
  return apiClient.post('/reviews', reviewData);
};

export const getReviewsByUserId = (userId) => {
  return apiClient.get('/reviews', {
    params: {
      userId: userId
    }
  });
};

export const registerUser = (userData) => {
  const dataToPost = { ...userData, role: 'member' };
  return apiClient.post('/users', dataToPost);
};

export const deleteReview = (reviewId) => {
  return apiClient.delete(`/reviews/${reviewId}`);
};

export const updateReview = (reviewId, reviewData) => {
  return apiClient.put(`/reviews/${reviewId}`, reviewData);
};