import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { profilesApi, type ParsedItem, type ProfileCreatePayload } from "@/api/profiles";
import ParsedPreviewTable from "./ParsedPreviewTable";

interface Props {
  onConfirm: (items: ProfileCreatePayload[]) => Promise<void>;
}

export default function FreeTextInput({ onConfirm }: Props) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleParse = async (overrideText?: string) => {
    const textToParse = overrideText || text;
    if (textToParse.trim().length < 10) return;
    setParsing(true);
    setError(null);
    try {
      const result = await profilesApi.parseText(textToParse);
      setParsed(result.items);
    } catch {
      setError("AI 파싱 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setParsing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.length > 50) {
      // 대량의 텍스트가 들어오면 즉시 분석 시도 (패키징 처리)
      setText(pastedText);
      handleParse(pastedText);
    }
  };

  const handleConfirm = async (items: ProfileCreatePayload[]) => {
    setSaving(true);
    try {
      await onConfirm(items);
      setText("");
      setParsed(null);
    } finally {
      setSaving(false);
    }
  };

  if (parsed) {
    return (
      <ParsedPreviewTable
        items={parsed}
        onItemsChange={setParsed}
        onConfirm={handleConfirm}
        onCancel={() => setParsed(null)}
        saving={saving}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        이력서 내용을 자유롭게 붙여넣으세요. AI가 즉시 분석하여 항목별로 분류합니다.
      </p>
      <Textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder={`예시:
한국대학교 컴퓨터공학과 졸업 (2020.03 ~ 2024.02), 학점 3.8/4.5
스타트업 ABC 백엔드 인턴 (2023.07 ~ 2023.12), FastAPI 기반 REST API 개발
정보처리기사 취득 (2023.05)
...`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        onClick={() => handleParse()}
        disabled={parsing || text.trim().length < 10}
        className="w-full gap-2"
      >
        <Sparkles size={15} />
        {parsing ? "AI가 분석 중..." : "AI로 자동 분류"}
      </Button>
    </div>
  );
}
