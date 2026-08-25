import { apiClient } from "@/services/api-client";
import {
  CreatorProfile,
  PortfolioItem,
  CreatorPackage,
  CollaborationItem,
  CollaborationCreatePayload,
  ApiMessageResponse,
} from "@/types";

export async function getPublicCreators(): Promise<CreatorProfile[]> {
  const response = await apiClient.get<ApiMessageResponse<CreatorProfile[]>>("/creators");
  return response.data.data;
}

export async function getPublicCreatorById(creatorId: string): Promise<CreatorProfile> {
  const response = await apiClient.get<ApiMessageResponse<CreatorProfile>>(`/creators/${creatorId}`);
  return response.data.data;
}

export async function getMyCreatorProfile(): Promise<CreatorProfile> {
  const response = await apiClient.get<ApiMessageResponse<CreatorProfile>>("/creators/me/profile");
  return response.data.data;
}

export async function updateMyCreatorProfile(
  payload: Partial<CreatorProfile>
): Promise<CreatorProfile> {
  const response = await apiClient.put<ApiMessageResponse<CreatorProfile>>(
    "/creators/me/profile",
    payload
  );
  return response.data.data;
}

export async function addPortfolioItem(payload: PortfolioItem): Promise<CreatorProfile> {
  const response = await apiClient.post<ApiMessageResponse<CreatorProfile>>(
    "/creators/me/portfolio",
    payload
  );
  return response.data.data;
}

export async function addOrUpdatePackage(payload: CreatorPackage): Promise<CreatorProfile> {
  const response = await apiClient.post<ApiMessageResponse<CreatorProfile>>(
    "/creators/me/packages",
    payload
  );
  return response.data.data;
}

export async function createCollaborationProposal(
  payload: CollaborationCreatePayload
): Promise<CollaborationItem> {
  const response = await apiClient.post<ApiMessageResponse<CollaborationItem>>(
    "/collaborations",
    payload
  );
  return response.data.data;
}

export async function getMyCollaborations(): Promise<CollaborationItem[]> {
  const response = await apiClient.get<ApiMessageResponse<CollaborationItem[]>>(
    "/collaborations/me"
  );
  return response.data.data;
}

export async function acceptCollaboration(collabId: string): Promise<CollaborationItem> {
  const response = await apiClient.post<ApiMessageResponse<CollaborationItem>>(
    `/collaborations/${collabId}/accept`
  );
  return response.data.data;
}

export async function rejectCollaboration(collabId: string): Promise<CollaborationItem> {
  const response = await apiClient.post<ApiMessageResponse<CollaborationItem>>(
    `/collaborations/${collabId}/reject`
  );
  return response.data.data;
}

export async function completeCollaboration(collabId: string): Promise<CollaborationItem> {
  const response = await apiClient.post<ApiMessageResponse<CollaborationItem>>(
    `/collaborations/${collabId}/complete`
  );
  return response.data.data;
}
