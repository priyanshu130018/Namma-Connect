import { apiClient } from "@/services/api-client";
import { MarketplaceService, ApiMessageResponse } from "@/types";

export interface CreateServicePayload {
  title: string;
  provider_type?: string;
  category: string;
  category_slug?: string;
  price: number;
  unit: string;
  location: string;
  district?: string;
  state?: string;
  description: string;
  duration_hours?: number;
  max_capacity?: number;
  capacity?: number; // legacy alias
  primary_image?: string;
  images?: string[];
  inclusions?: string[];
  amenities?: string[];
  status?: string;
  specific_details?: Record<string, any>;
}

export interface UpdateServicePayload {
  title?: string;
  price?: number;
  unit?: string;
  category?: string;
  category_slug?: string;
  location?: string;
  district?: string;
  state?: string;
  description?: string;
  duration_hours?: number;
  max_capacity?: number;
  capacity?: number;
  primary_image?: string;
  images?: string[];
  inclusions?: string[];
  amenities?: string[];
  status?: string;
  specific_details?: Record<string, any>;
}

export async function getPartnerServices(): Promise<MarketplaceService[]> {
  const response = await apiClient.get<ApiMessageResponse<MarketplaceService[]>>("/services/partner/me");
  return response.data.data;
}

export async function getPartnerServiceById(serviceId: string): Promise<MarketplaceService> {
  const response = await apiClient.get<ApiMessageResponse<MarketplaceService>>(`/services/partner/${serviceId}`);
  return response.data.data;
}

export async function createPartnerService(payload: CreateServicePayload): Promise<MarketplaceService> {
  const reqPayload = {
    ...payload,
    max_capacity: payload.max_capacity ?? payload.capacity ?? 10,
  };
  const response = await apiClient.post<ApiMessageResponse<MarketplaceService>>("/services", reqPayload);
  return response.data.data;
}

export async function updatePartnerService(
  serviceId: string,
  payload: UpdateServicePayload
): Promise<MarketplaceService> {
  const reqPayload = {
    ...payload,
    max_capacity: payload.max_capacity ?? payload.capacity,
  };
  const response = await apiClient.put<ApiMessageResponse<MarketplaceService>>(
    `/services/partner/${serviceId}`,
    reqPayload
  );
  return response.data.data;
}

export async function submitPartnerServiceForReview(serviceId: string): Promise<MarketplaceService> {
  const response = await apiClient.post<ApiMessageResponse<MarketplaceService>>(
    `/services/partner/${serviceId}/submit-review`
  );
  return response.data.data;
}

// ── Legacy Aliases ──
export const fetchPartnerServices = getPartnerServices;
export const fetchPartnerServiceById = getPartnerServiceById;

export async function fetchPartnerBookings(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<any[]>(`/bookings/partner${query}`);
}

export async function fetchPartnerBookingById(bookingId: string) {
  return apiClient.get<any>(`/bookings/partner/${bookingId}`);
}

export async function submitVerificationChangeRequest(payload: {
  field: string;
  requested_value: string;
  reason: string;
}) {
  return apiClient.post<any>("/partner/profile/change-request", payload);
}
