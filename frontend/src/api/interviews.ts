import { apiClient } from "./client";

export interface InterviewAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  ai_feedback?: string;
  study_recommendations?: { topic: string; description: string }[];
  reference_links?: { url: string; title: string; excerpt: string }[];
  attempt_number: number;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  question_number: number;
  question_type: "resume" | "values" | "technical" | "situational";
  question_text: string;
  hint_text?: string;
  reference_links?: { url: string; title: string; excerpt: string }[];
  is_follow_up: boolean;
  parent_question_id?: string;
  points_consumed: number;
  follow_up_count: number;
  answers: InterviewAnswer[];
  created_at: string;
}

export interface InterviewSession {
  id: string;
  project_id: string;
  user_id: string;
  status: "generating" | "ready" | "in_progress" | "done";
  total_questions: number;
  total_follow_ups: number;
  total_points_spent: number;
  created_at: string;
  completed_at?: string;
  questions: InterviewQuestion[];
  company_name?: string;
  position?: string;
}

export interface InterviewSessionListItem {
  id: string;
  project_id: string;
  status: string;
  total_questions: number;
  total_points_spent: number;
  created_at: string;
  completed_at?: string;
  company_name?: string;
  position?: string;
}

export interface SessionSummary {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
  study_plan: { topic: string; description: string }[];
  question_scores: { question: string; score: number; summary: string }[];
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  resume: "자소서 기반",
  values: "가치관",
  technical: "기술/직무",
  situational: "상황 대처",
};

export const interviewApi = {
  startSession: (projectId: string) =>
    apiClient
      .post<InterviewSession>(`/projects/${projectId}/interviews`, {})
      .then((r) => r.data),

  listSessions: (projectId: string) =>
    apiClient
      .get<InterviewSessionListItem[]>(`/projects/${projectId}/interviews`)
      .then((r) => r.data),

  getSession: (projectId: string, sessionId: string) =>
    apiClient
      .get<InterviewSession>(`/projects/${projectId}/interviews/${sessionId}`)
      .then((r) => r.data),

  submitAnswer: (projectId: string, sessionId: string, questionId: string, answerText: string) =>
    apiClient
      .post<InterviewAnswer>(`/projects/${projectId}/interviews/${sessionId}/answer`, {
        question_id: questionId,
        answer_text: answerText,
      })
      .then((r) => r.data),

  requestFollowUp: (projectId: string, sessionId: string, parentQuestionId: string) =>
    apiClient
      .post<InterviewQuestion>(`/projects/${projectId}/interviews/${sessionId}/follow-up`, {
        parent_question_id: parentQuestionId,
      })
      .then((r) => r.data),

  requestNewQuestion: (projectId: string, sessionId: string) =>
    apiClient
      .post<InterviewQuestion>(`/projects/${projectId}/interviews/${sessionId}/new-question`)
      .then((r) => r.data),

  completeSession: (projectId: string, sessionId: string) =>
    apiClient
      .post<SessionSummary>(`/projects/${projectId}/interviews/${sessionId}/complete`)
      .then((r) => r.data),
};
