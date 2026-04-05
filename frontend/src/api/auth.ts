import { apiClient } from "./client";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
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
  phone_number?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export const authApi = {
  sendOtp: (phone_number: string) =>
    apiClient.post<{ message: string }>("/auth/phone/send-otp", { phone_number }).then((r) => r.data),

  verifyOtp: (phone_number: string, code: string) =>
    apiClient.post<{ message: string; verified: boolean }>("/auth/phone/verify-otp", { phone_number, code }).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>("/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login", payload).then((r) => r.data),

  refresh: () =>
    apiClient.post<{ access_token: string }>("/auth/refresh").then((r) => r.data),

  logout: () =>
    apiClient.post("/auth/logout").then((r) => r.data),
};
