# Razorpay Payment Integration

Namma Connect integrates the Razorpay API to process booking transactions securely. 

---

## 💸 Payment Flow Sequence

The integration follows a secure, dual-verification payment cycle:

```
[ Frontend ] ──> POST /payments/create-order ──> [ Backend ] ──> Create Razorpay Order
                                                                     │
                                                                     ▼
[ Frontend ] ──<──── Return Order ID & Key ────────<─────────────────┘
     │
     ▼  (User pays via Razorpay Checkout Modal)
     │
[ Frontend ] ──> POST /payments/verify (Client check) ───────> [ Backend ] ──> Update status to "paid"
                                                                     │
                                                                     ▼
[ Razorpay Webhook ] ──> POST /webhook/razorpay (Async check) ─> [ Backend ] ──> Final DB verification
```

1. **Create Order**: The frontend requests order details. The backend creates a Razorpay order in INR (amount is converted to paise: `amount * 100`) and returns the order ID.
2. **Checkout Modal**: The frontend launches the Razorpay checkout overlay. Once completed, Razorpay returns a `razorpay_payment_id` and a cryptographic `razorpay_signature`.
3. **Verify Payment**:
   - The frontend passes these parameters to `POST /payments/verify`.
   - The backend validates the signature using the `RAZORPAY_SECRET` to verify authenticity.
   - If verified, the booking's `payment_status` is updated to `"paid"`.
4. **Payment Webhook (Backup/Async Verification)**:
   - For cases where the user closes the browser tab before the verification API finishes, Razorpay sends a webhook directly to the backend.
   - Route `POST /webhook/razorpay` verifies the header `x-razorpay-signature` and handles `payment.captured` and `payment.failed` events to update booking states.

---

## 🗃️ Booking Payment Mapping

- Stays start with `payment_status = "unpaid"`.
- Successful verification logs the transaction inside the `payments` table and updates `payment_status` to `"paid"`.
- Failed transactions update the field to `"failed"`.
