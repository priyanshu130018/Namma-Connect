export type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface PayoutItem {
  id: string;
  payout_code: string;
  provider_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  beneficiary_name?: string;
  bank_account_last4?: string;
  ifsc_code?: string;
  failure_reason?: string;
  created_at?: string;
  processed_at?: string;
}

export interface ProviderPayoutSummary {
  available_balance: number;
  processing_balance: number;
  paid_out_balance: number;
  failed_balance: number;
  currency: string;
  payouts: PayoutItem[];
}

export interface PayoutRequestPayload {
  amount?: number;
  bank_account_last4?: string;
  ifsc_code?: string;
}
