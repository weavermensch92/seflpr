import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Plus, ChevronRight, Calendar, Briefcase } from "lucide-react";
import { projectsApi, type ProjectStatus } from "@/api/projects";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending_payment: "결제 대기",
  researching: "리서치 중",
  generating: "생성 중",
  draft: "초안 작성",
  editing: "수정 중",
  final: "완료",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  researching: "bg-blue-100 text-blue-700",
  generating: "bg-purple-100 text-purple-700",
  draft: "bg-gray-100 text-gray-700",
  editing: "bg-indigo-100 text-indigo-700",
  final: "bg-emerald-100 text-emerald-700",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const recentProjects = projects.slice(0, 3);

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
                  기업과 포지션을 선택하고 AI 자소서를 생성하세요. (30P)
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

        {recentProjects.length === 0 ? (
          <div className="border rounded-xl p-12 text-center text-muted-foreground">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">아직 작성한 자소서가 없습니다.</p>
            <Button className="mt-4" size="sm" asChild>
              <Link to="/projects/new">첫 자소서 시작하기</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 rounded-lg bg-muted">
                    <Briefcase size={18} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.company_name} · {p.position}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`${STATUS_COLORS[p.status]} text-[10px]`} variant="secondary">
                        {STATUS_LABELS[p.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        질문 {p.answer_count}개
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
