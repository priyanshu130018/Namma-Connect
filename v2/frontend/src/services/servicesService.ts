import { apiClient } from "./api-client";
import { ApiMessageResponse, Booking, Service } from "@/types";

export async function fetchServices(category?: string): Promise<ApiMessageResponse<{ services: Service[] }>> {
  const url = category ? `/services?category=${encodeURIComponent(category)}` : "/services";
  const response = await apiClient.get<ApiMessageResponse<{ services: Service[] }>>(url);
  return response.data;
}

export async function fetchServiceById(id: string): Promise<ApiMessageResponse<{ service: Service }>> {
  const response = await apiClient.get<ApiMessageResponse<{ service: Service }>>(`/services/${id}`);
  return response.data;
}

export async function fetchBookings(): Promise<ApiMessageResponse<{ bookings: Booking[] }>> {
  const response = await apiClient.get<ApiMessageResponse<{ bookings: Booking[] }>>("/bookings");
  return response.data;
}

export async function fetchBookingById(id: string): Promise<ApiMessageResponse<{ booking: Booking }>> {
  const response = await apiClient.get<ApiMessageResponse<{ booking: Booking }>>(`/bookings/${id}`);
  return response.data;
}
