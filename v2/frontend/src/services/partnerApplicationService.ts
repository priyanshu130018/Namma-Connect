import { apiClient } from "./api-client";

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
  services: string[];
  activities: string[];
  status: "DRAFT" | "PENDING" | "REJECTED" | "APPROVED";
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
  services: string[];
  activities: string[];
}

export async function getMyPartnerApplication(): Promise<PartnerApplicationData | null> {
  try {
    const res = await apiClient.get<{ data: PartnerApplicationData | null }>("/partner/application");
    return res.data?.data || null;
  } catch (error) {
    return null;
  }
}

export async function submitPartnerApplication(
  payload: PartnerApplicationPayload
): Promise<PartnerApplicationData> {
  const res = await apiClient.post<{ data: PartnerApplicationData }>("/partner/application", payload);
  return res.data.data;
}

