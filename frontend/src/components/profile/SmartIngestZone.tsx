import { useCallback, useState, useRef } from "react";
import {
  UploadCloud,
  Link2,
  Type,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  profilesApi,
  type Profile,
  type IngestResponse,
  PROFILE_TYPE_LABELS,
  type ProfileType,
} from "@/api/profiles";

interface Props {
  onComplete: () => void; // 프로필 목록 새로고침 트리거
}

type IngestStep = "idle" | "extracting" | "categorizing" | "enriching" | "done" | "error";

const STEP_LABELS: Record<IngestStep, string> = {
  idle: "",
  extracting: "텍스트 추출 중...",
  categorizing: "AI 분류 중...",
  enriching: "심층 분석 중...",
  done: "완료!",
  error: "오류 발생",
};

export default function SmartIngestZone({ onComplete }: Props) {
  const [step, setStep] = useState<IngestStep>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text" | "link" | null>(null);
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPT = ".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.webp,.txt";

  const runIngest = useCallback(
    async (params: {
      sourceType: "file" | "text" | "link";
      file?: File;
      text?: string;
      url?: string;
    }) => {
      setError(null);
      setResult(null);
      setStep("extracting");

      try {
        // 단계별 진행 시뮬레이션 (실제 API는 한 번에 처리하지만 UX를 위해)
        const stepTimer = setTimeout(() => setStep("categorizing"), 1500);

        const response = await profilesApi.ingest({
          ...params,
          enrichmentLevel: "basic",
        });

        clearTimeout(stepTimer);
        setStep("done");
        setResult(response);

        // 완료 후 프로필 목록 새로고침
        setTimeout(() => onComplete(), 500);
      } catch (err: any) {
        setStep("error");
        if (err.response?.status === 402) {
          setError("포인트가 부족합니다. 충전 후 다시 시도해주세요.");
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      }
    },
    [onComplete]
  );

  const handleFileDrop = useCallback(
    (f: File) => {
      runIngest({ sourceType: "file", file: f });
    },
    [runIngest]
  );

  const handleTextSubmit = () => {
    if (textValue.trim().length < 10) return;
    runIngest({ sourceType: "text", text: textValue });
  };

  const handleLinkSubmit = () => {
    if (!urlValue.trim()) return;
    runIngest({ sourceType: "link", url: urlValue });
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileDrop(f);
    },
    [handleFileDrop]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileDrop(f);
    e.target.value = "";
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      // 파일 붙여넣기
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            handleFileDrop(f);
            return;
          }
        }
      }
      // URL 자동 감지
      const text = e.clipboardData.getData("text");
      if (text && /^https?:\/\/.+/i.test(text.trim())) {
        e.preventDefault();
        setUrlValue(text.trim());
        setInputMode("link");
      }
    },
    [handleFileDrop]
  );

  const reset = () => {
    setStep("idle");
    setResult(null);
    setError(null);
    setInputMode(null);
    setTextValue("");
    setUrlValue("");
  };

  // ── 결과 화면 ──
  if (step === "done" && result) {
    return (
      <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-6 space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base">
              {result.profiles.length}개 프로필 자동 생성 완료
            </h3>
            <p className="text-sm text-muted-foreground">
              AI가 분류하여 즉시 저장했습니다
            </p>
          </div>
        </div>

        {/* 생성된 프로필 카드 */}
        <div className="grid gap-2">
          {result.profiles.map((p: Profile) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 bg-background rounded-lg border animate-in slide-in-from-bottom-2 duration-300"
            >
              <Badge variant="secondary" className="text-xs shrink-0">
                {PROFILE_TYPE_LABELS[p.profile_type as ProfileType] || p.profile_type}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.title}</p>
                {p.organization && (
                  <p className="text-xs text-muted-foreground truncate">
                    {p.organization}
                    {p.role ? ` · ${p.role}` : ""}
                  </p>
                )}
              </div>
              {p.tags && p.tags.length > 0 && (
                <div className="hidden sm:flex gap-1">
                  {p.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI 활용 제안 */}
        {result.ai_summary?.suggested_uses && result.ai_summary.suggested_uses.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">AI 활용 제안</span>
            </div>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {result.ai_summary.suggested_uses.map((use, i) => (
                <li key={i}>· {use}</li>
              ))}
            </ul>
          </div>
        )}

        <Button size="sm" variant="outline" onClick={reset} className="w-full">
          추가 업로드
        </Button>
      </div>
    );
  }

  // ── 진행 중 ──
  if (step !== "idle" && step !== "error") {
    return (
      <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-10 text-center space-y-4">
        <Loader2 size={32} className="mx-auto text-primary animate-spin" />
        <div>
          <p className="font-medium text-sm">{STEP_LABELS[step]}</p>
          <p className="text-xs text-muted-foreground mt-1">
            파일을 분석하고 프로필을 자동 생성합니다
          </p>
        </div>

        {/* 단계 인디케이터 */}
        <div className="flex justify-center gap-2">
          {(["extracting", "categorizing", "enriching"] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${
                step === s
                  ? "bg-primary"
                  : ["extracting", "categorizing", "enriching"].indexOf(step) >
                    ["extracting", "categorizing", "enriching"].indexOf(s)
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 텍스트 입력 모드 ──
  if (inputMode === "text") {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-6 space-y-3">
        <textarea
          autoFocus
          className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="이력서, 포트폴리오, 프로젝트 경험 등을 자유롭게 입력하세요... (최소 10자)"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { setInputMode(null); setTextValue(""); }}>
            취소
          </Button>
          <Button size="sm" onClick={handleTextSubmit} disabled={textValue.trim().length < 10}>
            AI 분석 시작
          </Button>
        </div>
      </div>
    );
  }

  // ── 링크 입력 모드 ──
  if (inputMode === "link") {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-6 space-y-3">
        <input
          autoFocus
          type="url"
          className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="포트폴리오, 블로그, GitHub 등 URL을 입력하세요"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { setInputMode(null); setUrlValue(""); }}>
            취소
          </Button>
          <Button size="sm" onClick={handleLinkSubmit} disabled={!urlValue.trim()}>
            AI 분석 시작
          </Button>
        </div>
      </div>
    );
  }

  // ── 기본 드롭존 ──
  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onFileInput}
        />
        <div className="space-y-2">
          <UploadCloud
            size={36}
            className={`mx-auto transition-colors ${
              isDragging ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <p className="font-medium text-sm">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-muted-foreground">
            PDF, Excel, Word, 이미지, 텍스트 파일 (최대 100MB)
          </p>
          <p className="text-xs text-primary/80">
            AI가 자동으로 분류하여 프로필을 생성합니다
          </p>
        </div>
      </div>

      {/* 대체 입력 방법 */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setInputMode("text")}
        >
          <Type size={14} />
          텍스트 입력
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => setInputMode("link")}
        >
          <Link2 size={14} />
          링크 분석
        </Button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="flex gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            {error}
            <Button variant="link" size="sm" className="text-destructive p-0 h-auto ml-2" onClick={reset}>
              다시 시도
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
