import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, TrendingUp, TrendingDown, BookOpen, ArrowLeft, Loader2, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { interviewApi } from "@/api/interviews";

export default function InterviewSummaryPage() {
  const { id: projectId, sessionId } = useParams();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["interview-summary", projectId, sessionId],
    queryFn: () => interviewApi.completeSession(projectId!, sessionId!),
  });

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm text-muted-foreground">AI가 면접 결과를 분석하고 있습니다...</p>
      </div>
    );
  }

  const scoreColor =
    summary.overall_score >= 80 ? "text-emerald-600" :
    summary.overall_score >= 60 ? "text-amber-600" :
    "text-red-500";

  const scoreBarColor =
    summary.overall_score >= 80 ? "bg-emerald-500" :
    summary.overall_score >= 60 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          <ArrowLeft size={14} /> 프로젝트로 돌아가기
        </Button>
      </div>

      {/* 종합 점수 */}
      <div className="border rounded-2xl bg-card shadow-sm p-8 text-center">
        <Trophy size={40} className={`mx-auto mb-3 ${scoreColor}`} />
        <p className={`text-6xl font-black ${scoreColor}`}>{summary.overall_score}</p>
        <p className="text-sm text-muted-foreground mt-1">종합 면접 점수</p>
        <div className="max-w-xs mx-auto mt-4">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
              style={{ width: `${summary.overall_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* 강점 / 약점 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-2xl bg-card p-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            강점
          </h3>
          <ul className="space-y-2">
            {summary.strengths.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-2xl bg-card p-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <TrendingDown size={16} className="text-red-500" />
            약점
          </h3>
          <ul className="space-y-2">
            {summary.weaknesses.map((w, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-red-500 mt-0.5">-</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 개선 방향 */}
      <div className="border rounded-2xl bg-card p-5 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Target size={16} className="text-primary" />
          개선 방향
        </h3>
        <ul className="space-y-2">
          {summary.improvement_tips.map((tip, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary font-bold">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* 질문별 점수 */}
      {summary.question_scores.length > 0 && (
        <div className="border rounded-2xl bg-card p-5 space-y-3">
          <h3 className="font-bold text-sm mb-3">질문별 성과</h3>
          <div className="space-y-2">
            {summary.question_scores.map((qs, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className={`text-lg font-black w-10 text-center ${
                  qs.score >= 80 ? "text-emerald-600" :
                  qs.score >= 60 ? "text-amber-600" : "text-red-500"
                }`}>
                  {qs.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{qs.question}</p>
                  <p className="text-xs text-muted-foreground">{qs.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 학습 계획 */}
      {summary.study_plan.length > 0 && (
        <div className="border rounded-2xl bg-card p-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <BookOpen size={16} className="text-violet-600" />
            학습 추천
          </h3>
          <div className="space-y-2">
            {summary.study_plan.map((item, i) => (
              <div key={i} className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <p className="text-sm font-medium text-violet-800">{item.topic}</p>
                <p className="text-xs text-violet-600 mt-0.5">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 하단 */}
      <div className="flex justify-center gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
          프로젝트로 돌아가기
        </Button>
      </div>
    </div>
  );
}
