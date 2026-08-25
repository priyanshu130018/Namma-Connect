import { useState, useEffect } from "react";
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowDownToLine,
  Building2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPartnerEarnings } from "@/services/earningsService";
import {
  getPartnerPayoutSummary,
  requestPartnerPayout,
} from "@/services/payoutService";
import {
  ProviderEarningsResult,
  ProviderPayoutSummary,
  EarningsPeriod,
  PayoutItem,
} from "@/types";

const RANGES: { label: string; value: EarningsPeriod }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "1 Year", value: "1y" },
];

export function PartnerEarningsPage() {
  const [selectedRange, setSelectedRange] = useState<EarningsPeriod>("30d");
  const [earnings, setEarnings] = useState<ProviderEarningsResult | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<ProviderPayoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request Payout Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [bankLast4] = useState<string>("4092");
  const [ifscCode] = useState<string>("SBIN0001234");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  const loadData = async (period: EarningsPeriod) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [earningsData, payoutsData] = await Promise.all([
        getPartnerEarnings(period),
        getPartnerPayoutSummary().catch(() => null),
      ]);
      setEarnings(earningsData);
      if (payoutsData) {
        setPayoutSummary(payoutsData);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.message ||
          "Unable to retrieve provider earnings. Please check your network connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedRange);
  }, [selectedRange]);

  const handleOpenPayoutModal = () => {
    if (!payoutSummary || payoutSummary.available_balance <= 0) return;
    setPayoutAmount(payoutSummary.available_balance.toString());
    setPayoutError(null);
    setPayoutSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutSummary) return;

    const numAmount = parseFloat(payoutAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPayoutError("Please enter a valid payout amount greater than zero.");
      return;
    }
    if (numAmount > payoutSummary.available_balance) {
      setPayoutError(
        `Requested amount exceeds available balance of ${formatCurrency(
          payoutSummary.available_balance
        )}.`
      );
      return;
    }

    setIsSubmittingPayout(true);
    setPayoutError(null);

    try {
      const result = await requestPartnerPayout({
        amount: numAmount,
        bank_account_last4: bankLast4.trim(),
        ifsc_code: ifscCode.trim(),
      });
      setPayoutSuccessMsg(
        `Disbursement of ${formatCurrency(
          result.amount
        )} successfully queued (Ref: ${result.payout_code}).`
      );
      setIsModalOpen(false);
      // Reload updated balances
      await loadData(selectedRange);
    } catch (err: any) {
      setPayoutError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to process payout request. Please try again."
      );
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const activeRangeLabel =
    RANGES.find((r) => r.value === selectedRange)?.label || "30 Days";

  const chartData = earnings?.data || [];
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1000);

  const getStatusBadge = (status: PayoutItem["status"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" dot className="bg-emerald-600 text-white border-0 text-[10px]">
            Completed
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="default" dot className="bg-blue-600 text-white border-0 text-[10px]">
            Processing
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="default" dot className="bg-amber-600 text-white border-0 text-[10px]">
            Pending
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" dot className="text-[10px]">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Earnings & Payouts"
          subtitle="Direct bank settlements for completed guest stays and agricultural experiences."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Exactly 3 Filter Range Buttons */}
          <div
            role="group"
            aria-label="Earnings Time Range"
            className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
          >
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRange(r.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedRange === r.value
                    ? "bg-harvest-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(selectedRange)}
            disabled={isLoading}
            className="rounded-xl font-bold"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {payoutSuccessMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{payoutSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Error Loading Financial Data</p>
            <p>{errorMessage}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadData(selectedRange)}
              className="mt-2 font-bold text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl sm:col-span-2" />
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      ) : earnings ? (
        <>
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-5 rounded-3xl border-slate-200 bg-white space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Revenue</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                {formatCurrency(earnings.gross_revenue)}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {earnings.booking_count} Eligible {earnings.booking_count === 1 ? "Booking" : "Bookings"}
              </span>
            </Card>

            <Card className="p-5 rounded-3xl border-slate-200 bg-white space-y-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">Platform Fee (5%)</span>
              <p className="text-xl sm:text-2xl font-black text-slate-700">
                -{formatCurrency(earnings.platform_fee)}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Maintenance & Gateway</span>
            </Card>

            <Card className="p-5 rounded-3xl border-emerald-200 bg-emerald-50/60 space-y-1 sm:col-span-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Net Host Settlement (95%)</span>
                <Badge variant="default" dot className="bg-emerald-600 text-white border-0 text-[10px]">
                  Authoritative Payout
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-950">
                {formatCurrency(earnings.total_earnings)}
              </p>
              <span className="text-xs text-emerald-700 font-semibold">
                Direct NEFT/IMPS settlement ({activeRangeLabel})
              </span>
            </Card>
          </div>

          {/* Earnings Timeline Graph Card */}
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Earnings Timeline ({activeRangeLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative net payout distribution over selected timeframe
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                {chartData.length} data points
              </span>
            </div>

            {/* Time-Series Chart Visualization */}
            <div className="pt-6 pb-2">
              <div className="flex items-end gap-1.5 sm:gap-3 h-52 w-full overflow-x-auto pb-2">
                {chartData.map((bar, idx) => {
                  const heightPercent = bar.amount > 0
                    ? Math.max(Math.round((bar.amount / maxAmount) * 100), 8)
                    : 4;

                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center gap-2 group h-full justify-end"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10 pointer-events-none">
                        {formatCurrency(bar.amount)}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          bar.amount > 0
                            ? "bg-gradient-to-t from-harvest-600 to-amber-500 group-hover:from-harvest-700 group-hover:to-amber-600 shadow-sm"
                            : "bg-slate-100"
                        }`}
                      />
                      <span className="text-[10px] font-semibold text-slate-500 truncate w-full text-center">
                        {bar.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accessible Footer */}
            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Backend authoritative ledger calculated from confirmed & fulfilled stays.</span>
              </div>
              <span className="font-semibold text-slate-700">
                Currency: <strong className="font-mono text-slate-900">{earnings.currency}</strong>
              </span>
            </div>
          </Card>

          {/* Section 2: Payout Balances & Bank Settlement */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Payouts & Bank Settlement
                </h2>
                <p className="text-xs text-slate-500">
                  Track disbursements transferred to your verified primary host bank account.
                </p>
              </div>
            </div>

            {/* 4 Payout Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Available for Payout */}
              <Card className="p-5 rounded-3xl border-emerald-200 bg-emerald-50/40 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">
                    Available for Payout
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-950">
                    {formatCurrency(payoutSummary?.available_balance || 0)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Unreleased eligible earnings
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenPayoutModal}
                  disabled={!payoutSummary || payoutSummary.available_balance <= 0}
                  className="w-full rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Request Payout
                </Button>
              </Card>

              {/* 2. In-Flight Processing */}
              <Card className="p-5 rounded-3xl border-slate-200 bg-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Processing</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(payoutSummary?.processing_balance || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">In-flight bank transfers</span>
                </div>
                <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 pt-1">
                  <Building2 className="h-3 w-3" />
                  <span>Clears in 1-2 business days</span>
                </div>
              </Card>

              {/* 3. Paid Out */}
              <Card className="p-5 rounded-3xl border-slate-200 bg-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Paid Out</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(payoutSummary?.paid_out_balance || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Total settled to bank</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium pt-1">
                  Reconciled against verified bank
                </div>
              </Card>

              {/* 4. Failed */}
              <Card className="p-5 rounded-3xl border-slate-200 bg-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Failed</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-rose-950">
                    {formatCurrency(payoutSummary?.failed_balance || 0)}
                  </p>
                  <span className="text-[10px] text-rose-600 font-medium">Requires host verification</span>
                </div>
                <div className="text-[10px] text-rose-700 font-medium pt-1">
                  Contact support for assistance
                </div>
              </Card>
            </div>

            {/* Payout History Table */}
            <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Disbursement History</h3>
                  <p className="text-xs text-slate-500">Record of electronic transfers issued to host bank account</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                  {payoutSummary?.payouts.length || 0} Transfers
                </span>
              </div>

              {payoutSummary && payoutSummary.payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3">Reference Code</th>
                        <th className="py-3 px-3">Disbursed Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Bank Account</th>
                        <th className="py-3 px-3">Date Initiated</th>
                        <th className="py-3 px-3">Settlement Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {payoutSummary.payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                            {payout.payout_code}
                          </td>
                          <td className="py-3.5 px-3 font-black text-slate-900">
                            {formatCurrency(payout.amount)}
                          </td>
                          <td className="py-3.5 px-3">
                            {getStatusBadge(payout.status)}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-500">
                            {payout.bank_account_last4 ? `•••• ${payout.bank_account_last4}` : "Verified Account"}
                          </td>
                          <td className="py-3.5 px-3 text-slate-500">
                            {payout.created_at ? formatDate(payout.created_at) : "Recent"}
                          </td>
                          <td className="py-3.5 px-3 text-slate-500">
                            {payout.processed_at ? formatDate(payout.processed_at) : "Processing"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No payout history yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Unreleased earnings will become available for withdrawal once guest stays and agricultural experiences are fulfilled.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}

      {/* Request Payout Modal */}
      {isModalOpen && payoutSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Request Bank Payout</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Transfer unreleased earnings directly to your primary verified bank account.
              </p>
            </div>

            {payoutError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
                {payoutError}
              </div>
            )}

            <form onSubmit={handleConfirmPayout} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Payout Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={payoutSummary.available_balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-8 pr-4 text-sm font-bold text-slate-900 focus:border-harvest-600 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  Available balance: <strong>{formatCurrency(payoutSummary.available_balance)}</strong>
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bank Account (Masked)</label>
                <input
                  type="text"
                  value={`State Bank of India (•••• ${bankLast4})`}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Branch IFSC</label>
                <input
                  type="text"
                  value={ifscCode}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmittingPayout}
                  className="flex-1 rounded-2xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="flex-1 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmittingPayout ? "Processing..." : "Confirm Payout"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
