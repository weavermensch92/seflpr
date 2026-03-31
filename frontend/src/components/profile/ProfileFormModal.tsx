import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROFILE_TYPE_LABELS, type Profile, type ProfileCreatePayload, type ProfileType } from "@/api/profiles";
import type { LocalProfileItem } from "@/stores/localProfileStore";

export type ProfileLike = Profile | LocalProfileItem;
import { X } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  organization: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  tags: z.string().optional(), // 쉼표 구분 문자열
});
type FormData = z.infer<typeof schema>;

interface Props {
  profileType: ProfileType;
  initial?: ProfileLike | null;
  onSubmit: (data: ProfileCreatePayload) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ProfileFormModal({ profileType, initial, onSubmit, onClose, isLoading }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (initial) {
      reset({
        title: initial.title,
        organization: initial.organization ?? "",
        role: initial.role ?? "",
        description: initial.description ?? "",
        start_date: initial.start_date ?? "",
        end_date: initial.end_date ?? "",
        tags: initial.tags?.join(", ") ?? "",
      });
    }
  }, [initial, reset]);

  const onValid = async (data: FormData) => {
    await onSubmit({
      profile_type: profileType,
      title: data.title,
      organization: data.organization || undefined,
      role: data.role || undefined,
      description: data.description || undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    });
  };

  const showOrgRole = !["skill", "strength", "weakness", "motivation", "free_text"].includes(profileType);
  const showDate = !["skill", "strength", "weakness", "motivation", "free_text"].includes(profileType);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">
            {initial ? "수정" : "추가"} — {PROFILE_TYPE_LABELS[profileType]}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input {...register("title")} placeholder={
              profileType === "education" ? "예: 한국대학교 컴퓨터공학과" :
              profileType === "work_experience" ? "예: 스타트업 백엔드 인턴" :
              profileType === "project" ? "예: 팀 일정 관리 앱 개발" : "제목"
            } />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {showOrgRole && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>기관/회사</Label>
                <Input {...register("organization")} placeholder="기관명" />
              </div>
              <div className="space-y-1.5">
                <Label>역할/직책</Label>
                <Input {...register("role")} placeholder="역할" />
              </div>
            </div>
          )}

          {showDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>시작일</Label>
                <Input type="month" {...register("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>종료일</Label>
                <Input type="month" {...register("end_date")} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>상세 내용</Label>
            <Textarea {...register("description")} rows={4} placeholder="구체적인 내용, 성과, 역할 등을 입력하세요..." />
          </div>

          <div className="space-y-1.5">
            <Label>태그 (쉼표로 구분)</Label>
            <Input {...register("tags")} placeholder="예: React, Python, 팀프로젝트" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "저장 중..." : initial ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
