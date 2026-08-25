export interface TicketReply {
  sender_name: string;
  sender_role: "customer" | "admin" | "agent" | string;
  message: string;
  created_at?: string | null;
}

export interface SupportTicket {
  id: string;
  ticket_code: string;
  user_id: string;
  user_name: string;
  user_email: string;
  booking_id?: string | null;
  category: "Booking" | "Payment" | "Cancellation" | "Refund" | "Account" | "Service" | "Other" | string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  responses: TicketReply[];
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
}

export interface SupportTicketListResponseData {
  tickets: SupportTicket[];
  total: number;
}

export interface CreateTicketPayload {
  category: string;
  subject: string;
  description: string;
  booking_id?: string;
}

export interface TicketReplyPayload {
  message: string;
}
