import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { PartnerEarningsPage } from "@/routes/partner/PartnerEarnings";
import * as earningsService from "@/services/earningsService";
import * as payoutService from "@/services/payoutService";
import { ProviderEarningsResult, ProviderPayoutSummary } from "@/types";

const mockEarnings: ProviderEarningsResult = {
  period: "30d",
  total_earnings: 11400,
  gross_revenue: 12000,
  platform_fee: 600,
  currency: "INR",
  booking_count: 4,
  data: [{ date: "Aug 20", amount: 11400, bookings_count: 4 }],
};

const mockPayoutSummary: ProviderPayoutSummary = {
  available_balance: 5700,
  processing_balance: 0,
  paid_out_balance: 5700,
  failed_balance: 0,
  currency: "INR",
  payouts: [
    {
      id: "payout-01",
      payout_code: "NC-PAY-9812A",
      provider_id: "prov-01",
      amount: 5700,
      currency: "INR",
      status: "COMPLETED",
      bank_account_last4: "4092",
      ifsc_code: "SBIN0001234",
      created_at: "2026-08-15T10:00:00Z",
      processed_at: "2026-08-15T11:00:00Z",
    },
  ],
};

const mockEmptyPayoutSummary: ProviderPayoutSummary = {
  available_balance: 0,
  processing_balance: 0,
  paid_out_balance: 0,
  failed_balance: 0,
  currency: "INR",
  payouts: [],
};

describe("Provider Payouts Component Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(earningsService, "getPartnerEarnings").mockResolvedValue(mockEarnings);
  });

  it("renders Payouts section with 4 metric cards and disbursement history table", async () => {
    vi.spyOn(payoutService, "getPartnerPayoutSummary").mockResolvedValue(mockPayoutSummary);

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Payouts & Bank Settlement")).toBeInTheDocument();
      expect(screen.getByText("Available for Payout")).toBeInTheDocument();
      expect(screen.getByText("NC-PAY-9812A")).toBeInTheDocument();
      expect(screen.getByText("•••• 4092")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("handles Request Payout modal flow and submits valid disbursement request", async () => {
    vi.spyOn(payoutService, "getPartnerPayoutSummary").mockResolvedValue(mockPayoutSummary);
    const requestSpy = vi.spyOn(payoutService, "requestPartnerPayout").mockResolvedValue({
      id: "payout-02",
      payout_code: "NC-PAY-NEW01",
      provider_id: "prov-01",
      amount: 5700,
      currency: "INR",
      status: "COMPLETED",
      bank_account_last4: "4092",
      ifsc_code: "SBIN0001234",
    });

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Request Payout$/i })).toBeInTheDocument();
    });

    // Click Request Payout button to open modal
    fireEvent.click(screen.getByRole("button", { name: /^Request Payout$/i }));

    expect(screen.getByText("Request Bank Payout")).toBeInTheDocument();

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /Confirm Payout/i }));

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledWith({
        amount: 5700,
        bank_account_last4: "4092",
        ifsc_code: "SBIN0001234",
      });
      expect(screen.getByText(/Disbursement of ₹5,700 successfully queued/i)).toBeInTheDocument();
    });
  });

  it("renders empty state when provider has no payouts", async () => {
    vi.spyOn(payoutService, "getPartnerPayoutSummary").mockResolvedValue(mockEmptyPayoutSummary);

    render(
      <BrowserRouter>
        <PartnerEarningsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No payout history yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Request Payout$/i })).toBeDisabled();
    });
  });
});
