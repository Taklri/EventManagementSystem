const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export const apiRequest = async (path, { body, token, timeoutMs = 15000, ...options } = {}) => {
  let response;
  const isFormData = body instanceof FormData;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method: options.method || (body ? 'POST' : 'GET'),
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('The server is taking too long to respond. Please try again.', {
        cause: error,
      });
    throw new Error('Unable to reach the server. Check your connection and try again.', {
      cause: error,
    });
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.');
    error.status = response.status;
    error.field = data.field;
    error.issues = Array.isArray(data.issues) ? data.issues : undefined;
    error.retryAfterSeconds =
      data.retryAfterSeconds || Number(response.headers.get('Retry-After')) || undefined;
    throw error;
  }
  return data;
};

export const authApi = {
  login: (body) => apiRequest('/users/login', { body }),
  register: (body) => apiRequest('/users', { body }),
  verifyLoginOtp: (body) => apiRequest('/users/verify-otp', { body }),
  verifyRegistrationOtp: (body) => apiRequest('/users/verify-registration-otp', { body }),
  resendLoginOtp: (body) => apiRequest('/users/resend-login-otp', { body }),
  resendRegistrationOtp: (body) => apiRequest('/users/resend-registration-otp', { body }),
  refresh: () => apiRequest('/users/refresh', { body: {} }),
  logout: () => apiRequest('/users/logout', { body: {} }),
};

export const eventsApi = {
  list: ({ page = 1, limit = 9, search = '', status = 'active' } = {}, token) =>
    apiRequest(
      `/events?${new URLSearchParams({ page: String(page), limit: String(limit), search, status })}`,
      { token },
    ),
  get: (id, token) => apiRequest(`/events/${encodeURIComponent(id)}`, { token }),
  registration: (id, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}/registration`, { token }),
  registrationForm: (id, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}/registration/form`, { token }),
  register: (id, token, answers) =>
    apiRequest(`/events/${encodeURIComponent(id)}/registration`, {
      method: 'POST',
      body: { answers },
      token,
    }),
  cancelRegistration: (id, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}/registration`, { method: 'DELETE', token }),
  myRegistrations: (token) => apiRequest('/events/my-registrations', { token }),
  recordAttendance: (id, token, attendanceToken) =>
    apiRequest(`/events/${encodeURIComponent(id)}/attendance`, {
      method: 'POST',
      body: { token: attendanceToken },
      token,
    }),
  previewAttendance: (id, token, attendanceToken) =>
    apiRequest(`/events/${encodeURIComponent(id)}/attendance/preview`, {
      method: 'POST',
      body: { token: attendanceToken },
      token,
    }),
};

export const adminApi = {
  dashboard: (token) => apiRequest('/admin/dashboard', { token }),
  events: ({ page = 1, limit = 10, search = '', status = 'all' }, token) =>
    apiRequest(
      `/admin/events?${new URLSearchParams({ page: String(page), limit: String(limit), search, status })}`,
      { token },
    ),
  registrationForms: ({ page = 1, limit = 10, search = '', status = 'active' } = {}, token) =>
    apiRequest(
      `/admin/registration-forms?${new URLSearchParams({ page: String(page), limit: String(limit), search, status })}`,
      { token },
    ),
  registrationForm: (id, token) =>
    apiRequest(`/admin/registration-forms/${encodeURIComponent(id)}`, { token }),
  createRegistrationForm: (body, token) =>
    apiRequest('/admin/registration-forms', { method: 'POST', body, token }),
  updateRegistrationForm: (id, body, token) =>
    apiRequest(`/admin/registration-forms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
      token,
    }),
  archiveRegistrationForm: (id, token) =>
    apiRequest(`/admin/registration-forms/${encodeURIComponent(id)}/archive`, {
      method: 'PATCH',
      token,
    }),
  unarchiveRegistrationForm: (id, token) =>
    apiRequest(`/admin/registration-forms/${encodeURIComponent(id)}/unarchive`, {
      method: 'PATCH',
      token,
    }),
  createEvent: (body, token) =>
    apiRequest('/events', { method: 'POST', body, token, timeoutMs: 45000 }),
  updateEvent: (id, body, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
      token,
      timeoutMs: 45000,
    }),
  archiveEvent: (id, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}/archive`, { method: 'PATCH', token }),
  unarchiveEvent: (id, token) =>
    apiRequest(`/events/${encodeURIComponent(id)}/unarchive`, { method: 'PATCH', token }),
  registrationSummary: (id, token) =>
    apiRequest(`/admin/events/${encodeURIComponent(id)}/registrations`, { token }),
  registrations: (id, { page = 1, limit = 20, status = 'all' }, token) =>
    apiRequest(
      `/admin/events/${encodeURIComponent(id)}/registrations?${new URLSearchParams({ page: String(page), limit: String(limit), status })}`,
      { token },
    ),
  downloadRegistrations: async (id, token) => {
    const response = await fetch(
      `${API_BASE_URL}/admin/events/${encodeURIComponent(id)}/registrations/export`,
      {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Unable to export registrations.');
    }
    return response.blob();
  },
  createAttendanceSession: (id, token) =>
    apiRequest(`/admin/events/${encodeURIComponent(id)}/attendance/session`, {
      method: 'POST',
      token,
    }),
  attendanceSummary: (id, token) =>
    apiRequest(`/admin/events/${encodeURIComponent(id)}/attendance`, { token }),
  attendanceRecords: (id, token) =>
    apiRequest(`/admin/events/${encodeURIComponent(id)}/attendance/records`, { token }),
};
