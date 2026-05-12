import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

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

// Endpoints that may legitimately 401 without indicating an expired session
// (e.g. login form with bad credentials). Don't bounce the user to /login.
const NON_REDIRECT_AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/google"];

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    const reqUrl = (err.config as InternalAxiosRequestConfig | undefined)?.url || "";
    const onLoginPage =
      typeof window !== "undefined" &&
      (window.location.pathname === "/login" ||
        window.location.pathname === "/signup");

    if (status === 401) {
      const isAuthAttempt = NON_REDIRECT_AUTH_PATHS.some((p) =>
        reqUrl.includes(p)
      );
      // For login/signup attempts, surface the error inline — never redirect.
      // For other 401s, only redirect if the user actually had a token (i.e.
      // a session expired); pure-public-page 401s shouldn't yank the user
      // anywhere, and being already on /login should never trigger a reload.
      if (!isAuthAttempt && !onLoginPage) {
        const hadToken = !!localStorage.getItem("token");
        if (hadToken) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
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

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.patch("/auth/password", data);

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

export const updateRequest = (id: string, data: Record<string, unknown>) =>
  api.patch(`/requests/${id}`, data);

export const cancelRequest = (id: string) =>
  api.patch(`/requests/${id}/cancel`);

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
