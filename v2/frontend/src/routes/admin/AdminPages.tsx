import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  CheckSquare,
  Layers,
  Calendar,
  CreditCard,
  Banknote,
  LifeBuoy,
  Settings as SettingsIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Ban,
  Trash2,
  MapPin,
} from "lucide-react";
import {
  getAdminOverview,
  getAdminUsers,
  getAdminPartners,
  getAdminServices,
  approveAdminService,
  rejectAdminService,
  removeAdminService,
  blockAdminProvider,
  getAdminBookings,
  getAdminPayments,
  getAdminPayouts,
  updateAdminPayoutStatus,
  getAdminSupportTickets,
  getAdminSettings,
  getAdminPartnerApplications,
  approveAdminPartnerApplication,
  rejectAdminPartnerApplication,
} from "@/services/adminService";
import { PartnerApplicationData } from "@/services/partnerApplicationService";
import {
  AdminOverviewData,
  AdminUserItem,
  ServiceItem,
  ProviderBookingItem,
  AdminPaymentAuditItem,
  PayoutItem,
  AdminSupportTicketItem,
  AdminPlatformSettings,
} from "@/types";

// ==========================================
// 1. ADMIN OVERVIEW / HOME PAGE
// ==========================================
export function AdminHomePage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminOverview();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin overview metrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Admin Operations Control Center"
          subtitle="Platform health, GMV analytics, KYC approval queue, and system moderation."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          disabled={isLoading}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 p-4 text-xs text-rose-300">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Error Loading Overview</p>
            <p className="text-slate-400 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOverview} className="border-rose-700 bg-rose-900/40 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Users</span>
              <Users className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{data.total_users.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Customers, Hosts, and Admins</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Partner Farms</span>
              <Building2 className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{data.total_partners.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Verified & registered hosts</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">KYC Pending</span>
              <CheckSquare className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{data.pending_verifications}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting document inspection</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Published Listings</span>
              <Layers className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{data.published_services}</p>
            <p className="text-[11px] text-slate-400 mt-1">Active on marketplace</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Bookings</span>
              <Calendar className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{data.total_bookings.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Lifetime reservations</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Gross Platform GMV</span>
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">₹{data.total_revenue.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1">Settled transactions</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Pending Payouts</span>
              <Banknote className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{data.pending_payouts}</p>
            <p className="text-[11px] text-slate-400 mt-1">In-flight bank disbursements</p>
          </Card>

          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Support Inquiries</span>
              <LifeBuoy className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{data.open_support_tickets}</p>
            <p className="text-[11px] text-slate-400 mt-1">Open support tickets</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ==========================================
// 2. ADMIN USERS DIRECTORY
// ==========================================
export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers({ role: roleFilter || undefined, search: searchQuery || undefined });
      setUsers(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user directory");
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <PageHeader title="User Directory" subtitle="Manage accounts, user roles, and account access status." />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="partner">Partner / Host</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchUsers} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">Loading user accounts...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No user accounts found matching filters.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize border-slate-700 bg-slate-800 text-slate-300">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_active ? "default" : "destructive"}>
                        {u.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_verified ? "default" : "outline"} className={u.is_verified ? "bg-emerald-600 text-white" : "border-slate-700 text-slate-400"}>
                        {u.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 3. ADMIN PARTNERS DIRECTORY
// ==========================================
export function AdminPartnersPage() {
  const [partners, setPartners] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPartners();
      setPartners(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load partner hosts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return (
    <div className="space-y-6">
      <PageHeader title="Partner Directory" subtitle="All registered farm hosts and agricultural organizations." />
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchPartners} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}
      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Host / Partner</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">KYC State</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">Loading partner hosts...</td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No partner hosts found.</td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{p.full_name}</div>
                      <div className="text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize border-slate-700 bg-slate-800 text-slate-300">
                        {p.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p.is_verified ? "default" : "warning"} className={p.is_verified ? "bg-emerald-600 text-white" : ""}>
                        {p.is_verified ? "KYC Approved" : "KYC Pending"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p.is_active ? "default" : "destructive"}>
                        {p.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 4. ADMIN PARTNER VERIFICATION QUEUE
// ==========================================
// ==========================================
// 4. ADMIN PARTNER VERIFICATION QUEUE
// ==========================================
export function AdminVerificationPage() {
  const [applications, setApplications] = useState<PartnerApplicationData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal inspection states
  const [selectedApp, setSelectedApp] = useState<PartnerApplicationData | null>(null);
  const [rejectingApp, setRejectingApp] = useState<PartnerApplicationData | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPartnerApplications({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setApplications(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load partner applications queue.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (app: PartnerApplicationData) => {
    setActionLoadingId(app.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await approveAdminPartnerApplication(app.id);
      setSuccessMsg(`Application #${app.application_code} for ${app.full_name} (${app.business_name}) has been approved!`);
      if (selectedApp?.id === app.id) setSelectedApp(null);
      fetchApplications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve partner application.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    if (!rejectionReasonInput.trim()) {
      setRejectionError("Please provide a valid explanation for why this application requires changes.");
      return;
    }
    setActionLoadingId(rejectingApp.id);
    setRejectionError(null);
    setError(null);
    setSuccessMsg(null);
    try {
      await rejectAdminPartnerApplication(rejectingApp.id, rejectionReasonInput.trim());
      setSuccessMsg(`Application #${rejectingApp.application_code} was rejected with feedback.`);
      setRejectingApp(null);
      setRejectionReasonInput("");
      if (selectedApp?.id === rejectingApp.id) setSelectedApp(null);
      fetchApplications();
    } catch (err: unknown) {
      setRejectionError(err instanceof Error ? err.message : "Failed to reject partner application.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st.toUpperCase()) {
      case "APPROVED":
        return <Badge className="bg-emerald-600 text-white border-0">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Needs Changes</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white border-0">Pending Verification</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Host KYC Verification Queue"
        subtitle="Inspect agricultural hosts, rural guides, and accommodations awaiting platform verification."
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: "PENDING", label: "Pending Review" },
            { id: "APPROVED", label: "Approved" },
            { id: "REJECTED", label: "Rejected" },
            { id: "ALL", label: "All Applications" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchApplications}
          disabled={isLoading}
          className="border-slate-700 text-slate-300 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchApplications} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">App Code</th>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Business / Farm</th>
                <th className="px-6 py-4">Host Role</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading partner verification queue...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-emerald-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ShieldCheck className="h-6 w-6" />
                      <span className="font-bold">No applications found in this queue.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      {app.application_code}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{app.full_name}</p>
                      <p className="text-[11px] text-slate-400">{app.email} &bull; {app.mobile}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-200">{app.business_name}</p>
                      <p className="text-[11px] text-slate-400">{app.experience_years} yrs exp</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize border-slate-700 bg-slate-800 text-slate-200 font-bold">
                        {app.role_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {app.district}, {app.state}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedApp(app)}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-700 hover:bg-slate-800 text-slate-200"
                        >
                          View Details
                        </Button>
                        {app.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              disabled={actionLoadingId === app.id}
                              onClick={() => handleApprove(app)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2.5 text-xs rounded-lg"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoadingId === app.id}
                              onClick={() => {
                                setRejectingApp(app);
                                setRejectionReasonInput("");
                                setRejectionError(null);
                              }}
                              className="h-7 px-2.5 text-xs rounded-lg"
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================== */}
      {/* APPLICATION DETAIL INSPECTION MODAL */}
      {/* ========================================== */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Application #{selectedApp.application_code}</h3>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submitted: {new Date(selectedApp.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rejection notice if previously rejected */}
            {selectedApp.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                <span className="font-bold">Rejection Feedback: </span>
                {selectedApp.rejection_reason}
              </div>
            )}

            {/* Grid Sections */}
            <div className="space-y-4 text-xs">
              {/* 1. Personal & Contact */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Personal &amp; Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Applicant:</span>
                    <p className="font-bold text-white">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Mobile:</span>
                    <p className="font-bold text-white">{selectedApp.mobile}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-bold text-white">{selectedApp.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <p className="font-bold text-white">{selectedApp.address}, {selectedApp.district}, {selectedApp.state}</p>
                    {selectedApp.latitude && selectedApp.longitude && (
                      <p className="text-[10px] text-emerald-400 mt-0.5">GPS: {selectedApp.latitude}, {selectedApp.longitude}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Professional & Business */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Professional Profile</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Host Role:</span>
                    <p className="font-bold text-white capitalize">{selectedApp.role_type}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Business / Farm Name:</span>
                    <p className="font-bold text-white">{selectedApp.business_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Experience:</span>
                    <p className="font-bold text-white">{selectedApp.experience_years} Years</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Languages:</span>
                    <p className="font-bold text-white">{selectedApp.languages || "None specified"}</p>
                  </div>
                  {selectedApp.bio && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Bio &amp; Story:</span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        {selectedApp.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Services & Activities */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Offered Services ({selectedApp.services?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.services?.map((s, i) => (
                      <Badge key={i} className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Offered Activities ({selectedApp.activities?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.activities?.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-teal-300 border-teal-800 text-[11px]">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. KYC & Verification Document */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Identity &amp; KYC Verification</span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Document Type &amp; Number:</span>
                    <p className="font-bold text-white">{selectedApp.id_type} &bull; <span className="font-mono text-emerald-400">{selectedApp.id_number}</span></p>
                  </div>
                  <div>
                    {selectedApp.document_url ? (
                      <a
                        href={selectedApp.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        <span>View Uploaded Document</span>
                      </a>
                    ) : (
                      <span className="text-slate-500 italic text-xs">No file uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setSelectedApp(null)}
                className="border-slate-700 text-slate-300"
              >
                Close
              </Button>
              {selectedApp.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRejectingApp(selectedApp);
                      setRejectionReasonInput("");
                      setRejectionError(null);
                    }}
                    className="font-bold"
                  >
                    Reject with Feedback
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={actionLoadingId === selectedApp.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Approve Application
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* REJECTION REASON PROMPT DIALOG */}
      {/* ========================================== */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">Reject Partner Application</h3>
            <p className="text-xs text-slate-400">
              Provide feedback for <strong>{rejectingApp.full_name}</strong>. This message will be sent to the applicant and displayed on their reapplication dashboard.
            </p>

            {rejectionError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {rejectionError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Reason for changes / rejection *</label>
              <textarea
                rows={4}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Please upload a clearer copy of your RTC / Land record showing owner name matching applicant..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setRejectingApp(null)}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectingApp.id}
                className="font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. ADMIN SERVICES MODERATION
// ==========================================
export function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [rejectingService, setRejectingService] = useState<ServiceItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [removingService, setRemovingService] = useState<ServiceItem | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [blockingProvider, setBlockingProvider] = useState<{ providerId: string; providerName: string } | null>(null);
  const [blockReason, setBlockReason] = useState<string>("");

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParam = statusFilter === "ALL" ? undefined : statusFilter;
      const res = await getAdminServices({ status: filterParam });
      setServices(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace listings");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleApprove = async (service: ServiceItem) => {
    setActionLoadingId(service.id);
    try {
      await approveAdminService(service.id);
      setIsDetailOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to approve service '${service.title}'`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingService) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setError("Please provide a valid rejection reason (minimum 3 characters).");
      return;
    }
    setActionLoadingId(rejectingService.id);
    try {
      await rejectAdminService(rejectingService.id, rejectionReason.trim());
      setRejectingService(null);
      setRejectionReason("");
      setIsDetailOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to reject service '${rejectingService.title}'`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removingService) return;
    if (!removalReason.trim() || removalReason.trim().length < 3) {
      setError("Please provide a valid removal reason (minimum 3 characters).");
      return;
    }
    setActionLoadingId(removingService.id);
    try {
      await removeAdminService(removingService.id, removalReason.trim());
      setRemovingService(null);
      setRemovalReason("");
      setIsDetailOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to remove service '${removingService.title}'`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockProviderConfirm = async () => {
    if (!blockingProvider) return;
    if (!blockReason.trim() || blockReason.trim().length < 3) {
      setError("Please provide a valid provider suspension reason (minimum 3 characters).");
      return;
    }
    setActionLoadingId(blockingProvider.providerId);
    try {
      await blockAdminProvider(blockingProvider.providerId, blockReason.trim());
      setBlockingProvider(null);
      setBlockReason("");
      setIsDetailOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to block provider '${blockingProvider.providerName}'`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDetail = (s: ServiceItem) => {
    setSelectedService(s);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Service Listing Moderation"
          subtitle="Audit, approve, reject, or remove farm stays and agro-experience listings."
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchServices} className="border-slate-800 bg-slate-900 text-slate-300">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
        {[
          { key: "PENDING", label: "Pending Review" },
          { key: "PUBLISHED", label: "Published" },
          { key: "REJECTED", label: "Rejected" },
          { key: "REMOVED", label: "Removed / Suspended" },
          { key: "ALL", label: "All Listings" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              statusFilter === tab.key
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => setError(null)} className="border-rose-700 text-rose-200">
            Dismiss
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Host / Provider</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-400" />
                    Loading listings for moderation queue...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No listings found matching filter '{statusFilter}'.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{s.title}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-500" /> {s.location}, {s.district}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{s.provider_name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {s.provider_verified ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                            <ShieldCheck className="h-3 w-3" /> Verified Partner
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded">
                            <ShieldAlert className="h-3 w-3" /> Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                        {s.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      ₹{s.price.toLocaleString()} / {s.unit}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          s.status === "PUBLISHED"
                            ? "default"
                            : s.status === "REJECTED"
                            ? "destructive"
                            : s.status === "REMOVED"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          s.status === "PUBLISHED"
                            ? "bg-emerald-600 text-white font-bold"
                            : s.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : s.status === "REMOVED"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : ""
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetail(s)}
                          className="h-8 px-2.5 text-xs rounded-lg border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          title="Inspect Full Listing Details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>

                        {s.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              disabled={actionLoadingId === s.id}
                              onClick={() => handleApprove(s)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 px-2.5 text-xs rounded-lg shadow-sm"
                              title="Approve & Publish Listing"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoadingId === s.id}
                              onClick={() => {
                                setRejectingService(s);
                                setRejectionReason("");
                              }}
                              className="h-8 px-2.5 text-xs rounded-lg"
                              title="Reject Listing with Reason"
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}

                        {s.status === "PUBLISHED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoadingId === s.id}
                            onClick={() => {
                              setRemovingService(s);
                              setRemovalReason("");
                            }}
                            className="bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 h-8 px-2.5 text-xs rounded-lg"
                            title="Remove Service from Marketplace"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        )}

                        {s.provider_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingId === s.provider_id}
                            onClick={() => {
                              setBlockingProvider({
                                providerId: s.provider_id!,
                                providerName: s.provider_name,
                              });
                              setBlockReason("");
                            }}
                            className="h-8 px-2 text-xs rounded-lg border-amber-800/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50"
                            title="Suspend/Block Provider Account"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SERVICE DETAIL INSPECTION MODAL */}
      {isDetailOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedService.title}</h3>
                  <Badge
                    variant={
                      selectedService.status === "PUBLISHED"
                        ? "default"
                        : selectedService.status === "REJECTED"
                        ? "destructive"
                        : "outline"
                    }
                    className={
                      selectedService.status === "PUBLISHED"
                        ? "bg-emerald-600 text-white"
                        : selectedService.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : ""
                    }
                  >
                    {selectedService.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {selectedService.location}, {selectedService.district}, {selectedService.state}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Host / Provider Information Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Host / Provider Information</span>
                  {selectedService.provider_verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Partner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded text-[10px]">
                      <ShieldAlert className="h-3.5 w-3.5" /> Unverified Account
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500">Name:</span> {selectedService.provider_name}
                  </div>
                  <div>
                    <span className="text-slate-500">Role / Type:</span> {selectedService.provider_type}
                  </div>
                  {selectedService.provider_email && (
                    <div>
                      <span className="text-slate-500">Email:</span> {selectedService.provider_email}
                    </div>
                  )}
                  {selectedService.provider_mobile && (
                    <div>
                      <span className="text-slate-500">Mobile:</span> {selectedService.provider_mobile}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Category</span>
                  <span className="font-semibold text-slate-200">{selectedService.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Pricing</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{selectedService.price.toLocaleString()} / {selectedService.unit}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Capacity & Duration</span>
                  <span className="font-semibold text-slate-200">
                    {selectedService.max_capacity ? `Up to ${selectedService.max_capacity} guests` : "Standard capacity"}
                    {selectedService.duration_hours ? ` • ${selectedService.duration_hours} hrs` : ""}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
                <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap">
                  {selectedService.description}
                </p>
              </div>

              {/* Inclusions & Amenities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedService.inclusions && selectedService.inclusions.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Inclusions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedService.inclusions.map((item, idx) => (
                        <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-300">
                          ✓ {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedService.amenities && selectedService.amenities.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedService.amenities.map((item, idx) => (
                        <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-300">
                          • {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection / Removal Reason History if applicable */}
              {selectedService.rejection_reason && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                    Moderation Note / Reason
                  </div>
                  <p className="text-rose-200">{selectedService.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="border-slate-800 text-slate-400"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                {selectedService.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectingService(selectedService);
                        setRejectionReason("");
                      }}
                      className="px-4 font-semibold"
                    >
                      <X className="h-4 w-4 mr-1.5" /> Reject Listing
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedService)}
                      disabled={actionLoadingId === selectedService.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
                    >
                      <Check className="h-4 w-4 mr-1.5" /> Approve & Publish
                    </Button>
                  </>
                )}

                {selectedService.status === "PUBLISHED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setRemovingService(selectedService);
                      setRemovalReason("");
                    }}
                    className="bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-700 px-4 font-semibold"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Remove from Marketplace
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG */}
      {rejectingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reject Service Listing</h3>
            <p className="text-xs text-slate-400">
              Please provide a clear reason for rejecting <span className="text-white font-semibold">{rejectingService.title}</span>. This feedback will be sent to the host.
            </p>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Inaccurate pricing details, photos do not meet quality guidelines, or missing required farm safety documentation."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingService(null)}
                className="border-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoadingId === rejectingService.id || !rejectionReason.trim()}
                onClick={handleRejectConfirm}
                className="font-bold px-4"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVAL REASON DIALOG */}
      {removingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Remove Listing from Marketplace</h3>
            <p className="text-xs text-slate-400">
              Removing <span className="text-white font-semibold">{removingService.title}</span> will immediately hide it from public search and booking.
            </p>
            <textarea
              rows={4}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="e.g. Policy violation, fraudulent photos, or duplicate listing."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRemovingService(null)}
                className="border-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoadingId === removingService.id || !removalReason.trim()}
                onClick={handleRemoveConfirm}
                className="bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-700 font-bold px-4"
              >
                Remove Listing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCK PROVIDER CONFIRMATION DIALOG */}
      {blockingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-base font-bold text-white">Suspend Provider Account</h3>
            </div>
            <p className="text-xs text-slate-400">
              Blocking <span className="text-white font-semibold">{blockingProvider.providerName}</span> will suspend their account and remove all of their active and pending listings from the marketplace.
            </p>
            <textarea
              rows={4}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Repeated violation of hosting terms, verified fraud report, or invalid KYC documents."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlockingProvider(null)}
                className="border-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoadingId === blockingProvider.providerId || !blockReason.trim()}
                onClick={handleBlockProviderConfirm}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4"
              >
                Suspend & Remove Listings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. ADMIN BOOKINGS MANAGEMENT
// ==========================================
export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<ProviderBookingItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminBookings({ status: statusFilter || undefined });
      setBookings(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Global Bookings & Disputes" subtitle="System-wide reservations and guest dispute mediation." />
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Bookings</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchBookings} className="border-slate-800 bg-slate-900 text-slate-300">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchBookings} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Ref Code</th>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Experience / Farm</th>
                <th className="px-6 py-4">Dates & Guests</th>
                <th className="px-6 py-4">Total GMV</th>
                <th className="px-6 py-4">Booking Status</th>
                <th className="px-6 py-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Loading global reservations...</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">No reservations found matching filter.</td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{b.booking_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{b.customer_name}</div>
                      <div className="text-slate-400">{b.customer_email || "—"}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{b.service_title}</td>
                    <td className="px-6 py-4 text-slate-400">
                      <div>{b.start_date}</div>
                      <div>{b.guest_count} guest{b.guest_count > 1 ? "s" : ""}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">₹{b.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          b.status === "COMPLETED" || b.status === "CONFIRMED"
                            ? "default"
                            : b.status === "CANCELLED"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={b.payment_status === "PAID" ? "default" : "outline"}
                        className={b.payment_status === "PAID" ? "bg-emerald-600 text-white" : "border-slate-700 text-slate-400"}
                      >
                        {b.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 7. ADMIN PAYMENTS AUDIT
// ==========================================
export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPayments();
      setPayments(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment transactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Payment Transactions Audit" subtitle="Razorpay payment settlements, fees, and audit ledger." />
        <Button variant="outline" size="sm" onClick={fetchPayments} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchPayments} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Gateway Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading payment audit records...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No payment records found.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">{p.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{p.razorpay_order_id}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">₹{p.amount.toLocaleString()} {p.currency}</td>
                    <td className="px-6 py-4">
                      <Badge variant={p.status === "PAID" ? "default" : "destructive"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 uppercase font-mono">{p.method || "RAZORPAY"}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 8. ADMIN PAYOUTS LEDGER
// ==========================================
export function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPayouts();
      setPayouts(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payouts ledger");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleUpdateStatus = async (payoutId: string, status: "COMPLETED" | "FAILED") => {
    setActionLoadingId(payoutId);
    try {
      await updateAdminPayoutStatus(payoutId, { status });
      fetchPayouts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to update payout to ${status}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Host Payouts Ledger" subtitle="Review and moderate automated bank payouts to farm hosts." />
        <Button variant="outline" size="sm" onClick={fetchPayouts} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchPayouts} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Disbursement Amount</th>
                <th className="px-6 py-4">Destination Bank</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dispatched Date</th>
                <th className="px-6 py-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading payouts ledger...</td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No payout records found.</td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{p.payout_code}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">₹{p.amount.toLocaleString()} {p.currency}</td>
                    <td className="px-6 py-4 text-slate-300">
                      <div>•••• {p.bank_account_last4 || "4092"}</div>
                      <div className="text-[11px] text-slate-500">{p.ifsc_code || "SBIN0001234"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          p.status === "COMPLETED"
                            ? "default"
                            : p.status === "FAILED"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === "PENDING" || p.status === "PROCESSING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={actionLoadingId === p.id}
                            onClick={() => handleUpdateStatus(p.id, "COMPLETED")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2 text-xs rounded-lg"
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoadingId === p.id}
                            onClick={() => handleUpdateStatus(p.id, "FAILED")}
                            className="h-7 px-2 text-xs rounded-lg"
                          >
                            Fail
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 9. ADMIN SUPPORT TICKETS
// ==========================================
export function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminSupportTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminSupportTickets();
      setTickets(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support inquiries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Support Tickets Queue" subtitle="Manage customer and host support inquiries and grievances." />
        <Button variant="outline" size="sm" onClick={fetchTickets} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchTickets} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading support queue...</td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No open support tickets.</td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{t.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{t.user_name}</div>
                      <div className="text-slate-400">{t.user_email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{t.subject}</td>
                    <td className="px-6 py-4 text-slate-400">{t.category}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          t.priority === "URGENT" || t.priority === "HIGH"
                            ? "destructive"
                            : t.priority === "MEDIUM"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={t.status === "OPEN" ? "warning" : "default"}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 10. ADMIN SETTINGS
// ==========================================
export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminSettings();
      setSettings(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load platform settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Platform Settings"
        subtitle="Platform commission rate, operational currency, and server-authoritative configuration."
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchSettings} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-8 bg-slate-900 border-slate-800 text-slate-400 text-center animate-pulse">
          Loading platform settings...
        </Card>
      ) : settings ? (
        <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <SettingsIcon className="h-6 w-6 text-rose-400" />
            <div>
              <h3 className="font-bold text-sm">Active Platform Configuration</h3>
              <p className="text-xs text-slate-400">Server-enforced marketplace rates and financial policies.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Platform Name</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold">{settings.platform_name}</div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Platform Take-Rate (Commission)</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold text-emerald-400">
                {(settings.commission_rate * 100).toFixed(0)}% (Host receives 95% net settlement)
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Operating Currency</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold">{settings.currency} (₹ INR)</div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Environment Tier</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold uppercase text-rose-400">
                {settings.environment}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Support Contact Email</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold">{settings.support_email}</div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Maintenance Mode</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-bold">
                <Badge variant={settings.is_maintenance_mode ? "destructive" : "default"}>
                  {settings.is_maintenance_mode ? "Enabled" : "Disabled (Live)"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
