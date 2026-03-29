import axios from "axios";
import { authService } from "../services/authService";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let memoryToken = null;
export const setApiToken = (token) => {
  memoryToken = token;
};

// Request Interceptor: Attach token to every request
apiClient.interceptors.request.use(
  (config) => {
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Global error handling & token refresh logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // handle completely dead network
    if (!error.response) {
      console.error("Network/Server error. Please check your connection.");
      return Promise.reject(new Error("Network error occurred."));
    }

    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await authService.refreshToken();
        setApiToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (error) {
        console.error("Session Expired, forcing Logout.");
        authService.logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
