# Resend Email Notifications

Namma Connect uses the **Resend** transactional email API to deliver welcome messages, reservation confirmations, and receipt updates to tourists, farmers, and creators.

---

## 🔌 SDK Integration & Fallback Mode

- **SDK**: `resend` Python package.
- **Config**: Loaded via `settings.RESEND_API_KEY` in `app/core/config.py`.
- **Local Fallback Mode**:
  - If no `RESEND_API_KEY` is present in the `.env` configuration file, the email service operates in **Mock Mode**.
  - It prints the destination, subject, and text payload directly to the standard output and returns a mock success status. This ensures that developers can run and test the application locally without needing live Resend API keys.

---

## 📩 Event Triggers

Emails are triggered on key business flow events:

1. **User Registration**:
   - Sent when a new account registers.
   - Body: Welcome message with platform instructions.
2. **Booking Created**:
   - Sent when a tourist creates a booking request.
   - Body: Confirmation that the booking is pending farmer approval.
3. **Booking Status Modification**:
   - Sent when a farmer accepts or rejects a booking.
   - Body: "Your booking is confirmed" or "Your booking was cancelled/rejected".
4. **Payment Success**:
   - Sent when a Razorpay checkout signature is verified or a `payment.captured` webhook event is received.
   - Body: Receipt details ("Thanks for traveling with us").
