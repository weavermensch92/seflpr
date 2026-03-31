import { Link, useNavigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { pointsApi } from "@/api/points";
import { Coins } from "lucide-react";

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // 포인트 잔액 실시간 조회 (1분마다 갱신)
  const { data: balanceData } = useQuery({
    queryKey: ["point-balance"],
    queryFn: pointsApi.getBalance,
    refetchInterval: 60000,
    enabled: !!user,
  });

  const displayBalance = balanceData?.balance ?? user?.point_balance ?? 0;

  const handleLogout = async () => {
    await authApi.logout();
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="font-bold text-lg text-primary">
            SelfPR
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">
              내 프로필
            </Link>
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
              자소서 프로젝트
            </Link>
            {user?.is_admin && (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                어드민
              </Link>
            )}
            {/* 포인트 잔액 배지 */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border
              ${displayBalance > 0
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-muted border-muted-foreground/20 text-muted-foreground"
              }`}>
              <Coins size={14} />
              <span>{displayBalance.toLocaleString()}P</span>
            </div>
            <span className="text-sm text-muted-foreground">{user?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              로그아웃
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
