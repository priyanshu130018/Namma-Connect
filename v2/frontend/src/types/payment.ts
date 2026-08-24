export interface PaymentOrderData {
  order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string;
  booking_id: string;
  booking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  service_title: string;
}

export interface PaymentVerifyPayload {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  message: string;
  booking_id: string;
  booking_code: string;
  status: string;
  payment_id: string;
  amount: number;
  verified_at?: string;
}
