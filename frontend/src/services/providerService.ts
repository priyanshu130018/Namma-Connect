import { apiClient } from "@/services/api-client";
import { ApiMessageResponse } from "@/types";

export interface ProviderProfile {
  id: string;
  email: string;
  full_name: string;
  mobile: string | null;
  role: string;
  is_verified: boolean;
  kyc_status: string;
  business_name: string | null;
  district: string | null;
  state: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  language: string | null;
  created_at: string | null;
}

export interface ProviderProfileUpdatePayload {
  full_name?: string;
  mobile?: string;
  bio?: string;
  location?: string;
  language?: string;
  theme_preference?: string;
}

export interface ProviderKYCDetails {
  application_code: string;
  role_type: string;
  full_name: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  state: string;
  business_name: string | null;
  id_type: string;
  id_number: string;
  status: string;
  rejection_reason?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
}

export interface ProviderDashboardSummary {
  provider_name: string;
  greeting: string;
  is_verified: boolean;
  badge_text: string;
  overview_cards: {
    total_bookings: { value: number; trend: string; target: string };
    total_earnings: { value: number; formatted: string; trend: string; target: string };
    active_listings: { value: number; total_listings: number; categories_represented: number; target: string };
    nc_score: { score: number; tier: string; review_count: number; target: string };
    pending_actions: { value: number; target: string };
  };
  action_required: {
    all_caught_up: boolean;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      target: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
  };
  booking_overview: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    recent_bookings: Array<{
      id: string;
      booking_code: string;
      service_id: string;
      service_name: string;
      service_image: string;
      customer_name: string;
      start_date: string;
      end_date: string;
      guest_count: number;
      total_amount: number;
      status: string;
      allowed_actions: string[];
    }>;
  };
  my_services: {
    top_services: Array<any>;
    total_count: number;
  };
  earnings_summary: {
    this_month: number;
    gross_revenue: number;
    platform_fee: number;
    total_earnings: number;
  };
}

export interface ProviderListing {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  category_slug?: string;
  location: string;
  district?: string;
  state?: string;
  price: number;
  unit: string;
  status: string;
  rating: number;
  reviews_count: number;
  primary_image?: string;
  images?: string[];
  inclusions?: string[];
  amenities?: string[];
  max_capacity?: number;
  created_at?: string;
}

