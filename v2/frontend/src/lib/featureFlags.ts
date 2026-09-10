/**
 * Centralized typed Feature Flags for NammaConnect V2 Frontend
 */

export interface FeatureFlags {
  realtime_chat: boolean;
  travel_ai: boolean;
  new_checkout: boolean;
  creator_collaborations: boolean;
  sms_notifications: boolean;
  dark_mode: boolean;
  kannada_localization: boolean;
  require_customer_verification: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  realtime_chat: true,
  travel_ai: true,
  new_checkout: true,
  creator_collaborations: true,
  sms_notifications: false,
  dark_mode: true,
  kannada_localization: true,
  require_customer_verification: false,
};

/**
 * Check if a feature flag is enabled.
 * Evaluates VITE_FEATURE_<FLAG_NAME> environment variables first, falling back to defaults.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  if (typeof window !== "undefined") {
    // Check localStorage override for developer debugging
    const localOverride = localStorage.getItem(`ff_${flag}`);
    if (localOverride !== null) {
      return localOverride === "true" || localOverride === "1";
    }
  }

  const envKey = `VITE_FEATURE_${flag.toUpperCase()}`;
  const envVal = import.meta.env[envKey];
  if (envVal !== undefined && envVal !== "") {
    return envVal === "true" || envVal === "1";
  }

  return DEFAULT_FEATURE_FLAGS[flag] ?? false;
}
