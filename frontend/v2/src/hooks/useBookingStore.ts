import { useState } from "react";

/** 
 * Compatibility shim — real data now fetched directly via API.
 * Components using this hook should migrate to direct API calls.
 */
export function useBookingState() {
  const [state] = useState({ bookings: [], payments: [], notifications: [] });
  return state;
}
