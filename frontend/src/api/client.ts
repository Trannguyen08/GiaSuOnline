import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
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
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const res = await axios.post('/api/auth/refresh/', { refresh: refreshToken });
                localStorage.setItem('access_token', res.data.access);
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return client(originalRequest);
            } catch (err) {
                // Refresh failed, logout
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
