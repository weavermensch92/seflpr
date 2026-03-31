import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "@/api/auth";

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  setAuth: (user: UserInfo, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => {
        localStorage.setItem("access_token", token);
        set({ user, accessToken: token });
      },
      clearAuth: () => {
        localStorage.removeItem("access_token");
        set({ user: null, accessToken: null });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "selfpr-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