export interface ProviderBookingItem {
  id: string;
  booking_code: string;
  service_id: string;
  service_title: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface AnalyticsOverview {
  period: string;
  total_bookings: number;
  confirmed_bookings?: number;
  completed_bookings?: number;
  cancelled_bookings?: number;
  total_revenue: number;
  gross_booking_value?: number;
  net_earnings: number;
  platform_fee?: number;
  commission_rate_percent?: number;
  provider_share_percent?: number;
  cancelled_amount?: number;
  occupancy_rate: number;
  avg_booking_value: number;
  conversion_rate: number;
  average_lead_time_days?: number;
}

export interface AnalyticsTrendSeries {
  period: string;
  labels: string[];
  series: Array<{
    name: string;
    type: "bar" | "line";
    data: number[];
  }>;
}

export interface BestServiceItem {
  id: string;
  title: string;
  category: string;
  bookings_count: number;
  revenue: number;
  rating: number;
  reviews_count: number;
  occupancy_percentage: number;
}

export interface AnalyticsDemand {
  peak_days: string[];
  peak_hours: string;
  top_demanded_categories: Array<{ category: string; demand_index: number }>;
  seasonality_insight: string;
}

export interface ListingAvailabilitySlot {
  id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_label: string;
  capacity: number;
  booked_count: number;
  remaining_capacity: number;
  is_blocked: boolean;
  price_override?: number | null;
  notes?: string | null;
}

export interface SetAvailabilityPayload {
  date?: string;
  dates?: string[];
  slots?: Array<{
    date: string;
    start_time?: string;
    end_time?: string;
    slot_label?: string;
    capacity?: number;
    price_override?: number;
    is_blocked?: boolean;
    notes?: string;
  }>;
  start_time?: string;
  end_time?: string;
  slot_label?: string;
  capacity?: number;
  price_override?: number;
  is_blocked?: boolean;
  notes?: string;
}

export interface ActionableRecommendation {
  id: string;
  type_code: string;
  recommendation_type: string;
  action_type: string;
  confidence: "LOW_DATA" | "SUFFICIENT_DATA" | "HIGH_CONFIDENCE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  priority_score: number;
  title: string;
  description: string;
  evidence: string;
  expected_impact: string;
  action_text: string;
  action_target: string;
  service_id?: string;
}

export interface ServiceAnalyticsReport {
  service_id: string;
  title: string;
  category: string;
  category_slug?: string;
  price: number;
  unit: string;
  status: string;
  rating: number;
  reviews_count: number;
  period: string;
  bookings: {
    total: number;
    confirmed: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  financials: {
    gross_booking_value: number;
    net_realized_earnings: number;
    platform_fee: number;
    cancelled_amount: number;
  };
  funnel: {
    impressions_views: number;
    detail_clicks: number;
    saves: number;
    bookings: number;
    conversion_rate_percent: number;
  };
  operations: {
    total_slots_scheduled: number;
    total_capacity: number;
    booked_guests: number;
    occupancy_rate: number;
    avg_lead_time_days: number;
  };
}

export interface ProviderEarningsReport {
  period: string;
  gross_booking_value: number;
  formatted_gmv: string;
  net_realized_earnings: number;
  formatted_net_earnings: string;
  platform_commission: number;
  cancelled_refunded_amount: number;
  pending_settlement_payout: number;
  commission_rate_percent: number;
  provider_share_percent: number;
  total_settled_transactions: number;
  daily_series: Array<{
    date: string;
    label: string;
    gmv: number;
    net_earnings: number;
    bookings_count: number;
  }>;
}

export interface ProviderInteractionsFunnel {
  period: string;
  funnel_steps: Array<{
    step: string;
    count: number;
    conversion_from_prev: number;
  }>;
  total_interactions: number;
  impressions: number;
  clicks: number;
  saves: number;
  bookings: number;
  overall_conversion_rate: number;
}

export interface ProviderBookingsReport {
  period: string;
  total_bookings: number;
  status_distribution: Record<string, number>;
  cancellation_rate_percent: number;
  average_group_size: number;
  average_lead_time_days: number;
  lead_time_distribution: Array<{
    bucket: string;
    count: number;
    percentage: number;
  }>;
}

export interface AnalyticsRecommendations {
  confidence_level?: "LOW_DATA" | "SUFFICIENT_DATA" | "HIGH_CONFIDENCE";
  data_sufficiency?: {
    bookings_count: number;
    interactions_count: number;
    confidence: string;
  };
  recommendations?: ActionableRecommendation[];
  smart_slots: Array<{
    day: string;
    recommended_time: string;
    demand_reason: string;
    expected_boost: string;
  }>;
  pricing_insight: {
    current_avg_price: number;
    recommended_price_range: string;
    advisory_note: string;
    has_action: boolean;
  };
  opportunities: Array<{
    id?: string;
    title: string;
    description: string;
    impact: string;
    target?: string;
    action_label?: string;
  }>;
}

export const providerService = {
  // Profile & KYC
  getProfile: async (): Promise<ProviderProfile> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderProfile>>("/provider/profile");
    return res.data.data;
  },

  updateProfile: async (payload: ProviderProfileUpdatePayload): Promise<ProviderProfile> => {
    const res = await apiClient.put<ApiMessageResponse<ProviderProfile>>("/provider/profile", payload);
    return res.data.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiMessageResponse<{ avatar_url: string }>>("/provider/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  getKYCDetails: async (): Promise<ProviderKYCDetails> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderKYCDetails>>("/provider/kyc");
    return res.data.data;
  },

  // Dashboard
  getDashboard: async (period: string = "30d"): Promise<ProviderDashboardSummary> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderDashboardSummary>>(`/provider/dashboard?period=${period}`);
    return res.data.data;
  },

  // Listings
  getListings: async (statusFilter?: string): Promise<ProviderListing[]> => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    const res = await apiClient.get<ApiMessageResponse<ProviderListing[]>>(`/provider/listings${query}`);
    return res.data.data;
  },

