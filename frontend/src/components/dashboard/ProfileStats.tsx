import { PROFILE_TYPE_LABELS, type ProfileType } from "@/api/profiles";

interface Props {
  totalProfiles: number;
  typeCounts: Record<string, number>;
  completenessScore: number;
}

export default function ProfileStats({
  totalProfiles,
  typeCounts,
  completenessScore,
}: Props) {
  // 완성도 색상
  const scoreColor =
    completenessScore >= 80
      ? "text-emerald-600"
      : completenessScore >= 50
      ? "text-amber-600"
      : "text-red-500";

  const scoreBarColor =
    completenessScore >= 80
      ? "bg-emerald-500"
      : completenessScore >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="space-y-4">
      {/* 상단 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold">{totalProfiles}</p>
          <p className="text-xs text-muted-foreground">등록된 항목</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className={`text-2xl font-bold ${scoreColor}`}>{completenessScore}%</p>
          <p className="text-xs text-muted-foreground">프로필 완성도</p>
        </div>
      </div>

      {/* 완성도 바 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">완성도</span>
          <span className={scoreColor}>{completenessScore}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
            style={{ width: `${completenessScore}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          학력, 경력, 프로젝트, 스킬, 대외활동, 지원동기 6개 항목 기준
        </p>
      </div>

      {/* 타입별 분포 */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">항목별 분포</p>
        {Object.entries(typeCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {PROFILE_TYPE_LABELS[type as ProfileType] || type}
              </span>
              <span className="font-medium">{count}개</span>
            </div>
          ))}
      </div>
    </div>
  );
}
