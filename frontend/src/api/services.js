import { apiClient } from './client.js';

// Users & groups
export const getUsers = (status) =>
  apiClient.get('/users/', { params: status ? { status } : {} });

export const getUser = (id) => apiClient.get(`/users/${id}`);

export const createGroup = (name, userIds) =>
  apiClient.post('/users/group', { name, user_ids: userIds });

export const updateStatus = (id, status) =>
  apiClient.patch(`/users/${id}/status`, { status });

export const getAnalytics = () => apiClient.get('/users/analytics');

// Ingestion
export const uploadFile = (file, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/ingestion/upload', formData, {
    params: userId ? { user_id: userId } : {},
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const addUserManual = (data) => apiClient.post('/ingestion/add-user', data);

// Strategies (user-focused for now)
export const getStrategy = (userId) => apiClient.get(`/strategies/${userId}`);

export const updateStrategy = (userId, data) => {
  // Ensure owner_type is user for now
  const payload = { owner_type: 'user', ...data };
  return apiClient.post(`/strategies/${userId}`, payload);
};

export const aiGenerate = (userId, prompt) =>
  apiClient.post(`/strategies/${userId}/ai-generate`, { prompt });

export const executeStrategy = (userId) =>
  apiClient.post(`/strategies/${userId}/execute`);

// Per‑block AI content generation
export const aiGenerateBlockContent = (userId, block, prompt) =>
  apiClient.post(`/strategies/${userId}/ai-generate-block-content`, {
    block,
    prompt,
  });
