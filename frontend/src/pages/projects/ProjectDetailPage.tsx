import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Calendar, CheckCircle2, ChevronRight,
  Edit3, MessageSquare, Play, RefreshCcw, Search, Trash2, Plus,
  History, Sparkles, AlertCircle, CheckCheck, X, Clock, User, Bot, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsApi, type ProjectStatus, type AnswerVersion, type GapItem, type HumanizeDetectResult } from "@/api/projects";
import { useState, useRef, useEffect } from "react";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending_payment: "결제 대기",
  researching: "리서치 중",
  generating: "생성 중",
  draft: "초안 작성",
  editing: "수정 중",
  final: "완료",
};

const REVISION_TYPE_LABELS: Record<string, string> = {
  ai_generated: "AI 생성",
  user_edit: "직접 수정",
  ai_revised: "AI 첨삭",
  ai_review_applied: "의견 반영",
};

const REVISION_TYPE_ICONS: Record<string, React.ReactNode> = {
  ai_generated: <Bot size={11} />,
  user_edit: <User size={11} />,
  ai_revised: <Sparkles size={11} />,
  ai_review_applied: <CheckCheck size={11} />,
};

const GAP_COLORS = {
  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", dot: "bg-red-500", label: "핵심 보강" },
  recommended: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", label: "권장 보강" },
  nice_to_have: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500", label: "선택 보강" },
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeQuestion, setActiveQuestion] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [showGapPanel, setShowGapPanel] = useState(false);

  // AI 검토 상태
  const [reviewResult, setReviewResult] = useState<{ opinion: string; compare?: string } | null>(null);
  const [showReview, setShowReview] = useState(false);

  // AI 어투 검토 상태
  const [humanizeDiagnosis, setHumanizeDiagnosis] = useState<HumanizeDetectResult | null>(null);
  const [showHumanize, setShowHumanize] = useState(false);

  // 로딩 상태
  const [generating, setGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const currentAnswer = project?.answers.find((a) => a.question_number === activeQuestion);

  const { data: versions, refetch: refetchVersions } = useQuery({
    queryKey: ["versions", id, currentAnswer?.id],
    queryFn: () => projectsApi.getVersions(id!, currentAnswer!.id),
    enabled: !!id && !!currentAnswer?.id && showVersions,
  });

  const { data: gapAnalysis, refetch: refetchGap, isFetching: isGapFetching } = useQuery({
    queryKey: ["gap-analysis", id],
    queryFn: () => projectsApi.getGapAnalysis(id!),
    enabled: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.remove(id!),
    onSuccess: () => navigate("/projects"),
  });

  // 문항 변경 시 편집 모드 초기화
  useEffect(() => {
    setEditMode(false);
    setShowReview(false);
    setReviewResult(null);
    setShowVersions(false);
    setShowHumanize(false);
    setHumanizeDiagnosis(null);
  }, [activeQuestion]);

  // 편집 모드 진입 시 현재 텍스트로 초기화
  useEffect(() => {
    if (editMode && currentAnswer?.answer_text) {
      setEditText(currentAnswer.answer_text);
    }
  }, [editMode, currentAnswer?.answer_text]);

  const handleGenerate = async () => {
    if (!currentAnswer) return;
    setGenerating(true);
    try {
      const updated = await projectsApi.generateAnswer(id!, currentAnswer.id);
      qc.setQueryData(["projects", id], updated);
    } catch {
      alert("답변 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleResearch = async () => {
    setIsResearching(true);
    try {
      const updated = await projectsApi.researchCompany(id!);
      qc.setQueryData(["projects", id], updated);
    } catch {
      alert("기업 리서치 중 오류가 발생했습니다.");
    } finally {
      setIsResearching(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentAnswer || !editText.trim()) return;
    setIsSavingEdit(true);
    try {
      const updated = await projectsApi.saveUserEdit(id!, currentAnswer.id, editText);
      qc.setQueryData(["projects", id], updated);
      setEditMode(false);
      if (showVersions) refetchVersions();
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAIReview = async () => {
    if (!currentAnswer) return;
    const textToReview = editMode ? editText : (currentAnswer.answer_text || "");
    if (!textToReview) return;
    setIsReviewing(true);
    try {
      const result = await projectsApi.aiReview(id!, currentAnswer.id, textToReview);
      setReviewResult(result);
      setShowReview(true);
    } catch {
      alert("AI 검토 중 오류가 발생했습니다.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApplyReview = async () => {
    if (!currentAnswer || !reviewResult) return;
    const currentText = editMode ? editText : (currentAnswer.answer_text || "");
    setIsApplying(true);
    try {
      const updated = await projectsApi.applyReview(id!, currentAnswer.id, currentText, reviewResult.opinion);
      qc.setQueryData(["projects", id], updated);
      setShowReview(false);
      setReviewResult(null);
      setEditMode(false);
      if (showVersions) refetchVersions();
    } catch {
      alert("의견 반영 중 오류가 발생했습니다.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleViewVersion = (version: AnswerVersion) => {
    setEditText(version.new_text);
    setEditMode(true);
  };

  const handleHumanizeDetect = async () => {
    if (!currentAnswer) return;
    const text = editMode ? editText : (currentAnswer.answer_text || "");
    if (!text) return;
    setIsDetecting(true);
    setShowHumanize(true);
    try {
      const result = await projectsApi.humanizeDetect(id!, currentAnswer.id, text);
      setHumanizeDiagnosis(result);
    } catch {
      alert("AI 어투 감지 중 오류가 발생했습니다.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleHumanizeRewrite = async () => {
    if (!currentAnswer) return;
    const text = editMode ? editText : (currentAnswer.answer_text || "");
    if (!text) return;
    setIsHumanizing(true);
    try {
      const result = await projectsApi.humanizeRewrite(id!, currentAnswer.id, text);
      qc.setQueryData(["projects", id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          answers: old.answers.map((a: any) =>
            a.id === currentAnswer.id ? { ...a, answer_text: result.rewritten_text } : a
          ),
        };
      });
      setShowHumanize(false);
      setHumanizeDiagnosis(null);
      setEditMode(false);
      if (showVersions) refetchVersions();
    } catch {
      alert("인간화 재작성 중 오류가 발생했습니다.");
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleToggleGap = async () => {
    if (!showGapPanel) {
      await refetchGap();
    }
    setShowGapPanel((v) => !v);
  };

  const charCount = editMode ? editText.length : (currentAnswer?.answer_text?.length || 0);
  const charLimit = currentAnswer?.char_limit;
  const charMin = charLimit ? charLimit - 100 : null;
  const charOver = charLimit ? charCount > charLimit : false;
  const charUnder = charMin ? charCount < charMin : false;

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">불러오는 중...</div>;
  if (!project) return <div className="text-center py-20 text-muted-foreground">프로젝트를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="-mt-1">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {STATUS_LABELS[project.status]}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar size={12} />
                {new Date(project.created_at).toLocaleDateString()} 생성
              </span>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 size={24} className="text-muted-foreground" />
              {project.company_name} — {project.position}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{project.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResearch} disabled={isResearching}>
            {isResearching ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
            기업 분석
          </Button>
          <Button
            variant="outline" size="sm"
            className={`gap-1.5 ${showGapPanel ? "border-amber-400 text-amber-600" : ""}`}
            onClick={handleToggleGap}
            disabled={isGapFetching}
          >
            {isGapFetching ? <RefreshCcw size={14} className="animate-spin" /> : <AlertCircle size={14} />}
            프로필 갭 분석
          </Button>
          <Button
            variant="outline" size="sm"
            className={`gap-1.5 ${showHumanize ? "border-emerald-400 text-emerald-600" : ""}`}
            onClick={handleHumanizeDetect}
            disabled={isDetecting || (!currentAnswer?.answer_text && !editText)}
          >
            {isDetecting ? <RefreshCcw size={14} className="animate-spin" /> : <Wand2 size={14} />}
            AI 어투 검토
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive/10 border-transparent"
            onClick={() => confirm("삭제할까요?") && deleteMutation.mutate()}
          >
            <Trash2 size={14} /> 삭제
          </Button>
        </div>
      </div>

      {/* 프로필 갭 분석 패널 */}
      {showGapPanel && gapAnalysis && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
              <AlertCircle size={16} />
              프로필 보강 제안 — {project.position} 기준
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => navigate("/profile?highlight=add")}
              >
                <Plus size={12} /> 프로필에 추가하러 가기
              </Button>
              <button onClick={() => setShowGapPanel(false)} className="text-amber-500 hover:text-amber-800">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="p-5 grid gap-4">
            {(["critical", "recommended", "nice_to_have"] as const).map((level) => {
              const items = gapAnalysis[level];
              if (!items?.length) return null;
              const c = GAP_COLORS[level];
              return (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{c.label}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item: GapItem, i: number) => (
                      <div key={i} className={`${c.bg} ${c.border} border rounded-xl p-3`}>
                        <p className="text-sm font-medium text-foreground">{item.gap}</p>
                        <p className="text-xs text-muted-foreground mt-1">→ {item.recommendation}</p>
                        <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>
                          {item.profile_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI 어투 검토 패널 */}
      {showHumanize && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 border-b border-emerald-200">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 text-sm">
              <Wand2 size={16} />
              AI 어투 검토
              {humanizeDiagnosis && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium
                  ${humanizeDiagnosis.ai_level === "높음" ? "bg-red-100 text-red-700" :
                    humanizeDiagnosis.ai_level === "보통" ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"}`}>
                  AI 냄새 {humanizeDiagnosis.ai_level}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleHumanizeRewrite}
                disabled={isHumanizing || isDetecting}
              >
                {isHumanizing
                  ? <RefreshCcw size={12} className="animate-spin" />
                  : <Wand2 size={12} />}
                {isHumanizing ? "다듬는 중..." : "사람처럼 다듬기"}
              </Button>
              <button onClick={() => { setShowHumanize(false); setHumanizeDiagnosis(null); }}
                className="text-emerald-400 hover:text-emerald-800">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="p-5 bg-emerald-50/40">
            {isDetecting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <RefreshCcw size={14} className="animate-spin" /> AI 패턴 분석 중...
              </div>
            ) : humanizeDiagnosis ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">감지된 AI 패턴</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {humanizeDiagnosis.diagnosis}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  → "사람처럼 다듬기" 버튼을 누르면 위 패턴을 제거한 새 버전이 생성되고 버전 이력에 저장됩니다.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 본문 레이아웃 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 좌측: 문항 목록 */}
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <MessageSquare size={14} className="text-primary" /> 자기소개서 문항
            </h2>
            <Badge variant="outline" className="text-xs">{project.answers.length}개</Badge>
          </div>
          {project.answers.map((q: any) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestion(q.question_number)}
              className={`w-full text-left p-3 rounded-xl border transition-all
                ${activeQuestion === q.question_number
                  ? "bg-card border-primary shadow-sm"
                  : "border-transparent bg-muted/50 hover:bg-muted"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5
                  ${activeQuestion === q.question_number ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {q.question_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium line-clamp-2 leading-snug
                    ${activeQuestion === q.question_number ? "text-foreground" : "text-muted-foreground"}`}>
                    {q.question_text}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {q.char_limit && (
                      <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wide">
                        {q.char_limit}자
                      </span>
                    )}
                    {q.status === "done" && <CheckCircle2 size={10} className="text-emerald-500" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <Button variant="outline" className="w-full border-dashed text-muted-foreground text-xs py-4 hover:text-primary mt-2">
            <Plus size={14} className="mr-1.5" /> 문항 추가
          </Button>
        </aside>

        {/* 중앙: 버전 히스토리 (열렸을 때) */}
        {showVersions && (
          <aside className="col-span-12 lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <History size={14} className="text-primary" /> 버전 이력
              </h2>
              <button onClick={() => setShowVersions(false)} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            {!versions?.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">이력 없음</p>
            ) : (
              versions.map((v: AnswerVersion) => (
                <button
                  key={v.id}
                  onClick={() => handleViewVersion(v)}
                  className="w-full text-left p-2.5 rounded-lg border border-muted hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-muted-foreground group-hover:text-primary">{REVISION_TYPE_ICONS[v.revision_type]}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">v{v.revision_number}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium
                      ${v.revision_type === "user_edit" ? "bg-blue-100 text-blue-600" :
                        v.revision_type === "ai_review_applied" ? "bg-emerald-100 text-emerald-600" :
                        "bg-muted text-muted-foreground"}`}>
                      {REVISION_TYPE_LABELS[v.revision_type]}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{v.new_text.slice(0, 60)}…</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </aside>
        )}

        {/* 우측: 답변 영역 */}
        <main className={`col-span-12 ${showVersions ? "lg:col-span-7" : "lg:col-span-9"}`}>
          {currentAnswer ? (
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              {/* 상단 컨트롤 */}
              <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">문항 {activeQuestion}</span>
                  {currentAnswer.status === "done" && (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  )}
                  {charLimit && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-medium
                      ${charOver ? "bg-red-100 text-red-600" : charUnder && charCount > 0 ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                      {charCount} / {charLimit}자
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs gap-1"
                    onClick={() => { setShowVersions((v) => !v); if (!showVersions) refetchVersions(); }}
                  >
                    <History size={13} /> 이력
                  </Button>
                  {currentAnswer.answer_text && !editMode && (
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit3 size={13} /> 직접 편집
                    </Button>
                  )}
                  {editMode && (
                    <>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setEditMode(false)}
                      >
                        <X size={13} /> 취소
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1 border-violet-300 text-violet-600 hover:bg-violet-50"
                        onClick={handleAIReview}
                        disabled={isReviewing || !editText.trim()}
                      >
                        {isReviewing ? <RefreshCcw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        AI 검토
                      </Button>
                      <Button
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editText.trim()}
                      >
                        {isSavingEdit ? <RefreshCcw size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        저장
                      </Button>
                    </>
                  )}
                  {!editMode && currentAnswer.answer_text && (
                    <>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1 border-violet-300 text-violet-600 hover:bg-violet-50"
                        onClick={handleAIReview}
                        disabled={isReviewing}
                      >
                        {isReviewing ? <RefreshCcw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        AI 검토
                      </Button>
                      <Button
                        size="sm" className="h-7 text-xs gap-1 bg-black hover:bg-black/90"
                        onClick={handleGenerate}
                        disabled={generating}
                      >
                        {generating ? <RefreshCcw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                        재생성
                      </Button>
                    </>
                  )}
                  {!currentAnswer.answer_text && (
                    <Button
                      size="sm" className="h-7 text-xs gap-1 bg-black hover:bg-black/90"
                      onClick={handleGenerate}
                      disabled={generating}
                    >
                      {generating ? <RefreshCcw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                      {generating ? "생성 중..." : "AI 답변 생성"}
                    </Button>
                  )}
                </div>
              </div>

              {/* 질문 표시 */}
              <div className="px-6 py-4 border-b bg-muted/10">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Question</p>
                <p className="text-base font-medium leading-relaxed">{currentAnswer.question_text}</p>
                {charLimit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    글자 수 제한: {charMin}자 이상 ~ {charLimit}자 이하
                  </p>
                )}
              </div>

              {/* 답변 본문 */}
              <div className="p-6 min-h-[280px]">
                {editMode ? (
                  <textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-64 text-sm leading-relaxed resize-none border rounded-xl p-4 bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="자기소개서를 직접 작성하거나 수정하세요..."
                  />
                ) : currentAnswer.answer_text ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentAnswer.answer_text}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <RefreshCcw size={20} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">아직 생성된 답변이 없습니다.</p>
                    <p className="text-xs text-muted-foreground mt-1">상단의 'AI 답변 생성' 버튼을 눌러보세요.</p>
                  </div>
                )}
              </div>

              {/* AI 검토 의견 패널 */}
              {showReview && reviewResult && (
                <div className="border-t">
                  <div className="px-6 py-3 bg-violet-50 border-b border-violet-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                      <Sparkles size={15} /> AI 검토 의견
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
                        onClick={handleApplyReview}
                        disabled={isApplying}
                      >
                        {isApplying ? <RefreshCcw size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                        의견 반영
                      </Button>
                      <button onClick={() => setShowReview(false)} className="text-violet-400 hover:text-violet-700">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-violet-50/50 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">작성 의도</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{reviewResult.opinion}</p>
                    </div>
                    {reviewResult.compare && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">버전 비교 평가</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{reviewResult.compare}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 하단 푸터 */}
              <div className="px-5 py-2.5 border-t bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  수정 가능: <strong>{currentAnswer.revisions_remaining}</strong>회
                </span>
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  <ChevronRight size={13} /> 참고된 프로필 보기
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-2xl py-20 text-muted-foreground">
              질문을 선택해주세요.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
