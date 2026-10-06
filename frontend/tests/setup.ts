import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

window.scrollTo = vi.fn() as any;
Element.prototype.scrollIntoView = vi.fn();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  GoogleLogin: ({ onSuccess }: any) =>
    React.createElement(
      "button",
      {
        type: "button",
        "data-testid": "google-login-btn",
        onClick: () => onSuccess?.({ credential: "mock-google-credential" }),
      },
      "Continue with Google"
    ),
  useGoogleLogin: () => vi.fn(),
  useGoogleOAuth: () => ({ clientId: "mock-client-id" }),
}));
