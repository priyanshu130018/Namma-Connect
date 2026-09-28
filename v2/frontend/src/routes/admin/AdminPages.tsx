import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useParams, Link } from "react-router-dom";
import {
  Users,
  Building2,
  CheckSquare,
  Layers,
  Calendar,
  RefreshCw,
  Search,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  Ticket,
  ArrowLeft,
  ClipboardList,
  Coins,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { normalizeApiError } from "@/lib/api-error";
import {
  OverviewCardsSkeleton,
  TableSkeleton,
  ChartSkeleton,
  DetailPageSkeleton,
  DashboardSkeleton,
} from "@/components/admin/AdminSkeleton";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminToast, ToastMessage } from "@/components/admin/AdminToast";

import {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUserStatus,
  getAdminPartners,
  getAdminProviders,
  getAdminVerificationQueue,
  verifyAdminPartner,
  getAdminPartnerApplications,
  approveAdminPartnerApplication,
  getAdminServices,
  approveAdminService,
  rejectAdminService,
  getAdminBookings,
  getAdminPayments,
  getAdminPayouts,
  updateAdminPayoutStatus,
  getAdminSettings,
  getAdminReviews,
  moderateAdminReview,
  getAdminReports,
  getAdminSupportTickets,
} from "@/services/adminService";
import {
  AdminOverviewData,
  AdminUserItem,
  ServiceItem,
  ProviderBookingItem,
  AdminPaymentAuditItem,
  AdminSupportTicketItem,
  AdminReviewItem,
  AdminReportData,
  PayoutItem,
  AdminPlatformSettings,
} from "@/types";
import { formatCurrency } from "@/lib/utils";

