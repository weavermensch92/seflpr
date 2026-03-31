import { useState } from "react";
import { Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profilesApi, type ParsedItem, type ProfileCreatePayload } from "@/api/profiles";
import ParsedPreviewTable from "./ParsedPreviewTable";

interface Props {
  onConfirm: (items: ProfileCreatePayload[]) => Promise<void>;
}

export default function LinkInput({ onConfirm }: Props) {
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!url.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const result = await profilesApi.parseLink(url.trim());
      setParsed(result.items);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("접근 권한이 없어서 내용을 반영할 수 없습니다.");
      } else {
        setError("링크 분석 중 오류가 발생했습니다. URL이 올바른지 확인해주세요.");
      }
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async (items: ProfileCreatePayload[]) => {
    setSaving(true);
    try {
      await onConfirm(items);
      setUrl("");
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
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">외부 링크에서 정보 가져오기</h2>
        <p className="text-xs text-muted-foreground">
          링크드인, 노션, 개인 블로그 등 이력 정보가 포함된 URL을 입력하세요.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/resume"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={parsing}
          className="flex-1"
        />
        <Button
          onClick={handleParse}
          disabled={parsing || !url.trim()}
          className="gap-2 shrink-0"
        >
          {parsing ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Link2 size={16} />
          )}
          {parsing ? "분석 중..." : "링크 분석"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
