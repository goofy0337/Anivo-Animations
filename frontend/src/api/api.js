import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (username, email, password, confirmPassword) =>
    api.post('/signup', { username, email, password, confirmPassword }),
  login: (email, password) =>
    api.post('/login', { email, password }),
  googleLogin: (token) =>
    api.post('/google-login', { token }),
  getUser: () =>
    api.get('/user'),
};

export const projectAPI = {
  getProjects: () =>
    api.get('/projects'),
  getProject: (id) =>
    api.get(`/projects/${id}`),
  createProject: (title, description) =>
    api.post('/projects', { title, description }),
  updateProject: (id, title, description, data) =>
    api.put(`/projects/${id}`, { title, description, data }),
  deleteProject: (id) =>
    api.delete(`/projects/${id}`),
};

export default api;
