import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CustomerProfilePage } from "@/routes/customer/Profile";
import { CustomerSettingsPage } from "@/routes/customer/Settings";
import * as userService from "@/services/userService";
import { User, UserSettingsData } from "@/types";

const mockUser: User = {
  id: "usr-12345",
  email: "priya.nair@example.com",
  full_name: "Priya Nair",
  mobile: "+91 98765 11223",
  role: "customer",
  is_active: true,
  is_verified: true,
  phone_verified: true,
  location: "Mangaluru, Karnataka",
  language: "Kannada, English",
  theme_preference: "system",
};

const mockSettings: UserSettingsData = {
  user_id: "usr-12345",
  email: "priya.nair@example.com",
  mobile: "+91 98765 11223",
  language: "English (Default)",
  theme: "system",
  notifications: {
    email: true,
    sms: true,
    promo: false,
  },
  privacy: {
    share_profile: true,
    personalize_location: true,
  },
};

describe("Customer Profile & Settings Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CustomerProfilePage with real profile information", async () => {
    vi.spyOn(userService, "getUserProfile").mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <CustomerProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Customer Profile")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Priya Nair/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/priya.nair@example.com/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Mangaluru, Karnataka/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Verified Customer/i)).toBeInTheDocument();
    });
  });

  it("allows customer to edit and save allowed profile fields", async () => {
    vi.spyOn(userService, "getUserProfile").mockResolvedValue(mockUser);
    const updateSpy = vi.spyOn(userService, "updateUserProfile").mockResolvedValue({
      ...mockUser,
      full_name: "Priya R. Nair",
      location: "Bengaluru, Karnataka",
    });

    render(
      <MemoryRouter>
        <CustomerProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit Profile/i })).toBeInTheDocument();
    });

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: "Priya R. Nair" } });

    const locationInput = screen.getByLabelText(/Location/i);
    fireEvent.change(locationInput, { target: { value: "Bengaluru, Karnataka" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        full_name: "Priya R. Nair",
        location: "Bengaluru, Karnataka",
        language: "Kannada, English",
      });
      expect(screen.getByText("Profile updated.")).toBeInTheDocument();
    });
  });

  it("submits compliance request for protected KYC changes", async () => {
    vi.spyOn(userService, "getUserProfile").mockResolvedValue(mockUser);
    const changeSpy = vi.spyOn(userService, "submitChangeRequest").mockResolvedValue({
      status: "PENDING_REVIEW",
      message: "Change request submitted successfully for administrator compliance review.",
    });

    render(
      <MemoryRouter>
        <CustomerProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Request Change/i })).toBeInTheDocument();
    });

    // Open change request modal
    fireEvent.click(screen.getByRole("button", { name: /Request Change/i }));

    const valInput = screen.getByLabelText(/New Value/i);
    fireEvent.change(valInput, { target: { value: "Priya Ramesh Nair" } });

    const reasonInput = screen.getByLabelText(/Reason for Change/i);
    fireEvent.change(reasonInput, { target: { value: "Name updated on Aadhaar" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit for Review/i }));

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith({
        field: "Verified Name",
        requested_value: "Priya Ramesh Nair",
        reason: "Name updated on Aadhaar",
      });
      expect(screen.getByText("Change Request Submitted")).toBeInTheDocument();
    });
  });

  it("renders CustomerSettingsPage and toggles preferences", async () => {
    vi.spyOn(userService, "getUserSettings").mockResolvedValue(mockSettings);
    const updateSettingsSpy = vi.spyOn(userService, "updateUserSettings").mockResolvedValue({
      ...mockSettings,
      notifications: { ...mockSettings.notifications, promo: true },
    });

    render(
      <MemoryRouter>
        <CustomerSettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Settings & Preferences")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("usr-12345")).toBeInTheDocument();
    });

    // Switch to Alerts / Notifications tab
    fireEvent.click(screen.getByRole("button", { name: /Alerts/i }));

    await waitFor(() => {
      expect(screen.getByText("Seasonal Harvest Recommendations")).toBeInTheDocument();
    });

    const promoSwitch = screen.getByRole("switch", { name: /Seasonal Harvest Recommendations/i });
    fireEvent.click(promoSwitch);

    await waitFor(() => {
      expect(updateSettingsSpy).toHaveBeenCalled();
    });
  });

  it("executes password update from security tab", async () => {
    vi.spyOn(userService, "getUserSettings").mockResolvedValue(mockSettings);
    const changePwSpy = vi.spyOn(userService, "changePassword").mockResolvedValue({ message: "Password updated successfully." });

    render(
      <MemoryRouter>
        <CustomerSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Security/i })).toBeInTheDocument();
    });

    // Switch to Security tab
    fireEvent.click(screen.getByRole("button", { name: /Security/i }));

    const currentPwInput = screen.getByLabelText(/Current Password/i);
    fireEvent.change(currentPwInput, { target: { value: "OldPassword123!" } });

    const newPwInput = screen.getByLabelText(/New Password/i);
    fireEvent.change(newPwInput, { target: { value: "NewSecurePassword456!" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Password/i }));

    await waitFor(() => {
      expect(changePwSpy).toHaveBeenCalledWith({
        current_password: "OldPassword123!",
        new_password: "NewSecurePassword456!",
      });
      expect(screen.getByText(/Settings updated. Password updated successfully./i)).toBeInTheDocument();
    });
  });
});
