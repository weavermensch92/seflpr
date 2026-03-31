import { apiClient } from "./client";

export interface PointBalance {
  balance: number;
  user_id: string;
}

export interface PointTransaction {
  id: string;
  type: "CHARGE" | "CONSUME" | "REFUND" | "ADMIN_GRANT";
  amount: number;
  balance_after: number;
  reason: string;
  reference_id?: string;
  payment_id?: string;
  created_at: string;
}

export const pointsApi = {
  getBalance: () =>
    apiClient.get<PointBalance>("/points/balance").then((r) => r.data),

  getTransactions: (limit = 20, offset = 0) =>
    apiClient
      .get<PointTransaction[]>(`/points/transactions?limit=${limit}&offset=${offset}`)
      .then((r) => r.data),
};
