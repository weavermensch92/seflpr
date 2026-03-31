import { apiClient } from "./client";

export type ProfileType =
  | "education" | "work_experience" | "project" | "certification"
  | "skill" | "activity" | "award" | "strength" | "weakness"
  | "motivation" | "free_text";

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  education: "학력",
  work_experience: "경력/아르바이트",
  project: "프로젝트",
  certification: "자격증",
  skill: "스킬",
  activity: "대외활동",
  award: "수상",
  strength: "강점",
  weakness: "약점",
  motivation: "지원동기",
  free_text: "기타",
};

export interface Profile {
  id: string;
  profile_type: ProfileType;
  title: string;
  organization?: string;
  role?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sort_order: number;
  source: string;
}

export interface ProfileCreatePayload {
  profile_type: ProfileType;
  title: string;
  organization?: string;
  role?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sort_order?: number;
}

export interface ParsedItem extends ProfileCreatePayload {
  profile_type: ProfileType;
}

export const profilesApi = {
  list: () => apiClient.get<Profile[]>("/profiles").then((r) => r.data),

  create: (payload: ProfileCreatePayload) =>
    apiClient.post<Profile>("/profiles", payload).then((r) => r.data),

  update: (id: string, payload: Partial<ProfileCreatePayload>) =>
    apiClient.put<Profile>(`/profiles/${id}`, payload).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/profiles/${id}`),

  parseText: (text: string) =>
    apiClient
      .post<{ items: ParsedItem[] }>("/profiles/parse/text", { text })
      .then((r) => r.data),

  parseFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient
      .post<{ items: ParsedItem[] }>("/profiles/parse/file", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  parseLink: (url: string) =>
    apiClient
      .post<{ items: ParsedItem[] }>("/profiles/parse/link", { url })
      .then((r) => r.data),

  confirmParsed: (items: ProfileCreatePayload[]) =>
    apiClient
      .post<Profile[]>("/profiles/confirm", { items })
      .then((r) => r.data),

  extractFileTextOnly: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient
      .post<{ filename: string; text: string }>("/profiles/parse/file/extract", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // 로컬 데이터를 서버로 일괄 동기화
  syncLocalProfiles: (items: ProfileCreatePayload[]) =>
    apiClient
      .post<Profile[]>("/profiles/confirm", { items })
      .then((r) => r.data),
};
