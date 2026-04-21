import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

export const register = (data: {
  name: string;
  email: string;
  password: string;
  location?: string;
}) => api.post("/auth/register", data);

export const getMe = () => api.get("/auth/me");

export const googleLogin = (params: { credential?: string; accessToken?: string }) =>
  api.post("/auth/google", params);

export const getStats = () => api.get("/stats");

// Requests
export const getRequests = (params?: Record<string, string>) =>
  api.get("/requests", { params });

export const getRequest = (id: string) => api.get(`/requests/${id}`);

export const createRequest = (data: Record<string, unknown>) =>
  api.post("/requests", data);

export const submitOffer = (requestId: string, message: string) =>
  api.post(`/requests/${requestId}/offer`, { message });

export const handleOffer = (
  requestId: string,
  offerId: string,
  status: "accepted" | "rejected"
) => api.patch(`/requests/${requestId}/offer/${offerId}`, { status });

export const completeRequest = (id: string, review?: { rating: number; comment?: string }) =>
  api.patch(`/requests/${id}/complete`, review || {});

export const getMyPostedRequests = () => api.get("/requests/my/posted");

export const getMyOffers = () => api.get("/requests/my/offers");

// Users
export const getProfile = () => api.get("/users/profile");

export const updateProfile = (data: Record<string, unknown>) =>
  api.put("/users/profile", data);

export const getPublicProfile = (id: string) => api.get(`/users/${id}`);

// Notifications
export const getNotifications = () => api.get("/notifications");

export const markAllRead = () => api.patch("/notifications/read-all");

export const markNotificationRead = (id: string) =>
  api.patch(`/notifications/${id}/read`);

// Chat
export const getConversations = () => api.get("/chat/conversations");

export const getMessages = (userId: string) =>
  api.get(`/chat/messages/${userId}`);

export const sendMessage = (receiver: string, content: string) =>
  api.post("/chat/messages", { receiver, content });

export default api;
