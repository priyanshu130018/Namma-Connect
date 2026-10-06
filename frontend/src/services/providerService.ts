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
  total_revenue: number;
  net_earnings: number;
  occupancy_rate: number;
  avg_booking_value: number;
  conversion_rate: number;
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

export interface AnalyticsRecommendations {
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
    title: string;
    description: string;
    impact: string;
  }>;
}

export const providerService = {
  // Profile & KYC
  getProfile: async (): Promise<ProviderProfile> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderProfile>>("/v2/provider/profile");
    return res.data.data;
  },

  updateProfile: async (payload: ProviderProfileUpdatePayload): Promise<ProviderProfile> => {
    const res = await apiClient.put<ApiMessageResponse<ProviderProfile>>("/v2/provider/profile", payload);
    return res.data.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiMessageResponse<{ avatar_url: string }>>("/v2/provider/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  getKYCDetails: async (): Promise<ProviderKYCDetails> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderKYCDetails>>("/v2/provider/kyc");
    return res.data.data;
  },

  // Dashboard
  getDashboard: async (period: string = "30d"): Promise<ProviderDashboardSummary> => {
    const res = await apiClient.get<ApiMessageResponse<ProviderDashboardSummary>>(`/v2/provider/dashboard?period=${period}`);
    return res.data.data;
  },

  // Listings
  getListings: async (statusFilter?: string): Promise<ProviderListing[]> => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    const res = await apiClient.get<ApiMessageResponse<ProviderListing[]>>(`/v2/provider/listings${query}`);
    return res.data.data;
  },

  createListing: async (payload: Partial<ProviderListing>): Promise<ProviderListing> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderListing>>("/v2/provider/listings", payload);
    return res.data.data;
  },

  updateListing: async (id: string, payload: Partial<ProviderListing>): Promise<ProviderListing> => {
    const res = await apiClient.patch<ApiMessageResponse<ProviderListing>>(`/v2/provider/listings/${id}`, payload);
    return res.data.data;
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/v2/provider/listings/${id}`);
  },

  // Bookings
  getBookings: async (statusFilter?: string): Promise<ProviderBookingItem[]> => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    const res = await apiClient.get<ApiMessageResponse<ProviderBookingItem[]>>(`/v2/provider/bookings${query}`);
    return res.data.data;
  },

  confirmBooking: async (id: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/v2/provider/bookings/${id}/confirm`);
    return res.data.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/v2/provider/bookings/${id}/cancel`, { reason });
    return res.data.data;
  },

  completeBooking: async (id: string): Promise<ProviderBookingItem> => {
    const res = await apiClient.post<ApiMessageResponse<ProviderBookingItem>>(`/v2/provider/bookings/${id}/complete`);
    return res.data.data;
  },

  // Analytics
  getAnalyticsOverview: async (period: string = "30d"): Promise<AnalyticsOverview> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsOverview>>(`/v2/provider/analytics/overview?period=${period}`);
    return res.data.data;
  },

  getAnalyticsTrends: async (period: string = "30d"): Promise<AnalyticsTrendSeries> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsTrendSeries>>(`/v2/provider/analytics/trends?period=${period}`);
    return res.data.data;
  },

  getBestServices: async (sortBy: string = "bookings"): Promise<BestServiceItem[]> => {
    const res = await apiClient.get<ApiMessageResponse<BestServiceItem[]>>(`/v2/provider/analytics/best-services?sort_by=${sortBy}`);
    return res.data.data;
  },

  getDemandAnalysis: async (): Promise<AnalyticsDemand> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsDemand>>("/v2/provider/analytics/demand");
    return res.data.data;
  },

  getRecommendations: async (): Promise<AnalyticsRecommendations> => {
    const res = await apiClient.get<ApiMessageResponse<AnalyticsRecommendations>>("/v2/provider/analytics/recommendations");
    return res.data.data;
  },

  getExportUrl: (period: string = "30d"): string => {
    const baseURL = apiClient.defaults.baseURL || "/api";
    return `${baseURL}/v2/provider/analytics/export?period=${period}`;
  },
};
