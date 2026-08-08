/**
 * Role wrappers around the shared screens plus the remaining role-specific
 * feature pages. One import surface for the new routes.
 */
import { useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign,
  FiEye,
  FiHeart,
  FiInstagram,
  FiMapPin,
  FiPlayCircle,
  FiPlusSquare,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardTitle, StatCard } from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import { Field, Select, TextArea, TextInput } from "@/components/kit/Field";
import {
  Avatar,
  Badge,
  BarChart,
  DataTable,
  EmptyState,
  ProgressBar,
  SkeletonGrid,
  StatusBadge,
  Tabs,
} from "@/components/kit/UI";
import { useMockData } from "@/hooks/useMockData";
import mockApi from "@/services/mockApi";
import {
  ActivitiesPage,
  CalendarPage,
  HelpCentrePage,
  HistoryPage,
  MessagesPage,
  NotificationsPage,
  PaymentsPage,
  ReportsPage,
} from "@/dashboard/shared/pages";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ── Tourist ───────────────────────────────────────────────────────────── */

export const TouristActivities = () => <ActivitiesPage role="tourist" />;
export const TouristHistory = () => <HistoryPage role="tourist" />;
export const TouristHelp = () => <HelpCentrePage role="tourist" />;

export function TouristSavedRoutes() {
  const { data, loading } = useMockData(mockApi.getSavedRoutes);
  const routes = data ?? [];
  return (
    <DashboardLayout
      role="tourist"
      title="Saved Routes"
      description="Multi-stop trips you saved from the AI planner."
      actions={<Button size="sm">New route</Button>}
    >
      {loading ? (
        <SkeletonGrid count={3} />
      ) : routes.length === 0 ? (
        <EmptyState icon={<FiMapPin />} title="No saved routes yet" description="Plan a trip and save it here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((r) => (
            <Card key={r.id} className="space-y-4" hover>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{r.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.stops} stops · {r.days} days · {r.distance}
                  </p>
                </div>
                <Badge tone="info">Saved</Badge>
              </div>
              <ol className="space-y-2 border-l border-border pl-4 text-sm text-muted-foreground">
                {Array.from({ length: r.stops }).map((_, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-role" />
                    Stop {i + 1} · Day {i + 1}
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <Button size="sm" fullWidth>
                  Open route
                </Button>
                <Button size="sm" variant="outline" fullWidth>
                  Share
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Farmer ────────────────────────────────────────────────────────────── */

export const FarmerActivities = () => <ActivitiesPage role="farmer" />;
export const FarmerCalendar = () => <CalendarPage role="farmer" />;
export const FarmerReports = () => <ReportsPage role="farmer" />;
export const FarmerHistory = () => <HistoryPage role="farmer" />;
export const FarmerMessages = () => <MessagesPage role="farmer" />;
export const FarmerNotifications = () => <NotificationsPage role="farmer" />;
export const FarmerHelp = () => <HelpCentrePage role="farmer" />;

export function FarmerAddActivity() {
  const [saved, setSaved] = useState(false);
  return (
    <DashboardLayout role="farmer" title="Add Activity" description="Publish a new on-farm activity guests can book.">
      <form
        className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <Card className="space-y-4">
          <CardTitle>Activity details</CardTitle>
          <Field label="Activity name">
            <TextInput required placeholder="Sunrise coffee harvest walk" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select defaultValue="Farming">
                <option>Farming</option>
                <option>Food</option>
                <option>Culture</option>
                <option>Adventure</option>
                <option>Craft</option>
              </Select>
            </Field>
            <Field label="Duration">
              <TextInput placeholder="2 hrs" />
            </Field>
            <Field label="Price per person (₹)">
              <TextInput type="number" placeholder="700" />
            </Field>
            <Field label="Slots per session">
              <TextInput type="number" placeholder="8" />
            </Field>
          </div>
          <Field label="Description" hint="What will guests do, see and take away?">
            <TextArea rows={5} placeholder="Walk the rows at first light, pick cherries with the team…" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Publish activity</Button>
            <Button type="button" variant="outline">
              Save as draft
            </Button>
          </div>
          {saved ? (
            <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
              Activity saved. It will appear once approved.
            </p>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <CardTitle>Cover photo</CardTitle>
            <div className="grid h-36 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Drop an image or browse
            </div>
            <Button variant="outline" size="sm" fullWidth>
              Upload
            </Button>
          </Card>
          <Card className="space-y-3">
            <CardTitle>Availability</CardTitle>
            <Field label="Days">
              <Select defaultValue="all">
                <option value="all">Every day</option>
                <option value="weekend">Weekends only</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Start time">
              <TextInput type="time" defaultValue="06:30" />
            </Field>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}

export function FarmerCreatorRequests() {
  const { data, loading } = useMockData(mockApi.getCreatorRequests);
  const [tab, setTab] = useState("all");
  const rows = (data ?? []).filter((r) => tab === "all" || r.status === tab);

  return (
    <DashboardLayout role="farmer" title="Creator Requests" description="Creators asking to shoot at your farm.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={(data ?? []).filter((r) => r.status === "pending").length} icon={<FiUsers />} />
        <StatCard label="Accepted" value={(data ?? []).filter((r) => r.status === "accepted").length} icon={<FiCheckCircle />} />
        <StatCard label="Total reach" value="146K" icon={<FiTrendingUp />} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All", count: data?.length ?? 0 },
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "declined", label: "Declined" },
        ]}
      />
      {loading ? (
        <SkeletonGrid count={3} />
      ) : rows.length === 0 ? (
        <EmptyState title="No requests here" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar name={r.creator} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.creator}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.handle} · {r.followers} followers · {r.niche}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Dates</p>
                  <p className="font-medium text-foreground">{r.dates}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Asking for</p>
                  <p className="font-medium text-foreground">{r.ask}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" fullWidth>
                  Accept
                </Button>
                <Button size="sm" variant="outline" fullWidth>
                  Message
                </Button>
                <Button size="sm" variant="ghost">
                  <FiX />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Creator ───────────────────────────────────────────────────────────── */

export const CreatorPayments = () => <PaymentsPage role="creator" />;
export const CreatorMessages = () => <MessagesPage role="creator" />;
export const CreatorNotifications = () => <NotificationsPage role="creator" />;
export const CreatorHelp = () => <HelpCentrePage role="creator" />;
export const CreatorFavourites = () => <ActivitiesPage role="creator" />;

export function CreatorInstagram() {
  const { data } = useMockData(mockApi.getInstagram);
  if (!data) return <DashboardLayout role="creator" title="Instagram"><SkeletonGrid count={4} /></DashboardLayout>;
  return (
    <DashboardLayout
      role="creator"
      title="Instagram"
      description={`Connected account ${data.handle}`}
      actions={<Button size="sm" variant="outline">Sync now</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Followers" value={data.followers.toLocaleString("en-IN")} icon={<FiInstagram />} />
        <StatCard label="Monthly reach" value={data.reach.toLocaleString("en-IN")} icon={<FiEye />} />
        <StatCard label="Engagement" value={`${data.engagement}%`} icon={<FiTrendingUp />} />
        <StatCard label="Posts" value={data.posts} icon={<FiPlusSquare />} />
      </div>
      <Card className="space-y-4">
        <CardTitle>Reach this week</CardTitle>
        <BarChart data={data.weekly} />
      </Card>
      <Card className="space-y-4">
        <CardTitle>Top performing posts</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {data.topPosts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border">
              <img src={p.image} alt={p.caption} loading="lazy" className="h-36 w-full object-cover" />
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-foreground">{p.caption}</p>
                <p className="text-xs text-muted-foreground">
                  {p.likes.toLocaleString("en-IN")} likes · {p.comments} comments
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

export function CreatorYoutube() {
  const { data } = useMockData(mockApi.getYoutube);
  if (!data) return <DashboardLayout role="creator" title="YouTube"><SkeletonGrid count={4} /></DashboardLayout>;
  return (
    <DashboardLayout
      role="creator"
      title="YouTube"
      description={`Channel ${data.channel}`}
      actions={<Button size="sm" variant="outline">Sync now</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscribers" value={data.subscribers.toLocaleString("en-IN")} icon={<FiPlayCircle />} />
        <StatCard label="Watch hours" value={data.watchHours.toLocaleString("en-IN")} icon={<FiEye />} />
        <StatCard label="Avg. view duration" value={data.avgViewDuration} icon={<FiTrendingUp />} />
        <StatCard label="Videos" value={data.videos} icon={<FiPlusSquare />} />
      </div>
      <Card className="space-y-4">
        <CardTitle>Views this week</CardTitle>
        <BarChart data={data.weekly} />
      </Card>
      <DataTable
        caption="Top videos"
        rows={data.topVideos}
        columns={[
          {
            key: "title",
            header: "Video",
            render: (v) => (
              <span className="flex items-center gap-3">
                <img src={v.image} alt="" className="size-10 rounded object-cover" />
                <span className="font-medium">{v.title}</span>
              </span>
            ),
          },
          { key: "views", header: "Views", render: (v) => v.views.toLocaleString("en-IN") },
          { key: "published", header: "Published" },
        ]}
      />
    </DashboardLayout>
  );
}

export function CreatorBrandDeals() {
  const { data, loading } = useMockData(mockApi.getBrandDeals);
  const [tab, setTab] = useState("all");
  const rows = (data ?? []).filter((d) => tab === "all" || d.status === tab);
  const value = (data ?? []).filter((d) => d.status !== "declined").reduce((s, d) => s + d.budget, 0);

  return (
    <DashboardLayout
      role="creator"
      title="Brand Deals"
      description="Sponsored campaigns from farms, brands and tourism boards."
      actions={<Button size="sm">Add deal</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pipeline value" value={inr(value)} icon={<FiDollarSign />} />
        <StatCard label="Active" value={(data ?? []).filter((d) => d.status === "active").length} icon={<FiTrendingUp />} />
        <StatCard label="Completed" value={(data ?? []).filter((d) => d.status === "completed").length} icon={<FiCheckCircle />} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All", count: data?.length ?? 0 },
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
        ]}
      />
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Brand deals"
          rows={rows}
          columns={[
            { key: "brand", header: "Brand", render: (d) => <span className="font-medium">{d.brand}</span> },
            { key: "campaign", header: "Campaign" },
            { key: "deliverables", header: "Deliverables" },
            { key: "budget", header: "Budget", render: (d) => inr(d.budget) },
            { key: "deadline", header: "Deadline" },
            { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

/* ── Admin ─────────────────────────────────────────────────────────────── */

export const AdminHelp = () => <HelpCentrePage role="admin" />;

export function AdminVerifiedUsers() {
  const { data, loading } = useMockData(mockApi.getVerifiedUsers);
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <DashboardLayout role="admin" title="Verified Users" description="Accounts that cleared identity verification.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Verified accounts" value={data?.length ?? 0} icon={<FiUserCheck />} />
        <StatCard label="Avg. trust score" value="90" icon={<FiShield />} />
        <StatCard label="Re-verification due" value="1" icon={<FiAlertTriangle />} />
      </div>
      <div className="relative sm:max-w-sm">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search verified users" className="pl-9" />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Verified users"
          rows={rows}
          columns={[
            {
              key: "name",
              header: "User",
              render: (u) => (
                <span className="flex items-center gap-3">
                  <Avatar name={u.name} size="sm" />
                  <span>
                    <span className="block font-medium">{u.name}</span>
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </span>
                </span>
              ),
            },
            { key: "role", header: "Role", render: (u) => <Badge tone="info">{u.role}</Badge> },
            { key: "document", header: "Documents" },
            { key: "verifiedOn", header: "Verified on" },
            {
              key: "trust",
              header: "Trust",
              render: (u) => (
                <span className="block w-28">
                  <ProgressBar value={u.trust} />
                  <span className="mt-1 block text-xs text-muted-foreground">{u.trust}%</span>
                </span>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

export function AdminFarmApproval() {
  const { data, loading } = useMockData(mockApi.getFarmApprovals);
  const [tab, setTab] = useState("pending");
  const rows = (data ?? []).filter((f) => tab === "all" || f.status === tab);
  return (
    <DashboardLayout role="admin" title="Farm Approval" description="Review farm listings before they go live.">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Pending", count: (data ?? []).filter((f) => f.status === "pending").length },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ]}
      />
      {loading ? (
        <SkeletonGrid count={3} />
      ) : rows.length === 0 ? (
        <EmptyState title="Queue is clear" description="No farm listings waiting for review." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((f) => (
            <Card key={f.id} padded={false} className="overflow-hidden">
              <img src={f.image} alt={f.farm} loading="lazy" className="h-36 w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{f.farm}</CardTitle>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {f.owner} · {f.location}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {f.docs} documents · submitted {f.submitted}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" fullWidth>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" fullWidth>
                    Request info
                  </Button>
                  <Button size="sm" variant="danger">
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export function AdminActivityApproval() {
  const { data, loading } = useMockData(mockApi.getActivityApprovals);
  const rows = data ?? [];
  return (
    <DashboardLayout role="admin" title="Activity Approval" description="Moderate new activities submitted by hosts.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Activity approvals"
          rows={rows}
          columns={[
            {
              key: "activity",
              header: "Activity",
              render: (a) => (
                <span className="flex items-center gap-3">
                  <img src={a.image} alt="" className="size-10 rounded object-cover" />
                  <span className="font-medium">{a.activity}</span>
                </span>
              ),
            },
            { key: "host", header: "Host" },
            { key: "category", header: "Category", render: (a) => <Badge tone="info">{a.category}</Badge> },
            { key: "price", header: "Price", render: (a) => inr(a.price) },
            { key: "submitted", header: "Submitted" },
            { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
            {
              key: "actions",
              header: "",
              render: () => (
                <span className="flex gap-2">
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="ghost">
                    Reject
                  </Button>
                </span>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

export function AdminFraudDetection() {
  const { data, loading } = useMockData(mockApi.getFraudSignals);
  const rows = data ?? [];
  const tone = (l: string): "danger" | "warning" | "neutral" =>
    l === "high" ? "danger" : l === "medium" ? "warning" : "neutral";
  return (
    <DashboardLayout role="admin" title="Fraud Detection" description="Risk signals raised by the automated monitor.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open signals" value={rows.length} icon={<FiAlertTriangle />} />
        <StatCard label="High risk" value={rows.filter((r) => r.level === "high").length} icon={<FiShield />} />
        <StatCard label="Auto-blocked" value="2" icon={<FiX />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                  <FiAlertTriangle />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {r.signal} <Badge tone={tone(r.level)}>{r.level}</Badge>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entity {r.entity} · {r.time} · risk score {r.score}
                  </p>
                </div>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Investigate
                  </Button>
                  <Button size="sm" variant="danger">
                    Block
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}

export function AdminSettings() {
  return (
    <DashboardLayout role="admin" title="Settings" description="Platform-wide configuration and policies.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Platform</CardTitle>
          <Field label="Platform name">
            <TextInput defaultValue="Namma Connect" />
          </Field>
          <Field label="Support email">
            <TextInput defaultValue="support@nammaconnect.in" />
          </Field>
          <Field label="Default currency">
            <Select defaultValue="INR">
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </Field>
          <Button size="sm">Save changes</Button>
        </Card>

        <Card className="space-y-4">
          <CardTitle>Commission & payouts</CardTitle>
          <Field label="Platform commission (%)">
            <TextInput type="number" defaultValue={8} />
          </Field>
          <Field label="Payout cycle">
            <Select defaultValue="weekly">
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Minimum payout (₹)">
            <TextInput type="number" defaultValue={500} />
          </Field>
          <Button size="sm">Update payouts</Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Moderation</CardTitle>
          {[
            "Auto-approve verified hosts",
            "Require ID for creators",
            "Hold payouts on open fraud signal",
            "Enable guest review moderation",
          ].map((label, i) => (
            <label key={label} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
              <span className="text-foreground">{label}</span>
              <input type="checkbox" defaultChecked={i % 2 === 0} className="size-4 accent-[var(--color-role)]" />
            </label>
          ))}
        </Card>

        <Card className="space-y-3">
          <CardTitle>Danger zone</CardTitle>
          <p className="text-sm text-muted-foreground">
            Maintenance mode hides the marketplace from all guests. Existing bookings stay intact.
          </p>
          <Button variant="danger" size="sm">
            Enable maintenance mode
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export { FiHeart };
