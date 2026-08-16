import { useState } from "react";
import {
  FiBarChart2,
  FiCamera,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiEye,
  FiFileText,
  FiHeart,
  FiHeart as FiSave,
  FiInstagram,
  FiPlay,
  FiTrendingUp,
  FiUsers,
  FiYoutube,
} from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardTitle, StatCard } from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import {
  Avatar,
  Badge,
  BarChart,
  DataTable,
  DonutChart,
  EmptyState,
  LineChart,
  Modal,
  ProgressBar,
  SkeletonGrid,
  StatusBadge,
  Tabs,
} from "@/components/kit/UI";
import { useMockData } from "@/hooks/useMockData";
import api, { creatorAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch { return null; } };

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
    <DashboardLayout role="creator" title={title} description={description} actions={actions}>
      {children}
    </DashboardLayout>
  );
}

/* ── Portfolio ─────────────────────────────────────────────────────────── */

export function CreatorPortfolio() {
  const { data, loading } = useMockData(() => Promise.resolve([]));
  const [type, setType] = useState("all");
  const [preview, setPreview] = useState<{ title: string; image: string } | null>(null);
  const rows = data ?? [];
  const types = ["all", ...Array.from(new Set(rows.map((p) => p.type)))];
  const filtered = type === "all" ? rows : rows.filter((p) => p.type === type);

  return (
    <Shell
      title="Portfolio"
      description="Your published work across every platform."
      actions={<Button size="sm"><FiCamera /> Upload</Button>}
    >
      <Tabs
        value={type}
        onChange={setType}
        className="w-fit max-w-full"
        tabs={types.map((t) => ({ value: t, label: t === "all" ? "All work" : t }))}
      />
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FiCamera />} title="No posts yet" description="Upload your first reel or photo set." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} padded={false} hover className="overflow-hidden">
              <button
                type="button"
                onClick={() => setPreview({ title: p.title, image: p.image })}
                className="relative block w-full"
              >
                <img src={p.image} alt={p.title} loading="lazy" className="h-44 w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-foreground/0 text-transparent transition-colors hover:bg-foreground/30 hover:text-background">
                  <FiPlay size={28} />
                </span>
              </button>
              <div className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate">{p.title}</CardTitle>
                  <Badge tone="role">{p.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.date}</p>
                <div className="flex gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><FiEye size={13} /> {p.views}</span>
                  <span className="flex items-center gap-1"><FiHeart size={13} /> {p.likes}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} size="lg">
        {preview ? <img src={preview.image} alt={preview.title} className="w-full rounded-lg" /> : null}
      </Modal>
    </Shell>
  );
}

/* ── Collaborations ────────────────────────────────────────────────────── */

