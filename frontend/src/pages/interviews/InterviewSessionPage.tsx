import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, ChevronDown, ChevronUp, Sparkles,
  Plus, ArrowRight, CheckCircle2, Loader2, Lightbulb, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  interviewApi,
  QUESTION_TYPE_LABELS,
  type InterviewQuestion,
  type InterviewAnswer,
} from "@/api/interviews";

const TYPE_COLORS: Record<string, string> = {
  resume: "bg-blue-100 text-blue-700 border-blue-200",
  values: "bg-emerald-100 text-emerald-700 border-emerald-200",
  technical: "bg-violet-100 text-violet-700 border-violet-200",
  situational: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function InterviewSessionPage() {
  const { id: projectId, sessionId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [showHint, setShowHint] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ["interview", projectId, sessionId],
    queryFn: () => interviewApi.getSession(projectId!, sessionId!),
    refetchInterval: false,
  });

  const submitMutation = useMutation({
    mutationFn: (params: { questionId: string; text: string }) =>
      interviewApi.submitAnswer(projectId!, sessionId!, params.questionId, params.text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview", projectId, sessionId] });
      setAnswerText("");
    },
  });

  const followUpMutation = useMutation({
    mutationFn: (parentId: string) =>
      interviewApi.requestFollowUp(projectId!, sessionId!, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview", projectId, sessionId] });
      if (session) setCurrentQIdx(session.questions.length);
    },
  });

  const newQuestionMutation = useMutation({
    mutationFn: () => interviewApi.requestNewQuestion(projectId!, sessionId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview", projectId, sessionId] });
      if (session) setCurrentQIdx(session.questions.length);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => interviewApi.completeSession(projectId!, sessionId!),
    onSuccess: () => {
      navigate(`/projects/${projectId}/interviews/${sessionId}/summary`);
    },
  });

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const questions = session.questions || [];
  const currentQ: InterviewQuestion | undefined = questions[currentQIdx];
  const lastAnswer: InterviewAnswer | undefined = currentQ?.answers?.[currentQ.answers.length - 1];
  const hasAnswered = !!lastAnswer;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            면접 연습
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {session.company_name} · {session.position}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">질문 {questions.length}개</Badge>
          <Badge variant="secondary">{session.total_points_spent}P 사용</Badge>
          {session.status !== "done" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 size={14} />
              {completeMutation.isPending ? "분석 중..." : "세션 종료"}
            </Button>
          )}
        </div>
      </div>

      {/* 질문 네비게이터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => { setCurrentQIdx(i); setShowHint(false); setAnswerText(""); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              i === currentQIdx
                ? "bg-primary text-primary-foreground border-primary"
                : q.answers.length > 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            Q{q.question_number}
            {q.is_follow_up && " ↳"}
          </button>
        ))}
      </div>

      {/* 현재 질문 */}
      {currentQ && (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          {/* 질문 헤더 */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${TYPE_COLORS[currentQ.question_type] || ""}`}>
                {QUESTION_TYPE_LABELS[currentQ.question_type]}
              </Badge>
              {currentQ.is_follow_up && (
                <Badge variant="secondary" className="text-[10px]">꼬리 질문</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                Q{currentQ.question_number}
              </span>
            </div>

            <p className="text-base font-medium leading-relaxed">{currentQ.question_text}</p>

            {/* 힌트 */}
            {currentQ.hint_text && (
              <div>
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowHint(!showHint)}
                >
                  <Lightbulb size={12} />
                  힌트 {showHint ? "숨기기" : "보기"}
                  {showHint ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showHint && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
                    {currentQ.hint_text}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 답변 입력 (미답변 시) */}
          {!hasAnswered && (
            <div className="border-t p-6 bg-muted/20 space-y-3">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변을 입력하세요... (실제 면접처럼 구체적으로 작성해보세요)"
                className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {answerText.length}자
                </span>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={answerText.trim().length < 10 || submitMutation.isPending}
                  onClick={() => submitMutation.mutate({ questionId: currentQ.id, text: answerText })}
                >
                  {submitMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> AI 분석 중...</>
                  ) : (
                    <><Send size={14} /> 답변 제출</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* AI 피드백 (답변 후) */}
          {hasAnswered && lastAnswer && (
            <div className="border-t">
              {/* 유저 답변 */}
              <div className="p-4 bg-primary/5 border-b">
                <p className="text-xs font-semibold text-primary mb-1">내 답변</p>
                <p className="text-sm leading-relaxed">{lastAnswer.answer_text}</p>
              </div>

              {/* AI 피드백 */}
              {lastAnswer.ai_feedback && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">AI 피드백</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{lastAnswer.ai_feedback}</p>

                  {/* 학습 추천 */}
                  {lastAnswer.study_recommendations && lastAnswer.study_recommendations.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                        <HelpCircle size={12} /> 학습 추천
                      </p>
                      {lastAnswer.study_recommendations.map((rec, i) => (
                        <div key={i} className="text-xs text-amber-700 mt-1">
                          <span className="font-medium">{rec.topic}</span>: {rec.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="p-4 border-t bg-muted/20 flex flex-wrap gap-2">
                {/* 꼬리 질문 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={followUpMutation.isPending || (currentQ.follow_up_count >= 5)}
                  onClick={() => followUpMutation.mutate(currentQ.id)}
                >
                  {followUpMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ArrowRight size={12} />
                  )}
                  꼬리 질문 (1P)
                  {currentQ.follow_up_count > 0 && (
                    <span className="text-muted-foreground">({currentQ.follow_up_count}/5)</span>
                  )}
                </Button>

                {/* 다음 질문 */}
                {currentQIdx < questions.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => { setCurrentQIdx(currentQIdx + 1); setShowHint(false); setAnswerText(""); }}
                  >
                    다음 질문 →
                  </Button>
                )}

                {/* 신규 질문 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={newQuestionMutation.isPending}
                  onClick={() => newQuestionMutation.mutate()}
                >
                  {newQuestionMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  신규 질문 (3P)
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
