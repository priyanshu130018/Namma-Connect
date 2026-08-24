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
} from "lucide-react";
import {
  getAdminOverview,
  getAdminUsers,
  getAdminPartners,
  getAdminVerificationQueue,
  verifyAdminPartner,
  getAdminServices,
  updateAdminServiceStatus,
  getAdminBookings,
  getAdminPayments,
  getAdminPayouts,
  updateAdminPayoutStatus,
  getAdminSupportTickets,
  getAdminSettings,
} from "@/services/adminService";
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
export function AdminVerificationPage() {
  const [queue, setQueue] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminVerificationQueue();
      setQueue(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load verification queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleVerificationAction = async (userId: string, action: "APPROVE" | "REJECT") => {
    setActionLoadingId(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      await verifyAdminPartner(userId, {
        action,
        notes: action === "APPROVE" ? "Approved by Admin Operations" : "Verification rejected",
      });
      setSuccessMsg(`Partner successfully ${action === "APPROVE" ? "approved and verified" : "rejected"}.`);
      fetchQueue();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} partner.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Host KYC Verification Queue" subtitle="Inspect partner accounts awaiting verification review." />

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchQueue} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Host Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">Loading verification queue...</td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-emerald-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ShieldCheck className="h-6 w-6" />
                      <span className="font-bold">Queue is clear! All host profiles verified.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                queue.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{p.full_name}</td>
                    <td className="px-6 py-4 text-slate-400">{p.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize border-slate-700 bg-slate-800 text-slate-300">
                        {p.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="warning">Awaiting Review</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={actionLoadingId === p.id}
                          onClick={() => handleVerificationAction(p.id, "APPROVE")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2.5 text-xs rounded-lg"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoadingId === p.id}
                          onClick={() => handleVerificationAction(p.id, "REJECT")}
                          className="h-7 px-2.5 text-xs rounded-lg"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
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
// 5. ADMIN SERVICES MODERATION
// ==========================================
export function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminServices({ status: statusFilter || undefined });
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

  const handleStatusChange = async (serviceId: string, status: "PUBLISHED" | "REJECTED" | "ARCHIVED") => {
    setActionLoadingId(serviceId);
    try {
      await updateAdminServiceStatus(serviceId, { status });
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to update status to ${status}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Service Listing Moderation" subtitle="Approve and moderate farm listings and experience packages." />
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchServices} className="border-slate-800 bg-slate-900 text-slate-300">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchServices} className="border-rose-700 text-rose-200">
            Retry
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
                <th className="px-6 py-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Loading listings...</td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No listings found matching filter.</td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{s.title}</div>
                      <div className="text-slate-400">{s.location}, {s.district}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">{s.provider_name}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                        {s.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">₹{s.price.toLocaleString()} / {s.unit}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          s.status === "PUBLISHED"
                            ? "default"
                            : s.status === "REJECTED"
                            ? "destructive"
                            : "outline"
                        }
                        className={s.status === "PUBLISHED" ? "bg-emerald-600 text-white" : ""}
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status !== "PUBLISHED" && (
                          <Button
                            size="sm"
                            disabled={actionLoadingId === s.id}
                            onClick={() => handleStatusChange(s.id, "PUBLISHED")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2 text-xs rounded-lg"
                          >
                            Publish
                          </Button>
                        )}
                        {s.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoadingId === s.id}
                            onClick={() => handleStatusChange(s.id, "REJECTED")}
                            className="h-7 px-2 text-xs rounded-lg"
                          >
                            Reject
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
