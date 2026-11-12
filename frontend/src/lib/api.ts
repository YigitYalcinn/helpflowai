import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "helpflow_token";
export const UNAUTHORIZED_EVENT = "helpflow:unauthorized";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    // An expired session anywhere in the app sends the user back to the login page.
    if (error.response?.status === 401 && !url.startsWith("/auth/login") && !url.startsWith("/auth/register")) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Turns any thrown value into a message that can be shown to the user. */
export function apiError(error: unknown, fallback = "Bir hata oluştu, lütfen tekrar deneyin.") {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.code === "ERR_NETWORK") return "Sunucuya ulaşılamıyor. Bağlantınızı kontrol edip tekrar deneyin.";
    if (error.response?.status === 413) return "Gönderilen dosya çok büyük.";
  }
  return fallback;
}

export function apiStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
