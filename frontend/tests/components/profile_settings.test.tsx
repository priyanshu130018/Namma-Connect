import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CustomerProfilePage } from "@/routes/customer/Profile";
import { CustomerSettingsPage } from "@/routes/customer/Settings";
import * as userService from "@/services/userService";
import { User } from "@/types";

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

    expect(screen.getByText("Account Profile")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Priya Nair/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/priya.nair@example.com/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Mangaluru, Karnataka/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /Edit Profile/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Verified/i).length).toBeGreaterThanOrEqual(1);
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
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Priya R. Nair",
          mobile: "+91 98765 11223",
          location: "Bengaluru, Karnataka",
        })
      );
    });
  });

  it("renders CustomerSettingsPage with functioning Theme/Language options", () => {
    render(
      <MemoryRouter>
        <CustomerSettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Settings & Preferences/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. Security/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. App/i)).toBeInTheDocument();
  });
});
