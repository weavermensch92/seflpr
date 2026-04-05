import { useCallback, useState } from "react";
import { UploadCloud, X, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profilesApi, type ParsedItem, type ProfileCreatePayload } from "@/api/profiles";
import ParsedPreviewTable from "./ParsedPreviewTable";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  onConfirm: (items: ProfileCreatePayload[]) => Promise<void>;
  onExtractOnly?: (filename: string, text: string) => void;
}

export default function FileUploadZone({ onConfirm, onExtractOnly }: Props) {
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showMemorySuccess, setShowMemorySuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const ACCEPT = ".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.webp";

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setParsed(null);
    setExtractedText(null);
    setParsing(true);

    try {
      const balance = user?.point_balance ?? 0;
      const isAdmin = user?.is_admin ?? false;

      if (balance > 0 || isAdmin) {
        // 포인트 보유 유저 또는 어드민: AI 전략 메모리 변환 시도
        setError(null);
        try {
          await profilesApi.interpretFileToMemory(f);
          // 성공 시 즉시 저장됨 -> 성공 상태로 변경
          setParsed(null);
          setShowMemorySuccess(true);
        } catch (memErr) {
          // 메모리 변환 실패 시 일반 파싱으로 폴백하거나 에러 표시
          console.error("Memory interpretation failed, falling back to normal parsing:", memErr);
          const result = await profilesApi.parseFile(f); 
          setParsed(result.items);
          setShowWarning(true);
        }
      } else {
        // 미결제 유저: 텍스트 추출만
        const result = await profilesApi.extractFileTextOnly(f);
        setExtractedText(result.text);
        if (onExtractOnly) onExtractOnly(result.filename, result.text);
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        // 포인트 부족 시 텍스트 추출로 폴백
        try {
          const result = await profilesApi.extractFileTextOnly(f);
          setExtractedText(result.text);
          if (onExtractOnly) onExtractOnly(result.filename, result.text);
          setError("포인트 부족: AI 분류 대신 텍스트 추출만 수행했습니다.");
        } catch {
          setError("파일 처리에 실패했습니다.");
        }
      } else {
        setError("파일 파싱 중 오류가 발생했습니다. 다른 파일을 시도해주세요.");
      }
    } finally {
      setParsing(false);
    }
  }, [user?.point_balance, onExtractOnly]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleConfirm = async (items: ProfileCreatePayload[]) => {
    setSaving(true);
    try {
      await onConfirm(items);
      setFile(null);
      setParsed(null);
      setShowWarning(false);
    } finally {
      setSaving(false);
    }
  };

  // AI 파싱 결과 미리보기
  if (parsed) {
    return (
      <div className="space-y-4">
        {showWarning && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">저장 전 확인해주세요</p>
              <p className="mt-0.5">
                저장 완료 후 원본 파일({file?.name})은 개인정보 보호를 위해
                서버에 저장되지 않습니다.
              </p>
            </div>
          </div>
        )}
        <ParsedPreviewTable
          items={parsed}
          onItemsChange={setParsed}
          onConfirm={handleConfirm}
          onCancel={() => { setFile(null); setParsed(null); setShowWarning(false); }}
          saving={saving}
        />
      </div>
    );
  }

  // AI 메모리 변환 성공 결과
  if (showMemorySuccess) {
    return (
      <div className="space-y-4 p-8 border-2 border-primary/20 bg-primary/5 rounded-xl text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
          <UploadCloud className="text-primary" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold">AI 전략 메모리 저장 완료!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            업로드된 파일({file?.name})을 자소서 작성을 위한 전략적 데이터로 변환하여 DB에 안전하게 보관했습니다.
          </p>
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <Button size="sm" onClick={() => { setFile(null); setShowMemorySuccess(false); }}>
            새 파일 업로드
          </Button>
          <Button size="sm" variant="outline" onClick={() => (window.location.href = "/profiles")}>
            프로필 목록 확인
          </Button>
        </div>
      </div>
    );
  }

  // 텍스트 추출 결과 (미결제 유저)
  if (extractedText) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <FileText size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">텍스트 추출 완료</p>
            <p className="mt-0.5">
              AI 자동 분류는 포인트 충전 후 사용 가능합니다.
              추출된 텍스트를 복사하여 직접 입력하거나, 로컬에 임시 저장됩니다.
            </p>
          </div>
        </div>
        <div className="border rounded-xl bg-muted/30 p-4 max-h-[360px] overflow-y-auto whitespace-pre-wrap text-sm font-mono">
          {extractedText}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm"
            onClick={() => { setFile(null); setExtractedText(null); }}>
            닫기
          </Button>
          <Button size="sm" onClick={() => {
            navigator.clipboard.writeText(extractedText);
          }}>
            텍스트 복사
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
        onClick={() => document.getElementById("file-upload-input")?.click()}
      >
        <input id="file-upload-input" type="file" accept={ACCEPT}
          className="hidden" onChange={onInputChange} />
        {parsing ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">파일을 분석하고 있습니다...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud size={32} className="mx-auto text-muted-foreground" />
            <p className="font-medium text-sm">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-muted-foreground">PDF, Excel, Word, 이미지 (최대 100MB)</p>
            {!( (user?.point_balance ?? 0) > 0 || user?.is_admin ) && (
              <p className="text-xs text-amber-600 mt-1">
                ※ 포인트 미보유 시 텍스트 추출만 지원됩니다
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <X size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
