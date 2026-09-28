export type UserRole = "user" | "customer" | "provider" | "partner" | "admin" | "farmer" | "creator";

export interface User {
  id: string;
  email: string;
  full_name: string;
  mobile?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  phone_verified?: boolean;
  avatar_url?: string | null;
  location?: string | null;
  language?: string | null;
  business_name?: string | null;
  theme_preference?: string | null;
  created_at?: string | null;
  bio?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  tags?: string[];
}

export interface UserSettingsData {
  user_id: string;
  email: string;
  mobile?: string | null;
  language: string;
  theme: string;
  notifications: {
    email?: boolean;
    sms?: boolean;
    promo?: boolean;
    bookings?: boolean;
    payments?: boolean;
    collaborations?: boolean;
    support?: boolean;
    [key: string]: boolean | undefined;
  };
  privacy: {
    share_profile?: boolean;
    personalize_location?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface UserProfileUpdatePayload {
  full_name?: string;
  mobile?: string;
  location?: string;
  language?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  date_of_birth?: string;
  tags?: string[];
}

export interface UserSettingsUpdatePayload {
  language?: string;
  theme?: string;
  theme_preference?: string;
  notifications?: Record<string, boolean>;
  privacy?: Record<string, boolean>;
}

export type ThemePreference = "light" | "dark" | "system";
export type SupportedLanguage = "en" | "kn";

export interface UserPreferencesData {
  theme_preference: ThemePreference;
  language: SupportedLanguage;
}

export interface UserPreferencesUpdatePayload {
  theme_preference?: ThemePreference;
  language?: SupportedLanguage;
}

export interface VerificationChangePayload {
  field: string;
  requested_value: string;
  reason: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}
