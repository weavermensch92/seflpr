import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, Calendar, ChevronRight, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsApi, type ProjectStatus } from "@/api/projects";
import { useState } from "react";

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

export default function ProjectListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm("이 프로젝트를 삭제할까요?")) return;
    await deleteMutation.mutateAsync(id);
  };

  const filtered = projects.filter(p => 
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase()) ||
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">자소서 프로젝트</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            작성 중인 자소서와 지원 현황을 관리하세요.
          </p>
        </div>
        <Link to="/projects/new">
          <Button className="gap-2">
            <Plus size={18} /> 새 프로젝트
          </Button>
        </Link>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="기업명, 포지션 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-card transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-24 text-center">
          <Briefcase size={40} className="mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-muted-foreground">진행 중인 프로젝트가 없습니다</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">새로운 기업에 지원하기 위한 자소서 작성을 시작해보세요.</p>
          <Link to="/projects/new">
            <Button variant="outline" className="gap-2">
              <Plus size={16} /> 신규 프로젝트 생성
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group border rounded-xl p-5 bg-card hover:border-primary/50 transition-all hover:shadow-md relative"
            >
              <div className="flex justify-between items-start mb-4">
                <Badge className={STATUS_COLORS[p.status]} variant="secondary">
                  {STATUS_LABELS[p.status]}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Calendar size={12} />
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {p.company_name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{p.position}</p>
                <p className="text-xs text-muted-foreground mt-1 opacity-60">[{p.title}]</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 text-sm">
                <span className="text-muted-foreground">
                  질문 <strong>{p.answer_count}</strong>개
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, p.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
