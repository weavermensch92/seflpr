import axios from "axios";

const BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? "https://seflpr-api.onrender.com" : "http://localhost:8000");

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true, // refresh token 쿠키 전송
  headers: { "Content-Type": "application/json" },
});

// Access token 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

// 401 시 refresh token으로 자동 갱신
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    
    // 401 에러이고, 리트라이한 적이 없으며, 인증 관련 요청(로그인, 가입, 갱신) 자체가 아닌 경우
    if (
      error.response?.status === 401 && 
      !original._retry && 
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/register") &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retry = true;

      // 이미 갱신 중이라면 그 결과를 기다림
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = apiClient.post("/auth/refresh")
          .then((res) => {
            isRefreshing = false;
            return res.data;
          })
          .catch((err) => {
            isRefreshing = false;
            throw err;
          });
      }

      try {
        const data = await refreshPromise;
        localStorage.setItem("access_token", data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(original); // 본래 요청 재시도
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        // 리프레시 자체가 실패한 경우 로그인 페이지로 이동 (무한루프 방지)
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
