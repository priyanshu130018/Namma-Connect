import { apiClient } from "./api-client";
import {
  User,
  UserSettingsData,
  UserProfileUpdatePayload,
  UserSettingsUpdatePayload,
  VerificationChangePayload,
  ApiMessageResponse,
} from "@/types";

export async function getUserProfile(): Promise<User> {
  const response = await apiClient.get<ApiMessageResponse<User>>("/users/me");
  return response.data.data;
}

export async function updateUserProfile(payload: UserProfileUpdatePayload): Promise<User> {
  const response = await apiClient.put<ApiMessageResponse<User>>("/users/me", payload);
  return response.data.data;
}

export async function getUserSettings(): Promise<UserSettingsData> {
  const response = await apiClient.get<ApiMessageResponse<UserSettingsData>>("/users/me/settings");
  return response.data.data;
}

export async function updateUserSettings(payload: UserSettingsUpdatePayload): Promise<UserSettingsData> {
  const response = await apiClient.put<ApiMessageResponse<UserSettingsData>>("/users/me/settings", payload);
  return response.data.data;
}

export async function submitChangeRequest(payload: VerificationChangePayload): Promise<{ message: string; status: string }> {
  const response = await apiClient.post<ApiMessageResponse<{ message: string; status: string }>>("/users/me/change-request", payload);
  return response.data.data;
}

export async function getUserPreferences(): Promise<{ theme_preference: "light" | "dark" | "system"; language: "en" | "kn" }> {
  const response = await apiClient.get<ApiMessageResponse<{ theme_preference: "light" | "dark" | "system"; language: "en" | "kn" }>>("/users/me/preferences");
  return response.data.data;
}

export async function updateUserPreferences(payload: { theme_preference?: string; language?: string }): Promise<{ theme_preference: "light" | "dark" | "system"; language: "en" | "kn" }> {
  const response = await apiClient.patch<ApiMessageResponse<{ theme_preference: "light" | "dark" | "system"; language: "en" | "kn" }>>("/users/me/preferences", payload);
  return response.data.data;
}

export async function changePassword(payload: { current_password?: string; new_password?: string }): Promise<{ message: string }> {
  const response = await apiClient.post<ApiMessageResponse<{ message: string }>>("/auth/change-password", payload);
  return response.data.data;
}
