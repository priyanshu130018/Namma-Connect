import { apiClient } from "@/services/api-client";
import { User } from "@/types";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  mobile?: string;
  role?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface MessageResponse {
  success: boolean;
  message: string;
  data?: any;
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/login", payload);
  return response.data;
}

export async function registerUser(payload: RegisterPayload): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/register", payload);
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return response.data;
}

export async function googleLoginUser(credential: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/google", {
    credential,
  });
  return response.data;
}

export async function logoutUser(): Promise<MessageResponse> {
  try {
    const response = await apiClient.post<MessageResponse>("/auth/logout");
    return response.data;
  } catch {
    return { success: true, message: "Logged out locally" };
  }
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/forgot-password", {
    email,
  });
  return response.data;
}

export async function resetPassword(token: string, new_password: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/reset-password", {
    token,
    new_password,
  });
  return response.data;
}

export async function changePassword(current_password: string, new_password: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/change-password", {
    current_password,
    new_password,
  });
  return response.data;
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/verify-email", {
    token,
  });
  return response.data;
}

export async function verifyPhone(phone: string, otp: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/verify-phone", {
    phone,
    otp,
  });
  return response.data;
}