// ==========================================
// 1. DASHBOARD (/admin)
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
      const normErr = normalizeApiError(err, "Unable to load admin overview metrics. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  const overviewCards = [
    { label: "Total Users", value: data?.total_users ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Total Providers", value: data?.total_partners ?? 0, icon: Building2, color: "text-harvest-700 bg-harvest-50" },
    { label: "Active Listings", value: data?.published_services ?? 0, icon: Layers, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Bookings", value: data?.total_bookings ?? 0, icon: Calendar, color: "text-purple-600 bg-purple-50" },
    { label: "Platform Revenue", value: formatCurrency(data?.total_revenue ?? 0), icon: DollarSign, color: "text-teal-600 bg-teal-50" },
    { label: "Pending KYC", value: data?.pending_verifications ?? 0, icon: CheckSquare, color: "text-amber-600 bg-amber-50" },
    { label: "Pending Listings", value: 0, icon: Layers, color: "text-orange-600 bg-orange-50" },
    { label: "Open Tickets", value: data?.open_support_tickets ?? 0, icon: Ticket, color: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Admin Operations Control Center"
          subtitle="Real-time platform overview, user metrics, governance, and audit stats."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          disabled={isLoading}
          className="rounded-xl font-bold text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <AdminErrorState
          title="Overview Error"
          message={error}
          onRetry={fetchOverview}
          isRetrying={isLoading}
        />
      )}

      {/* 8 Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, idx) => (
          <Card key={idx} className="p-5 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {card.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Independent Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Recent Activity</span>
          </h3>
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            No recent activity
          </div>
        </Card>

        {/* Booking Overview */}
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>Booking Overview</span>
          </h3>
          {data?.total_bookings && data.total_bookings > 0 ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Total Bookings</span>
                <span className="font-bold">{data.total_bookings}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No booking data available yet.
            </div>
          )}
        </Card>

        {/* Revenue Overview */}
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-3">
            <DollarSign className="h-4 w-4 text-slate-500" />
            <span>Revenue Overview</span>
          </h3>
          {data?.total_revenue && data.total_revenue > 0 ? (
            <div className="text-center py-4">
              <span className="text-2xl font-black text-emerald-600">₹{(data.total_revenue / 100000).toFixed(2)} Lakhs</span>
              <p className="text-xs text-slate-500 mt-1">Settled Platform Revenue</p>
            </div>
          ) : (
            <div className="p-8 text-center space-y-1">
              <span className="text-xl font-black text-slate-900 dark:text-white">₹0</span>
              <p className="text-xs text-slate-400 font-medium">No revenue data available yet.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 2. USERS (/admin/users)
// ==========================================
export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const nameQuery = searchParams.get("name") || searchParams.get("search") || "";
  const idQuery = searchParams.get("id") || "";
  const statusFilter = searchParams.get("status") || "";

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmUser, setConfirmUser] = useState<AdminUserItem | null>(null);

  const requestSeq = useRef(0);

  const fetchUsers = useCallback(async () => {
    const seq = ++requestSeq.current;
    if (users.length === 0) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    setError(null);
    try {
      const is_active = statusFilter === "active" ? true : statusFilter === "disabled" || statusFilter === "suspended" ? false : undefined;
      const res = await getAdminUsers({
        search: nameQuery || idQuery || undefined,
        is_active,
        limit: 200,
      });
      if (seq === requestSeq.current) {
        setUsers(res || []);
      }
    } catch (err: unknown) {
      if (seq === requestSeq.current) {
        const normErr = normalizeApiError(err, "Unable to load users. Please try again.");
        setError(normErr.message);
      }
    } finally {
      if (seq === requestSeq.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [nameQuery, idQuery, statusFilter, users.length]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: limit.toString() });
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    setActionLoadingId(user.id);
    try {
      const nextStatus = !user.is_active;
      await updateAdminUserStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
      setToast({
        id: Date.now().toString(),
        message: nextStatus ? "User activated successfully." : "User suspended successfully.",
        type: "success",
      });
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to update user status. Please try again.");
      setToast({ id: Date.now().toString(), message: normErr.message, type: "error" });
    } finally {
      setActionLoadingId(null);
      setConfirmUser(null);
    }
  };

  const totalRecords = users.length;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return users.slice(start, start + limit);
  }, [users, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="User Directory" subtitle="Manage registered customers, hosts, and account statuses." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && users.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchUsers} isRetrying={isLoading} />
      )}

      {/* Filter Bar */}
      <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={nameQuery}
              onChange={(e) => updateFilters({ name: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-harvest-500"
            />
          </div>

          <input
            type="text"
            placeholder="User ID..."
            value={idQuery}
            onChange={(e) => updateFilters({ id: e.target.value })}
            className="w-36 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled / Suspended</option>
          </select>

          {(nameQuery || idQuery || statusFilter) && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs font-bold text-rose-600">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Content Rendering */}
      {isLoading && users.length === 0 ? (
        <TableSkeleton headers={["User", "Email", "Phone", "Status", "Created At", "Actions"]} />
      ) : users.length === 0 ? (
        <AdminEmptyState
          title="No users found"
          description="There are currently no users matching your filter parameters."
          icon={Users}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                      {u.full_name}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-6 py-3.5 text-slate-500">{u.phone || "—"}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={u.is_active ? "default" : "destructive"} className="text-[10px] font-bold">
                        {u.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/users/${u.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold">
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant={u.is_active ? "destructive" : "default"}
                          disabled={actionLoadingId === u.id || u.role === "admin"}
                          onClick={() => {
                            if (u.is_active) {
                              setConfirmUser(u);
                            } else {
                              handleToggleStatus(u);
                            }
                          }}
                          className="h-7 text-[11px] font-bold"
                        >
                          {actionLoadingId === u.id
                            ? u.is_active
                              ? "Suspending..."
                              : "Activating..."
                            : u.is_active
                            ? "Suspend"
                            : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}

      {/* Confirm Suspend Modal */}
      <ConfirmModal
        isOpen={!!confirmUser}
        title="Suspend User Account?"
        description={`This will suspend ${confirmUser?.full_name}'s account and restrict access.`}
        confirmLabel="Suspend User"
        confirmLoadingLabel="Suspending..."
        isLoading={actionLoadingId === confirmUser?.id}
        onConfirm={() => confirmUser && handleToggleStatus(confirmUser)}
        onCancel={() => setConfirmUser(null)}
      />

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ==========================================
// 3. USER DETAILS (/admin/users/:id)
// ==========================================
export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    getAdminUserDetail(id)
      .then((res) => setUser(res))
      .catch((err) => {
        const normErr = normalizeApiError(err, "The requested user could not be found.");
        setError(normErr.message);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto pb-12">
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")} className="rounded-xl text-xs font-bold">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
        </Button>
        <AdminErrorState title="Resource not found" message={error || "The requested user could not be found."} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")} className="rounded-xl text-xs font-bold">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <PageHeader title={user.full_name} subtitle={`User ID: ${user.id}`} />
      </div>

      {/* Overview Card */}
      <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white border-b pb-3">Personal & Account Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Full Name</span>
            <span className="font-bold text-slate-900 dark:text-white">{user.full_name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Email Address</span>
            <span className="font-bold text-slate-900 dark:text-white">{user.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Phone Number</span>
            <span className="font-bold text-slate-900 dark:text-white">{user.phone || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Account Status</span>
            <Badge variant={user.is_active ? "default" : "destructive"} className="mt-0.5 text-[10px] font-bold">
              {user.is_active ? "Active" : "Suspended"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Sub-sections with clean empty states */}
      <div className="space-y-6">
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">Booking History</h3>
          <div className="p-8 text-center text-xs text-slate-400 font-medium">No booking history available</div>
        </Card>

        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">Payment History</h3>
          <div className="p-8 text-center text-xs text-slate-400 font-medium">No payment history available</div>
        </Card>

        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">Reviews</h3>
          <div className="p-8 text-center text-xs text-slate-400 font-medium">No reviews written yet</div>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 4. PROVIDERS (/admin/providers)
// ==========================================
export function AdminProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const nameQuery = searchParams.get("name") || searchParams.get("search") || "";
  const idQuery = searchParams.get("id") || "";
  const statusFilter = searchParams.get("status") || "";
  const typeFilter = searchParams.get("type") || "";
  const kycStatusFilter = searchParams.get("kyc_status") || "";

  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const fetchProviders = useCallback(async () => {
    if (providers.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminProviders({
        search: nameQuery || idQuery || undefined,
        kyc_status: kycStatusFilter || undefined,
        limit: 200,
      });
      setProviders(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load providers. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [nameQuery, idQuery, kycStatusFilter, providers.length]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: limit.toString() });
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "disabled" && p.is_active) return false;
      if (typeFilter && p.provider_type?.toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
  }, [providers, statusFilter, typeFilter]);

  const totalRecords = filteredProviders.length;
  const paginatedProviders = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredProviders.slice(start, start + limit);
  }, [filteredProviders, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="All Providers" subtitle="Directory of verified hosts, activity managers, stay providers, and creators." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && providers.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchProviders} isRetrying={isLoading} />
      )}

      {/* Filter Bar */}
      <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search provider name or email..."
              value={nameQuery}
              onChange={(e) => updateFilters({ name: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 pl-9 pr-3 text-xs focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Provider Types</option>
            <option value="Activity">Activity</option>
            <option value="Hotel & Stay">Hotel & Stay</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Content Creator">Content Creator</option>
          </select>

          <select
            value={kycStatusFilter}
            onChange={(e) => updateFilters({ kyc_status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All KYC Statuses</option>
            <option value="APPROVED">Approved / Verified</option>
            <option value="PENDING">Pending KYC</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Suspended</option>
          </select>

          {(nameQuery || typeFilter || kycStatusFilter || statusFilter) && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs font-bold text-rose-600">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Table or Empty State */}
      {isLoading && providers.length === 0 ? (
        <TableSkeleton headers={["Provider", "Provider Type", "Listings", "Bookings", "Earnings", "NC Score", "KYC Status", "Account Status", "Created At"]} />
      ) : providers.length === 0 ? (
        <AdminEmptyState
          title="No providers found"
          description="There are currently no provider records matching your filter parameters."
          icon={Building2}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Provider</th>
                  <th className="px-6 py-3.5">Provider Type</th>
                  <th className="px-6 py-3.5 text-center">Listings</th>
                  <th className="px-6 py-3.5 text-center">Bookings</th>
                  <th className="px-6 py-3.5 text-right">Earnings</th>
                  <th className="px-6 py-3.5 text-center">NC Score</th>
                  <th className="px-6 py-3.5">KYC Status</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProviders.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                      {p.business_name || p.full_name || p.email}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{p.provider_type || "Activity"}</td>
                    <td className="px-6 py-3.5 text-center font-bold">{p.service_count || 0}</td>
                    <td className="px-6 py-3.5 text-center font-bold">0</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">₹0</td>
                    <td className="px-6 py-3.5 text-center font-bold text-amber-600">850</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={p.kyc_status === "APPROVED" ? "default" : "outline"} className="text-[10px] font-bold">
                        {p.kyc_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={p.is_active ? "default" : "destructive"} className="text-[10px] font-bold">
                        {p.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ==========================================
// 5. KYC VERIFICATION (/admin/providers/kyc)
// ==========================================
export function AdminKYCPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const nameQuery = searchParams.get("name") || "";
  const idQuery = searchParams.get("id") || "";
  const statusFilter = searchParams.get("status") || "Pending";

  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [rejectItem, setRejectItem] = useState<any | null>(null);

  const fetchQueue = useCallback(async () => {
    if (queue.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminVerificationQueue();
      setQueue(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load KYC verification queue. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [queue.length]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: limit.toString() });
  };

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (nameQuery && !item.full_name?.toLowerCase().includes(nameQuery.toLowerCase()) && !item.email?.toLowerCase().includes(nameQuery.toLowerCase())) return false;
      if (idQuery && !item.id?.toLowerCase().includes(idQuery.toLowerCase())) return false;
      return true;
    });
  }, [queue, nameQuery, idQuery]);

  const totalRecords = filteredQueue.length;
  const paginatedQueue = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredQueue.slice(start, start + limit);
  }, [filteredQueue, page, limit]);

  const handleVerifyAction = async (userId: string, action: "APPROVE" | "REJECT") => {
    setActionLoadingId(userId);
    try {
      await verifyAdminPartner(userId, { action });
      setQueue((prev) => prev.filter((item) => item.id !== userId));
      setToast({
        id: Date.now().toString(),
        message: action === "APPROVE" ? "KYC approved successfully." : "KYC application rejected.",
        type: "success",
      });
    } catch (err: any) {
      const normErr = normalizeApiError(err, `Unable to ${action.toLowerCase()} KYC. Please try again.`);
      setToast({ id: Date.now().toString(), message: normErr.message, type: "error" });
    } finally {
      setActionLoadingId(null);
      setRejectItem(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="KYC Verification Queue" subtitle="Inspect identity verification documents and approve host applications." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && queue.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchQueue} isRetrying={isLoading} />
      )}

      <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Provider name / email..."
            value={nameQuery}
            onChange={(e) => updateFilters({ name: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none flex-1 min-w-[180px]"
          />

          <input
            type="text"
            placeholder="Provider ID..."
            value={idQuery}
            onChange={(e) => updateFilters({ id: e.target.value })}
            className="w-36 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>

          {(nameQuery || idQuery) && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs font-bold text-rose-600">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {isLoading && queue.length === 0 ? (
        <TableSkeleton headers={["Provider", "Email", "KYC Status", "Submission Date", "Actions"]} />
      ) : paginatedQueue.length === 0 ? (
        <AdminEmptyState
          title="No KYC verification requests"
          description="There are currently no provider KYC requests awaiting administrative inspection."
          icon={CheckSquare}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Provider</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">KYC Status</th>
                  <th className="px-6 py-3.5">Submission Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{item.full_name}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{item.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                        {statusFilter}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleVerifyAction(item.id, "APPROVE")}
                          className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {actionLoadingId === item.id ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoadingId === item.id}
                          onClick={() => setRejectItem(item)}
                          className="h-7 text-[11px] font-bold"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}

      <ConfirmModal
        isOpen={!!rejectItem}
        title="Reject KYC Application?"
        description={`Are you sure you want to reject ${rejectItem?.full_name}'s verification request?`}
        confirmLabel="Reject KYC"
        confirmLoadingLabel="Rejecting..."
        isLoading={actionLoadingId === rejectItem?.id}
        onConfirm={() => rejectItem && handleVerifyAction(rejectItem.id, "REJECT")}
        onCancel={() => setRejectItem(null)}
      />

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ==========================================
// 6. LISTINGS (/admin/listings)
// ==========================================
export function AdminListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const nameQuery = searchParams.get("name") || "";
  const idQuery = searchParams.get("id") || "";
  const providerQuery = searchParams.get("provider") || "";
  const typeFilter = searchParams.get("type") || "";
  const categoryFilter = searchParams.get("category") || "";
  const statusFilter = searchParams.get("status") || "";

  const [listings, setListings] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [rejectListingItem, setRejectListingItem] = useState<ServiceItem | null>(null);

  const fetchListings = useCallback(async () => {
    if (listings.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminServices({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 200,
      });
      setListings(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load listings. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [statusFilter, categoryFilter, listings.length]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: limit.toString() });
  };

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (nameQuery && !l.title.toLowerCase().includes(nameQuery.toLowerCase())) return false;
      if (idQuery && !l.id.toLowerCase().includes(idQuery.toLowerCase())) return false;
      if (providerQuery && l.provider_id && !l.provider_id.toLowerCase().includes(providerQuery.toLowerCase())) return false;
      if (typeFilter && l.category?.toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
  }, [listings, nameQuery, idQuery, providerQuery, typeFilter]);

  const totalRecords = filteredListings.length;
  const paginatedListings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredListings.slice(start, start + limit);
  }, [filteredListings, page, limit]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await approveAdminService(id);
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "PUBLISHED" } : l)));
      setToast({ id: Date.now().toString(), message: "Listing approved successfully.", type: "success" });
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to approve listing. Please try again.");
      setToast({ id: Date.now().toString(), message: normErr.message, type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await rejectAdminService(id, "Rejected by administrator");
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "REJECTED" } : l)));
      setToast({ id: Date.now().toString(), message: "Listing rejected successfully.", type: "success" });
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to reject listing. Please try again.");
      setToast({ id: Date.now().toString(), message: normErr.message, type: "error" });
    } finally {
      setActionLoadingId(null);
      setRejectListingItem(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="All Listings" subtitle="Marketplace service catalog moderation and administrative approval." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && listings.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchListings} isRetrying={isLoading} />
      )}

      <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Listing name..."
            value={nameQuery}
            onChange={(e) => updateFilters({ name: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none flex-1 min-w-[160px]"
          />

          <select
            value={typeFilter}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Listing Types</option>
            <option value="Activities">Activities</option>
            <option value="Hotel & Stay">Hotel & Stay</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Content Creator">Content Creator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="PENDING">Pending Review</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {(nameQuery || typeFilter || statusFilter) && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs font-bold text-rose-600">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {isLoading && listings.length === 0 ? (
        <TableSkeleton headers={["Listing", "Listing Type", "Category", "Location", "Price", "Status", "Actions"]} />
      ) : paginatedListings.length === 0 ? (
        <AdminEmptyState
          title="No listings found"
          description="There are currently no listings matching your filter parameters."
          icon={ClipboardList}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Listing</th>
                  <th className="px-6 py-3.5">Listing Type</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5 text-right">Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedListings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">{l.title}</td>
                    <td className="px-6 py-3.5 text-slate-600 capitalize">{l.category}</td>
                    <td className="px-6 py-3.5 text-slate-500 capitalize">{l.category_slug || l.category}</td>
                    <td className="px-6 py-3.5 text-slate-500">{l.location || "Karnataka"}</td>
                    <td className="px-6 py-3.5 text-right font-bold">{formatCurrency(l.price)}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={l.status === "PUBLISHED" ? "default" : "outline"} className="text-[10px] font-bold">
                        {l.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {l.status !== "PUBLISHED" && (
                          <Button
                            size="sm"
                            disabled={actionLoadingId === l.id}
                            onClick={() => handleApprove(l.id)}
                            className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {actionLoadingId === l.id ? "Approving..." : "Approve"}
                          </Button>
                        )}
                        {l.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoadingId === l.id}
                            onClick={() => setRejectListingItem(l)}
                            className="h-7 text-[11px] font-bold"
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}

      <ConfirmModal
        isOpen={!!rejectListingItem}
        title="Reject Listing?"
        description={`Rejecting "${rejectListingItem?.title}" will change its status to rejected.`}
        confirmLabel="Reject Listing"
        confirmLoadingLabel="Rejecting..."
        isLoading={actionLoadingId === rejectListingItem?.id}
        onConfirm={() => rejectListingItem && handleReject(rejectListingItem.id)}
        onCancel={() => setRejectListingItem(null)}
      />

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ==========================================
// 7. BOOKINGS (/admin/bookings)
// ==========================================
export function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const idQuery = searchParams.get("id") || "";
  const nameQuery = searchParams.get("name") || "";
  const statusFilter = searchParams.get("status") || "";

  const [bookings, setBookings] = useState<ProviderBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (bookings.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminBookings({
        status: statusFilter || undefined,
        limit: 200,
      });
      setBookings(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load bookings. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [statusFilter, bookings.length]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: limit.toString() });
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (idQuery && !b.id.toLowerCase().includes(idQuery.toLowerCase()) && !b.booking_code?.toLowerCase().includes(idQuery.toLowerCase())) return false;
      if (nameQuery && !b.customer_name?.toLowerCase().includes(nameQuery.toLowerCase())) return false;
      return true;
    });
  }, [bookings, idQuery, nameQuery]);

  const totalRecords = filteredBookings.length;
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredBookings.slice(start, start + limit);
  }, [filteredBookings, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="Global Bookings & Disputes" subtitle="Global traveler reservation records and fulfillment statuses." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && bookings.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchBookings} isRetrying={isLoading} />
      )}

      <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Booking ID..."
            value={idQuery}
            onChange={(e) => updateFilters({ id: e.target.value })}
            className="w-36 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {(idQuery || statusFilter) && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-xs font-bold text-rose-600">
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {isLoading && bookings.length === 0 ? (
        <TableSkeleton headers={["Booking ID", "User", "Listing", "Travel Date", "Amount", "Status"]} />
      ) : paginatedBookings.length === 0 ? (
        <AdminEmptyState
          title="No bookings found"
          description="There are currently no bookings registered in the system."
          icon={Calendar}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Booking ID</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Listing</th>
                  <th className="px-6 py-3.5">Travel Date</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-mono text-[11px] font-bold text-rose-600">{b.booking_code || b.id.slice(0, 8)}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{b.customer_name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{b.service_title}</td>
                    <td className="px-6 py-3.5 text-slate-400">{b.start_date}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(b.total_amount)}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold">{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}
    </div>
  );
}

// ==========================================
// 8. PAYMENTS (/admin/payments)
// ==========================================
export function AdminPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const statusFilter = searchParams.get("status") || "";

  const [payments, setPayments] = useState<AdminPaymentAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (payments.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminPayments({
        status: statusFilter || undefined,
        limit: 200,
      });
      setPayments(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load payment transactions. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [statusFilter, payments.length]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const totalRecords = payments.length;
  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * limit;
    return payments.slice(start, start + limit);
  }, [payments, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="Payment Transactions Audit" subtitle="Payment gateway transaction audit and revenue metrics." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && payments.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchPayments} isRetrying={isLoading} />
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Transactions</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{totalRecords}</span>
        </Card>
        <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Total GMV</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">₹0</span>
        </Card>
        <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Platform Revenue</span>
          <span className="text-xl font-black text-emerald-600">₹0</span>
        </Card>
        <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Provider Payouts</span>
          <span className="text-xl font-black text-teal-600">₹0</span>
        </Card>
        <Card className="p-4 rounded-3xl border-slate-200 bg-white dark:bg-slate-900">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Refunds</span>
          <span className="text-xl font-black text-amber-600">₹0</span>
        </Card>
      </div>

      {isLoading && payments.length === 0 ? (
        <TableSkeleton headers={["Transaction ID", "Booking Code", "User", "Gross Amount", "Platform Fee", "Provider Amount", "Status"]} />
      ) : paginatedPayments.length === 0 ? (
        <AdminEmptyState
          title="No payment transactions found"
          description="There are currently no payment transactions registered in the database."
          icon={Coins}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Booking Code</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5 text-right">Gross Amount</th>
                  <th className="px-6 py-3.5 text-right">Platform Fee</th>
                  <th className="px-6 py-3.5 text-right">Provider Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{p.razorpay_order_id || p.razorpay_payment_id || p.id.slice(0, 8)}</td>
                    <td className="px-6 py-3.5 font-mono text-rose-600 font-bold">{p.booking_code || "—"}</td>
                    <td className="px-6 py-3.5 font-bold">{p.customer_name}</td>
                    <td className="px-6 py-3.5 text-right font-bold">{p.amount} {p.currency || 'INR'}</td>
                    <td className="px-6 py-3.5 text-right text-slate-500">{formatCurrency(p.amount * 0.05)}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(p.amount * 0.95)}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}
    </div>
  );
}

// ==========================================
// 9. REVIEWS (/admin/reviews)
// ==========================================
export function AdminReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const statusFilter = searchParams.get("status") || "";

  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [hideReviewItem, setHideReviewItem] = useState<AdminReviewItem | null>(null);

  const fetchReviews = useCallback(async () => {
    if (reviews.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminReviews({ status: statusFilter || undefined, limit: 200 });
      setReviews(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load reviews. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [statusFilter, reviews.length]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleModerate = async (reviewId: string, status: string) => {
    setActionLoadingId(reviewId);
    try {
      await moderateAdminReview(reviewId, { status });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: status as AdminReviewItem["status"] } : r)));
      setToast({
        id: Date.now().toString(),
        message: status === "HIDDEN" ? "Review hidden successfully." : "Review restored successfully.",
        type: "success",
      });
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to moderate review. Please try again.");
      setToast({ id: Date.now().toString(), message: normErr.message, type: "error" });
    } finally {
      setActionLoadingId(null);
      setHideReviewItem(null);
    }
  };

  const totalRecords = reviews.length;
  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * limit;
    return reviews.slice(start, start + limit);
  }, [reviews, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="Customer Reviews Moderation" subtitle="Customer experience feedback and review moderation." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && reviews.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchReviews} isRetrying={isLoading} />
      )}

      {isLoading && reviews.length === 0 ? (
        <TableSkeleton headers={["Review", "User", "Service", "Rating", "Status", "Actions"]} />
      ) : paginatedReviews.length === 0 ? (
        <AdminEmptyState
          title="No reviews found"
          description="There are currently no reviews published or submitted for moderation."
          icon={Star}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Review</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-6 py-3.5 text-center">Rating</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-medium max-w-xs truncate">{r.comment ? `"${r.comment}"` : "—"}</td>
                    <td className="px-6 py-3.5 font-bold">{r.user_name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{r.service_title}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-amber-600">★ {r.rating}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold">{r.status}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "PUBLISHED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingId === r.id}
                            onClick={() => setHideReviewItem(r)}
                            className="h-7 text-[11px] font-bold"
                          >
                            {actionLoadingId === r.id ? "Hiding..." : "Hide"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={actionLoadingId === r.id}
                            onClick={() => handleModerate(r.id, "PUBLISHED")}
                            className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {actionLoadingId === r.id ? "Restoring..." : "Restore"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}

      <ConfirmModal
        isOpen={!!hideReviewItem}
        title="Hide Review?"
        description="This will hide the review from public display."
        confirmLabel="Hide Review"
        confirmLoadingLabel="Hiding..."
        isLoading={actionLoadingId === hideReviewItem?.id}
        onConfirm={() => hideReviewItem && handleModerate(hideReviewItem.id, "HIDDEN")}
        onCancel={() => setHideReviewItem(null)}
      />

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ==========================================
// 10. ANALYTICS (/admin/analytics)
// ==========================================
export function AdminAnalyticsPage() {
  const [report, setReport] = useState<AdminReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminReports("monthly");
      setReport(res);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load analytics. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const hasEnoughData = (report?.total_bookings ?? 0) > 0 || (report?.total_revenue ?? 0) > 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Analytics" subtitle="Marketplace growth, user acquisition, and financial analytics." />

      {error ? (
        <AdminErrorState message={error} onRetry={fetchAnalytics} isRetrying={isLoading} />
      ) : isLoading ? (
        <div className="space-y-6">
          <OverviewCardsSkeleton count={4} />
          <ChartSkeleton />
        </div>
      ) : !hasEnoughData ? (
        <AdminEmptyState
          title="Not enough data to generate analytics yet."
          description="Analytics and growth trends require active database booking records and user transactions."
          icon={TrendingUp}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Users</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report?.total_users}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Providers</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report?.total_providers}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Bookings</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report?.total_bookings}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Revenue</span>
              <span className="text-2xl font-black text-emerald-600">{formatCurrency(report?.total_revenue ?? 0)}</span>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 11. TICKETS RAISED (/admin/tickets)
// ==========================================
export function AdminTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const statusFilter = searchParams.get("status") || "";

  const [tickets, setTickets] = useState<AdminSupportTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (tickets.length === 0) setIsLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const res = await getAdminSupportTickets();
      setTickets(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load tickets. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [tickets.length]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter && t.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      return true;
    });
  }, [tickets, statusFilter]);

  const totalRecords = filteredTickets.length;
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredTickets.slice(start, start + limit);
  }, [filteredTickets, page, limit]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="Support Tickets Queue" subtitle="Customer support inquiries and host resolution tickets." />
        {isRefetching && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="animate-spin h-3.5 w-3.5 text-emerald-600" /> Updating...
          </span>
        )}
      </div>

      {error && tickets.length === 0 && (
        <AdminErrorState message={error} onRetry={fetchTickets} isRetrying={isLoading} />
      )}

      {isLoading && tickets.length === 0 ? (
        <TableSkeleton headers={["Ticket ID", "Raised By", "Subject", "Priority", "Status", "Created At"]} />
      ) : paginatedTickets.length === 0 ? (
        <AdminEmptyState
          title="No tickets raised"
          description="There are currently no support inquiries or resolution tickets opened."
          icon={Ticket}
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Ticket ID</th>
                  <th className="px-6 py-3.5">Raised By</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-mono text-[11px] font-bold text-rose-600">{t.id.slice(0, 8)}</td>
                    <td className="px-6 py-3.5 font-bold">{t.user_name}</td>
                    <td className="px-6 py-3.5 font-medium">{t.subject}</td>
                    <td className="px-6 py-3.5 font-bold">{t.priority}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold">{t.status}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={page}
            pageSize={limit}
            totalRecords={totalRecords}
            onPageChange={(p) => updateFilters({ page: p.toString() })}
            onPageSizeChange={(l) => updateFilters({ limit: l.toString() })}
          />
        </Card>
      )}
    </div>
  );
}

