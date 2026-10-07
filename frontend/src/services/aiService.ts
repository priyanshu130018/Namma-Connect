import { apiClient } from "./api-client";

// ── V2 AI Conversation Types ──

export interface CreateAIConversationRequest {
  title?: string;
  context_type?: string;
}

export interface SendAIMessageRequest {
  content: string;
}

export interface AIMessageResponse {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string;
  tool_calls?: any[];
  recommended_services?: any[];
  trip_planner_handoff?: {
    recommended_action: string;
    suggested_params: Record<string, any>;
  };
  trip_id?: string;
  itinerary?: AgentRunResponse["itinerary"];
  budget?: AgentRunResponse["budget"];
  changed_items?: string[];
  selected_services?: any[];
  current_agent_step?: string;
  approval_required?: boolean;
  approval_prompt?: string;
  approval_status?: string;
  booking_state?: any;
  extracted_requirements?: any;
  created_at: string;
}


export interface AIConversationResponse {
  id: string;
  user_id?: string;
  title: string;
  context_type: string;
  created_at: string;
  updated_at: string;
}

export interface AIConversationListResponse {
  items: AIConversationResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── V2 Agentic Trip Planner Types ──

export interface GenerateTripPlanRequest {
  destination_district?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  party_size?: number;
  max_budget?: number;
  preferred_categories?: string[];
  special_interests?: string[];
  pace?: "RELAXED" | "MODERATE" | "INTENSE" | string;
  notes?: string;
}

export interface RefineTripPlanRequest {
  action: "REPLACE" | "REMOVE" | "REDUCE_BUDGET" | string;
  day_number?: number;
  item_id?: string;
  replacement_service_id?: string;
  target_budget?: number;
}

export interface ConfirmTripPlanRequest {
  prompt_text?: string;
}

export interface TripPlanItemProposal {
  item_id: string;
  service_id: string;
  title: string;
  time_slot: "MORNING" | "AFTERNOON" | "EVENING" | string;
  start_time?: string;
  end_time?: string;
  price: number;
  category: string;
  location?: string;
  provider_name?: string;
  is_verified?: boolean;
}

export interface TripPlanDayProposal {
  day_number: number;
  date?: string;
  theme?: string;
  items: TripPlanItemProposal[];
  estimated_day_cost: number;
}

export interface TripPlanItineraryProposal {
  total_days: number;
  estimated_total_cost: number;
  currency: string;
  days: TripPlanDayProposal[];
  notes?: string;
}

export interface TripPlanValidationReport {
  is_valid: boolean;
  score: number;
  issues: string[];
  conflicts: Array<{
    type: string;
    day_number?: number;
    item_id?: string;
    description: string;
  }>;
}

export interface TripPlanResponse {
  plan_id: string;
  user_id?: string;
  status:
    | "DRAFT"
    | "COLLECTING_REQUIREMENTS"
    | "SEARCHING"
    | "BUILDING_ITINERARY"
    | "VALIDATING"
    | "REFINING"
    | "READY_FOR_REVIEW"
    | "CONFIRMED"
    | "HANDED_OFF"
    | "FAILED";
  constraints: {
    destination_district?: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    party_size?: number;
    max_budget?: number;
    preferred_categories?: string[];
    special_interests?: string[];
    pace?: string;
    notes?: string;
  };
  proposal?: TripPlanItineraryProposal;
  validation_report?: TripPlanValidationReport;
  clarification_questions: string[];
  associated_trip_id?: string;
  last_error?: string;
}

export interface BookingHandoffItem {
  item_id: string;
  service_id: string;
  title: string;
  day_number: number;
  date?: string;
  time_slot?: string;
  price: number;
  category: string;
  location?: string;
}

export interface BookingHandoffResponse {
  plan_id: string;
  associated_trip_id: string;
  user_id: string;
  status: string;
  estimated_total_cost: number;
  currency: string;
  items_to_book: BookingHandoffItem[];
  bookings_created: boolean;
  payment_created: boolean;
  requires_user_checkout: boolean;
  checkout_url?: string;
}

// ── V2 AI Assistant API Calls ──

export async function createAIConversation(
  data: CreateAIConversationRequest = {}
): Promise<AIConversationResponse> {
  const response = await apiClient.post<AIConversationResponse>("/ai/conversations", data);
  return response.data;
}

export async function listAIConversations(params?: {
  context_type?: string;
  page?: number;
  page_size?: number;
}): Promise<AIConversationListResponse> {
  const response = await apiClient.get<AIConversationListResponse>("/ai/conversations", {
    params,
  });
  return response.data;
}

export async function getConversationMessages(
  conversationId: string
): Promise<AIMessageResponse[]> {
  const response = await apiClient.get<AIMessageResponse[]>(
    `/ai/conversations/${conversationId}/messages`
  );
  return response.data;
}

export async function sendMessageToAI(
  conversationId: string,
  data: SendAIMessageRequest
): Promise<AIMessageResponse> {
  const response = await apiClient.post<AIMessageResponse>(
    `/ai/conversations/${conversationId}/messages`,
    data
  );
  return response.data;
}

// ── V2 Agentic Trip Planner API Calls ──

export async function generateTripPlan(
  data: GenerateTripPlanRequest
): Promise<TripPlanResponse> {
  const response = await apiClient.post<TripPlanResponse>("/ai/trip-plans/generate", data);
  return response.data;
}

export async function refineTripPlan(
  planId: string,
  data: RefineTripPlanRequest
): Promise<TripPlanResponse> {
  const response = await apiClient.post<TripPlanResponse>(
    `/ai/trip-plans/${planId}/refine`,
    data
  );
  return response.data;
}

export async function confirmTripPlan(
  planId: string,
  data: ConfirmTripPlanRequest = {}
): Promise<Record<string, any>> {
  const response = await apiClient.post<Record<string, any>>(
    `/ai/trip-plans/${planId}/confirm`,
    data
  );
  return response.data;
}

export async function getTripPlan(planId: string): Promise<TripPlanResponse> {
  const response = await apiClient.get<TripPlanResponse>(`/ai/trip-plans/${planId}`);
  return response.data;
}

export async function getBookingHandoff(
  planId: string
): Promise<BookingHandoffResponse> {
  const response = await apiClient.get<BookingHandoffResponse>(
    `/ai/trip-plans/${planId}/booking-handoff`
  );
  return response.data;
}

// Legacy compatibility shim
export async function sendTravelChatMessage(data: {
  conversation_id?: string;
  message: string;
}) {
  let convId = data.conversation_id;
  if (!convId) {
    const conv = await createAIConversation({ title: "Travel Chat" });
    convId = conv.id;
  }
  const reply = await sendMessageToAI(convId, { content: data.message });
  return {
    data: {
      conversation_id: convId,
      reply: reply.content,
      suggested_services: reply.recommended_services || [],
    },
  };
}

export async function getTravelConversations() {
  const list = await listAIConversations();
  return {
    data: list.items,
  };
}

// ── V2 Unified LangGraph Travel Agent API ──

export interface AgentRunRequest {
  conversation_id?: string;
  message: string;
}

export interface AgentExecutionTraceStep {
  step: string;
  action?: string;
  message?: string;
  district?: string;
  duration_days?: number;
  count?: number;
  trip_id?: string;
  [key: string]: any;
}

export interface AgentRunResponse {
  id: string;
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  intent: string;
  current_agent_step: string;
  trip_id?: string;
  itinerary?: {
    total_days?: number;
    total_estimated_cost?: number;
    currency?: string;
    summary?: string;
    days?: Array<{
      day_number: number;
      date?: string;
      title?: string;
      estimated_day_cost?: number;
      day_notes?: string;
      items: Array<{
        id: string;
        service_id: string;
        title: string;
        category: string;
        location?: string;
        district?: string;
        start_time?: string;
        end_time?: string;
        estimated_price: number;
        rating?: number;
        primary_image?: string;
        provider_name?: string;
        notes?: string;
      }>;
    }>;
  };
  search_results: Array<{
    id: string;
    title: string;
    slug?: string;
    category?: string;
    district?: string;
    price: number;
    rating?: number;
    primary_image?: string;
    provider_name?: string;
    available?: boolean;
    available_spots?: number;
  }>;
  selected_services: any[];
  availability_results: any[];
  booking_state?: {
    success: boolean;
    booking_id?: string;
    booking_code?: string;
    payment_order_id?: string;
    total_amount?: number;
    currency?: string;
    status?: string;
    error?: string;
    [key: string]: any;
  };
  extracted_requirements?: {
    destination_district?: string;
    target_date?: string;
    duration_days?: number;
    party_size?: number;
    max_budget?: number;
    preferred_categories?: string[];
    [key: string]: any;
  };
  budget?: {
    stay?: number;
    activities?: number;
    food?: number;
    transport?: number;
    total?: number;
    remaining?: number;
    max_budget?: number;
    [key: string]: any;
  };
  approval_required?: boolean;
  approval_status?: string;
  approval_prompt?: string;
  approval_action?: string;
  payment_status?: string;
  changed_items?: string[];
  execution_trace: AgentExecutionTraceStep[];
  tool_calls: any[];
  recommended_services: any[];
  trip_planner_handoff?: any;
  errors: string[];
  created_at: string;
}

export interface AgentStateResponse {
  user_id?: string;
  conversation_id: string;
  trip_id?: string;
  itinerary?: Record<string, any>;
  budget?: Record<string, any>;
  search_results: any[];
  selected_services: any[];
  availability_results: any[];
  booking_state?: Record<string, any>;
  approval_required?: boolean;
  approval_status?: string;
  approval_prompt?: string;
  approval_action?: string;
  payment_status?: string;
  changed_items?: string[];
  current_agent_step: string;
  errors: string[];
}

export async function runAgent(data: AgentRunRequest): Promise<AgentRunResponse> {
  const response = await apiClient.post<AgentRunResponse>("/ai/agent/run", data);
  return response.data;
}

export async function getAgentState(conversationId: string): Promise<AgentStateResponse> {
  const response = await apiClient.get<AgentStateResponse>(`/ai/agent/state/${conversationId}`);
  return response.data;
}

