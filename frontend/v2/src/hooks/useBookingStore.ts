import { useSyncExternalStore } from "react";
import { bookingStore } from "@/services/bookingStore";

/**
 * Live view of the shared booking state (bookings, payments, notifications).
 * Re-renders the subscriber on every store mutation — this is what makes a
 * farmer accepting a booking instantly show up on the tourist dashboard.
 */
export function useBookingState() {
  return useSyncExternalStore(
    (cb) => bookingStore.subscribe(cb),
    () => bookingStore.getState(),
    () => bookingStore.getState(),
  );
}
