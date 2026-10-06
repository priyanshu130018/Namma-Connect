export type EarningsPeriod = "7d" | "30d" | "1y";

export interface EarningsDataPoint {
  date: string;
  amount: number;
  bookings_count: number;
}

export interface ProviderEarningsResult {
  period: EarningsPeriod;
  total_earnings: number;
  gross_revenue: number;
  platform_fee: number;
  currency: string;
  booking_count: number;
  data: EarningsDataPoint[];
}