export function CreatorCollaborations() {
  const { data, loading } = useMockData(() => Promise.resolve([]));
  const rows = data ?? [];

  return (
    <Shell title="Collaborations" description="Brand and farm partnerships in progress.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Active" value={rows.filter((r) => r.status === "active").length} icon={<FiUsers />} />
        <StatCard label="Pending" value={rows.filter((r) => r.status === "pending").length} icon={<FiTrendingUp />} />
        <StatCard label="Contracted value" value={inr(rows.reduce((s, r) => s + r.fee, 0))} icon={<FiDollarSign />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate">{c.brand}</CardTitle>
                <StatusBadge status={c.status} />
              </div>
              <Badge tone="role">{c.type}</Badge>
              <p className="text-sm text-muted-foreground">{c.deliverables}</p>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Due {c.deadline}</span>
                <span className="font-semibold text-foreground">{inr(c.fee)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Bookings board ────────────────────────────────────────────────────── */

export function CreatorBookingsBoard() {
  const { data, loading } = useMockData(() => { const uid = getUser()?.userId; return uid ? creatorAPI.getBookings(uid).then(r => r.data?.received || []) : Promise.resolve([]); });
  const rows = data ?? [];

  return (
    <Shell title="Bookings" description="Clients who booked your creative services.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Creator bookings"
          rows={rows}
          columns={[
            { key: "id", header: "Booking" },
            { key: "client", header: "Client", render: (r) => (
              <span className="flex items-center gap-2">
                <Avatar name={r.client} size="sm" /> {r.client}
              </span>
            ) },
            { key: "service", header: "Service" },
            { key: "date", header: "Date" },
            { key: "amount", header: "Amount", render: (r) => inr(r.amount) },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </Shell>
  );
}

/* ── Analytics ─────────────────────────────────────────────────────────── */

export function CreatorAnalytics() {
  const { data } = useMockData(() => api.get('/analytics', {params:{role:'creator'}}).then(r => r.data?.engagement || []));

  return (
    <Shell title="Analytics" description="Audience growth and engagement.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Followers" value="113.6K" hint="+2.4K this month" icon={<FiUsers />} />
        <StatCard label="Avg. engagement" value="5.8%" icon={<FiBarChart2 />} />
        <StatCard label="Total views" value="870K" icon={<FiEye />} />
        <StatCard label="Saves" value="24.1K" icon={<FiSave />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Weekly engagement</CardTitle>
          <LineChart data={data ?? []} />
        </Card>
        <Card className="space-y-4">
          <CardTitle>Reach by day</CardTitle>
          <BarChart data={data ?? []} />
        </Card>
      </div>
      <Card className="space-y-4">
        <CardTitle>Audience breakdown</CardTitle>
        {[
          { label: "18–24", value: 32 },
          { label: "25–34", value: 44 },
          { label: "35–44", value: 16 },
          { label: "45+", value: 8 },
        ].map((a) => (
          <div key={a.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{a.label}</span>
              <span className="text-muted-foreground">{a.value}%</span>
            </div>
            <ProgressBar value={a.value} />
          </div>
        ))}
      </Card>
    </Shell>
  );
}

/* ── Revenue ───────────────────────────────────────────────────────────── */

export function CreatorRevenue() {
  const { data } = useMockData(() => api.get('/analytics', {params:{role:'creator'}}).then(r => r.data?.revenue || []));
  const rows = (data ?? []).map((r) => ({ ...r, value: Math.round(r.value * 0.6) }));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <Shell title="Revenue" description="Earnings from collaborations and bookings.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Lifetime earnings" value={inr(total)} icon={<FiDollarSign />} />
        <StatCard label="This month" value={inr(rows[rows.length - 1]?.value ?? 0)} icon={<FiTrendingUp />} />
        <StatCard label="Awaiting payout" value={inr(21500)} icon={<FiDollarSign />} />
      </div>
      <Card className="space-y-4">
        <CardTitle>Earnings trend</CardTitle>
        <BarChart data={rows.map((r) => ({ label: r.label, value: Math.round(r.value / 1000) }))} valuePrefix="₹" />
        <p className="text-xs text-muted-foreground">Values in thousands (₹k)</p>
      </Card>
      <DataTable
        caption="Payouts"
        rows={rows.map((r) => ({ id: r.label, month: r.label, amount: r.value, status: "paid" }))}
        columns={[
          { key: "month", header: "Month" },
          { key: "amount", header: "Payout", render: (r) => inr(r.amount as number) },
          { key: "status", header: "Status", render: () => <StatusBadge status="paid" /> },
        ]}
      />
    </Shell>
  );
}

/* ── Reports (revenue + analytics) ─────────────────────────────────────── */

export function CreatorReports() {
  const { data: earnings } = useMockData(() => Promise.resolve([]));
  const { data: mix } = useMockData(() => Promise.resolve([]));
  const { data: transactions, loading } = useMockData(() => Promise.resolve([]));
  const { data: reports } = useMockData(() => Promise.resolve([]));

  const series = earnings ?? [];
  const mixRows = mix ?? [];
  const tx = transactions ?? [];
  const total = series.reduce((s, r) => s + r.value, 0);
  const monthly = series[series.length - 1]?.value ?? 0;
  const prevLabel = series[series.length - 2]?.label ?? "last month";
  const prev = series[series.length - 2]?.value ?? 0;
  const delta = prev ? Math.round(((monthly - prev) / prev) * 100) : 0;
  const pendingRows = tx.filter((t) => t.status !== "paid");
  const pending = pendingRows.reduce((s, t) => s + t.amount, 0);

  return (
    <Shell
      title="Reports"
      description="Revenue and analytics across your creator work."
      actions={
        <Button size="sm">
          <FiFileText /> Generate report
        </Button>
      }
    >
      {/* Revenue summary */}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total earnings" value={inr(total)} hint="Feb – Aug 2026" icon={<FiDollarSign />} />
        <StatCard
          label="Monthly earnings"
          value={inr(monthly)}
          hint={`${delta >= 0 ? "+" : ""}${delta}% vs ${prevLabel}`}
          icon={<FiTrendingUp />}
        />
        <StatCard
          label="Pending payments"
          value={inr(pending)}
          hint={`${pendingRows.length} payout${pendingRows.length === 1 ? "" : "s"} in progress`}
          icon={<FiClock />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Earnings over time</CardTitle>
            <Badge tone="role">Last 7 months</Badge>
          </div>
          <LineChart data={series} />
          <p className="text-xs text-muted-foreground">
            Monthly payouts in ₹ across farm collabs, bookings and brand deals.
          </p>
        </Card>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Booking distribution</CardTitle>
            <Badge tone="role">By work type</Badge>
          </div>
          <DonutChart data={mixRows} centerValue="26" centerLabel="projects" />
        </Card>
      </div>

      {/* Recent transactions */}
      <section className="space-y-3" aria-label="Recent transactions">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Recent transactions</h2>
          <Badge tone="neutral">{tx.length} records</Badge>
        </div>
        {loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <DataTable
            caption="Recent transactions"
            rows={tx}
            columns={[
              { key: "date", header: "Date" },
              {
                key: "brand",
                header: "Brand / Collaboration",
                render: (r) => (
                  <span>
                    <span className="block font-medium text-foreground">{r.brand}</span>
                    <span className="block text-xs text-muted-foreground">{r.type}</span>
                  </span>
                ),
              },
              { key: "amount", header: "Amount", render: (r) => inr(r.amount as number) },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
            ]}
          />
        )}
      </section>

      {/* Generated reports */}
      <section className="space-y-3" aria-label="Generated reports">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Generated reports</h2>
          <Badge tone="neutral">{(reports ?? []).length} files</Badge>
        </div>
        <DataTable
          caption="Generated reports"
          rows={reports ?? []}
          columns={[
            {
              key: "name",
              header: "Report",
              render: (r) => (
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FiFileText className="text-muted-foreground" /> {String(r.name)}
                </span>
              ),
            },
            { key: "period", header: "Period" },
            { key: "generated", header: "Generated" },
            { key: "format", header: "Format", render: (r) => <Badge tone="info">{String(r.format)}</Badge> },
            { key: "size", header: "Size" },
            {
              key: "download",
              header: "",
              render: () => (
                <Button size="sm" variant="ghost">
                  <FiDownload /> Download
                </Button>
              ),
            },
          ]}
        />
      </section>
    </Shell>
  );
}

/* ── Social integrations ───────────────────────────────────────────────── */

export function CreatorSocial() {
  const { data, loading } = useMockData(() => Promise.resolve([]));
  const rows = data ?? [];

  return (
    <Shell title="Social Integrations" description="Connect the platforms you publish on.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-role-soft text-role">
                  {s.platform === "YouTube" ? <FiYoutube size={20} /> : <FiInstagram size={20} />}
                </span>
                <div className="min-w-0">
                  <CardTitle>{s.platform}</CardTitle>
                  <p className="truncate text-sm text-muted-foreground">{s.handle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Followers</p>
                  <p className="font-semibold text-foreground">{s.followers}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Engagement</p>
                  <p className="font-semibold text-foreground">{s.engagement}</p>
                </div>
              </div>
              <Button fullWidth variant={s.connected ? "outline" : "primary"}>
                {s.connected ? "Disconnect" : "Connect account"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Followers ─────────────────────────────────────────────────────────── */

export function CreatorFollowers() {
  const { data, loading } = useMockData(() => Promise.resolve([]));
  const rows = data ?? [];

  return (
    <Shell title="Followers" description="People following your work on Namma Connect.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Followers"
          rows={rows}
          columns={[
            { key: "name", header: "Follower", render: (r) => (
              <span className="flex items-center gap-2">
                <Avatar name={r.name} size="sm" />
                <span>
                  <span className="block font-medium text-foreground">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.handle}</span>
                </span>
              </span>
            ) },
            { key: "since", header: "Following since" },
            { key: "tier", header: "Tier", render: (r) => (
              <Badge tone={r.tier === "Top fan" ? "role" : "neutral"}>{r.tier}</Badge>
            ) },
            { key: "actions", header: "", render: () => <Button size="sm" variant="outline">Message</Button> },
          ]}
        />
      )}
    </Shell>
  );
}

/* ── Saved farms ───────────────────────────────────────────────────────── */

export function CreatorSavedFarms() {
  const { data, loading } = useMockData(() => Promise.resolve([]));
  const rows = (data ?? []).slice(0, 5);

  return (
    <Shell title="Saved Farms" description="Locations you're planning to shoot at.">
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((f) => (
            <Card key={f.id} padded={false} hover className="overflow-hidden">
              <img src={f.image} alt={f.name} loading="lazy" className="h-40 w-full object-cover" />
              <div className="space-y-2 p-5">
                <CardTitle className="truncate">{f.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{f.location}</p>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Badge tone="role">{f.category}</Badge>
                  <Button size="sm" variant="outline">Pitch collab</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
