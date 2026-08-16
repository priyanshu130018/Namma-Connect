import type { ReactNode } from "react";

/**
 * Shared form-validation helpers.
 * Each validator returns "" when valid, or an error message string.
 * Compose with `firstError(...checks)`.
 */

export type Validator = (value: string) => string;

export const required =
  (message = "This field is required"): Validator =>
  (v) =>
    v.trim() ? "" : message;

export const email =
  (message = "Enter a valid email address"): Validator =>
  (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : message;

export const phone10 =
  (message = "Enter a valid 10-digit mobile number"): Validator =>
  (v) =>
    /^\d{10}$/.test(v.replace(/\D/g, "")) ? "" : message;

export const minLength =
  (n: number, message?: string): Validator =>
  (v) =>
    v.trim().length >= n ? "" : (message ?? `Must be at least ${n} characters`);

export const maxLength =
  (n: number, message?: string): Validator =>
  (v) =>
    v.trim().length <= n ? "" : (message ?? `Must be ${n} characters or fewer`);

export const positiveNumber =
  (message = "Enter a number greater than 0"): Validator =>
  (v) =>
    Number(v) > 0 ? "" : message;

export const pincode =
  (message = "Enter a valid 6-digit pincode"): Validator =>
  (v) =>
    /^\d{6}$/.test(v.trim()) ? "" : message;

/** Email OR 10-digit mobile (login identifier). */
export const identifier =
  (message = "Enter a valid email or 10-digit mobile number"): Validator =>
  (v) => {
    const t = v.trim();
    if (!t) return "This field is required";
    if (t.includes("@")) return email()(t);
    return /^\d{10}$/.test(t.replace(/\D/g, "")) ? "" : message;
  };

/** Date (yyyy-mm-dd) that is today or later. */
export const notPastDate =
  (message = "Date cannot be in the past"): Validator =>
  (v) => {
    if (!v) return "Please pick a date";
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    return v >= todayStr ? "" : message;
  };

/** Run validators in order, return the first error (or ""). */
export function firstError(value: string, ...checks: Validator[]): string {
  for (const check of checks) {
    const err = check(value);
    if (err) return err;
  }
  return "";
}

/** Inline field error message — pairs with kit Field inputs. */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
      {children}
    </p>
  );
}

/** Red border class for invalid inputs (merge after the base input classes). */
export const invalidInputClass = "border-destructive focus:border-destructive focus:ring-destructive/20";
