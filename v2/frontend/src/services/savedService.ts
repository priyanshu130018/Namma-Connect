import { apiClient } from "./api-client";
import { MarketplaceService, ApiMessageResponse } from "@/types";

export interface SavedServiceListResult {
  services: MarketplaceService[];
  total: number;
}

export interface SavedStatusResult {
  is_saved: boolean;
  service_id: string;
}

export async function getSavedServices(): Promise<MarketplaceService[]> {
  const response = await apiClient.get<ApiMessageResponse<SavedServiceListResult>>("/users/me/saved");
  return response.data.data?.services || [];
}

export async function saveService(serviceId: string): Promise<boolean> {
  const response = await apiClient.post<ApiMessageResponse<SavedStatusResult>>(`/services/${serviceId}/save`);
  return response.data.data?.is_saved ?? true;
}

export async function removeSavedService(serviceId: string): Promise<boolean> {
  const response = await apiClient.delete<ApiMessageResponse<SavedStatusResult>>(`/services/${serviceId}/save`);
  return response.data.data?.is_saved ?? false;
}

export async function getSavedStatus(serviceId: string): Promise<boolean> {
  try {
    const response = await apiClient.get<ApiMessageResponse<SavedStatusResult>>(`/services/${serviceId}/save-status`);
    return response.data.data?.is_saved ?? false;
  } catch {
    return false;
  }
}
