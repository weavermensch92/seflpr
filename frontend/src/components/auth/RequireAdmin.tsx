import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * is_admin=true 인 유저만 통과.
 * 미로그인 → /login
 * 로그인했지만 어드민 아님 → /dashboard (403 화면 대신 조용히 리다이렉트)
 */
export default function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
