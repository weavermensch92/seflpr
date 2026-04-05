import { Badge } from "@/components/ui/badge";
import { PROFILE_TYPE_LABELS, type ProfileType, type TimelineEntry } from "@/api/profiles";
import { Calendar } from "lucide-react";

interface Props {
  timeline: TimelineEntry[];
}

const TYPE_COLORS: Partial<Record<string, string>> = {
  education: "bg-blue-100 text-blue-700 border-blue-200",
  work_experience: "bg-emerald-100 text-emerald-700 border-emerald-200",
  project: "bg-violet-100 text-violet-700 border-violet-200",
  certification: "bg-amber-100 text-amber-700 border-amber-200",
  activity: "bg-pink-100 text-pink-700 border-pink-200",
  award: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function ExperienceTimeline({ timeline }: Props) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        날짜가 입력된 경험이 없습니다
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4">
      {/* 세로 선 */}
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

      {timeline.map((entry, i) => (
        <div key={i} className="relative flex gap-3">
          {/* 점 */}
          <div className="absolute -left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] ${TYPE_COLORS[entry.profile_type] || ""}`}
              >
                {PROFILE_TYPE_LABELS[entry.profile_type as ProfileType] || entry.profile_type}
              </Badge>
              <span className="font-medium text-sm truncate">{entry.title}</span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {entry.organization && (
                <span className="text-xs text-muted-foreground">{entry.organization}</span>
              )}
              {(entry.start_date || entry.end_date) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar size={10} />
                  {entry.start_date || "?"} ~ {entry.end_date || "현재"}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
