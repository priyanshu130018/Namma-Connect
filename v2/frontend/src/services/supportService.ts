import { apiClient } from "@/services/api-client";
import {
  SupportTicket,
  SupportTicketListResponseData,
  CreateTicketPayload,
  ApiMessageResponse,
} from "@/types";

export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  const response = await apiClient.post<ApiMessageResponse<SupportTicket>>(
    "/support/tickets",
    payload
  );
  return response.data.data;
}

export async function getMySupportTickets(): Promise<SupportTicketListResponseData> {
  const response = await apiClient.get<ApiMessageResponse<SupportTicketListResponseData>>(
    "/support/tickets"
  );
  return response.data.data;
}

export async function getSupportTicketDetail(ticketId: string): Promise<SupportTicket> {
  const response = await apiClient.get<ApiMessageResponse<SupportTicket>>(
    `/support/tickets/${ticketId}`
  );
  return response.data.data;
}

export async function replySupportTicket(
  ticketId: string,
  message: string
): Promise<SupportTicket> {
  const response = await apiClient.post<ApiMessageResponse<SupportTicket>>(
    `/support/tickets/${ticketId}/reply`,
    { message }
  );
  return response.data.data;
}
