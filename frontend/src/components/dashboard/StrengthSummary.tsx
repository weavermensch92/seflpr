import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  summary: string | null | undefined;
  loading?: boolean;
}

export default function StrengthSummary({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">AI 분석 중...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        프로필 3개 이상 등록 시 AI가 핵심 강점을 분석합니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-semibold text-primary">AI 강점 분석</span>
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
        {summary}
      </div>
    </div>
  );
}
