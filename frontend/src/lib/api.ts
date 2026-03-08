import axios from 'axios';
import { useAuthStore } from '@/lib/authStore';
import toast from 'react-hot-toast';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window === 'undefined'
    ? 'http://localhost:5001'
    : 'http://localhost:5001');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const storedTenantSlug = localStorage.getItem('tenant_slug');

      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }

      // Always send x-tenant-slug. Logged-in users have it in localStorage;
      // unauthenticated users (homepage, public event browsing) use the
      // default tenant slug from env. Without this, TenantMiddleware returns 400.
      const tenantSlug =
        storedTenantSlug ||
        process.env.NEXT_PUBLIC_TENANT_SLUG ||
        'starpass'; // hard fallback — matches the seeded default tenant

      config.headers.set('x-tenant-slug', tenantSlug);
    }


    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      toast.error('Session expired. Please login again.');
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else if (status >= 500) {
      toast.error('Internal server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;