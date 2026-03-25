import axios from "axios";

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT token if it exists
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("Network/Server error. Please check your connection.");
      return Promise.reject(new Error("Network error occurred."));
    }
    if (error.response.status === 401) {
      console.error("Unauthorized. Session expired.");
      // Call a centralized logout function
    }
    return Promise.reject(error);
  },
);

export default apiClient;
