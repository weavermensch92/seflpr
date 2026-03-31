import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { FileText, User, Plus } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">안녕하세요, {user?.full_name}님</h1>
        <p className="text-muted-foreground mt-1">AI로 맞춤 자기소개서를 작성해보세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/profile" className="group block">
          <div className="border rounded-xl p-6 bg-card hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <User size={24} />
              </div>
              <div>
                <h2 className="font-semibold">내 프로필 관리</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  학력, 경험, 프로젝트 등 자소서 소재를 등록하세요.
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/projects/new" className="group block">
          <div className="border rounded-xl p-6 bg-card hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Plus size={24} />
              </div>
              <div>
                <h2 className="font-semibold">새 자소서 프로젝트</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  기업과 포지션을 선택하고 AI 자소서를 생성하세요. (5,000원)
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">최근 프로젝트</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects">전체 보기</Link>
          </Button>
        </div>
        <div className="border rounded-xl p-12 text-center text-muted-foreground">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 작성한 자소서가 없습니다.</p>
          <Button className="mt-4" size="sm" asChild>
            <Link to="/projects/new">첫 자소서 시작하기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
