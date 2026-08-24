import { apiClient } from "@/services/api-client";
import {
  AppNotification,
  NotificationListResponseData,
  ConversationItem,
  ConversationDetail,
  ChatMessage,
  MessageSendPayload,
  ApiMessageResponse,
} from "@/types";

export async function getNotifications(): Promise<NotificationListResponseData> {
  const response = await apiClient.get<ApiMessageResponse<NotificationListResponseData>>(
    "/notifications"
  );
  return response.data.data;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const response = await apiClient.post<ApiMessageResponse<AppNotification>>(
    `/notifications/${notificationId}/read`
  );
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<{ marked_count: number }> {
  const response = await apiClient.post<ApiMessageResponse<{ marked_count: number }>>(
    "/notifications/read-all"
  );
  return response.data.data;
}

export async function getConversations(): Promise<ConversationItem[]> {
  const response = await apiClient.get<ApiMessageResponse<ConversationItem[]>>(
    "/messages/conversations"
  );
  return response.data.data;
}

export async function getConversationThread(conversationId: string): Promise<ConversationDetail> {
  const response = await apiClient.get<ApiMessageResponse<ConversationDetail>>(
    `/messages/conversations/${conversationId}`
  );
  return response.data.data;
}

export async function sendMessage(payload: MessageSendPayload): Promise<ChatMessage> {
  const response = await apiClient.post<ApiMessageResponse<ChatMessage>>(
    "/messages/send",
    payload
  );
  return response.data.data;
}
