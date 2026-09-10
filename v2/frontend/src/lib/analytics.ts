/**
 * Client Analytics Tracking Abstraction
 * Supports structured event tracking, page views, user identification, and sensitive payload redaction.
 */

import { logger } from "./logger";

export interface AnalyticsEventMap {
  page_view: { path: string; title?: string };
  search_performed: { query: string; category?: string; results_count?: number };
  service_viewed: { service_id: string; title: string; category?: string; price?: number };
  booking_started: { service_id: string; date: string; guests: number; price?: number };
  booking_completed: { booking_id: string; service_id: string; total_amount: number };
  payment_attempted: { order_id: string; amount: number; method?: string };
  payment_success: { payment_id: string; order_id: string; amount: number };
  payment_failed: { order_id: string; error_code?: string; error_description?: string };
  chat_message_sent: { conversation_id?: string; recipient_id?: string };
  auth_login: { method?: string };
  auth_logout: Record<string, never>;
  auth_register: { role?: string };
}

const SENSITIVE_PROPERTIES = ["password", "token", "cvv", "card", "otp", "secret", "authorization"];

function sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (SENSITIVE_PROPERTIES.some((p) => key.toLowerCase().includes(p))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

class ClientAnalytics {
  private userId: string | null = null;
  private userTraits: Record<string, unknown> = {};

  public identify(userId: string, traits?: Record<string, unknown>): void {
    this.userId = userId;
    this.userTraits = sanitizeProperties(traits);
    logger.debug(`[Analytics] Identify: ${userId}`, this.userTraits);
  }

  public reset(): void {
    logger.debug(`[Analytics] Reset identity`);
    this.userId = null;
    this.userTraits = {};
  }

  public track<E extends keyof AnalyticsEventMap>(
    eventName: E,
    properties: AnalyticsEventMap[E]
  ): void;
  public track(eventName: string, properties?: Record<string, unknown>): void;
  public track(eventName: string, properties?: Record<string, unknown>): void {
    const payload = {
      event: eventName,
      userId: this.userId,
      properties: sanitizeProperties(properties),
      timestamp: new Date().toISOString(),
    };

    logger.debug(`[Analytics] Track: ${eventName}`, payload);

    // If external telemetry or window.dataLayer exists, forward to it
    if (typeof window !== "undefined") {
      const win = window as unknown as { dataLayer?: unknown[] };
      if (Array.isArray(win.dataLayer)) {
        win.dataLayer.push(payload);
      }
    }
  }

  public page(path: string, title?: string): void {
    this.track("page_view", {
      path,
      title: title || (typeof document !== "undefined" ? document.title : undefined),
    });
  }
}

export const analytics = new ClientAnalytics();
