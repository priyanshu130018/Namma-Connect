/**
 * Role-agnostic dashboard screens.
 * Each takes a `role` so the shared shell keeps the correct accent + sidebar.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBell,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiGlobe,
  FiLifeBuoy,
  FiLock,
  FiMail,
  FiMessageSquare,
  FiMoon,
  FiSearch,
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardTitle, StatCard } from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import { Field, Select, TextArea, TextInput } from "@/components/kit/Field";
import {
  Avatar,
  Badge,
  DataTable,
  EmptyState,
  Modal,
  SkeletonGrid,
  StatusBadge,
  Tabs,
} from "@/components/kit/UI";
import { useBookingState } from "@/hooks/useBookingStore";
import { bookingStore } from "@/services/bookingStore";
import { Switch } from "@/components/ui/switch";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useMockData } from "@/hooks/useMockData";
import mockApi from "@/services/mockApi";
import { useTheme } from "@/lib/theme";
import type { Role } from "@/lib/roles";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ── Activities ────────────────────────────────────────────────────────── */

export function ActivitiesPage({ role }: { role: Role }) {
  const { data, loading } = useMockData(mockApi.getActivities);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = data ?? [];
    return list.filter(
      (a) =>
        (tab === "all" || a.status === tab) &&
        (a.title.toLowerCase().includes(q.toLowerCase()) ||
          a.location.toLowerCase().includes(q.toLowerCase())),
    );
  }, [data, tab, q]);

  return (
    <DashboardLayout
      role={role}
      title="Activities"
      description="Hands-on farm activities and experiences available on the platform."
      actions={
        role === "farmer" ? (
          <Button size="sm" onClick={() => window.location.assign("/farmer/add-activity")}>
            Add activity
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All", count: data?.length ?? 0 },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <div className="relative sm:w-72">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activities"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No activities found" description="Try a different filter or search term." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <Card key={a.id} padded={false} hover className="overflow-hidden">
              <img src={a.image} alt={a.title} loading="lazy" className="h-40 w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{a.title}</CardTitle>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {a.farm} · {a.location}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge tone="info">{a.category}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <FiClock /> {a.duration}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FiStar className="text-warning" /> {a.rating}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm font-semibold text-foreground">
                    {inr(a.price)} <span className="text-xs font-normal text-muted-foreground">/ person</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.booked}/{a.slots} booked
                  </p>
                </div>
                <Button variant="outline" size="sm" fullWidth>
                  {role === "tourist" ? "Book activity" : "Manage"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── History ───────────────────────────────────────────────────────────── */

export function HistoryPage({ role }: { role: Role }) {
  const { data, loading } = useMockData(mockApi.getHistory);
  const rows = data ?? [];
  const total = rows.filter((r) => r.status === "completed").reduce((s, r) => s + r.amount, 0);

  return (
    <DashboardLayout
      role={role}
      title="History"
      description="Everything that has already happened on your account."
      actions={
        <Button size="sm" variant="outline">
          <FiDownload /> Export
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completed" value={rows.filter((r) => r.status === "completed").length} icon={<FiCheckCircle />} />
        <StatCard label="Cancelled" value={rows.filter((r) => r.status === "cancelled").length} icon={<FiClock />} />
        <StatCard label="Lifetime value" value={inr(total)} icon={<FiTrendingUp />} />
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="History"
          rows={rows}
          columns={[
            { key: "id", header: "Reference", render: (r) => <span className="font-medium">{r.id}</span> },
            { key: "item", header: "Item" },
            { key: "type", header: "Type", render: (r) => <Badge tone="info">{r.type}</Badge> },
            { key: "date", header: "Date" },
            { key: "guests", header: "Guests" },
            { key: "amount", header: "Amount", render: (r) => inr(r.amount) },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "action",
              header: "",
              render: (r) => (
                <Button size="sm" variant="ghost">
                  {r.rated ? "View" : "Leave review"}
                </Button>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

/* ── Messages ──────────────────────────────────────────────────────────── */

type ChatMessage = { from: string; text: string; time: string };
type Thread = {
  id: string;
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
};

const nowTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const autoReplyFor = (name: string) =>
  name.includes("Support")
    ? "Thanks — our team will pick this up within a few hours."
    : "Perfect, noted! I'll confirm the details shortly.";

export function MessagesPage({ role }: { role: Role }) {
  const { data, loading } = useMockData(mockApi.getConversations);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data) setThreads(data.map((c) => ({ ...c, messages: [...c.messages] })));
  }, [data]);

  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    },
    [],
  );

  const active = threads.find((c) => c.id === (activeId ?? threads[0]?.id));
  const filtered = threads.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  const openThread = (id: string) => {
    setActiveId(id);
    setChatOpen(true);
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const send = (text: string) => {
    const body = text.trim();
    if (!body || !active) return;
    const id = active.id;
    const name = active.name;
    setThreads((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              messages: [...t.messages, { from: "me", text: body, time: nowTime() }],
              last: body,
              time: "now",
            }
          : t,
      ),
    );
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      const reply = autoReplyFor(name);
      setThreads((ts) =>
        ts.map((t) =>
          t.id === id
            ? {
                ...t,
                messages: [...t.messages, { from: "them", text: reply, time: nowTime() }],
                last: reply,
                time: "now",
              }
            : t,
        ),
      );
    }, 1500);
  };

  return (
    <DashboardLayout role={role} title="Messages" description="Conversations with guests, hosts and the support team.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Conversation list */}
          <Card padded={false} className={`flex-col overflow-hidden ${chatOpen ? "hidden lg:flex" : "flex"}`}>
            <div className="border-b border-border p-3">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search conversations"
                  className="pl-9"
                />
              </div>
            </div>
            <ul className="max-h-[620px] divide-y divide-border overflow-y-auto">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openThread(c.id)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted ${
                      active?.id === c.id ? "bg-role-soft" : ""
                    }`}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={c.name} />
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{c.last}</span>
                        {c.unread > 0 ? (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-role text-[10px] font-semibold text-role-foreground">
                            {c.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">No conversations found</li>
              ) : null}
            </ul>
          </Card>

          {/* Chat panel */}
          <Card
            padded={false}
            className={`h-[600px] flex-col overflow-hidden lg:h-[680px] ${chatOpen ? "flex" : "hidden lg:flex"}`}
          >
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <button
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                    onClick={() => setChatOpen(false)}
                    aria-label="Back to conversations"
                  >
                    <FiArrowLeft />
                  </button>
                  <Avatar name={active.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{active.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-success" />
                      {active.role} · Online
                    </p>
                  </div>
                </div>

                <Conversation className="bg-muted/40">
                  <ConversationContent className="gap-3 p-4">
                    {active.messages.length === 0 ? (
                      <ConversationEmptyState
                        icon={<FiMessageSquare className="size-8" />}
                        title="No messages yet"
                        description={`Say hello to ${active.name}.`}
                      />
                    ) : (
                      active.messages.map((m, i) => (
                        <Message
                          key={i}
                          from={m.from === "me" ? "user" : "assistant"}
                          className="max-w-[88%] sm:max-w-[70%]"
                        >
                          <MessageContent className="group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-role group-[.is-user]:px-3.5 group-[.is-user]:py-2 group-[.is-user]:text-role-foreground group-[.is-assistant]:rounded-2xl group-[.is-assistant]:rounded-bl-md group-[.is-assistant]:border group-[.is-assistant]:border-border group-[.is-assistant]:bg-card group-[.is-assistant]:px-3.5 group-[.is-assistant]:py-2">
                            {m.from !== "me" ? (
                              <span className="text-[11px] font-semibold text-role">{active.name}</span>
                            ) : null}
                            <span className="whitespace-pre-wrap text-sm leading-snug">{m.text}</span>
                            <span className="-mt-1 self-end text-[10px] opacity-60">{m.time}</span>
                          </MessageContent>
                        </Message>
                      ))
                    )}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>

                <div className="border-t border-border p-3">
                  <PromptInput onSubmit={(message) => send(message.text)}>
                    <PromptInputTextarea placeholder="Type a message…" />
                    <PromptInputFooter className="justify-end">
                      <PromptInputSubmit />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </>
            ) : (
              <ConversationEmptyState
                icon={<FiMessageSquare className="size-8" />}
                title="Pick a conversation"
                description="Choose a chat from the list to start messaging."
              />
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Notifications ─────────────────────────────────────────────────────── */

type NotificationItem = {
  id: string;
  category: string;
  title: string;
  body: string;
  time: string;
  type: string;
  read: boolean;
};

const NOTIF_META: Record<string, { icon: ReactNode; label: string }> = {
  booking: { icon: <FiCalendar />, label: "Booking" },
  payment: { icon: <FiCreditCard />, label: "Payment" },
  review: { icon: <FiStar />, label: "Review" },
  message: { icon: <FiMessageSquare />, label: "Message" },
  system: { icon: <FiBell />, label: "System" },
};

export function NotificationsPage({ role }: { role: Role }) {
  const bookingState = useBookingState();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  // Live feed from the shared store: base announcements plus booking/payment
  // events targeted at this role — updates instantly as actions happen.
  const items = bookingState.notifications.filter(
    (n) => n.audience === "all" || n.audience === role,
  );

  const unread = items.filter((n) => !n.read).length;
  const list = items.filter((n) =>
    tab === "all" ? true : tab === "unread" ? !n.read : n.read,
  );

  const markRead = (id: string) => bookingStore.markNotificationRead(id);
  const markAll = () => bookingStore.markAllNotificationsRead(role);

  return (
    <DashboardLayout
      role={role}
      title="Notifications"
      description="Booking updates, payouts and platform announcements."
      actions={
        <Button size="sm" variant="outline" onClick={markAll} disabled={unread === 0}>
          <FiCheck /> Mark all read
        </Button>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All", count: items.length },
          { value: "unread", label: "Unread", count: unread },
          { value: "read", label: "Read", count: items.length - unread },
        ]}
      />
      {loading ? (
        <SkeletonGrid count={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<FiBell />}
          title="You're all caught up"
          description="New booking, payment and review updates will appear here."
        />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {list.map((n) => {
              const meta = NOTIF_META[n.category] ?? NOTIF_META["system"]!;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-4 transition-colors ${n.read ? "" : "bg-role-soft/40"}`}
                >
                  <span
                    className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${
                      n.read ? "bg-muted text-muted-foreground" : "bg-role-soft text-role"
                    }`}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm text-foreground ${n.read ? "font-medium" : "font-semibold"}`}>
                        {n.title}
                      </p>
                      <Badge tone="neutral">{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {n.read ? (
                      <FiCheckCircle className="text-muted-foreground/40" aria-label="Read" />
                    ) : (
                      <>
                        <button
                          onClick={() => markRead(n.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-role transition-colors hover:bg-role-soft"
                        >
                          Mark as read
                        </button>
                        <span className="size-2 rounded-full bg-role" aria-label="Unread" />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}

/* ── Help centre ───────────────────────────────────────────────────────── */

export function HelpCentrePage({ role }: { role: Role }) {
  const { data: articles } = useMockData(mockApi.getHelpArticles);
  const { data: topics } = useMockData(mockApi.getHelpTopics);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const faqs = (articles ?? []).filter((a) => a.q.toLowerCase().includes(q.toLowerCase()));

  return (
    <DashboardLayout role={role} title="Help Centre" description="Guides, answers and a direct line to our support team.">
      <Card className="space-y-4">
        <CardTitle>How can we help?</CardTitle>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search help articles"
            className="pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(topics ?? []).map((t) => (
            <button
              key={t.id}
              className="rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-role-soft text-role">
                <FiFileText />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.articles} articles</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="space-y-3">
          <CardTitle>Frequently asked</CardTitle>
          <ul className="divide-y divide-border">
            {faqs.map((f) => (
              <li key={f.id} className="py-3">
                <button
                  onClick={() => setOpen(open === f.id ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm font-medium text-foreground"
                  aria-expanded={open === f.id}
                >
                  {f.q}
                  <span className="text-muted-foreground">{open === f.id ? "−" : "+"}</span>
                </button>
                {open === f.id ? <p className="mt-2 text-sm text-muted-foreground">{f.a}</p> : null}
              </li>
            ))}
          </ul>
          {faqs.length === 0 ? <EmptyState title="No articles matched" /> : null}
        </Card>

        <Card className="space-y-4">
          <CardTitle>Contact support</CardTitle>
          <Field label="Subject">
            <TextInput placeholder="Briefly describe the issue" />
          </Field>
          <Field label="Category">
            <Select defaultValue="booking">
              <option value="booking">Bookings</option>
              <option value="payment">Payments</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Message">
            <TextArea rows={4} placeholder="Tell us what happened…" />
          </Field>
          <Button fullWidth>
            <FiMail /> Send message
          </Button>
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <FiLifeBuoy /> Average reply time
            </p>
            <p className="mt-1">Under 4 hours, 9 AM – 9 PM IST.</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ── Reports ───────────────────────────────────────────────────────────── */

export function ReportsPage({ role }: { role: Role }) {
  const { data, loading } = useMockData(mockApi.getReports);
  const { data: revenue } = useMockData(mockApi.getRevenue);
  const rows = data ?? [];

  return (
    <DashboardLayout
      role={role}
      title="Reports"
      description="Downloadable summaries of bookings, revenue and guest feedback."
      actions={
        <Button size="sm">
          <FiFileText /> Generate report
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reports generated" value={rows.length} icon={<FiFileText />} />
        <StatCard label="This month" value="2" icon={<FiCalendar />} />
        <StatCard
          label="Revenue tracked"
          value={inr((revenue ?? []).reduce((s, r) => s + (r.value ?? 0), 0))}
          icon={<FiTrendingUp />}
        />
        <StatCard label="Scheduled" value="Weekly" icon={<FiClock />} />
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Reports"
          rows={rows}
          columns={[
            { key: "name", header: "Report", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "period", header: "Period" },
            { key: "generated", header: "Generated" },
            { key: "format", header: "Format", render: (r) => <Badge tone="info">{r.format}</Badge> },
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
      )}
    </DashboardLayout>
  );
}

/* ── Payments (generic) ────────────────────────────────────────────────── */

export function PaymentsPage({ role }: { role: Role }) {
  const { data, loading } = useMockData(mockApi.getPayments);
  const rows = data ?? [];
  const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <DashboardLayout role={role} title="Payments" description="Transactions, payouts and settlement status.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Settled" value={inr(paid)} icon={<FiCheckCircle />} />
        <StatCard label="Pending" value={rows.filter((p) => p.status === "pending").length} icon={<FiClock />} />
        <StatCard label="Transactions" value={rows.length} icon={<FiUsers />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Payments"
          rows={rows}
          columns={[
            { key: "id", header: "Payment", render: (p) => <span className="font-medium">{p.id}</span> },
            { key: "bookingId", header: "Booking" },
            { key: "date", header: "Date" },
            { key: "method", header: "Method" },
            { key: "amount", header: "Amount", render: (p) => inr(p.amount) },
            { key: "fee", header: "Fee", render: (p) => inr(p.fee) },
            { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

/* ── Calendar ──────────────────────────────────────────────────────────── */

export function CalendarPage({ role }: { role: Role }) {
  const { data } = useMockData(mockApi.getCalendar);
  const events = data ?? [];
  const today = new Date();
  const days = Array.from({ length: 35 }, (_, i) => i - today.getDay() + 1);

  return (
    <DashboardLayout role={role} title="Calendar" description="Upcoming stays, activities and blocked dates.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <CardTitle>{today.toLocaleString("en-IN", { month: "long", year: "numeric" })}</CardTitle>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const valid = d > 0 && d <= 31;
              const busy = valid && [4, 9, 14, 19, 25].includes(d);
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-md border border-border p-1 text-xs ${
                    valid ? "text-foreground" : "text-muted-foreground/40"
                  } ${busy ? "bg-role-soft font-semibold text-role" : ""}`}
                >
                  {valid ? d : ""}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Upcoming</CardTitle>
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.date} · {e.slot} · {e.guests} guests
                </p>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" fullWidth>
            Block dates
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

function SettingsSection({
  icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={`space-y-5 ${danger ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            danger ? "bg-destructive/10 text-destructive" : "bg-role-soft text-role"
          }`}
        >
          {icon}
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

function SettingRow({ label, hint, control }: { label: string; hint?: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {control}
    </div>
  );
}

const readUser = (): { name?: string; email?: string } => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("nc_user") ?? "null") ?? {};
  } catch {
    return {};
  }
};

const NOTIF_PREFS = [
  { key: "email", label: "Email alerts", hint: "Booking confirmations and receipts" },
  { key: "sms", label: "SMS / WhatsApp alerts", hint: "Time-sensitive updates on the go" },
  { key: "booking", label: "Booking updates", hint: "Requests, approvals and reminders" },
  { key: "offers", label: "Offers & deals", hint: "Seasonal discounts and new farms" },
] as const;

export function SettingsPage({ role }: { role: Role }) {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(() => {
    const u = readUser();
    return { name: u.name ?? "", email: u.email ?? "", phone: "+91 98765 43210" };
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, sms: false, booking: true, offers: false });
  const [lang, setLang] = useState("English");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const saveProfile = () => {
    try {
      const u = readUser();
      localStorage.setItem("nc_user", JSON.stringify({ ...u, name: profile.name, email: profile.email }));
    } catch {
      /* storage unavailable */
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const changePassword = () => {
    setPwMsg(null);
    if (!pw.current) return setPwMsg({ type: "error", text: "Enter your current password." });
    if (pw.next.length < 6)
      return setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
    if (pw.next !== pw.confirm) return setPwMsg({ type: "error", text: "New passwords do not match." });
    setPwSaving(true);
    setTimeout(() => {
      setPwSaving(false);
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "success", text: "Password updated successfully." });
    }, 900);
  };

  const pwField = (key: "current" | "next" | "confirm", label: string, placeholder: string) => (
    <Field label={label}>
      <div className="relative">
        <TextInput
          type={showPw[key] ? "text" : "password"}
          value={pw[key]}
          onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPw[key] ? "Hide password" : "Show password"}
        >
          {showPw[key] ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </button>
      </div>
    </Field>
  );

  return (
    <DashboardLayout role={role} title="Settings" description="Manage your profile, security and preferences.">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <SettingsSection
          icon={<FiUser />}
          title="Profile info"
          description="This is how you appear to hosts and guests."
        >
          <div className="flex items-center gap-4">
            <Avatar name={profile.name || "Guest"} size="lg" />
            <Button size="sm" variant="outline">
              Change photo
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <TextInput
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91…"
              />
            </Field>
          </div>
          <Field label="Email address">
            <TextInput
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveProfile} disabled={!profile.name.trim() || !profile.email.trim()}>
              {profileSaved ? <FiCheck /> : null}
              {profileSaved ? "Saved" : "Save changes"}
            </Button>
            {profileSaved ? <span className="text-xs font-medium text-success">Profile updated</span> : null}
          </div>
        </SettingsSection>

        {/* Change password */}
        <SettingsSection
          icon={<FiLock />}
          title="Change password"
          description="Keep your account secure with a strong password."
        >
          {pwMsg ? (
            <div
              className={`rounded-lg border p-3 text-sm font-medium ${
                pwMsg.type === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {pwMsg.text}
            </div>
          ) : null}
          {pwField("current", "Current password", "Your current password")}
          <div className="grid gap-4 sm:grid-cols-2">
            {pwField("next", "New password", "Min. 6 characters")}
            {pwField("confirm", "Confirm new password", "Re-enter new password")}
          </div>
          <Button size="sm" onClick={changePassword} disabled={pwSaving}>
            {pwSaving ? "Updating…" : "Update password"}
          </Button>
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection
          icon={<FiMoon />}
          title="Preferences"
          description="Personalise how Namma Connect looks and feels."
        >
          <SettingRow
            label="Dark mode"
            hint="Easier on the eyes at night"
            control={
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
            }
          />
          <div className="border-t border-border" />
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <FiGlobe /> Language
              </p>
              <p className="text-xs text-muted-foreground">Used across the app</p>
            </div>
            <Select value={lang} onChange={(e) => setLang(e.target.value)} className="w-36">
              {["English", "हिंदी", "ಕನ್ನಡ", "മലയാളം", "தமிழ்", "తెలుగు"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </div>
        </SettingsSection>

        {/* Notification settings */}
        <SettingsSection
          icon={<FiBell />}
          title="Notification settings"
          description="Choose what you want to hear about."
        >
          {NOTIF_PREFS.map((row, i) => (
            <Fragment key={row.key}>
              <SettingRow
                label={row.label}
                hint={row.hint}
                control={
                  <Switch
                    checked={notifs[row.key]}
                    onCheckedChange={(v) => setNotifs((n) => ({ ...n, [row.key]: v }))}
                    aria-label={row.label}
                  />
                }
              />
              {i < NOTIF_PREFS.length - 1 ? <div className="border-t border-border" /> : null}
            </Fragment>
          ))}
        </SettingsSection>

        {/* Danger zone */}
        <div className="lg:col-span-2">
          <SettingsSection
            danger
            icon={<FiAlertTriangle />}
            title="Danger zone"
            description="Irreversible account actions."
          >
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteText("");
                setDeleteMsg(null);
              }}
            >
              <FiTrash2 /> Delete account
            </Button>
          </SettingsSection>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        description="This permanently removes your profile, bookings and listings."
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleteText !== "DELETE"}
              onClick={() => setDeleteMsg("Account deletion is disabled in demo mode.")}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Type <span className="font-semibold text-destructive">DELETE</span> to confirm.
          </p>
          <TextInput
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
          {deleteMsg ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm font-medium text-warning">
              {deleteMsg}
            </p>
          ) : null}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
