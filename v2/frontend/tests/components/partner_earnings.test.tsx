import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { PartnerEarningsPage } from "@/routes/partner/PartnerEarnings";
import * as earningsService from "@/services/earningsService";
import { ProviderEarningsResult } from "@/types";

const mockEarnings30d: ProviderEarningsResult = {
  period: "30d",
  total_earnings: 11400,
  gross_revenue: 12000,
  platform_fee: 600,
  currency: "INR",
  booking_count: 4,
  data: [
    { date: "Aug 10", amount: 2660, bookings_count: 1 },
    { date: "Aug 15", amount: 3420, bookings_count: 1 },
    { date: "Aug 20", amount: 5320, bookings_count: 2 },
  ],
};

const mockEarnings7d: ProviderEarningsResult = {
  period: "7d",
  total_earnings: 5320,
  gross_revenue: 5600,
  platform_fee: 280,
  currency: "INR",
  booking_count: 2,
  data: [
    { date: "Aug 20", amount: 5320, bookings_count: 2 },
  ],
};

describe("Provider Earnings Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders PartnerEarningsPage with authoritative gross revenue, fee, and net payout", async () => {
    const fetchSpy = vi.spyOn(earningsService, "getPartnerEarnings").mockResolvedValue(mockEarnings30d);

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Earnings & Payouts")).toBeInTheDocument();
      expect(screen.getAllByText(/₹12,000/).length).toBeGreaterThanOrEqual(1); // Gross
      expect(screen.getAllByText(/-₹600/).length).toBeGreaterThanOrEqual(1); // Platform fee
      expect(screen.getAllByText(/₹11,400/).length).toBeGreaterThanOrEqual(1); // Net settlement
      expect(screen.getByText(/4 Eligible Bookings/i)).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith("30d");
  });

  it("switches time ranges dynamically between 7 Days, 30 Days, and 1 Year", async () => {
    const fetchSpy = vi
      .spyOn(earningsService, "getPartnerEarnings")
      .mockImplementation(async (period) => {
        if (period === "7d") return mockEarnings7d;
        return mockEarnings30d;
      });

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/₹11,400/).length).toBeGreaterThanOrEqual(1);
    });

    // Click 7 Days
    fireEvent.click(screen.getByRole("button", { name: /^7 Days$/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("7d");
      expect(screen.getAllByText(/₹5,320/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Earnings Timeline \(7 Days\)/i)).toBeInTheDocument();
    });
  });

  it("displays friendly error banner and allows retry when API fails", async () => {
    const fetchSpy = vi
      .spyOn(earningsService, "getPartnerEarnings")
      .mockRejectedValueOnce(new Error("Database ledger timeout"))
      .mockResolvedValueOnce(mockEarnings30d);

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Error Loading Financial Data")).toBeInTheDocument();
      expect(screen.getByText("Database ledger timeout")).toBeInTheDocument();
    });

    // Click Retry
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/₹11,400/).length).toBeGreaterThanOrEqual(1);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
