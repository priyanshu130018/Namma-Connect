import { apiClient } from "./api-client";
import { ApiMessageResponse } from "@/types";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
  suggested_services?: any[];
}

export interface TravelChatRequest {
  conversation_id?: string;
  message: string;
  destination?: string;
  category?: string;
  language?: string;
}

export interface TravelChatResponse {
  conversation_id: string;
  reply: string;
  suggested_services?: any[];
  source?: string;
}

export async function sendTravelChatMessage(
  data: TravelChatRequest
): Promise<ApiMessageResponse<TravelChatResponse>> {
  const response = await apiClient.post<ApiMessageResponse<TravelChatResponse>>(
    "/ai/travel/chat",
    data
  );
  return response.data;
}

export async function getTravelConversations(): Promise<ApiMessageResponse> {
  const response = await apiClient.get<ApiMessageResponse>("/ai/travel/conversations");
  return response.data;
}
