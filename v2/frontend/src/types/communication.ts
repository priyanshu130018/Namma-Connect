export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "booking" | "payment" | "collaboration" | "payout" | "system" | string;
  resource_type?: "booking" | "service" | "collaboration" | "payout" | null;
  resource_id?: string | null;
  is_read: boolean;
  created_at?: string | null;
}

export interface NotificationListResponseData {
  notifications: AppNotification[];
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at?: string | null;
}

export interface ConversationItem {
  id: string;
  participant_id: string;
  participant_name: string;
  subject?: string | null;
  last_message_text?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  created_at?: string | null;
}

export interface ConversationDetail {
  conversation: ConversationItem;
  messages: ChatMessage[];
}

export interface MessageSendPayload {
  conversation_id?: string;
  recipient_id?: string;
  content: string;
  subject?: string;
}
