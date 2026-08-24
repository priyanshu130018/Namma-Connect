export interface MarketplaceService {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  category_slug: string;
  location: string;
  district: string;
  state: string;
  price: number;
  unit: string;
  duration_hours?: number;
  max_capacity?: number;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
  status: string;
  provider_name: string;
  provider_type: string;
  provider_avatar?: string;
  primary_image: string;
  images: string[];
  inclusions: string[];
  amenities: string[];
  specific_details?: Record<string, any>;
  created_at?: string;
}

export interface ServiceReview {
  id: string;
  service_id: string;
  booking_id?: string;
  user_name: string;
  rating: number;
  comment: string;
  is_verified?: boolean;
  status?: string;
  created_at?: string;
}

export type ReviewItem = ServiceReview;

export interface ReviewCreatePayload {
  booking_id: string;
  rating: number;
  comment: string;
}

export interface ServiceDetailData {
  service: MarketplaceService;
  reviews: ServiceReview[];
}

export interface ServiceListResult {
  services: MarketplaceService[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
  location: string;
  type: string;
  text?: string;
  slug?: string;
}

export interface SearchResultData {
  query: string;
  results: MarketplaceService[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceFilterParams {
  category?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  sort_by?: string;
  page?: number;
  limit?: number;
  q?: string;
}

// ── Availability Types ──

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  capacity: number;
  remaining_capacity: number;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  is_available: boolean;
  status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "BLACKOUT" | string;
  price_override?: number;
  remaining_capacity?: number;
  time_slots: TimeSlot[];
}

export interface ServiceAvailabilityData {
  service_id: string;
  service_title: string;
  booking_model: "date_range" | "time_slot" | "single_date" | string;
  min_guests: number;
  max_guests: number;
  min_days_notice: number;
  max_days_advance: number;
  start_date: string;
  end_date: string;
  days: DayAvailability[];
  blackout_dates: string[];
}
