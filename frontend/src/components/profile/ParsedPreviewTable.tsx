import { useState } from "react";
import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PROFILE_TYPE_LABELS, type ParsedItem, type ProfileCreatePayload, type ProfileType } from "@/api/profiles";

interface Props {
  items: ParsedItem[];
  onItemsChange: (items: ParsedItem[]) => void;
  onConfirm: (items: ProfileCreatePayload[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export default function ParsedPreviewTable({ items, onItemsChange, onConfirm, onCancel, saving }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(items.map((_, i) => i)));

  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const updateItem = (i: number, field: keyof ParsedItem, value: string) => {
    const next = [...items];
    (next[i] as unknown as Record<string, unknown>)[field] = value;
    onItemsChange(next);
  };

  const removeItem = (i: number) => {
    onItemsChange(items.filter((_, idx) => idx !== i));
    
    // 선택된 인덱스들 다시 계산 (i보다 큰 인덱스는 1씩 줄임)
    const next = new Set<number>();
    selected.forEach(idx => {
      if (idx < i) next.add(idx);
      else if (idx > i) next.add(idx - 1);
    });
    setSelected(next);
  };

  const handleConfirm = async () => {
    const payload = items
      .filter((_, i) => selected.has(i))
      .map((item) => ({ ...item } as ProfileCreatePayload));
    await onConfirm(payload);
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">추출된 항목 ({items.length}개)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            내용을 확인하고 저장할 항목을 선택하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>취소</Button>
          <Button size="sm" disabled={saving || selectedCount === 0} onClick={handleConfirm}>
            {saving ? "저장 중..." : `선택 항목 저장 (${selectedCount}개)`}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`border rounded-lg p-3 transition-colors cursor-pointer
              ${selected.has(i) ? "border-primary bg-primary/5" : "border-border opacity-60"}`}
            onClick={() => toggle(i)}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0
                ${selected.has(i) ? "bg-primary border-primary" : "border-border"}`}>
                {selected.has(i) && <Check size={11} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {PROFILE_TYPE_LABELS[item.profile_type as ProfileType]}
                  </Badge>
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(i, "title", e.target.value)}
                    className="h-7 text-sm font-medium"
                    placeholder="제목"
                  />
                </div>
                {(item.organization || item.role) && (
                  <div className="flex gap-2">
                    <Input
                      value={item.organization ?? ""}
                      onChange={(e) => updateItem(i, "organization", e.target.value)}
                      className="h-7 text-xs"
                      placeholder="기관명"
                    />
                    <Input
                      value={item.role ?? ""}
                      onChange={(e) => updateItem(i, "role", e.target.value)}
                      className="h-7 text-xs"
                      placeholder="역할"
                    />
                  </div>
                )}
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.map((t) => (
                      <Badge key={t} variant="muted" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => { e.stopPropagation(); removeItem(i); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
