import { apiClient } from "./api-client";
import {
  AdminOverviewData,
  AdminUserItem,
  AdminPartnerVerificationPayload,
  AdminServiceStatusPayload,
  AdminPayoutStatusPayload,
  AdminPaymentAuditItem,
  AdminSupportTicketItem,
  AdminPlatformSettings,
  ServiceItem,
  ProviderBookingItem,
  PayoutItem,
} from "@/types";
import { PartnerApplicationData } from "./partnerApplicationService";

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const response = await apiClient.get<{ success: boolean; data: AdminOverviewData }>("/admin/overview");
  return response.data.data;
}

export async function getAdminUsers(params?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUserItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.append("role", params.role);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/users?${queryStr}` : "/admin/users";
  const response = await apiClient.get<{ success: boolean; data: AdminUserItem[] }>(url);
  return response.data.data;
}

export async function getAdminPartners(): Promise<AdminUserItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AdminUserItem[] }>("/admin/partners");
  return response.data.data;
}

export async function getAdminVerificationQueue(): Promise<AdminUserItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AdminUserItem[] }>("/admin/partners/verification");
  return response.data.data;
}

export async function verifyAdminPartner(
  userId: string,
  payload: AdminPartnerVerificationPayload
): Promise<AdminUserItem> {
  const response = await apiClient.post<{ success: boolean; data: AdminUserItem }>(
    `/admin/partners/${userId}/verify`,
    payload
  );
  return response.data.data;
}

export async function getAdminServices(params?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<ServiceItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append("status", params.status);
  if (params?.category) searchParams.append("category", params.category);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/services?${queryStr}` : "/admin/services";
  const response = await apiClient.get<{ success: boolean; data: ServiceItem[] }>(url);
  return response.data.data;
}

export async function updateAdminServiceStatus(
  serviceId: string,
  payload: AdminServiceStatusPayload
): Promise<ServiceItem> {
  const response = await apiClient.post<{ success: boolean; data: ServiceItem }>(
    `/admin/services/${serviceId}/status`,
    payload
  );
  return response.data.data;
}

export async function getAdminBookings(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ProviderBookingItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append("status", params.status);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/bookings?${queryStr}` : "/admin/bookings";
  const response = await apiClient.get<{ success: boolean; data: ProviderBookingItem[] }>(url);
  return response.data.data;
}

export async function getAdminPayments(params?: {
  limit?: number;
  offset?: number;
}): Promise<AdminPaymentAuditItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/payments?${queryStr}` : "/admin/payments";
  const response = await apiClient.get<{ success: boolean; data: AdminPaymentAuditItem[] }>(url);
  return response.data.data;
}

export async function getAdminPayouts(params?: {
  limit?: number;
  offset?: number;
}): Promise<PayoutItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/payouts?${queryStr}` : "/admin/payouts";
  const response = await apiClient.get<{ success: boolean; data: PayoutItem[] }>(url);
  return response.data.data;
}

export async function updateAdminPayoutStatus(
  payoutId: string,
  payload: AdminPayoutStatusPayload
): Promise<PayoutItem> {
  const response = await apiClient.post<{ success: boolean; data: PayoutItem }>(
    `/admin/payouts/${payoutId}/status`,
    payload
  );
  return response.data.data;
}

export async function getAdminSupportTickets(): Promise<AdminSupportTicketItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AdminSupportTicketItem[] }>("/admin/support");
  return response.data.data;
}

export async function getAdminSettings(): Promise<AdminPlatformSettings> {
  const response = await apiClient.get<{ success: boolean; data: AdminPlatformSettings }>("/admin/settings");
  return response.data.data;
}

export async function getAdminPartnerApplications(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PartnerApplicationData[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append("status", params.status);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? `/admin/partner-applications?${queryStr}` : "/admin/partner-applications";
  const response = await apiClient.get<{ success: boolean; data: PartnerApplicationData[] }>(url);
  return response.data.data;
}

export async function getAdminPartnerApplicationDetail(appId: string): Promise<PartnerApplicationData> {
  const response = await apiClient.get<{ success: boolean; data: PartnerApplicationData }>(
    `/admin/partner-applications/${appId}`
  );
  return response.data.data;
}

export async function approveAdminPartnerApplication(appId: string): Promise<PartnerApplicationData> {
  const response = await apiClient.post<{ success: boolean; data: PartnerApplicationData }>(
    `/admin/partner-applications/${appId}/approve`
  );
  return response.data.data;
}

export async function rejectAdminPartnerApplication(
  appId: string,
  rejectionReason: string
): Promise<PartnerApplicationData> {
  const response = await apiClient.post<{ success: boolean; data: PartnerApplicationData }>(
    `/admin/partner-applications/${appId}/reject`,
    { rejection_reason: rejectionReason }
  );
  return response.data.data;
}

export async function getAdminServiceDetail(serviceId: string): Promise<ServiceItem> {
  const response = await apiClient.get<{ success: boolean; data: ServiceItem }>(
    `/admin/services/${serviceId}`
  );
  return response.data.data;
}

export async function approveAdminService(serviceId: string): Promise<ServiceItem> {
  const response = await apiClient.post<{ success: boolean; data: ServiceItem }>(
    `/admin/services/${serviceId}/approve`
  );
  return response.data.data;
}

export async function rejectAdminService(
  serviceId: string,
  rejectionReason: string
): Promise<ServiceItem> {
  const response = await apiClient.post<{ success: boolean; data: ServiceItem }>(
    `/admin/services/${serviceId}/reject`,
    { rejection_reason: rejectionReason }
  );
  return response.data.data;
}

export async function removeAdminService(
  serviceId: string,
  removalReason: string
): Promise<ServiceItem> {
  const response = await apiClient.post<{ success: boolean; data: ServiceItem }>(
    `/admin/services/${serviceId}/remove`,
    { removal_reason: removalReason }
  );
  return response.data.data;
}

export async function blockAdminProvider(
  providerId: string,
  reason: string
): Promise<AdminUserItem> {
  const response = await apiClient.post<{ success: boolean; data: AdminUserItem }>(
    `/admin/providers/${providerId}/block`,
    { reason }
  );
  return response.data.data;
}

export async function unblockAdminProvider(providerId: string): Promise<AdminUserItem> {
  const response = await apiClient.post<{ success: boolean; data: AdminUserItem }>(
    `/admin/providers/${providerId}/unblock`
  );
  return response.data.data;
}
