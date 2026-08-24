import { apiClient } from "./api-client";
import {
  PaymentOrderData,
  PaymentVerifyPayload,
  PaymentVerificationResult,
  ApiMessageResponse,
} from "@/types";

export async function createPaymentOrder(bookingId: string): Promise<PaymentOrderData> {
  const response = await apiClient.post<ApiMessageResponse<PaymentOrderData>>(
    "/payments/create-order",
    { booking_id: bookingId }
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to create payment order.");
  }
  return response.data.data;
}

export async function verifyPayment(
  payload: PaymentVerifyPayload
): Promise<PaymentVerificationResult> {
  const response = await apiClient.post<ApiMessageResponse<PaymentVerificationResult>>(
    "/payments/verify",
    payload
  );
  if (!response.data.data) {
    throw new Error(response.data.message || "Payment verification failed.");
  }
  return response.data.data;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
