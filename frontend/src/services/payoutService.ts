import { apiClient } from "./api-client";
import {
  ProviderPayoutSummary,
  PayoutItem,
  PayoutRequestPayload,
  ApiMessageResponse,
} from "@/types";

export async function getPartnerPayoutSummary(): Promise<ProviderPayoutSummary> {
  const response = await apiClient.get<ApiMessageResponse<ProviderPayoutSummary>>(
    "/payouts/partner"
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to load provider payout summary.");
  }
  return response.data.data;
}

export async function requestPartnerPayout(
  payload: PayoutRequestPayload = {}
): Promise<PayoutItem> {
  const response = await apiClient.post<ApiMessageResponse<PayoutItem>>(
    "/payouts/request",
    payload
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to process payout request.");
  }
  return response.data.data;
}

export async function getPartnerPayoutById(payoutId: string): Promise<PayoutItem> {
  const response = await apiClient.get<ApiMessageResponse<PayoutItem>>(
    `/payouts/${payoutId}`
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to load payout record.");
  }
  return response.data.data;
}
