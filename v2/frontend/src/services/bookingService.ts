import { apiClient } from "./api-client";
import {
  BookingItem,
  BookingCreatePayload,
  BookingListResult,
  ProviderBookingItem,
  ProviderBookingListResult,
  ApiMessageResponse,
} from "@/types";

export async function createBooking(payload: BookingCreatePayload): Promise<BookingItem> {
  const response = await apiClient.post<ApiMessageResponse<BookingItem>>("/bookings", payload);
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to create booking reservation.");
  }
  return response.data.data;
}

export async function getCustomerBookings(): Promise<BookingListResult> {
  const response = await apiClient.get<ApiMessageResponse<BookingListResult>>("/bookings/me");
  return response.data.data || { bookings: [], total: 0 };
}

export async function getBookingById(bookingId: string): Promise<BookingItem> {
  const response = await apiClient.get<ApiMessageResponse<BookingItem>>(`/bookings/${bookingId}`);
  if (!response.data.data) {
    throw new Error(response.data.message || "Booking reservation was not found.");
  }
  return response.data.data;
}

export async function cancelBooking(bookingId: string): Promise<BookingItem> {
  const response = await apiClient.post<ApiMessageResponse<BookingItem>>(`/bookings/${bookingId}/cancel`);
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to cancel booking reservation.");
  }
  return response.data.data;
}

export async function getPartnerBookings(): Promise<ProviderBookingListResult> {
  const response = await apiClient.get<ApiMessageResponse<ProviderBookingListResult>>("/bookings/partner");
  return response.data.data || { bookings: [], total: 0 };
}

export async function getPartnerBookingById(bookingId: string): Promise<ProviderBookingItem> {
  const response = await apiClient.get<ApiMessageResponse<ProviderBookingItem>>(`/bookings/partner/${bookingId}`);
  if (!response.data.data) {
    throw new Error(response.data.message || "Provider reservation was not found.");
  }
  return response.data.data;
}

export async function updatePartnerBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED"
): Promise<ProviderBookingItem> {
  const response = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(
    `/bookings/partner/${bookingId}/status`,
    { status }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to update reservation status.");
  }
  return response.data.data;
}
