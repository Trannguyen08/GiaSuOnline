import axios from 'axios';
import { clearAuth, getAccessToken, getAuthRoleFromPath, getRefreshToken, setAccessToken } from '../utils/auth';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const publicClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const authRole = getAuthRoleFromPath();
            try {
                const refreshToken = getRefreshToken(authRole);
                const res = await axios.post('/api/auth/refresh/', { refresh: refreshToken });
                setAccessToken(res.data.access, authRole);
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return client(originalRequest);
            } catch (err) {
                clearAuth(authRole);
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
