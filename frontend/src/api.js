import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// fetch notifications
export const fetchNotifications = () =>
  API.get("/auth/notifications");

// mark notification read
export const markAsRead = (id) =>
  API.patch(`/auth/notifications/${id}/read`);

export default API;
