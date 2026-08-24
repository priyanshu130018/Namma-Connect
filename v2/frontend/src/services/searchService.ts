import { apiClient } from "./api-client";
import { ApiMessageResponse } from "@/types";

export interface SearchParams {
  place?: string;
  date?: string;
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
}

export async function searchServices(params: SearchParams): Promise<ApiMessageResponse> {
  const queryParams = new URLSearchParams();
  if (params.place) queryParams.append("place", params.place);
  if (params.date) queryParams.append("date", params.date);
  if (params.category) queryParams.append("category", params.category);
  if (params.q) queryParams.append("q", params.q);
  if (params.min_price) queryParams.append("min_price", params.min_price.toString());
  if (params.max_price) queryParams.append("max_price", params.max_price.toString());

  const response = await apiClient.get<ApiMessageResponse>(`/search?${queryParams.toString()}`);
  return response.data;
}

export async function getSearchSuggestions(query: string): Promise<ApiMessageResponse<{ suggestions: string[] }>> {
  const response = await apiClient.get<ApiMessageResponse<{ suggestions: string[] }>>(
    `/search/suggestions?q=${encodeURIComponent(query)}`
  );
  return response.data;
}
