import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Mail,
  Phone,
  MapPin,
  Clock,
  Tag,
  DollarSign,
  UserCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminDetailDrawer } from "@/components/admin/AdminDetailDrawer";
import {
  getAdminOverview,
  getAdminUsers,
  updateAdminUserStatus,
  updateAdminUserVerification,
  getAdminPartners,
  getAdminPartnerApplications,
  approveAdminPartnerApplication,
  rejectAdminPartnerApplication,
  getAdminServices,
  approveAdminService,
  rejectAdminService,
  removeAdminService,
  getAdminBookings,
  getAdminPayments,
  getAdminPayouts,
  updateAdminPayoutStatus,
  getAdminSupportTickets,
  getAdminSettings,
  updateAdminSettings,
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
import { PartnerApplicationData } from "@/services/partnerApplicationService";

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
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Users</span>
              <Users className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-2">{data.total_users.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Customers, Hosts, and Admins</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Partner Farms</span>
              <Building2 className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-2">{data.total_partners.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verified & registered hosts</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">KYC Pending</span>
              <CheckSquare className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-2">{data.pending_verifications}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Awaiting document inspection</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Published Listings</span>
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{data.published_services}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active on marketplace</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Bookings</span>
              <Calendar className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-2">{data.total_bookings.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Lifetime reservations</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Gross Platform GMV</span>
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">₹{data.total_revenue.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Settled transactions</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pending Payouts</span>
              <Banknote className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-2">{data.pending_payouts}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">In-flight bank disbursements</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Support Inquiries</span>
              <LifeBuoy className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-2">{data.open_support_tickets}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Open support tickets</p>
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [verificationFilter, setVerificationFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Detail Drawer state
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const is_active = statusFilter === "active" ? true : statusFilter === "disabled" ? false : undefined;
      const is_verified = verificationFilter === "verified" ? true : verificationFilter === "unverified" ? false : undefined;
      const res = await getAdminUsers({
        role: roleFilter || undefined,
        search: searchQuery || undefined,
        is_active,
        is_verified,
        sort_by: sortBy,
        limit: 100, // Fetch up to 100 for client pagination
      });
      setUsers(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user directory");
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, statusFilter, verificationFilter, sortBy, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, verificationFilter, sortBy, searchQuery]);

  const handleToggleStatus = async (user: AdminUserItem) => {
    setActionLoadingId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const nextStatus = !user.is_active;
      await updateAdminUserStatus(user.id, nextStatus);
      setSuccessMsg(`User ${user.full_name} is now ${nextStatus ? "Active" : "Disabled"}.`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_active: nextStatus } : null));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVerification = async (user: AdminUserItem) => {
    setActionLoadingId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const nextVerified = !user.is_verified;
      await updateAdminUserVerification(user.id, nextVerified);
      setSuccessMsg(`User ${user.full_name} verification set to ${nextVerified ? "Verified" : "Unverified"}.`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_verified: nextVerified } : u)));
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_verified: nextVerified } : null));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update verification status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Client-side pagination slices
  const totalRecords = users.length;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader title="User Directory" subtitle="Manage user accounts, roles, access permissions, and verification badges." />

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchUsers} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="partner">Partner / Host</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="disabled">Disabled Accounts</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A - Z)</option>
            <option value="name_desc">Name (Z - A)</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading} className="border-slate-700 bg-slate-800 text-slate-200">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading user directory...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No user accounts found matching the current filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{u.full_name}</span>
                        {u.role === "admin" && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1 font-mono">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
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
                      <Badge
                        variant={u.is_verified ? "default" : "outline"}
                        className={u.is_verified ? "bg-emerald-600 text-white font-bold" : "border-slate-700 text-slate-400"}
                      >
                        {u.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(u)}
                          className="h-7 px-2 text-[11px] rounded-lg border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant={u.is_active ? "destructive" : "default"}
                          disabled={actionLoadingId === u.id || u.role === "admin"}
                          onClick={() => handleToggleStatus(u)}
                          className="h-7 px-2 text-[11px] rounded-lg font-bold"
                          title={u.role === "admin" ? "Admin accounts cannot be deactivated" : ""}
                        >
                          {u.is_active ? "Disable" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* USER DETAIL INSPECTION DRAWER */}
      {selectedUser && (
        <AdminDetailDrawer
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={selectedUser.full_name}
          subtitle={`Account ID: ${selectedUser.id}`}
          badge={{
            text: selectedUser.is_active ? "Active Account" : "Disabled / Suspended",
            variant: selectedUser.is_active ? "default" : "destructive",
          }}
          fields={[
            { label: "Email Address", value: selectedUser.email, icon: Mail },
            { label: "System Role", value: <span className="capitalize font-bold">{selectedUser.role}</span>, icon: Tag },
            {
              label: "KYC Verification",
              value: (
                <Badge
                  variant={selectedUser.is_verified ? "default" : "outline"}
                  className={selectedUser.is_verified ? "bg-emerald-600 text-white font-bold" : "border-slate-700 text-slate-400"}
                >
                  {selectedUser.is_verified ? "Verified Identity" : "Unverified"}
                </Badge>
              ),
              icon: ShieldCheck,
            },
            {
              label: "Created Date",
              value: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "—",
              icon: Clock,
            },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="border-slate-700 text-slate-300"
              >
                Close
              </Button>
              <Button
                size="sm"
                variant={selectedUser.is_verified ? "outline" : "default"}
                disabled={actionLoadingId === selectedUser.id}
                onClick={() => handleToggleVerification(selectedUser)}
                className={!selectedUser.is_verified ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold" : "border-slate-700 text-slate-300"}
              >
                {selectedUser.is_verified ? "Unverify User" : "Verify User"}
              </Button>
              <Button
                size="sm"
                variant={selectedUser.is_active ? "destructive" : "default"}
                disabled={actionLoadingId === selectedUser.id || selectedUser.role === "admin"}
                onClick={() => handleToggleStatus(selectedUser)}
                className="font-bold"
              >
                {selectedUser.is_active ? "Disable Account" : "Activate Account"}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

// ==========================================
// 3. ADMIN PARTNERS DIRECTORY
// ==========================================
export function AdminPartnersPage() {
  const [partners, setPartners] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedPartner, setSelectedPartner] = useState<AdminUserItem | null>(null);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPartners({ limit: 100 });
      setPartners(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load partner hosts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const q = searchQuery.toLowerCase();
    return partners.filter((p) => p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [partners, searchQuery]);

  const totalRecords = filteredPartners.length;
  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPartners.slice(start, start + pageSize);
  }, [filteredPartners, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader title="Partner Directory" subtitle="All registered farm hosts, nature guides, and agricultural providers." />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search partner by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchPartners} disabled={isLoading} className="border-slate-700 bg-slate-800 text-slate-200">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchPartners} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Host / Partner</th>
                <th className="px-6 py-4">Host Type</th>
                <th className="px-6 py-4">KYC State</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading partner hosts...
                  </td>
                </tr>
              ) : paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">No partner hosts found.</td>
                </tr>
              ) : (
                paginatedPartners.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPartner(p)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{p.full_name}</div>
                      <div className="text-slate-400 text-[11px]">{p.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize border-slate-700 bg-slate-800 text-slate-300">
                        {p.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={p.is_verified ? "default" : "outline"}
                        className={p.is_verified ? "bg-emerald-600 text-white font-bold" : "border-slate-700 text-slate-400"}
                      >
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* PARTNER DETAIL DRAWER */}
      {selectedPartner && (
        <AdminDetailDrawer
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          title={selectedPartner.full_name}
          subtitle={`Host ID: ${selectedPartner.id}`}
          badge={{
            text: selectedPartner.is_verified ? "KYC Verified Host" : "KYC Pending Review",
            variant: selectedPartner.is_verified ? "default" : "outline",
          }}
          fields={[
            { label: "Email Address", value: selectedPartner.email, icon: Mail },
            { label: "Host Role", value: <span className="capitalize font-bold">{selectedPartner.role}</span>, icon: Tag },
            {
              label: "Account Status",
              value: (
                <Badge variant={selectedPartner.is_active ? "default" : "destructive"}>
                  {selectedPartner.is_active ? "Active & Live" : "Suspended"}
                </Badge>
              ),
              icon: UserCheck,
            },
            {
              label: "Registered Date",
              value: selectedPartner.created_at ? new Date(selectedPartner.created_at).toLocaleString() : "—",
              icon: Clock,
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPartner(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          }
        />
      )}
    </div>
  );
}

// ==========================================
// 4. ADMIN PARTNER VERIFICATION QUEUE (KYC)
// ==========================================
export function AdminVerificationPage() {
  const [applications, setApplications] = useState<PartnerApplicationData[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
        limit: 100,
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

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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
        return <Badge className="bg-emerald-600 text-white border-0 font-bold">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Needs Changes</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white border-0 font-bold">Pending Review</Badge>;
    }
  };

  const totalRecords = applications.length;
  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return applications.slice(start, start + pageSize);
  }, [applications, page, pageSize]);

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
                  ? "bg-rose-600 text-white shadow-sm"
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

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading partner verification queue...
                  </td>
                </tr>
              ) : paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ShieldCheck className="h-6 w-6 text-emerald-400" />
                      <span className="font-bold">No applications found in this queue.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">
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
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedApp(app)}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-700 hover:bg-slate-800 text-slate-200"
                        >
                          Details
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
                              className="h-7 px-2.5 text-xs rounded-lg font-bold"
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* APPLICATION DETAIL INSPECTION DRAWER */}
      {selectedApp && (
        <AdminDetailDrawer
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={`Application #${selectedApp.application_code}`}
          subtitle={`Applicant: ${selectedApp.full_name} (${selectedApp.business_name})`}
          badge={{
            text: selectedApp.status,
            variant: selectedApp.status === "APPROVED" ? "default" : selectedApp.status === "REJECTED" ? "destructive" : "outline",
          }}
          fields={[
            { label: "Applicant Name", value: selectedApp.full_name, icon: Users },
            { label: "Contact Mobile", value: selectedApp.mobile, icon: Phone },
            { label: "Email Address", value: selectedApp.email, icon: Mail },
            { label: "Host Role", value: <span className="capitalize font-bold">{selectedApp.role_type}</span>, icon: Tag },
            { label: "Business / Farm Name", value: selectedApp.business_name, icon: Building2 },
            { label: "Experience", value: `${selectedApp.experience_years} Years`, icon: Clock },
            { label: "Location", value: `${selectedApp.address}, ${selectedApp.district}, ${selectedApp.state}`, icon: MapPin, fullWidth: true },
            { label: "Document Type & ID", value: `${selectedApp.id_type} • ${selectedApp.id_number}`, icon: FileText },
            {
              label: "Verification Document",
              value: selectedApp.document_url ? (
                <a
                  href={selectedApp.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-bold"
                >
                  <span>View Uploaded File</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">No document file attached</span>
              ),
              icon: FileText,
            },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(null)}
                className="border-slate-700 text-slate-300"
              >
                Close
              </Button>
              {selectedApp.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
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
                    size="sm"
                    onClick={() => handleApprove(selectedApp)}
                    disabled={actionLoadingId === selectedApp.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Approve Application
                  </Button>
                </div>
              )}
            </>
          }
        >
          {selectedApp.rejection_reason && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
              <span className="font-bold">Rejection Note: </span>
              {selectedApp.rejection_reason}
            </div>
          )}
          {selectedApp.bio && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Host Story & Bio</span>
              <p className="leading-relaxed">{selectedApp.bio}</p>
            </div>
          )}
        </AdminDetailDrawer>
      )}

      {/* REJECTION REASON DIALOG */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">Reject Partner Application</h3>
            <p className="text-xs text-slate-400">
              Provide feedback for <strong>{rejectingApp.full_name}</strong>. This message will be recorded in the applicant's record.
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
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [rejectingService, setRejectingService] = useState<ServiceItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [removingService, setRemovingService] = useState<ServiceItem | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParam = statusFilter === "ALL" ? undefined : statusFilter;
      const res = await getAdminServices({ status: filterParam, limit: 100 });
      setServices(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace listings");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const handleApprove = async (service: ServiceItem) => {
    setActionLoadingId(service.id);
    try {
      await approveAdminService(service.id);
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
    if (!rejectionReason.trim()) {
      setError("Please provide a valid rejection reason.");
      return;
    }
    setActionLoadingId(rejectingService.id);
    try {
      await rejectAdminService(rejectingService.id, rejectionReason.trim());
      setRejectingService(null);
      setRejectionReason("");
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
    if (!removalReason.trim()) {
      setError("Please provide a valid removal reason.");
      return;
    }
    setActionLoadingId(removingService.id);
    try {
      await removeAdminService(removingService.id, removalReason.trim());
      setRemovingService(null);
      setRemovalReason("");
      setSelectedService(null);
      fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to remove service '${removingService.title}'`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter((s) => s.title?.toLowerCase().includes(q) || s.provider_name?.toLowerCase().includes(q));
  }, [services, searchQuery]);

  const totalRecords = filteredServices.length;
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Service Listing Moderation"
          subtitle="Audit, approve, reject, or remove farm stays and agro-experience listings."
        />
        <Button variant="outline" size="sm" onClick={fetchServices} disabled={isLoading} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { key: "PENDING", label: "Pending Review" },
            { key: "PUBLISHED", label: "Published" },
            { key: "REJECTED", label: "Rejected" },
            { key: "ALL", label: "All Listings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === tab.key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => setError(null)} className="border-rose-700 text-rose-200">
            Dismiss
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Host / Provider</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading listings for moderation queue...
                  </td>
                </tr>
              ) : paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No listings found matching filter '{statusFilter}'.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{s.title}</div>
                      <div className="text-slate-400 text-[11px]">{s.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{s.provider_name}</div>
                      <div className="text-[11px] text-slate-400">{s.provider_type || "Partner"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                        {s.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      ₹{s.price.toLocaleString()} / {s.unit || "night"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={s.status === "PUBLISHED" ? "default" : s.status === "REJECTED" ? "destructive" : "warning"}
                        className={s.status === "PUBLISHED" ? "bg-emerald-600 text-white font-bold" : ""}
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedService(s)}
                          className="h-7 px-2 text-xs rounded-lg border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          Details
                        </Button>
                        {s.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              disabled={actionLoadingId === s.id}
                              onClick={() => handleApprove(s)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 px-2 text-xs rounded-lg"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoadingId === s.id}
                              onClick={() => {
                                setRejectingService(s);
                                setRejectionReason("");
                              }}
                              className="h-7 px-2 text-xs rounded-lg font-bold"
                            >
                              Reject
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
                            className="h-7 px-2 text-xs rounded-lg font-bold"
                          >
                            Remove
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* SERVICE DETAIL DRAWER */}
      {selectedService && (
        <AdminDetailDrawer
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          title={selectedService.title}
          subtitle={`Provider: ${selectedService.provider_name} (${selectedService.location})`}
          badge={{
            text: selectedService.status,
            variant: selectedService.status === "PUBLISHED" ? "default" : selectedService.status === "REJECTED" ? "destructive" : "outline",
          }}
          fields={[
            { label: "Category", value: selectedService.category, icon: Tag },
            { label: "Price / Rate", value: `₹${selectedService.price.toLocaleString()} / ${selectedService.unit || "unit"}`, icon: DollarSign },
            { label: "Location", value: selectedService.location, icon: MapPin },
            { label: "Max Capacity", value: selectedService.max_capacity ? `${selectedService.max_capacity} guests` : "Not specified", icon: Users },
            { label: "Description", value: selectedService.description, icon: FileText, fullWidth: true },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedService(null)}
                className="border-slate-700 text-slate-300"
              >
                Close
              </Button>
              {selectedService.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setRejectingService(selectedService);
                      setRejectionReason("");
                    }}
                    className="font-bold"
                  >
                    Reject Listing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(selectedService)}
                    disabled={actionLoadingId === selectedService.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Approve & Publish
                  </Button>
                </div>
              )}
              {selectedService.status === "PUBLISHED" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setRemovingService(selectedService);
                    setRemovalReason("");
                  }}
                  className="font-bold"
                >
                  Remove from Marketplace
                </Button>
              )}
            </>
          }
        />
      )}

      {/* REJECTION REASON DIALOG */}
      {rejectingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reject Service Listing</h3>
            <p className="text-xs text-slate-400">
              Provide feedback for <span className="text-white font-semibold">{rejectingService.title}</span>.
            </p>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing required photo quality or incomplete accommodation amenities."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Remove Listing from Marketplace</h3>
            <p className="text-xs text-slate-400">
              Removing <span className="text-white font-semibold">{removingService.title}</span> will immediately hide it from public search.
            </p>
            <textarea
              rows={4}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="e.g. Temporary farm maintenance or host request."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
                className="font-bold px-4"
              >
                Remove Listing
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedBooking, setSelectedBooking] = useState<ProviderBookingItem | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminBookings({ status: statusFilter || undefined, limit: 100 });
      setBookings(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        b.booking_code?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.service_title?.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const totalRecords = filteredBookings.length;
  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Global Bookings & Disputes" subtitle="System-wide reservations, guest manifestations, and payment statuses." />
        <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isLoading} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search code, customer, experience..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
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

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading global reservations...
                  </td>
                </tr>
              ) : paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">No reservations found matching filter.</td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{b.booking_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{b.customer_name}</div>
                      <div className="text-slate-400 text-[11px]">{b.customer_email || "—"}</div>
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
                        className={b.payment_status === "PAID" ? "bg-emerald-600 text-white font-bold" : "border-slate-700 text-slate-400"}
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* BOOKING DETAIL DRAWER */}
      {selectedBooking && (
        <AdminDetailDrawer
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Booking ${selectedBooking.booking_code}`}
          subtitle={`Experience: ${selectedBooking.service_title}`}
          badge={{
            text: selectedBooking.status,
            variant: selectedBooking.status === "CONFIRMED" || selectedBooking.status === "COMPLETED" ? "default" : "outline",
          }}
          fields={[
            { label: "Customer Name", value: selectedBooking.customer_name, icon: Users },
            { label: "Customer Email", value: selectedBooking.customer_email || "Not recorded", icon: Mail },
            { label: "Check-in Date", value: selectedBooking.start_date, icon: Calendar },
            { label: "Guest Count", value: `${selectedBooking.guest_count} guests`, icon: Users },
            { label: "Total Amount", value: `₹${selectedBooking.total_amount.toLocaleString()}`, icon: DollarSign },
            {
              label: "Payment Status",
              value: (
                <Badge variant={selectedBooking.payment_status === "PAID" ? "default" : "outline"}>
                  {selectedBooking.payment_status}
                </Badge>
              ),
              icon: CreditCard,
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBooking(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          }
        />
      )}
    </div>
  );
}

// ==========================================
// 7. ADMIN PAYMENTS AUDIT
// ==========================================
export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentAuditItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentAuditItem | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPayments({ limit: 100 });
      setPayments(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment transactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.id?.toLowerCase().includes(q) ||
        p.razorpay_order_id?.toLowerCase().includes(q) ||
        p.razorpay_payment_id?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  const totalRecords = filteredPayments.length;
  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Payment Transactions Audit" subtitle="Razorpay payment settlements, transaction IDs, and audit ledger." />
        <Button variant="outline" size="sm" onClick={fetchPayments} disabled={isLoading} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transaction ID or gateway order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchPayments} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Gateway Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading payment audit records...
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No payment records found.</td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-white">{p.id.slice(0, 10)}...</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{p.razorpay_order_id || "—"}</td>
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* PAYMENT DETAIL DRAWER */}
      {selectedPayment && (
        <AdminDetailDrawer
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment #${selectedPayment.id.slice(0, 12)}`}
          subtitle={`Amount: ₹${selectedPayment.amount.toLocaleString()} ${selectedPayment.currency}`}
          badge={{
            text: selectedPayment.status,
            variant: selectedPayment.status === "PAID" ? "default" : "destructive",
          }}
          fields={[
            { label: "Transaction ID", value: selectedPayment.id, icon: Tag, fullWidth: true },
            { label: "Razorpay Order ID", value: selectedPayment.razorpay_order_id || "N/A", icon: FileText },
            { label: "Razorpay Payment ID", value: selectedPayment.razorpay_payment_id || "N/A", icon: FileText },
            { label: "Settlement Amount", value: `₹${selectedPayment.amount.toLocaleString()} ${selectedPayment.currency}`, icon: DollarSign },
            { label: "Payment Gateway", value: selectedPayment.method || "Razorpay Gateway", icon: CreditCard },
            {
              label: "Timestamp",
              value: selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString() : "—",
              icon: Clock,
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPayment(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          }
        />
      )}
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

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminPayouts({ limit: 100 });
      setPayouts(res || []);
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
      if (selectedPayout?.id === payoutId) setSelectedPayout(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to update payout to ${status}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalRecords = payouts.length;
  const paginatedPayouts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return payouts.slice(start, start + pageSize);
  }, [payouts, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Host Payouts Ledger" subtitle="Review and moderate automated bank payouts to farm hosts." />
        <Button variant="outline" size="sm" onClick={fetchPayouts} disabled={isLoading} className="border-slate-800 bg-slate-900 text-slate-300">
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

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Disbursement Amount</th>
                <th className="px-6 py-4">Destination Bank</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dispatched Date</th>
                <th className="px-6 py-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading payouts ledger...
                  </td>
                </tr>
              ) : paginatedPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No payout records found.</td>
                </tr>
              ) : (
                paginatedPayouts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayout(p)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
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
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* PAYOUT DETAIL DRAWER */}
      {selectedPayout && (
        <AdminDetailDrawer
          isOpen={!!selectedPayout}
          onClose={() => setSelectedPayout(null)}
          title={`Payout ${selectedPayout.payout_code}`}
          subtitle={`Disbursement Amount: ₹${selectedPayout.amount.toLocaleString()} ${selectedPayout.currency}`}
          badge={{
            text: selectedPayout.status,
            variant: selectedPayout.status === "COMPLETED" ? "default" : selectedPayout.status === "FAILED" ? "destructive" : "outline",
          }}
          fields={[
            { label: "Payout Reference", value: selectedPayout.payout_code, icon: Tag },
            { label: "Host / Provider ID", value: selectedPayout.provider_id, icon: Users },
            { label: "Net Amount", value: `₹${selectedPayout.amount.toLocaleString()} ${selectedPayout.currency}`, icon: DollarSign },
            { label: "Bank Account (Last 4)", value: `•••• ${selectedPayout.bank_account_last4 || "4092"}`, icon: Banknote },
            { label: "Bank IFSC Code", value: selectedPayout.ifsc_code || "SBIN0001234", icon: FileText },
            {
              label: "Created Date",
              value: selectedPayout.created_at ? new Date(selectedPayout.created_at).toLocaleString() : "—",
              icon: Clock,
            },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayout(null)}
                className="border-slate-700 text-slate-300"
              >
                Close
              </Button>
              {(selectedPayout.status === "PENDING" || selectedPayout.status === "PROCESSING") && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedPayout.id, "FAILED")}
                    disabled={actionLoadingId === selectedPayout.id}
                  >
                    Mark as Failed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedPayout.id, "COMPLETED")}
                    disabled={actionLoadingId === selectedPayout.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Confirm Disbursement
                  </Button>
                </div>
              )}
            </>
          }
        />
      )}
    </div>
  );
}