  getListingDetail: async (id: string): Promise<ProviderListing> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderListing>>(`/provider/listings/${id}`);
    return res.data.data;
  },

  createListing: async (payload: Partial<ProviderListing>): Promise<ProviderListing> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderListing>>("/provider/listings", payload);
    return res.data.data;
  },

  updateListing: async (id: string, payload: Partial<ProviderListing>): Promise<ProviderListing> => {
    const res = await apiClient.patch<ApiMessageResponse<ProviderListing>>(`/provider/listings/${id}`, payload);
    return res.data.data;
  },

  publishListing: async (id: string): Promise<{ id: string; status: string; is_verified: boolean }> => {
    const res = await apiClient.post<ApiMessageResponse<{ id: string; status: string; is_verified: boolean }>>(`/provider/listings/${id}/publish`);
    return res.data.data;
  },

  duplicateListing: async (id: string): Promise<{ id: string; title: string; status: string }> => {
    const res = await apiClient.post<ApiMessageResponse<{ id: string; title: string; status: string }>>(`/provider/listings/${id}/duplicate`);
    return res.data.data;
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/provider/listings/${id}`);
  },

  // Availability Management
  getListingAvailability: async (listingId: string): Promise<ListingAvailabilitySlot[]> => {
    const res = await apiClient.get<ApiMessageResponse<ListingAvailabilitySlot[]>>(`/provider/listings/${listingId}/availability`);
    return res.data.data;
  },

  setListingAvailability: async (
    listingId: string,
    payload: SetAvailabilityPayload
  ): Promise<{ service_id: string; slots_processed: number }> => {
    const res = await apiClient.post<ApiMessageResponse<{ service_id: string; slots_processed: number }>>(
      `/provider/listings/${listingId}/availability`,
      payload
    );
    return res.data.data;
  },

  deleteAvailabilitySlot: async (listingId: string, slotId: string): Promise<void> => {
    await apiClient.delete(`/provider/listings/${listingId}/availability/${slotId}`);
  },

  blockAvailabilityDate: async (
    listingId: string,
    payload: { date?: string; slot_id?: string; is_blocked: boolean }
  ): Promise<void> => {
    await apiClient.post(`/provider/listings/${listingId}/availability/block`, payload);
  },

  // Bookings
  getBookings: async (statusFilter?: string): Promise<ProviderBookingItem[]> => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    const res = await apiClient.get<ApiMessageResponse<ProviderBookingItem[]>>(`/provider/bookings${query}`);
    return res.data.data;
  },

  confirmBooking: async (id: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/provider/bookings/${id}/confirm`);
    return res.data.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/provider/bookings/${id}/cancel`, { reason });
    return res.data.data;
  },

  completeBooking: async (id: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/provider/bookings/${id}/complete`);
    return res.data.data;
  },

  // Analytics & Reports
  getAnalyticsOverview: async (period: string = "30d"): Promise<AnalyticsOverview> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsOverview>>(`/provider/analytics/overview?period=${period}`);
    return res.data.data;
  },

  getServiceAnalytics: async (serviceId: string, period: string = "30d"): Promise<ServiceAnalyticsReport> => {
    const res = await apiClient.get<ApiMessageResponse<ServiceAnalyticsReport>>(`/provider/analytics/service/${serviceId}?period=${period}`);
    return res.data.data;
  },

  getEarningsReport: async (period: string = "30d"): Promise<ProviderEarningsReport> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderEarningsReport>>(`/provider/analytics/earnings?period=${period}`);
    return res.data.data;
  },

  getInteractionsFunnel: async (period: string = "30d"): Promise<ProviderInteractionsFunnel> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderInteractionsFunnel>>(`/provider/analytics/interactions?period=${period}`);
    return res.data.data;
  },

  getBookingsReport: async (period: string = "30d"): Promise<ProviderBookingsReport> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderBookingsReport>>(`/provider/analytics/bookings-report?period=${period}`);
    return res.data.data;
  },

  getAnalyticsTrends: async (period: string = "30d"): Promise<AnalyticsTrendSeries> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsTrendSeries>>(`/provider/analytics/trends?period=${period}`);
    return res.data.data;
  },

  getBestServices: async (sortBy: string = "bookings"): Promise<BestServiceItem[]> => {
    const res = await apiClient.get<ApiMessageResponse<BestServiceItem[]>>(`/provider/analytics/best-services?sort_by=${sortBy}`);
    return res.data.data;
  },

  getDemandAnalysis: async (): Promise<AnalyticsDemand> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsDemand>>("/provider/analytics/demand");
    return res.data.data;
  },

  getRecommendations: async (): Promise<AnalyticsRecommendations> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsRecommendations>>("/provider/analytics/recommendations");
    return res.data.data;
  },

  getExportUrl: (period: string = "30d"): string => {
    const baseURL = apiClient.defaults.baseURL || "/api/v2";
    return `${baseURL}/provider/analytics/export?period=${period}`;
  },
};

