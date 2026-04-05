import { useState } from "react";
import { Pencil, Trash2, Calendar, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/api/profiles";

interface Props {
  profile: Profile;
  onEdit: (p: Profile) => void;
  onDelete: (id: string) => void;
}

export default function ProfileCard({ profile, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const dateRange = [profile.start_date, profile.end_date]
    .filter(Boolean)
    .map((d) => d!.slice(0, 7))
    .join(" ~ ");

  const enrichmentStatus = profile.enrichment_status || "none";
  const hasAiInsight = profile.is_ai_memory && profile.ai_interpreted_content;
  const summaryJson = profile.ai_summary_json as {
    suggested_section?: string;
    key_strength?: string;
  } | null;

  return (
    <div className="border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{profile.title}</p>

              {/* Enrichment 상태 뱃지 */}
              {enrichmentStatus === "complete" && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                  <Sparkles size={10} className="mr-0.5" />
                  AI 분석 완료
                </Badge>
              )}
              {enrichmentStatus === "pending" && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 shrink-0 animate-pulse">
                  <Loader2 size={10} className="mr-0.5 animate-spin" />
                  분석 중
                </Badge>
              )}
            </div>

            {(profile.organization || profile.role) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[profile.organization, profile.role].filter(Boolean).join(" · ")}
              </p>
            )}
            {dateRange && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar size={11} />
                {dateRange}
              </p>
            )}
            {profile.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {profile.description}
              </p>
            )}

            {/* 태그 */}
            {profile.tags && profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.tags.slice(0, 5).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))}
                {profile.tags.length > 5 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{profile.tags.length - 5}
                  </Badge>
                )}
              </div>
            )}

            {/* 활용 제안 뱃지 */}
            {summaryJson?.suggested_section && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Sparkles size={9} />
                  {summaryJson.suggested_section}에 활용 추천
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            {(hasAiInsight || summaryJson) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(profile)}>
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(profile.id)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* AI 인사이트 확장 패널 */}
      {expanded && (hasAiInsight || summaryJson) && (
        <div className="border-t px-4 py-3 bg-muted/30 space-y-2 animate-in slide-in-from-top-1 duration-200">
          {hasAiInsight && (
            <div>
              <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
                <Sparkles size={11} />
                AI 전략 해석 (STAR)
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                {profile.ai_interpreted_content}
              </p>
            </div>
          )}
          {summaryJson?.key_strength && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">핵심 역량</p>
              <p className="text-xs text-foreground/80">{summaryJson.key_strength}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