// ==========================================
// LEGACY ALIAS EXPORTS (For backward test compatibility)
// ==========================================

export function AdminPartnersPage() {
  const [partners, setPartners] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPartners({ limit: 200 });
      setPartners(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load partners. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Partner Directory" subtitle="Directory of verified host partners and creators." />
      {error && (
        <AdminErrorState message={error} onRetry={fetchPartners} isRetrying={isLoading} />
      )}
      {isLoading ? (
        <TableSkeleton headers={["Partner", "Email", "Status", "Verification"]} />
      ) : partners.length === 0 ? (
        <AdminEmptyState title="No providers found" description="There are currently no provider profiles registered." icon={Building2} />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Partner</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold">{p.full_name}</td>
                  <td className="px-6 py-3.5 text-slate-600">{p.email}</td>
                  <td className="px-6 py-3.5"><Badge variant="outline">{p.is_active ? "Active" : "Disabled"}</Badge></td>
                  <td className="px-6 py-3.5"><Badge variant="default">{p.is_verified ? "KYC Approved" : "Pending KYC"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function AdminVerificationPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPartnerApplications();
      setQueue(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load verification queue. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (id: string) => {
    try {
      await approveAdminPartnerApplication(id, true);
      await fetchQueue();
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to approve KYC. Please try again.");
      setError(normErr.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Host KYC Verification Queue" subtitle="Inspect identity documents and approve application queue." />
      {error && (
        <AdminErrorState message={error} onRetry={fetchQueue} isRetrying={isLoading} />
      )}
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading queue...</Card>
      ) : queue.length === 0 ? (
        <AdminEmptyState title="No KYC verification requests" description="All partner identity verification requests have been processed." icon={CheckSquare} />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl p-6 space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b pb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.full_name}</h4>
                <p className="text-xs text-slate-500">{item.business_name}</p>
                <p className="text-xs text-slate-400">{item.email} • {item.mobile}</p>
              </div>
              <Button size="sm" onClick={() => handleApprove(item.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                Approve
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminServices({ limit: 200 });
      setServices(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load listings. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleApprove = async (id: string) => {
    try {
      await approveAdminService(id);
      await fetchServices();
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to approve listing. Please try again.");
      setError(normErr.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Service Listing Moderation" subtitle="Inspect listing submissions and publish services." />
      {error && (
        <AdminErrorState message={error} onRetry={fetchServices} isRetrying={isLoading} />
      )}
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading services...</Card>
      ) : services.length === 0 ? (
        <AdminEmptyState title="No listings found" description="There are currently no listings submitted for moderation." icon={Layers} />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl p-6 space-y-4">
          {services.map((srv) => (
            <div key={srv.id} className="flex items-center justify-between border-b pb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{srv.title}</h4>
                <p className="text-xs text-slate-500">{srv.provider_name} • {srv.category}</p>
              </div>
              <Button size="sm" onClick={() => handleApprove(srv.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                Approve
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPayouts({ limit: 200 });
      setPayouts(res || []);
    } catch (err: unknown) {
      const normErr = normalizeApiError(err, "Unable to load payouts. Please try again.");
      setError(normErr.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleMarkPaid = async (id: string) => {
    try {
      await updateAdminPayoutStatus(id, { status: "COMPLETED" });
      await fetchPayouts();
    } catch (err: any) {
      const normErr = normalizeApiError(err, "Unable to update payout status. Please try again.");
      setError(normErr.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Host Payouts Ledger" subtitle="Settle provider earnings and bank payouts." />
      {error && (
        <AdminErrorState message={error} onRetry={fetchPayouts} isRetrying={isLoading} />
      )}
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading payouts...</Card>
      ) : payouts.length === 0 ? (
        <AdminEmptyState title="No payout transactions found" description="There are currently no provider payout settlement records." icon={DollarSign} />
      ) : (
        <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl p-6 space-y-4">
          {payouts.map((po) => (
            <div key={po.id} className="flex items-center justify-between border-b pb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{po.payout_code}</h4>
                <p className="text-xs text-slate-500">Amount: ₹{po.amount} {po.currency}</p>
              </div>
              <Button size="sm" onClick={() => handleMarkPaid(po.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                Mark Paid
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getAdminSettings()
      .then((res) => setSettings(res))
      .catch((err) => {
        const normErr = normalizeApiError(err, "Unable to load settings. Please try again.");
        setError(normErr.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Global Platform Settings" subtitle="Marketplace rules, fees, and operational parameters." />
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading platform settings...</Card>
      ) : settings ? (
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Platform Name</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{settings.platform_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Platform Take Rate</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {Math.round(settings.commission_rate * 100)}% (Host receives {Math.round((1 - settings.commission_rate) * 100)}% net settlement)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Maintenance Mode</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {settings.is_maintenance_mode ? "Enabled" : "Disabled (Live)"}
            </span>
          </div>
        </Card>
      ) : (
        <AdminEmptyState title="Settings unavailable" description={error || "Could not load settings."} />
      )}
    </div>
  );
}

export function AdminReportsPage() {
  const [report, setReport] = useState<AdminReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    getAdminReports("monthly")
      .then((res) => setReport(res))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Platform Governance & Performance Reports" subtitle="Aggregate analytics and performance metrics." />
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading reports...</Card>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Users</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report.total_users}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Providers</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report.total_providers}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Bookings</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{report.total_bookings}</span>
            </Card>
            <Card className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
              <span className="text-xs font-bold text-slate-400 block uppercase">Revenue</span>
              <span className="text-2xl font-black text-emerald-600">{formatCurrency(report.total_revenue)}</span>
            </Card>
          </div>
          <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chronological Performance Trajectory</h3>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export const AdminSupportPage = AdminTicketsPage;