// ==========================================
// 9. ADMIN SUPPORT TICKETS
// ==========================================
export function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminSupportTicketItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicketItem | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminSupportTickets();
      setTickets(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support inquiries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, searchQuery]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id?.toLowerCase().includes(q) ||
          t.user_name?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  const totalRecords = filteredTickets.length;
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Support Tickets Queue" subtitle="Manage customer and host support inquiries, requests, and grievances." />
        <Button variant="outline" size="sm" onClick={fetchTickets} disabled={isLoading} className="border-slate-800 bg-slate-900 text-slate-300">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search ticket code, requester, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchTickets} className="border-rose-700 text-rose-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading support queue...
                  </td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No support tickets found.</td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-rose-400">{t.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{t.user_name}</div>
                      <div className="text-slate-400 text-[11px]">{t.user_email}</div>
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

        <AdminPagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Card>

      {/* TICKET DETAIL DRAWER */}
      {selectedTicket && (
        <AdminDetailDrawer
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket ${selectedTicket.id}`}
          subtitle={`Requester: ${selectedTicket.user_name}`}
          badge={{
            text: `${selectedTicket.priority} Priority • ${selectedTicket.status}`,
            variant: selectedTicket.priority === "URGENT" || selectedTicket.priority === "HIGH" ? "destructive" : "outline",
          }}
          fields={[
            { label: "Requester Name", value: selectedTicket.user_name, icon: Users },
            { label: "Requester Email", value: selectedTicket.user_email, icon: Mail },
            { label: "Category", value: selectedTicket.category, icon: Tag },
            { label: "Current Status", value: selectedTicket.status, icon: LifeBuoy },
            { label: "Subject", value: selectedTicket.subject, icon: FileText, fullWidth: true },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTicket(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          }
        />
      )}
    </div>
  );
}

// ==========================================
// 10. ADMIN PLATFORM SETTINGS
// ==========================================
export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [formData, setFormData] = useState<{
    platform_name: string;
    commission_rate: number;
    currency: string;
    environment: string;
    support_email: string;
    is_maintenance_mode: boolean;
  }>({
    platform_name: "NammaConnect",
    commission_rate: 0.05,
    currency: "INR",
    environment: "development",
    support_email: "support@nammaconnect.com",
    is_maintenance_mode: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminSettings();
      setSettings(res);
      setFormData({
        platform_name: res.platform_name,
        commission_rate: res.commission_rate,
        currency: res.currency,
        environment: res.environment,
        support_email: res.support_email,
        is_maintenance_mode: res.is_maintenance_mode,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load platform settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await updateAdminSettings({
        platform_name: formData.platform_name,
        commission_rate: Number(formData.commission_rate),
        currency: formData.currency,
        environment: formData.environment,
        support_email: formData.support_email,
        is_maintenance_mode: formData.is_maintenance_mode,
      });
      setSettings(updated);
      setSuccessMsg("Platform settings successfully updated and saved to database!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to persist platform settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Platform Settings"
        subtitle="Platform commission rate, operational currency, maintenance modes, and server configuration."
      />

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

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
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <SettingsIcon className="h-6 w-6 text-rose-500" />
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

          <form onSubmit={handleSave}>
            <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <SettingsIcon className="h-6 w-6 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm">Update Platform Configuration</h3>
                  <p className="text-xs text-slate-400">Save changes directly to PostgreSQL database.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Platform Name</label>
                  <input
                    type="text"
                    value={formData.platform_name}
                    onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Platform Commission Rate (e.g. 0.05 for 5%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.5"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Operating Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Environment Tier</label>
                  <input
                    type="text"
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-rose-400 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Support Contact Email</label>
                  <input
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">Maintenance Mode</label>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <input
                      type="checkbox"
                      id="maintenance_mode_cb"
                      checked={formData.is_maintenance_mode}
                      onChange={(e) => setFormData({ ...formData, is_maintenance_mode: e.target.checked })}
                      className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-800 border-slate-700"
                    />
                    <label htmlFor="maintenance_mode_cb" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Enable System Maintenance Barrier
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 rounded-xl shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Platform Settings"
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      ) : null}
    </div>
  );
}
