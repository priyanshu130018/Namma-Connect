import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { LoginPage } from "@/routes/public/Login";
import { RegisterPage } from "@/routes/public/Register";
import { ForgotPasswordPage } from "@/routes/public/ForgotPassword";
import { ResetPasswordPage } from "@/routes/public/ResetPassword";

describe("Frontend Authentication & RBAC Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders LoginPage with email, password, submit, Google OAuth, and navigation links", () => {
    render(
      <AppProviders>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Sign In to Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address or Mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("renders RegisterPage as a simple user account creation form without provider selector", () => {
    render(
      <AppProviders>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Join Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Re-enter password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();

    // Verify "I WANT TO JOIN AS" and role selector buttons do NOT exist
    expect(screen.queryByText(/I WANT TO JOIN AS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Traveler$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Farm$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Digital$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Hotel$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Creator$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Guide$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Driver$/i)).not.toBeInTheDocument();
  });

  it("validates password mismatch on RegisterPage", () => {
    render(
      <AppProviders>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AppProviders>
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Ananya Rao" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "ananya@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/At least 6 characters/i), { target: { value: "Password123" } });
    fireEvent.change(screen.getByPlaceholderText(/Re-enter password/i), { target: { value: "Mismatch456" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it("renders ForgotPasswordPage and handles submission to generic safe state", async () => {
    render(
      <AppProviders>
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Reset Your Password/i })).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/Registered Email Address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Password Reset Link/i }));

    expect(await screen.findByText(/Instructions Dispatched/i)).toBeInTheDocument();
  });

  it("renders ResetPasswordPage with password and confirmation fields", () => {
    window.history.pushState({}, "Reset Password", "/reset-password?token=mock_test_token");
    render(
      <AppProviders>
        <BrowserRouter>
          <ResetPasswordPage />
        </BrowserRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Set New Password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Re-enter new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update Password/i })).toBeInTheDocument();
  });
});
