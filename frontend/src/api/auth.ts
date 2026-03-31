import { apiClient } from "./client";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  point_balance: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>("/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login", payload).then((r) => r.data),

  refresh: () =>
    apiClient.post<{ access_token: string }>("/auth/refresh").then((r) => r.data),

  logout: () =>
    apiClient.post("/auth/logout").then((r) => r.data),
};
