import { apiClient } from "./api-client";
import { ProviderEarningsResult, EarningsPeriod, ApiMessageResponse } from "@/types";

export async function getPartnerEarnings(
  period: EarningsPeriod = "30d"
): Promise<ProviderEarningsResult> {
  const response = await apiClient.get<ApiMessageResponse<ProviderEarningsResult>>(
    `/earnings/partner?period=${period}`
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to load provider earnings.");
  }
  return response.data.data;
}
