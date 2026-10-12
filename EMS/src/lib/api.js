const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, { body, token, ...options } = {}) {
  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method: options.method || (body ? 'POST' : 'GET'),
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server is taking too long to respond. Please try again.', { cause: error });
    throw new Error('Unable to reach the server. Check your connection and try again.', { cause: error });
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.');
    error.status = response.status;
    error.field = data.field;
    error.retryAfterSeconds = data.retryAfterSeconds || Number(response.headers.get('Retry-After')) || undefined;
    throw error;
  }
  return data;
}

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
  list: ({ page = 1, limit = 9, search = '', status = 'active' } = {}) => apiRequest(`/events?${new URLSearchParams({ page: String(page), limit: String(limit), search, status })}`),
  get: (id) => apiRequest(`/events/${encodeURIComponent(id)}`),
};
