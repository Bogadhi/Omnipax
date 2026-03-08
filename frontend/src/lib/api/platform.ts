import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const tenantSlug = localStorage.getItem('tenant_slug');

            if (token) {
                config.headers.set('Authorization', `Bearer ${token}`);
            }

            if (tenantSlug) {
                config.headers.set('x-tenant-slug', tenantSlug);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const platformApi = {
    getStats: async () => {
        const { data } = await api.get('/platform/stats');
        return data;
    },

    getTenants: async () => {
        const { data } = await api.get('/platform/tenants');
        return data;
    },

    updateTenantPlan: async (id: string, plan: string) => {
        const { data } = await api.patch(`/platform/tenant/${id}/plan`, { plan });
        return data;
    },

    getFeatureFlags: async () => {
        const { data } = await api.get('/platform/features');
        return data;
    },

    toggleFeature: async (id: string, enabled: boolean) => {
        const { data } = await api.patch(`/platform/feature/${id}/toggle`, { enabled });
        return data;
    },
    
    getAuditLogs: async (params?: any) => {
        const { data } = await api.get('/platform/audit-logs', { params });
        return data;
    }
};
