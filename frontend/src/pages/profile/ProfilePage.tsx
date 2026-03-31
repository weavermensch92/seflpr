import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Upload, Type, GraduationCap, Briefcase, FolderGit2, Award, Zap, Users, Star, Frown, Lightbulb, FileText, BadgeCheck, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileFormModal from "@/components/profile/ProfileFormModal";
import FileUploadZone from "@/components/profile/FileUploadZone";
import FreeTextInput from "@/components/profile/FreeTextInput";
import LinkInput from "@/components/profile/LinkInput";
import { profilesApi, PROFILE_TYPE_LABELS, type Profile, type ProfileType, type ProfileCreatePayload } from "@/api/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore, type LocalProfileItem } from "@/stores/localProfileStore";
import LocalProfileSyncBanner from "@/components/profile/LocalProfileSyncBanner";

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
  "education", "work_experience", "project", "certification",
  "skill", "activity", "award", "strength", "weakness", "motivation", "free_text",
];

type InputMode = "list" | "manual" | "file" | "text" | "link";



export default function ProfilePage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const localStore = useLocalProfileStore();
  
  const [activeType, setActiveType] = useState<ProfileType>("education");
  const [mode, setMode] = useState<InputMode>("list");
  const [editTarget, setEditTarget] = useState<Profile | LocalProfileItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [highlightAdd, setHighlightAdd] = useState(false);

  const isServerMode = (user?.point_balance ?? 0) > 0;

  // ?highlight=add 처리
  useEffect(() => {
    if (searchParams.get("highlight") === "add") {
      setHighlightAdd(true);
      setSearchParams({}, { replace: true });
      const t = setTimeout(() => setHighlightAdd(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  const { data: serverProfiles = [], isLoading: isServerLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: profilesApi.list,
    enabled: isServerMode,
  });

  const profiles = isServerMode ? serverProfiles : localStore.pendingProfiles;
  const isLoading = isServerMode && isServerLoading;

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

  const confirmMutation = useMutation({
    mutationFn: profilesApi.confirmParsed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setMode("list");
    },
  });

  const byType = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = profiles.filter((p) => p.profile_type === t);
    return acc;
  }, {} as Record<ProfileType, (Profile | LocalProfileItem)[]>);

  const handleFormSubmit = async (data: ProfileCreatePayload) => {
    setFormLoading(true);
    try {
      if (isServerMode) {
        if (editTarget && "id" in editTarget) {
          await updateMutation.mutateAsync({ id: editTarget.id, data });
        } else {
          await createMutation.mutateAsync(data);
        }
      } else {
        // 로컬 모드
        if (editTarget && "tempId" in editTarget) {
          localStore.updateProfile(editTarget.tempId, data);
        } else {
          localStore.addProfile({ ...data, source: 'manual' });
        }
      }
      setShowForm(false);
      setEditTarget(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (idOrTempId: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    if (isServerMode) {
      await deleteMutation.mutateAsync(idOrTempId);
    } else {
      localStore.removeProfile(idOrTempId);
    }
  };

  const handleEdit = (p: Profile | LocalProfileItem) => {
    setEditTarget(p);
    setActiveType(p.profile_type as ProfileType);
    setShowForm(true);
    setMode("list");
  };

  const handleConfirmParsed = async (items: ProfileCreatePayload[]) => {
    if (isServerMode) {
      await confirmMutation.mutateAsync(items);
    } else {
      items.forEach(item => localStore.addProfile({ ...item, source: 'file_extract' }));
      setMode("list");
    }
  };

  const totalCount = profiles.length;

  return (
    <div className="space-y-6">
      {/* 포인트 충전 후 로컬 데이터 동기화 배너 */}
      {isServerMode && (
        <LocalProfileSyncBanner onSynced={() => {
          // 동기화 후 서버 모드이므로 자동으로 서버 데이터 표시
        }} />
      )}
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 프로필</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            자소서 소재가 될 정보를 등록하세요. 총 {totalCount}개 항목
          </p>
        </div>
        {mode === "list" && (
          <div className={`flex gap-2 rounded-xl transition-all duration-300 ${highlightAdd ? "p-1.5 ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_4px_hsl(var(--primary)/0.35)] animate-pulse" : ""}`}>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode("file")}>
              <Upload size={14} /> 파일 업로드
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode("link")}>
              <Link2 size={14} /> 링크 입력
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMode("text")}>
              <Type size={14} /> 텍스트 입력
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditTarget(null); setShowForm(true); }}>
              <Plus size={14} /> 직접 추가
            </Button>
          </div>
        )}
        {mode !== "list" && (
          <Button variant="outline" size="sm" onClick={() => setMode("list")}>
            ← 목록으로
          </Button>
        )}
      </div>

      {/* 파일 업로드 모드 */}
      {mode === "file" && (
        <div className="border rounded-xl p-6 bg-card">
          <h2 className="font-semibold mb-4">파일 업로드</h2>
          <FileUploadZone onConfirm={handleConfirmParsed} />
        </div>
      )}

      {/* 링크 입력 모드 */}
      {mode === "link" && (
        <div className="border rounded-xl p-6 bg-card">
          <LinkInput onConfirm={handleConfirmParsed} />
        </div>
      )}

      {/* 자유 텍스트 모드 */}
      {mode === "text" && (
        <div className="border rounded-xl p-6 bg-card">
          <h2 className="font-semibold mb-4">텍스트로 입력</h2>
          <FreeTextInput onConfirm={handleConfirmParsed} />
        </div>
      )}

      {/* 목록 모드 */}
      {mode === "list" && (
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
                    ${activeType === t
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
                      variant={activeType === t ? "secondary" : "muted"}
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
                {(() => { const I = TYPE_ICONS[activeType]; return <I size={16} />; })()}
                {PROFILE_TYPE_LABELS[activeType]}
                <span className="text-muted-foreground font-normal text-sm">
                  ({byType[activeType].length}개)
                </span>
              </h2>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                onClick={() => { setEditTarget(null); setShowForm(true); }}
              >
                <Plus size={13} /> 추가
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>
            ) : byType[activeType].length === 0 ? (
              <div className="border-2 border-dashed rounded-xl py-12 text-center">
                <p className="text-muted-foreground text-sm">등록된 항목이 없습니다.</p>
                <Button
                  size="sm" className="mt-3 gap-1.5"
                  onClick={() => { setEditTarget(null); setShowForm(true); }}
                >
                  <Plus size={13} /> 첫 항목 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {byType[activeType].map((p) => {
                  const key = 'id' in p ? p.id : (p as LocalProfileItem).tempId;
                  return (
                    <ProfileCard
                      key={key}
                      profile={p}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 수동 입력 모달 */}
      {showForm && (
        <ProfileFormModal
          profileType={activeType}
          initial={editTarget}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          isLoading={formLoading}
        />
      )}
    </div>
  );
}
