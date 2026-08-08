import { useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiDollarSign,
  FiEdit2,
  FiFileText,
  FiLifeBuoy,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
} from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardTitle, StatCard } from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import { Field, Select, TextInput } from "@/components/kit/Field";
import {
  Avatar,
  Badge,
  BarChart,
  DataTable,
  EmptyState,
  LineChart,
  Modal,
  ProgressBar,
  SkeletonGrid,
  StatusBadge,
  Tabs,
} from "@/components/kit/UI";
import { useMockData } from "@/hooks/useMockData";
import mockApi from "@/services/mockApi";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Shell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout role="admin" title={title} description={description} actions={actions}>
      {children}
    </DashboardLayout>
  );
}

/* ── Users ─────────────────────────────────────────────────────────────── */

export function AdminUsers() {
  const { data, loading } = useMockData(mockApi.getUsers);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = (data ?? []).filter(
    (u) =>
      (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())) &&
      (role === "all" || u.role === role) &&
      (status === "all" || u.status === status),
  );

  return (
    <Shell title="Users" description="Every account on the platform." actions={<Button size="sm"><FiPlus /> Invite</Button>}>
      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label="Search">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="pl-9" />
          </div>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {["all", "tourist", "farmer", "creator", "admin"].map((r) => (
              <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["all", "active", "pending", "suspended"].map((s) => (
              <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Users"
          rows={rows}
          empty={<EmptyState icon={<FiUsers />} title="No users match that search" />}
          columns={[
            { key: "name", header: "User", render: (u) => (
              <span className="flex items-center gap-2">
                <Avatar name={u.name} size="sm" />
                <span>
                  <span className="block font-medium text-foreground">{u.name}</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </span>
              </span>
            ) },
            { key: "role", header: "Role", render: (u) => <Badge tone="role">{u.role}</Badge> },
            { key: "joined", header: "Joined" },
            { key: "verified", header: "Verified", render: (u) => (u.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>) },
            { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
            { key: "actions", header: "", render: () => <Button size="sm" variant="outline">Manage</Button> },
          ]}
        />
      )}
    </Shell>
  );
}

/* ── Verification ──────────────────────────────────────────────────────── */

export function AdminVerify() {
  const { data, loading } = useMockData(mockApi.getVerificationQueue);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const rows = data ?? [];

  return (
    <Shell title="Verify Users" description="Review identity and ownership documents.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((v) => {
            const status = decisions[v.id] ?? v.status;
            return (
              <Card key={v.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={v.name} />
                    <div className="min-w-0">
                      <CardTitle className="truncate">{v.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{v.role} · {v.submitted}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{v.document}</p>
                {status === "pending" ? (
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button size="sm" fullWidth onClick={() => setDecisions({ ...decisions, [v.id]: "approved" })}>
                      <FiCheck /> Approve
                    </Button>
                    <Button size="sm" fullWidth variant="outline" onClick={() => setDecisions({ ...decisions, [v.id]: "rejected" })}>
                      <FiX /> Reject
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* ── Approvals ─────────────────────────────────────────────────────────── */

export function AdminApprovals() {
  const { data, loading } = useMockData(mockApi.getApprovalQueue);
  const [tab, setTab] = useState("all");
  const rows = (data ?? []).filter((a) => tab === "all" || a.kind.toLowerCase().includes(tab));

  return (
    <Shell title="Farm & Activity Approval" description="Moderate new listings before they go live.">
      <Tabs
        value={tab}
        onChange={setTab}
        className="w-fit max-w-full"
        tabs={[
          { value: "all", label: "All" },
          { value: "farm", label: "Farm listings" },
          { value: "activity", label: "Activities" },
        ]}
      />
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <Card key={a.id} padded={false} className="overflow-hidden">
              <img src={a.image} alt={a.title} loading="lazy" className="h-36 w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{a.title}</CardTitle>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {a.kind} · {a.owner}
                </p>
                <p className="text-xs text-muted-foreground">Submitted {a.submitted}</p>
                {a.status === "pending" ? (
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button size="sm" fullWidth><FiCheck /> Approve</Button>
                    <Button size="sm" fullWidth variant="outline"><FiX /> Reject</Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Reports & fraud ───────────────────────────────────────────────────── */

export function AdminReports() {
  const { data, loading } = useMockData(mockApi.getFraudAlerts);
  const rows = data ?? [];
  const tone = (s: string) =>
    s === "high" ? ("danger" as const) : s === "medium" ? ("warning" as const) : ("neutral" as const);

  return (
    <Shell title="Reports & Fraud Detection" description="Automated risk signals across the platform.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Open alerts" value={rows.length} icon={<FiAlertTriangle />} />
        <StatCard label="High severity" value={rows.filter((r) => r.severity === "high").length} icon={<FiShield />} />
        <StatCard label="Resolved (30d)" value={14} icon={<FiCheck />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FiShield />} title="No active alerts" />
      ) : (
        <div className="space-y-3">
          {rows.map((f) => (
            <Card key={f.id} className="flex items-start gap-4">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <FiAlertTriangle />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{f.title}</p>
                  <Badge tone={tone(f.severity)}>{f.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.time}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline">Dismiss</Button>
                <Button size="sm">Investigate</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Analytics ─────────────────────────────────────────────────────────── */

export function AdminAnalytics() {
  const { data: stats } = useMockData(mockApi.getPlatformStats);
  const { data: revenue } = useMockData(mockApi.getRevenue);
  const { data: traffic } = useMockData(mockApi.getTraffic);

  return (
    <Shell title="Platform Analytics" description="Growth, bookings and marketplace volume.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={(stats?.users ?? 0).toLocaleString("en-IN")} icon={<FiUsers />} />
        <StatCard label="Bookings" value={(stats?.bookings ?? 0).toLocaleString("en-IN")} icon={<FiTrendingUp />} />
        <StatCard label="GMV" value={inr(stats?.gmv ?? 0)} icon={<FiDollarSign />} />
        <StatCard label="Active listings" value={stats?.activeListings ?? 0} icon={<FiBarChart2 />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Marketplace revenue</CardTitle>
          <BarChart data={(revenue ?? []).map((r) => ({ label: r.label, value: Math.round(r.value / 1000) }))} valuePrefix="₹" />
        </Card>
        <Card className="space-y-4">
          <CardTitle>Weekly signups</CardTitle>
          <LineChart data={traffic ?? []} />
        </Card>
      </div>
      <Card className="space-y-4">
        <CardTitle>Users by role</CardTitle>
        {[
          { label: "Tourists", value: 84 },
          { label: "Farmers", value: 9 },
          { label: "Creators", value: 6 },
          { label: "Admins", value: 1 },
        ].map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{r.label}</span>
              <span className="text-muted-foreground">{r.value}%</span>
            </div>
            <ProgressBar value={r.value} />
          </div>
        ))}
      </Card>
    </Shell>
  );
}

/* ── Support ───────────────────────────────────────────────────────────── */

export function AdminSupport() {
  const { data, loading } = useMockData(mockApi.getTickets);
  const [open, setOpen] = useState<string | null>(null);
  const rows = data ?? [];
  const active = rows.find((t) => t.id === open);

  return (
    <Shell title="Support" description="Tickets raised by users and hosts.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Open tickets" value={rows.filter((t) => t.status === "open").length} icon={<FiLifeBuoy />} />
        <StatCard label="Awaiting reply" value={rows.filter((t) => t.status === "pending").length} icon={<FiTrendingUp />} />
        <StatCard label="Resolved today" value={7} icon={<FiCheck />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Support tickets"
          rows={rows}
          columns={[
            { key: "id", header: "Ticket" },
            { key: "subject", header: "Subject" },
            { key: "user", header: "User" },
            { key: "priority", header: "Priority", render: (t) => (
              <Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "neutral"}>
                {t.priority}
              </Badge>
            ) },
            { key: "updated", header: "Updated" },
            { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
            { key: "actions", header: "", render: (t) => (
              <Button size="sm" variant="outline" onClick={() => setOpen(t.id)}>Open</Button>
            ) },
          ]}
        />
      )}

      <Modal
        open={!!active}
        onClose={() => setOpen(null)}
        title={active?.subject}
        description={`${active?.id} · ${active?.user}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
            <Button onClick={() => setOpen(null)}>Send reply</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Hi, I still haven't received the refund for my cancelled booking. Could you check?
          </div>
          <Field label="Reply">
            <TextInput placeholder="Type your response…" />
          </Field>
        </div>
      </Modal>
    </Shell>
  );
}

/* ── Blogs ─────────────────────────────────────────────────────────────── */

export function AdminBlogs() {
  const { data, loading } = useMockData(mockApi.getBlogPosts);
  const [composing, setComposing] = useState(false);
  const rows = data ?? [];

  return (
    <Shell
      title="Blogs"
      description="Create and manage editorial content."
      actions={<Button size="sm" onClick={() => setComposing(true)}><FiPlus /> New post</Button>}
    >
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Blog posts"
          rows={rows}
          empty={<EmptyState icon={<FiFileText />} title="No posts yet" />}
          columns={[
            { key: "title", header: "Title" },
            { key: "author", header: "Author" },
            { key: "category", header: "Category", render: (b) => <Badge tone="role">{b.category}</Badge> },
            { key: "date", header: "Date" },
            { key: "views", header: "Views", render: (b) => (b.views as number).toLocaleString("en-IN") },
            { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
            { key: "actions", header: "", render: () => (
              <span className="flex gap-2">
                <Button size="sm" variant="outline"><FiEdit2 /></Button>
                <Button size="sm" variant="danger"><FiTrash2 /></Button>
              </span>
            ) },
          ]}
        />
      )}

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="New blog post"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setComposing(false)}>Save draft</Button>
            <Button onClick={() => setComposing(false)}>Publish</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><TextInput placeholder="10 farm stays to visit this monsoon" /></Field>
          <Field label="Category">
            <Select>{["Guides", "Impact", "Creators", "News"].map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          <Field label="Author"><TextInput placeholder="Priya Desai" /></Field>
        </div>
      </Modal>
    </Shell>
  );
}

/* ── Roles ─────────────────────────────────────────────────────────────── */

export function AdminRoles() {
  const { data, loading } = useMockData(mockApi.getRoles);
  const rows = data ?? [];

  return (
    <Shell title="Roles & Permissions" description="What each role can do on the platform.">
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-3">
              <span className="grid size-10 place-items-center rounded-xl bg-role-soft text-role">
                <FiShield />
              </span>
              <CardTitle>{r.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {r.users.toLocaleString("en-IN")} users
              </p>
              <ul className="space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
                {r.permissions.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <FiCheck size={13} className="text-success" /> {p}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="outline" fullWidth>Edit permissions</Button>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
