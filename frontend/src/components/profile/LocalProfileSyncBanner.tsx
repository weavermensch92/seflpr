import { useState } from "react";
import { Cloud, ArrowUpFromLine, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profilesApi, type ProfileCreatePayload } from "@/api/profiles";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  /** 서버 동기화 성공 후 호출 */
  onSynced?: () => void;
}

export default function LocalProfileSyncBanner({ onSynced }: Props) {
  const qc = useQueryClient();
  const localStore = useLocalProfileStore();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const count = localStore.pendingProfiles.length;
  if (count === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const items: ProfileCreatePayload[] = localStore.pendingProfiles.map((p) => ({
        profile_type: p.profile_type as ProfileCreatePayload["profile_type"],
        title: p.title,
        organization: p.organization,
        role: p.role,
        description: p.description,
        start_date: p.start_date,
        end_date: p.end_date,
        tags: p.tags,
        metadata: p.metadata,
      }));

      await profilesApi.syncLocalProfiles(items);
      localStore.clearLocalData();
      localStore.setSynced(true);
      await qc.invalidateQueries({ queryKey: ["profiles"] });
      setResult("success");
      if (onSynced) onSynced();
    } catch {
      setResult("error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4
      ${result === "success"
        ? "bg-emerald-50 border-emerald-200"
        : result === "error"
        ? "bg-red-50 border-red-200"
        : "bg-blue-50 border-blue-200"
      }`}>
      <div className="shrink-0">
        {result === "success" ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : result === "error" ? (
          <AlertCircle size={20} className="text-red-500" />
        ) : (
          <Cloud size={20} className="text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {result === "success" ? (
          <p className="text-sm font-medium text-emerald-800">
            {count}개 항목이 서버에 저장되었습니다 ✓
          </p>
        ) : result === "error" ? (
          <div>
            <p className="text-sm font-medium text-red-800">동기화 실패</p>
            <p className="text-xs text-red-600 mt-0.5">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-blue-800">
              로컬에 {count}개 항목이 임시 저장되어 있습니다
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              포인트 충전 후 서버에 동기화하면 AI 분석에 활용됩니다.
            </p>
          </div>
        )}
      </div>
      {result !== "success" && (
        <Button
          size="sm"
          variant={result === "error" ? "destructive" : "default"}
          className="shrink-0 gap-1.5"
          onClick={handleSync}
          disabled={syncing}
        >
          <ArrowUpFromLine size={14} />
          {syncing ? "동기화 중..." : "서버에 동기화"}
        </Button>
      )}
    </div>
  );
}
