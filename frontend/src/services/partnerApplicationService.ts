import { apiClient } from "./api-client";

export interface OnboardingServiceItem {
  title: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  max_capacity?: number;
  duration_hours?: number;
  images: string[];
}

export interface PartnerApplicationData {
  id: string;
  application_code: string;
  user_id: string;
  role_type: string;
  full_name: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  business_name: string;
  experience_years: number;
  bio?: string | null;
  languages?: string | null;
  id_type: string;
  id_number: string;
  document_url?: string | null;
  provider_details?: Record<string, any>;
  documents?: Array<{ name: string; url: string; type: string }>;
  images?: string[];
  services: string[];
  activities: string[];
  services_payload?: OnboardingServiceItem[];
  draft_step?: number;
  status: "DRAFT" | "PENDING" | "REJECTED" | "APPROVED" | "CHANGES_REQUESTED";
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerApplicationPayload {
  role_type: string;
  full_name: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  business_name: string;
  experience_years?: number;
  bio?: string;
  languages?: string;
  id_type: string;
  id_number: string;
  document_url?: string;
  provider_details?: Record<string, any>;
  documents?: Array<{ name: string; url: string; type: string }>;
  images?: string[];
  services: string[];
  activities: string[];
  services_payload?: OnboardingServiceItem[];
  draft_step?: number;
}

export async function getMyPartnerApplication(): Promise<PartnerApplicationData | null> {
  try {
    const res = await apiClient.get<{ data: PartnerApplicationData | null }>("/partner/application");
    return res.data?.data || null;
  } catch (error) {
    return null;
  }
}

export async function savePartnerApplicationDraft(
  payload: Partial<PartnerApplicationPayload>
): Promise<PartnerApplicationData> {
  const res = await apiClient.post<{ data: PartnerApplicationData }>("/partner/application/draft", payload);
  return res.data.data;
}

export async function submitPartnerApplication(
  payload: PartnerApplicationPayload
): Promise<PartnerApplicationData> {
  const res = await apiClient.post<{ data: PartnerApplicationData }>("/partner/application", payload);
  return res.data.data;
}
