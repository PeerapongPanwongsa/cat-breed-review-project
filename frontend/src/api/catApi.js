import apiClient from './axiosConfig';

export const getCats = (params) => {
  return apiClient.get('/cats', { params });
};

export const getCatById = (id) => {
  // (Backend Go ไม่สน ?_embed แล้ว แต่ใส่ไว้ก็ไม่พัง)
  return apiClient.get(`/cats/${id}`);
};

// --- (เพิ่มฟังก์ชันนี้) ---
export const getCatDiscussions = (id) => {
  return apiClient.get(`/cats/${id}/discussions`);
};
// -----------------------

export const addCatBreed = (catData) => {
  return apiClient.post('/admin/cats', catData);
};

// (ฟังก์ชัน update/delete ที่เคยเพิ่มไว้ก่อนหน้านี้ เก็บไว้เหมือนเดิม)
export const updateCatBreed = (id, catData) => {
  return apiClient.put(`/admin/cats/${id}`, catData);
};

export const deleteCatBreed = (id) => {
  return apiClient.delete(`/admin/cats/${id}`);
};