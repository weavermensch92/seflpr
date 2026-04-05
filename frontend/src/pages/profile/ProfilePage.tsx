import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  Zap,
  Users,
  Star,
  Frown,
  Lightbulb,
  FileText,
  BadgeCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileFormModal from "@/components/profile/ProfileFormModal";
import SmartIngestZone from "@/components/profile/SmartIngestZone";
import ExperienceTimeline from "@/components/dashboard/ExperienceTimeline";
import SkillRadar from "@/components/dashboard/SkillRadar";
import StrengthSummary from "@/components/dashboard/StrengthSummary";
import ProfileStats from "@/components/dashboard/ProfileStats";
import {
  profilesApi,
  PROFILE_TYPE_LABELS,
  type Profile,
  type ProfileType,
  type ProfileCreatePayload,
} from "@/api/profiles";

const TYPE_ICONS: Record<ProfileType, React.ElementType> = {
  education: GraduationCap,
  work_experience: Briefcase,
  project: FolderGit2,
  certification: BadgeCheck,
  skill: Zap,
  activity: Users,
  award: Award,
  strength: Star,
  weakness: Frown,
  motivation: Lightbulb,
  free_text: FileText,
};

const TYPE_ORDER: ProfileType[] = [
  "education",
  "work_experience",
  "project",
  "certification",
  "skill",
  "activity",
  "award",
  "strength",
  "weakness",
  "motivation",
  "free_text",
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeType, setActiveType] = useState<ProfileType>("education");
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [highlightAdd, setHighlightAdd] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  // ?highlight=add 처리
  useEffect(() => {
    if (searchParams.get("highlight") === "add") {
      setHighlightAdd(true);
      setSearchParams({}, { replace: true });
      const t = setTimeout(() => setHighlightAdd(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  // 항상 서버 모드
  const {
    data: profiles = [],
    isLoading,
  } = useQuery({
    queryKey: ["profiles"],
    queryFn: profilesApi.list,
  });

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["profiles-dashboard"],
    queryFn: profilesApi.dashboard,
    enabled: profiles.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProfileCreatePayload> }) =>
      profilesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: profilesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const byType = TYPE_ORDER.reduce(
    (acc, t) => {
      acc[t] = profiles.filter((p) => p.profile_type === t);
      return acc;
    },
    {} as Record<ProfileType, Profile[]>
  );

  const handleFormSubmit = async (data: ProfileCreatePayload) => {
    setFormLoading(true);
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowForm(false);
      setEditTarget(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleEdit = (p: Profile) => {
    setEditTarget(p);
    setActiveType(p.profile_type as ProfileType);
    setShowForm(true);
  };

  const totalCount = profiles.length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 프로필</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            자소서 소재가 될 정보를 등록하세요. 총 {totalCount}개 항목
          </p>
        </div>
        <div
          className={`flex gap-2 rounded-xl transition-all duration-300 ${
            highlightAdd
              ? "p-1.5 ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_4px_hsl(var(--primary)/0.35)] animate-pulse"
              : ""
          }`}
        >
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditTarget(null);
              setShowForm(true);
            }}
          >
            <Plus size={14} /> 직접 추가
          </Button>
        </div>
      </div>

      {/* 통합 업로드 존 (항상 노출) */}
      <SmartIngestZone
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ["profiles"] });
          qc.invalidateQueries({ queryKey: ["profiles-dashboard"] });
        }}
      />

      {/* 경험 대시보드 */}
      {profiles.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDashboard((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 size={14} />
            내 경험 대시보드
            <span className="text-xs">({showDashboard ? "접기" : "펼치기"})</span>
          </button>

          {showDashboard && dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 통계 + 완성도 */}
              <div className="border rounded-xl p-4 bg-card">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  프로필 현황
                </h3>
                <ProfileStats
                  totalProfiles={dashboardData.total_profiles}
                  typeCounts={dashboardData.type_counts}
                  completenessScore={dashboardData.completeness_score}
                />
              </div>

              {/* 타임라인 */}
              <div className="border rounded-xl p-4 bg-card">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  경험 타임라인
                </h3>
                <div className="max-h-[320px] overflow-y-auto">
                  <ExperienceTimeline timeline={dashboardData.timeline} />
                </div>
              </div>

              {/* 스킬 + AI 강점 */}
              <div className="border rounded-xl p-4 bg-card space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    스킬 분포
                  </h3>
                  <SkillRadar tags={dashboardData.skill_tags} />
                </div>
                <div className="border-t pt-3">
                  <StrengthSummary
                    summary={dashboardData.ai_strength_summary}
                    loading={isDashboardLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 프로필 목록 */}
      <div className="flex gap-6">
        {/* 좌측 타입 네비 */}
        <nav className="w-44 shrink-0 space-y-1">
          {TYPE_ORDER.map((t) => {
            const Icon = TYPE_ICONS[t];
            const count = byType[t].length;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                  ${
                    activeType === t
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} />
                  {PROFILE_TYPE_LABELS[t]}
                </span>
                {count > 0 && (
                  <Badge
                    variant={activeType === t ? "secondary" : "outline"}
                    className="text-xs px-1.5 py-0 h-4"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* 우측 카드 목록 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              {(() => {
                const I = TYPE_ICONS[activeType];
                return <I size={16} />;
              })()}
              {PROFILE_TYPE_LABELS[activeType]}
              <span className="text-muted-foreground font-normal text-sm">
                ({byType[activeType].length}개)
              </span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setEditTarget(null);
                setShowForm(true);
              }}
            >
              <Plus size={13} /> 추가
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : byType[activeType].length === 0 ? (
            <div className="border-2 border-dashed rounded-xl py-12 text-center">
              <p className="text-muted-foreground text-sm">등록된 항목이 없습니다.</p>
              <Button
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  setEditTarget(null);
                  setShowForm(true);
                }}
              >
                <Plus size={13} /> 첫 항목 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {byType[activeType].map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 수동 입력 모달 */}
      {showForm && (
        <ProfileFormModal
          profileType={activeType}
          initial={editTarget}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
          isLoading={formLoading}
        />
      )}
    </div>
  );
}
