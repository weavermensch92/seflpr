import { apiClient } from "./client";

export type ProjectStatus =
  | "pending_payment"
  | "researching"
  | "generating"
  | "draft"
  | "editing"
  | "final";

export type AnswerStatus = "pending" | "generating" | "done";

export type RevisionType =
  | "ai_generated"
  | "user_edit"
  | "ai_revised"
  | "ai_review_applied";

export interface ProjectAnswer {
  id: string;
  question_number: number;
  question_text: string;
  answer_text?: string;
  char_limit?: number;
  status: AnswerStatus;
  matched_profiles?: any[];
  revisions_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  company_cache_id?: string;
  company_name: string;
  position: string;
  title: string;
  status: ProjectStatus;
  generation_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
  answers: ProjectAnswer[];
}

export interface ProjectListItem {
  id: string;
  company_name: string;
  position: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  answer_count: number;
}

export interface ProjectCreatePayload {
  company_name: string;
  position: string;
  title: string;
  questions: {
    question_number: number;
    question_text: string;
    char_limit?: number;
  }[];
  generation_config?: Record<string, any>;
}

export interface AnswerVersion {
  id: string;
  revision_number: number;
  revision_type: RevisionType;
  new_text: string;
  previous_text?: string;
  revision_request?: string;
  ai_review_text?: string;
  created_at: string;
}

export interface ReviewResponse {
  opinion: string;
  compare?: string;
}

export interface GapItem {
  gap: string;
  recommendation: string;
  profile_type: string;
}

export interface GapAnalysis {
  critical: GapItem[];
  recommended: GapItem[];
  nice_to_have: GapItem[];
}

export interface HumanizeDetectResult {
  diagnosis: string;   // AI 패턴 목록 텍스트
  ai_level: "낮음" | "보통" | "높음";
}

export interface HumanizeRewriteResult {
  rewritten_text: string;
}

export const projectsApi = {
  list: () => apiClient.get<ProjectListItem[]>("/projects").then((r) => r.data),

  get: (id: string) => apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (payload: ProjectCreatePayload) =>
    apiClient.post<Project>("/projects", payload).then((r) => r.data),

  update: (id: string, payload: Partial<ProjectCreatePayload> & { status?: ProjectStatus }) =>
    apiClient.put<Project>(`/projects/${id}`, payload).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/projects/${id}`),

  generateAnswer: (projectId: string, answerId: string) =>
    apiClient
      .post<Project>(`/projects/${projectId}/answers/${answerId}/generate`)
      .then((r) => r.data),

  reviseAnswer: (projectId: string, answerId: string, feedback: string) =>
    apiClient
      .post<Project>(`/projects/${projectId}/answers/${answerId}/revise`, null, { params: { feedback } })
      .then((r) => r.data),

  researchCompany: (projectId: string) =>
    apiClient.post<Project>(`/projects/${projectId}/research`).then((r) => r.data),

  // 유저 직접 수정 저장
  saveUserEdit: (projectId: string, answerId: string, editedText: string) =>
    apiClient
      .post<Project>(`/projects/${projectId}/answers/${answerId}/user-edit`, { edited_text: editedText })
      .then((r) => r.data),

  // AI 검토 의견
  aiReview: (projectId: string, answerId: string, currentText: string) =>
    apiClient
      .post<ReviewResponse>(`/projects/${projectId}/answers/${answerId}/ai-review`, { current_text: currentText })
      .then((r) => r.data),

  // AI 검토 의견 반영
  applyReview: (projectId: string, answerId: string, currentText: string, aiReview: string) =>
    apiClient
      .post<Project>(`/projects/${projectId}/answers/${answerId}/apply-review`, {
        current_text: currentText,
        ai_review: aiReview,
      })
      .then((r) => r.data),

  // 버전 이력
  getVersions: (projectId: string, answerId: string) =>
    apiClient
      .get<AnswerVersion[]>(`/projects/${projectId}/answers/${answerId}/versions`)
      .then((r) => r.data),

  // 프로필 갭 분석
  getGapAnalysis: (projectId: string) =>
    apiClient.get<GapAnalysis>(`/projects/${projectId}/gap-analysis`).then((r) => r.data),

  // AI 어투 감지
  humanizeDetect: (projectId: string, answerId: string, currentText: string) =>
    apiClient
      .post<HumanizeDetectResult>(`/projects/${projectId}/answers/${answerId}/humanize/detect`, { current_text: currentText })
      .then((r) => r.data),

  // AI 어투 제거 후 인간화 재작성
  humanizeRewrite: (projectId: string, answerId: string, currentText: string) =>
    apiClient
      .post<HumanizeRewriteResult>(`/projects/${projectId}/answers/${answerId}/humanize/rewrite`, { current_text: currentText })
      .then((r) => r.data),
};
