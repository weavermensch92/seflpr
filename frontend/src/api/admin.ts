import { apiClient } from "./client";

export interface AdminStats {
  user_count: number;
  profile_count: number;
  project_count: number;
  answer_count: number;
  generation_success_rate: number;
  avg_revisions_used: number;
}

export interface AgentLogEntry {
  id: string;
  username: string;
  action: string;
  status: string;
  timestamp: string;
  details?: string;
}

export interface AdminDashboardResponse {
  stats: AdminStats;
  recent_logs: AgentLogEntry[];
}

export interface PromptConfig {
  id: string;
  prompt_key: string;
  label: string;
  description: string;
  category: string;
  content: string;
  default_content: string;
  is_active: boolean;
  updated_by?: string;
  updated_at: string;
}

export const PROMPT_CATEGORY_LABELS: Record<string, string> = {
  generator: "자소서 생성",
  reviewer: "AI 검토",
  gap: "프로필 갭 분석",
  humanizer: "AI 어투 제거",
  researcher: "기업 리서치",
  interview: "면접 연습",
};

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  is_active: boolean;
  is_admin: boolean;
  point_balance: number;
  free_ingests_remaining: number;
  created_at: string;
  last_login_at?: string | null;
  payment_count: number;
}

export const adminApi = {
  getDashboard: () =>
    apiClient.get<AdminDashboardResponse>("/admin/dashboard").then((r) => r.data),

  listPrompts: () =>
    apiClient.get<PromptConfig[]>("/admin/prompts").then((r) => r.data),

  getPrompt: (key: string) =>
    apiClient.get<PromptConfig>(`/admin/prompts/${key}`).then((r) => r.data),

  updatePrompt: (key: string, content: string) =>
    apiClient.put<PromptConfig>(`/admin/prompts/${key}`, { content }).then((r) => r.data),

  resetPrompt: (key: string) =>
    apiClient.post<PromptConfig>(`/admin/prompts/${key}/reset`).then((r) => r.data),

  listUsers: () =>
    apiClient.get<AdminUser[]>("/admin/users").then((r) => r.data),

  toggleUserActive: (userId: string) =>
    apiClient.post<AdminUser>(`/admin/users/${userId}/toggle-active`).then((r) => r.data),

  grantPoints: (userId: string, amount: number, reason = "admin_grant") =>
    apiClient.post<{ user_id: string; new_balance: number }>(
      `/admin/users/${userId}/grant-points`,
      { amount, reason }
    ).then((r) => r.data),
};
