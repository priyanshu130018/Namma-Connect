export interface AdminOverviewData {
  total_users: number;
  total_partners: number;
  pending_verifications: number;
  published_services: number;
  total_bookings: number;
  total_revenue: number;
  pending_payouts: number;
  open_support_tickets: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string | null;
}

export interface AdminPartnerVerificationPayload {
  action: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  notes?: string;
}

export interface AdminServiceStatusPayload {
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED" | "REJECTED";
}

export interface AdminPayoutStatusPayload {
  status: "COMPLETED" | "FAILED" | "PROCESSING";
  failure_reason?: string;
}

export interface AdminPaymentAuditItem {
  id: string;
  booking_id: string;
  customer_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  created_at?: string | null;
}

export interface AdminSupportTicketItem {
  id: string;
  user_email: string;
  user_name: string;
  subject: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  created_at?: string | null;
}

export interface AdminPlatformSettings {
  platform_name: string;
  commission_rate: number;
  currency: string;
  environment: string;
  is_maintenance_mode: boolean;
  support_email: string;
}
