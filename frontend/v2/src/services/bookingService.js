/**
 * Booking service — mock implementation with endpoint structure.
 *
 * Endpoint mapping (swap internals for real HTTP calls later):
 *   GET  /bookings                     → list tourist bookings
 *   POST /bookings                     → create a booking (status: pending)
 *   GET  /bookings/:id                 → single booking
 *   POST /bookings/:id/cancel          → tourist cancels
 *   GET  /bookings/requests            → farmer booking requests
 *   POST /bookings/requests/:id/accept → farmer accepts (status: confirmed)
 *   POST /bookings/requests/:id/reject → farmer rejects (status: cancelled)
 *   POST /payments                     → pay for a booking
 *   GET  /payments                     → payment history
 *   POST /notifications/:id/read       → mark a notification read
 *   POST /notifications/read-all       → mark all read
 *
 * All methods delegate to the shared booking store, so state changes
 * propagate across dashboards, payments and notifications.
 */
import { bookingStore } from "./bookingStore";

export const bookingEndpoints = {
  list: "/bookings",
  detail: (id) => `/bookings/${id}`,
  cancel: (id) => `/bookings/${id}/cancel`,
  requests: "/bookings/requests",
  accept: (id) => `/bookings/requests/${id}/accept`,
  reject: (id) => `/bookings/requests/${id}/reject`,
  pay: "/payments",
  payments: "/payments",
};

export const bookingService = {
  /** GET /bookings — bookings belonging to the signed-in tourist */
  getBookings: async () => bookingStore.touristBookings(),

  /** GET /bookings/:id */
  getBooking: async (id) => bookingStore.findBooking(id) ?? null,

  /** POST /bookings — create a booking (status: pending, payment: unpaid) */
  createBooking: (payload) => bookingStore.createBooking(payload),

  /** POST /bookings/:id/cancel */
  cancelBooking: (id) => bookingStore.cancelBooking(id),

  /** GET /bookings/requests — all booking requests for the farmer */
  getRequests: async () => bookingStore.farmerRequests(),

  /** POST /bookings/requests/:id/accept */
  acceptRequest: (id) => bookingStore.acceptBooking(id),

  /** POST /bookings/requests/:id/reject */
  rejectRequest: (id) => bookingStore.rejectBooking(id),

  /** POST /bookings/requests/:id/reopen — undo a decision */
  reopenRequest: (id) => bookingStore.reopenBooking(id),

  /** POST /payments — simulate a successful payment for a booking */
  payBooking: (id, method) => bookingStore.payBooking(id, method),

  /** GET /payments — payment history */
  getPayments: async () => bookingStore.allPayments(),

  /** POST /notifications/:id/read */
  markNotificationRead: (id) => bookingStore.markNotificationRead(id),

  /** POST /notifications/read-all */
  markAllNotificationsRead: (role) => bookingStore.markAllNotificationsRead(role),
};

export default bookingService;
