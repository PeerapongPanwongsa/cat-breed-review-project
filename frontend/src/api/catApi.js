import apiClient from './axiosConfig';

export const getCats = (params) => {
  return apiClient.get('/cats', { params });
};

export const getCatById = (id) => {
  return apiClient.get(`/cats/${id}`);
};

export const getCatDiscussions = (id) => {
  return apiClient.get(`/cats/${id}/discussions`);
};

export const addCatBreed = (catData) => {
  return apiClient.post('/admin/cats', catData);
};

export const updateCatBreed = (id, catData) => {
  return apiClient.put(`/admin/cats/${id}`, catData);
};

export const deleteCatBreed = (id) => {
  return apiClient.delete(`/admin/cats/${id}`);
};