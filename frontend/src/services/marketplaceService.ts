import { apiClient } from "./api-client";
import {
  MarketplaceService,
  ServiceListResult,
  ServiceDetailData,
  ServiceReview,
  ReviewCreatePayload,
  SearchResultData,
  SearchSuggestion,
  ServiceFilterParams,
  ServiceAvailabilityData,
  ApiMessageResponse,
} from "@/types";

export async function getMarketplaceServices(
  params?: ServiceFilterParams
): Promise<ServiceListResult> {
  const response = await apiClient.get<ApiMessageResponse<ServiceListResult>>("/services", {
    params: {
      category: params?.category && params.category !== "all" ? params.category : undefined,
      location: params?.location || undefined,
      q: params?.q || undefined,
      min_price: params?.min_price || undefined,
      max_price: params?.max_price || undefined,
      min_rating: params?.min_rating || undefined,
      sort_by: params?.sort_by || "rating",
      page: params?.page || 1,
      limit: params?.limit || 12,
    },
  });
  return response.data.data || { services: [], total: 0, page: 1, limit: 12, total_pages: 1 };
}

export async function getServiceDetail(serviceId: string): Promise<ServiceDetailData> {
  const response = await apiClient.get<ApiMessageResponse<ServiceDetailData>>(`/services/${serviceId}`);
  if (!response.data.data) {
    throw new Error("Service detail not found");
  }
  return response.data.data;
}

export async function getServiceReviews(serviceId: string): Promise<ServiceReview[]> {
  const response = await apiClient.get<ApiMessageResponse<ServiceReview[]>>(`/services/${serviceId}/reviews`);
  return response.data.data || [];
}

export async function submitReview(serviceId: string, payload: ReviewCreatePayload): Promise<ServiceReview> {
  const response = await apiClient.post<ApiMessageResponse<ServiceReview>>(`/services/${serviceId}/reviews`, payload);
  if (!response.data.data) {
    throw new Error(response.data.message || "Failed to submit customer review.");
  }
  return response.data.data;
}

export async function getServiceAvailability(
  serviceId: string,
  month?: number,
  year?: number
): Promise<ServiceAvailabilityData> {
  const response = await apiClient.get<ApiMessageResponse<ServiceAvailabilityData>>(
    `/services/${serviceId}/availability`,
    {
      params: {
        month: month || undefined,
        year: year || undefined,
      },
    }
  );
  if (!response.data.data) {
    throw new Error("Service availability data not found");
  }
  return response.data.data;
}

export async function searchServices(
  query: string,
  category?: string,
  location?: string,
  page: number = 1,
  limit: number = 12
): Promise<SearchResultData> {
  const response = await apiClient.get<ApiMessageResponse<SearchResultData>>("/search", {
    params: {
      q: query,
      category: category && category !== "all" ? category : undefined,
      location: location || undefined,
      page,
      limit,
    },
  });
  return response.data.data || { query, results: [], total: 0, page: 1, limit: 12 };
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const response = await apiClient.get<ApiMessageResponse<{ query: string; suggestions: SearchSuggestion[] }>>(
    "/search/suggestions",
    {
      params: { q: query.trim() },
    }
  );
  return response.data.data?.suggestions || [];
}

export async function getRecentSearches(): Promise<string[]> {
  try {
    const response = await apiClient.get<ApiMessageResponse<string[]>>("/search/recent");
    return response.data.data || [];
  } catch {
    return [];
  }
}

export interface ExploreCategory {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  sort_order?: number;
}

export interface BecauseYouVisitedData {
  context: string;
  source_service_id?: string;
  source_title?: string;
  items: MarketplaceService[];
}

export interface ExploreFeedData {
  categories: ExploreCategory[];
  active_sections: string[];
  nearby_places?: MarketplaceService[];
  because_you_visited?: BecauseYouVisitedData;
  personalized_for_you?: MarketplaceService[];
  top_and_most_visited: MarketplaceService[];
  user_signals: {
    is_authenticated: boolean;
    has_location: boolean;
    location?: string;
    has_history: boolean;
    has_preferences: boolean;
    interaction_count: number;
    is_cold_start: boolean;
    has_sufficient_personalization: boolean;
  };
}

export async function getExploreFeed(location?: string, seed?: number): Promise<ExploreFeedData> {
  const response = await apiClient.get<ApiMessageResponse<ExploreFeedData>>("/recommendations/explore", {
    params: {
      location: location || undefined,
      seed: seed !== undefined ? seed : undefined,
    },
  });
  return response.data.data || {
    categories: [],
    active_sections: ["categories", "top_and_most_visited"],
    top_and_most_visited: [],
    user_signals: {
      is_authenticated: false,
      has_location: false,
      has_history: false,
      has_preferences: false,
      interaction_count: 0,
      is_cold_start: true,
      has_sufficient_personalization: false,
    },
  };
}

export async function getHomeRecommendations(location?: string): Promise<{
  recommended_for_you: MarketplaceService[];
  top_rated: MarketplaceService[];
  most_visited: MarketplaceService[];
  near_you: MarketplaceService[];
  nearby: MarketplaceService[];
  things_to_visit: MarketplaceService[];
  things_to_do: MarketplaceService[];
  categories: any[];
}> {
  const response = await apiClient.get<ApiMessageResponse<any>>("/recommendations/home", {
    params: { location: location || undefined },
  });
  const data = response.data.data || {};
  return {
    recommended_for_you: data.recommended_for_you || [],
    top_rated: data.top_rated || [],
    most_visited: data.most_visited || [],
    near_you: data.near_you || data.nearby || [],
    nearby: data.nearby || data.near_you || [],
    things_to_visit: data.things_to_visit || [],
    things_to_do: data.things_to_do || [],
    categories: data.categories || [],
  };
}

export async function recordUserInteraction(
  eventType: string,
  serviceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await apiClient.post("/recommendations/interactions", {
      event_type: eventType,
      service_id: serviceId || null,
      metadata: metadata || {},
    });
  } catch {
    // Non-blocking interaction log
  }
}

export async function getProviderNCScore(serviceId?: string): Promise<{
  nc_score: number;
  trend: string;
  components: Record<string, number>;
  explanations: Record<string, string>;
}> {
  const response = await apiClient.get<ApiMessageResponse<any>>("/provider/nc-score", {
    params: { service_id: serviceId || undefined },
  });
  return response.data.data || {
    nc_score: 0,
    trend: "0%",
    components: {},
    explanations: {},
  };
}

export async function getProviderRecommendations(): Promise<any[]> {
  const response = await apiClient.get<ApiMessageResponse<any>>("/provider/recommendations");
  return response.data.data?.action_recommendations || [];
}
