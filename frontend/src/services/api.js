const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  signup: (name, email, password) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  // Monday
  getMondayStatus: () => request('/api/monday/status'),
  getMondayBoards: () => request('/api/monday/boards'),

  // Chat
  chat: (message, conversationHistory = []) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ message, conversationHistory }) }),
};
