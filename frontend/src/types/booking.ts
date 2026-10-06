export type BookingStatusType = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatusType = "PENDING" | "PAID" | "FAILED" | "PROCESSING";

export interface BookingItem {
  id: string;
  booking_code: string;
  customer_id: string;
  service_id: string;
  service_title: string;
  service_location: string;
  service_image: string;
  provider_name: string;
  provider_phone?: string;
  start_date: string;
  end_date?: string;
  time_slot_id?: string;
  time_slot_label?: string;
  guest_count: number;
  status: BookingStatusType;
  payment_status?: PaymentStatusType;
  unit_price: number;
  total_amount: number;
  special_requests?: string;
  is_cancellable?: boolean;
  refund_amount?: number;
  refund_status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "NOT_ELIGIBLE" | string;
  refund_code?: string;
  can_review?: boolean;
  has_reviewed?: boolean;
  created_at?: string;
}

export type Booking = BookingItem;

export interface BookingCreatePayload {
  service_id: string;
  start_date: string;
  end_date?: string;
  time_slot_id?: string;
  time_slot_label?: string;
  guest_count: number;
  special_requests?: string;
}

export interface BookingListResult {
  bookings: BookingItem[];
  total: number;
}

export interface ProviderBookingItem {
  id: string;
  booking_code: string;
  service_id: string;
  service_title: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_date: string;
  end_date?: string;
  time_slot_label?: string;
  guest_count: number;
  status: BookingStatusType;
  payment_status: PaymentStatusType;
  unit_price: number;
  total_amount: number;
  net_payout: number;
  is_cancellable?: boolean;
  refund_amount?: number;
  refund_status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "NOT_ELIGIBLE" | string;
  refund_code?: string;
  special_requests?: string;
  created_at?: string;
}

export interface ProviderBookingListResult {
  bookings: ProviderBookingItem[];
  total: number;
}

export interface ProviderBookingStatusPayload {
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
}
