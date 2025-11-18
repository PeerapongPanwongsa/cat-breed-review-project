import apiClient from './axiosConfig';

export const getCats = (params) => {
  return apiClient.get('/cats', { params });
};

export const getCatById = (id) => {
  return apiClient.get(`/cats/${id}?_embed=reviews&_embed=qas`);
};

export const addCatBreed = (catData) => {
  return apiClient.post('/cats', catData);
};