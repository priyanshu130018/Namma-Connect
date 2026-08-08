import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCloudRain,
  FiDollarSign,
  FiDroplet,
  FiEdit2,
  FiEye,
  FiHome,
  FiMapPin,
  FiMessageSquare,
  FiRotateCcw,
  FiSearch,
  FiSun,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiWind,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardTitle, StatCard } from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import { Field, Select, TextArea, TextInput } from "@/components/kit/Field";
import { firstError, minLength, pincode, positiveNumber, required } from "@/lib/validation";
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
import { LocationPickerMap } from "@/components/map/Map";
import { useMockData } from "@/hooks/useMockData";
import { useBookingState } from "@/hooks/useBookingStore";
import { bookingStore } from "@/services/bookingStore";
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
    <DashboardLayout role="farmer" title={title} description={description} actions={actions}>
      {children}
    </DashboardLayout>
  );
}

/* ── Create farm (multi-step) ──────────────────────────────────────────── */

const STEPS = ["Basics", "Location", "Amenities", "Pricing", "Media"];

export function FarmerCreateFarm() {
  const [step, setStep] = useState(0);
  const amenities = ["Wi-Fi", "Parking", "Meals included", "Bonfire", "Pet friendly", "Guided tours", "Pool", "Bicycles"];
  const [picked, setPicked] = useState<string[]>(["Meals included"]);
  const [published, setPublished] = useState(false);

  /* Controlled form + field-level validation */
  const [form, setForm] = useState({
    name: "",
    category: "Organic",
    description: "",
    village: "",
    district: "",
    state: "",
    pincode: "",
    directions: "",
    price: "",
    maxGuests: "",
    minNights: "1",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const errors: Record<string, string> = {
    name: firstError(form.name, required("Farm name is required")),
    description: firstError(
      form.description,
      required("Description is required"),
      minLength(20, "Tell guests a bit more (min 20 characters)"),
    ),
    village: firstError(form.village, required("Village / town is required")),
    district: firstError(form.district, required("District is required")),
    state: firstError(form.state, required("State is required")),
    pincode: firstError(form.pincode, required("Pincode is required"), pincode()),
    price: firstError(form.price, required("Price is required"), positiveNumber("Price must be greater than 0")),
    maxGuests: firstError(form.maxGuests, required("Max guests is required"), positiveNumber("Must be at least 1 guest")),
    minNights: firstError(form.minNights, required("Minimum nights is required"), positiveNumber("Must be at least 1 night")),
  };

  const stepFields: string[][] = [
    ["name", "description"],
    ["village", "district", "state", "pincode"],
    [], // amenities validated via `picked`
    ["price", "maxGuests", "minNights"],
    [],
  ];
  const stepValid = (s: number) => (s === 2 ? picked.length > 0 : (stepFields[s] ?? []).every((k) => !errors[k]));

  const goNext = () => {
    if (!stepValid(step)) return; // button is disabled; guard anyway
    setStep(step + 1);
  };

  const publish = () => {
    const firstInvalid = [0, 1, 2, 3].findIndex((s) => !stepValid(s));
    if (firstInvalid !== -1) {
      setStep(firstInvalid);
      setTouched((t) => {
        const next = { ...t };
        (stepFields[firstInvalid] ?? []).forEach((k) => {
          next[k] = true;
        });
        return next;
      });
      return;
    }
    setPublished(true);
    setTimeout(() => setPublished(false), 4000);
  };

  const err = (key: string) => (touched[key] ? errors[key] || undefined : undefined);
  const invalidCls = (key: string) => (touched[key] && errors[key] ? "border-destructive" : "");

  return (
    <Shell title="Create Farm Listing" description="Publish a new farm stay in five short steps.">
      <Card className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                  i <= step ? "bg-role text-role-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <FiCheck size={13} /> : i + 1}
              </span>
              <span className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 ? <span className="h-px w-8 bg-border" /> : null}
            </div>
          ))}
        </div>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} />
      </Card>

      <Card className="space-y-4">
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Farm name" error={err("name")}>
              <TextInput
                value={form.name}
                onChange={set("name")}
                onBlur={() => touch("name")}
                className={invalidCls("name")}
                placeholder="Green Valley Organic Farm"
              />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={set("category")}>
                {["Organic", "Dairy", "Spice", "Paddy", "Orchard", "Plantation"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Short description" className="sm:col-span-2" error={err("description")}>
              <TextArea
                value={form.description}
                onChange={set("description")}
                onBlur={() => touch("description")}
                className={invalidCls("description")}
                placeholder="What makes your farm special? (min 20 characters)"
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Village / Town" error={err("village")}>
              <TextInput
                value={form.village}
                onChange={set("village")}
                onBlur={() => touch("village")}
                className={invalidCls("village")}
                placeholder="Madikeri"
              />
            </Field>
            <Field label="District" error={err("district")}>
              <TextInput
                value={form.district}
                onChange={set("district")}
                onBlur={() => touch("district")}
                className={invalidCls("district")}
                placeholder="Coorg"
              />
            </Field>
            <Field label="State" error={err("state")}>
              <TextInput
                value={form.state}
                onChange={set("state")}
                onBlur={() => touch("state")}
                className={invalidCls("state")}
                placeholder="Karnataka"
              />
            </Field>
            <Field label="Pincode" error={err("pincode")}>
              <TextInput
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                onBlur={() => touch("pincode")}
                className={invalidCls("pincode")}
                inputMode="numeric"
                maxLength={6}
                placeholder="571201"
              />
            </Field>
            <Field label="Directions for guests" className="sm:col-span-2" hint="Optional — landmarks, road condition, parking…">
              <TextArea value={form.directions} onChange={set("directions")} placeholder="Landmarks, road condition, parking…" />
            </Field>

            <Field
              label="Pin farm location on map"
              className="sm:col-span-2"
              hint="Click anywhere on the map to drop your farm's pin — guests see this on your listing."
            >
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <LocationPickerMap
                  height={400}
                  value={
                    form.latitude != null && form.longitude != null
                      ? { latitude: form.latitude, longitude: form.longitude }
                      : null
                  }
                  onChange={(p) => setForm((f) => ({ ...f, latitude: p.latitude, longitude: p.longitude }))}
                />
              </div>
            </Field>
            <div className="flex items-center gap-2 text-sm sm:col-span-2" aria-live="polite">
              <FiMapPin className="shrink-0 text-role" />
              {form.latitude != null && form.longitude != null ? (
                <span className="font-medium text-foreground">
                  Selected coordinates:{" "}
                  <span className="tabular-nums text-role">
                    {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">No location selected yet — click the map to place your farm.</span>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const on = picked.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked(on ? picked.filter((p) => p !== a) : [...picked, a])}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      on ? "border-role bg-role-soft text-role" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            {picked.length === 0 ? (
              <p role="alert" className="text-xs font-medium text-destructive">Pick at least one amenity.</p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price per night (₹)" error={err("price")}>
              <TextInput
                value={form.price}
                onChange={set("price")}
                onBlur={() => touch("price")}
                className={invalidCls("price")}
                inputMode="numeric"
                placeholder="2400"
              />
            </Field>
            <Field label="Max guests" error={err("maxGuests")}>
              <TextInput
                value={form.maxGuests}
                onChange={set("maxGuests")}
                onBlur={() => touch("maxGuests")}
                className={invalidCls("maxGuests")}
                inputMode="numeric"
                placeholder="6"
              />
            </Field>
            <Field label="Minimum nights" error={err("minNights")}>
              <TextInput
                value={form.minNights}
                onChange={set("minNights")}
                onBlur={() => touch("minNights")}
                className={invalidCls("minNights")}
                inputMode="numeric"
                placeholder="1"
              />
            </Field>
            <Field label="Cancellation policy" className="sm:col-span-3">
              <Select>
                {["Flexible — full refund 24h before", "Moderate — 50% refund 3 days before", "Strict — non refundable"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="grid h-32 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
              >
                <span className="flex flex-col items-center gap-1">
                  <FiCamera /> Upload photo
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-between border-t border-border pt-4">
          <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext} disabled={!stepValid(step)}>Continue</Button>
          ) : (
            <Button onClick={publish}>Publish listing</Button>
          )}
        </div>
      </Card>

      {published ? (
        <div className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">
          <FiCheckCircle className="shrink-0 text-success" />
          Listing published (demo) — it now appears in Explore.
        </div>
      ) : null}
    </Shell>
  );
}

/* ── Booking requests ──────────────────────────────────────────────────── */

export function FarmerRequests() {
  const bookingState = useBookingState();
  const rows = bookingState.bookings;
  type Row = (typeof rows)[number];

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Farmer-facing status labels; the shared store keeps tourist-style states.
  const statusOf = (r: Row) =>
    r.status === "confirmed" || r.status === "completed"
      ? "approved"
      : r.status === "cancelled"
        ? "rejected"
        : "pending";

  const counts = { pending: 0, approved: 0, rejected: 0 };
  rows.forEach((r) => {
    const s = statusOf(r);
    if (s in counts) counts[s as keyof typeof counts] += 1;
  });
  const approvedValue = rows
    .filter((r) => statusOf(r) === "approved")
    .reduce((sum, r) => sum + r.amount, 0);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchesTab = tab === "all" || statusOf(r) === tab;
    const matchesQuery =
      !q ||
      r.guest.toLowerCase().includes(q) ||
      r.item.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const decide = async (r: Row, status: "approved" | "rejected") => {
    setSelected(null);
    if (status === "approved") {
      await bookingStore.acceptBooking(r.id);
    } else {
      await bookingStore.rejectBooking(r.id);
    }
    setToast(
      status === "approved"
        ? `Request from ${r.guest} accepted — guest has been notified.`
        : `Request from ${r.guest} declined.`,
    );
  };

  const undo = async (r: Row) => {
    setSelected(null);
    await bookingStore.reopenBooking(r.id);
    setToast(`${r.guest}'s request moved back to pending.`);
  };

  return (
    <Shell title="Booking Requests" description="Review incoming guest requests and accept or decline them.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending review" value={counts.pending} hint="Awaiting your decision" icon={<FiClock />} />
        <StatCard label="Accepted" value={counts.approved} icon={<FiCheckCircle />} />
        <StatCard label="Declined" value={counts.rejected} icon={<FiXCircle />} />
        <StatCard label="Accepted value" value={inr(approvedValue)} hint="Expected earnings" icon={<FiDollarSign />} />
      </div>

      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="relative w-full 2xl:max-w-xs">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest, experience or ID…"
            aria-label="Search booking requests"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-role/40"
          />
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          className="w-fit max-w-full"
          tabs={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Accepted", count: counts.approved },
            { value: "rejected", label: "Declined", count: counts.rejected },
            { value: "all", label: "All", count: rows.length },
          ]}
        />
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No requests here"
          description={q ? "No requests match your search." : "New guest requests will appear in this tab."}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((r) => {
            const status = statusOf(r);
            return (
              <Card key={r.id} hover className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.guest} size="lg" />
                    <div className="min-w-0">
                      <CardTitle className="truncate">{r.guest}</CardTitle>
                      <p className="text-xs text-muted-foreground">{r.id}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <FiHome className="shrink-0 text-role" />
                    <span className="truncate">{r.item}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FiCalendar /> {r.dates}</span>
                    <span className="flex items-center gap-1.5"><FiUsers /> {r.guests} guests</span>
                  </div>
                </div>

                <p className="rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">
                  "{r.note || "No note from the guest."}"
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Booking value</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">{inr(r.amount)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    <FiEye /> Details
                  </Button>
                </div>

                {status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" fullWidth onClick={() => decide(r, "approved")}>
                      <FiCheck /> Accept
                    </Button>
                    <Button size="sm" fullWidth variant="outline" onClick={() => decide(r, "rejected")}>
                      <FiX /> Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {status === "approved" ? (
                        <FiCheckCircle className="text-success" />
                      ) : (
                        <FiXCircle className="text-destructive" />
                      )}
                      {status === "approved" ? "You accepted this request" : "You declined this request"}
                    </span>
                    <button
                      type="button"
                      onClick={() => undo(r)}
                      className="flex items-center gap-1 text-xs font-medium text-role hover:underline"
                    >
                      <FiRotateCcw size={12} /> Undo
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.guest}
        description={selected ? `${selected.id} · ${selected.item}` : undefined}
        footer={
          selected ? (
            statusOf(selected) === "pending" ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => decide(selected, "rejected")}>
                  <FiX /> Reject
                </Button>
                <Button onClick={() => decide(selected, "approved")}>
                  <FiCheck /> Accept request
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => undo(selected)}>
                  <FiRotateCcw /> Move back to pending
                </Button>
                <Button onClick={() => setSelected(null)}>Close</Button>
              </div>
            )
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={statusOf(selected)} />
              <span className="text-xs text-muted-foreground">Current status</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
                  <FiCalendar className="text-role" /> {selected.dates}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Guests</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
                  <FiUsers className="text-role" /> {selected.guests} people
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Booking value</p>
                <p className="mt-1 font-semibold text-foreground">{inr(selected.amount)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">You earn (after 8% fee)</p>
                <p className="mt-1 font-semibold text-foreground">{inr(Math.round(selected.amount * 0.92))}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest note</p>
              <p className="mt-2 rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">"{selected.note}"</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">
          <FiCheckCircle className="shrink-0 text-success" />
          {toast}
        </div>
      ) : null}
    </Shell>
  );
}

/* ── Collaborations ────────────────────────────────────────────────────── */

export function FarmerCollaborations() {
  const { data, loading } = useMockData(mockApi.getCollabRequests);
  const rows = data ?? [];
  type Row = (typeof rows)[number];

  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const statusOf = (r: Row) => decisions[r.id] ?? r.status;

  const counts = { pending: 0, approved: 0, rejected: 0 };
  rows.forEach((r) => {
    const s = statusOf(r);
    if (s in counts) counts[s as keyof typeof counts] += 1;
  });
  const approvedValue = rows
    .filter((r) => statusOf(r) === "approved")
    .reduce((sum, r) => sum + r.fee, 0);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchesTab = tab === "all" || statusOf(r) === tab;
    const matchesQuery =
      !q ||
      r.creator.toLowerCase().includes(q) ||
      r.farm.toLowerCase().includes(q) ||
      r.platform.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const decide = (r: Row, status: "approved" | "rejected") => {
    setDecisions((d) => ({ ...d, [r.id]: status }));
    setSelected(null);
    setToast(
      status === "approved"
        ? `Collaboration with ${r.creator} accepted — creator has been notified.`
        : `Request from ${r.creator} declined.`,
    );
  };

  const undo = (r: Row) => {
    setDecisions((d) => ({ ...d, [r.id]: "pending" }));
    setSelected(null);
    setToast(`${r.creator}'s request moved back to pending.`);
  };

  return (
    <Shell title="Creator Collaborations" description="Requests from creators who want to feature your farm.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending review" value={counts.pending} hint="Awaiting your decision" icon={<FiClock />} />
        <StatCard label="Accepted" value={counts.approved} icon={<FiCheckCircle />} />
        <StatCard label="Declined" value={counts.rejected} icon={<FiXCircle />} />
        <StatCard label="Committed value" value={inr(approvedValue)} hint="Accepted collab fees" icon={<FiDollarSign />} />
      </div>

      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="relative w-full 2xl:max-w-xs">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creator, farm or ID…"
            aria-label="Search collaboration requests"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-role/40"
          />
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          className="w-fit max-w-full"
          tabs={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Accepted", count: counts.approved },
            { value: "rejected", label: "Declined", count: counts.rejected },
            { value: "all", label: "All", count: rows.length },
          ]}
        />
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No requests here"
          description={q ? "No collaborations match your search." : "New creator requests will appear in this tab."}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((r) => {
            const status = statusOf(r);
            return (
              <Card key={r.id} hover className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.creator} size="lg" />
                    <div className="min-w-0">
                      <CardTitle className="truncate">{r.creator}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {r.platform} · {r.followers} followers · {r.id}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <FiHome className="shrink-0 text-role" />
                    <span className="truncate">{r.farm}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FiCamera /> {r.ask}</span>
                    <span className="flex items-center gap-1.5"><FiCalendar /> {r.dates}</span>
                  </div>
                </div>

                <p className="rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">"{r.message}"</p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Collab fee</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">{inr(r.fee)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    <FiEye /> Details
                  </Button>
                </div>

                {status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" fullWidth onClick={() => decide(r, "approved")}>
                      <FiCheck /> Accept
                    </Button>
                    <Button size="sm" fullWidth variant="outline" onClick={() => decide(r, "rejected")}>
                      <FiX /> Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {status === "approved" ? (
                        <FiCheckCircle className="text-success" />
                      ) : (
                        <FiXCircle className="text-destructive" />
                      )}
                      {status === "approved" ? "You accepted this collab" : "You declined this collab"}
                    </span>
                    <button
                      type="button"
                      onClick={() => undo(r)}
                      className="flex items-center gap-1 text-xs font-medium text-role hover:underline"
                    >
                      <FiRotateCcw size={12} /> Undo
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.creator}
        description={selected ? `${selected.id} · ${selected.farm}` : undefined}
        footer={
          selected ? (
            statusOf(selected) === "pending" ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => decide(selected, "rejected")}>
                  <FiX /> Reject
                </Button>
                <Button onClick={() => decide(selected, "approved")}>
                  <FiCheck /> Accept collab
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => undo(selected)}>
                  <FiRotateCcw /> Move back to pending
                </Button>
                <Button onClick={() => setSelected(null)}>Close</Button>
              </div>
            )
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={statusOf(selected)} />
              <span className="text-xs text-muted-foreground">Current status</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="mt-1 font-medium text-foreground">
                  {selected.platform} · {selected.followers}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
                  <FiCalendar className="text-role" /> {selected.dates}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Deliverables</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
                  <FiCamera className="text-role" /> {selected.ask}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Collab fee</p>
                <p className="mt-1 font-semibold text-foreground">{inr(selected.fee)}</p>
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FiMessageSquare /> Message from creator
              </p>
              <p className="mt-2 rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">"{selected.message}"</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">
          <FiCheckCircle className="shrink-0 text-success" />
          {toast}
        </div>
      ) : null}
    </Shell>
  );
}

/* ── Weather ───────────────────────────────────────────────────────────── */

export function FarmerWeather() {
  const { data, loading } = useMockData(mockApi.getWeather);

  if (loading || !data) {
    return (
      <Shell title="Weather">
        <SkeletonGrid count={3} />
      </Shell>
    );
  }

  return (
    <Shell title="Weather" description={data.location}>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-role-soft text-role">
              <FiCloudRain size={24} />
            </span>
            <div>
              <p className="text-4xl font-semibold text-foreground">{data.now.temp}°C</p>
              <p className="text-sm text-muted-foreground">{data.now.condition}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
            <Metric icon={<FiDroplet />} label="Humidity" value={`${data.now.humidity}%`} />
            <Metric icon={<FiWind />} label="Wind" value={`${data.now.wind} km/h`} />
            <Metric icon={<FiCloudRain />} label="Rain" value={`${data.now.rainChance}%`} />
          </div>
        </Card>

        <Card className="space-y-4">
          <CardTitle>7-day forecast</CardTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {data.week.map((d) => (
              <div key={d.day} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">{d.day}</p>
                <span className="my-2 inline-grid size-8 place-items-center text-role">
                  {d.rain > 50 ? <FiCloudRain /> : <FiSun />}
                </span>
                <p className="text-sm font-semibold text-foreground">{d.high}°</p>
                <p className="text-xs text-muted-foreground">{d.low}° · {d.rain}%</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="border-warning/40 bg-warning/10">
        <p className="text-sm font-medium text-foreground">Advisory</p>
        <p className="mt-1 text-sm text-muted-foreground">{data.advisory}</p>
      </Card>
    </Shell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <span className="mx-auto mb-1 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Crop calendar ─────────────────────────────────────────────────────── */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function FarmerCropCalendar() {
  const { data, loading } = useMockData(mockApi.getCropCalendar);
  const rows = data ?? [];

  return (
    <Shell title="Crop Calendar" description="Seasonal activity across your crops.">
      {loading ? (
        <SkeletonGrid count={2} />
      ) : (
        <Card className="space-y-5 overflow-x-auto">
          <div className="min-w-[640px] space-y-5">
            <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 text-center text-xs text-muted-foreground">
              <span />
              {MONTHS.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
            {rows.map((c) => (
              <div key={c.crop} className="grid grid-cols-[180px_repeat(12,1fr)] items-center gap-1">
                <div className="pr-3">
                  <p className="truncate text-sm font-medium text-foreground">{c.crop}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.stage}</p>
                </div>
                {MONTHS.map((_, i) => (
                  <span
                    key={i}
                    title={c.months.includes(i + 1) ? c.action : undefined}
                    className={`h-6 rounded ${c.months.includes(i + 1) ? "bg-role" : "bg-muted"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((c) => (
          <Card key={c.crop} className="space-y-2">
            <Badge tone="role">{c.stage}</Badge>
            <CardTitle>{c.crop}</CardTitle>
            <p className="text-sm text-muted-foreground">Next action: {c.action}</p>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

/* ── Availability ──────────────────────────────────────────────────────── */

export function FarmerAvailability() {
  const { data, loading } = useMockData(mockApi.getAvailability);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const rows = data ?? [];

  return (
    <Shell title="Availability & Capacity" description="Open or close dates and manage guest capacity.">
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((d) => {
            const open = overrides[d.date] ?? d.open;
            return (
              <Card key={d.date} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={open}
                    aria-label={`Toggle availability for ${d.date}`}
                    onClick={() => setOverrides({ ...overrides, [d.date]: !open })}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${open ? "bg-role" : "bg-muted"}`}
                  >
                    <span
                      className={`block size-5 rounded-full bg-card shadow-sm transition-transform ${
                        open ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
                <ProgressBar value={(d.booked / d.capacity) * 100} />
                <p className="text-xs text-muted-foreground">
                  {open ? `${d.booked}/${d.capacity} beds booked` : "Closed for bookings"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label="Default capacity"><TextInput defaultValue="6" inputMode="numeric" /></Field>
        <Field label="Check-in time"><TextInput type="time" defaultValue="12:00" /></Field>
        <Field label="Check-out time"><TextInput type="time" defaultValue="10:00" /></Field>
      </Card>
    </Shell>
  );
}

/* ── Revenue ───────────────────────────────────────────────────────────── */

export function FarmerRevenue() {
  const { data } = useMockData(mockApi.getRevenue);
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const last = rows[rows.length - 1]?.value ?? 0;
  const prev = rows[rows.length - 2]?.value ?? 0;
  const delta = prev ? Math.round(((last - prev) / prev) * 100) : 0;

  return (
    <Shell title="Revenue Report" description="Earnings across all your listings.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={inr(total)} icon={<FiDollarSign />} />
        <StatCard label="This month" value={inr(last)} hint={`${delta >= 0 ? "+" : ""}${delta}% vs last month`} icon={<FiTrendingUp />} />
        <StatCard label="Avg. per booking" value={inr(Math.round(total / 68))} icon={<FiUsers />} />
        <StatCard label="Payout pending" value={inr(18400)} icon={<FiDollarSign />} />
      </div>
      <Card className="space-y-4">
        <CardTitle>Monthly revenue</CardTitle>
        <BarChart data={rows.map((r) => ({ label: r.label, value: Math.round(r.value / 1000) }))} valuePrefix="₹" />
        <p className="text-xs text-muted-foreground">Values in thousands (₹k)</p>
      </Card>
      <DataTable
        caption="Payout schedule"
        rows={rows.map((r) => ({ id: r.label, month: r.label, gross: r.value, fee: Math.round(r.value * 0.08), net: Math.round(r.value * 0.92), status: "paid" }))}
        columns={[
          { key: "month", header: "Month" },
          { key: "gross", header: "Gross", render: (r) => inr(r.gross as number) },
          { key: "fee", header: "Platform fee", render: (r) => inr(r.fee as number) },
          { key: "net", header: "Net payout", render: (r) => inr(r.net as number) },
          { key: "status", header: "Status", render: () => <StatusBadge status="paid" /> },
        ]}
      />
    </Shell>
  );
}

/* ── Analytics ─────────────────────────────────────────────────────────── */

export function FarmerAnalytics() {
  const { data: traffic } = useMockData(mockApi.getTraffic);
  const { data: revenue } = useMockData(mockApi.getRevenue);
  const { data: listings } = useMockData(mockApi.getFarmerListings);

  return (
    <Shell title="Analytics" description="How guests find and book your farm.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Listing views" value="2,650" hint="+18% this month" icon={<FiEye />} />
        <StatCard label="Conversion" value="4.8%" hint="Views → bookings" icon={<FiTrendingUp />} />
        <StatCard label="Repeat guests" value="21%" icon={<FiUsers />} />
        <StatCard label="Avg. rating" value="4.7" icon={<FiCamera />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Weekly traffic</CardTitle>
          <LineChart data={traffic ?? []} />
        </Card>
        <Card className="space-y-4">
          <CardTitle>Revenue trend</CardTitle>
          <BarChart data={(revenue ?? []).map((r) => ({ label: r.label, value: Math.round(r.value / 1000) }))} valuePrefix="₹" />
        </Card>
      </div>
      <Card className="space-y-4">
        <CardTitle>Performance by listing</CardTitle>
        <div className="space-y-4">
          {(listings ?? []).map((l) => (
            <div key={l.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium text-foreground">{l.name}</span>
                <span className="text-muted-foreground">{l.views} views · {l.bookingsCount} bookings</span>
              </div>
              <ProgressBar value={(l.views / 1400) * 100} />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

/* ── Payments ──────────────────────────────────────────────────────────── */

export function FarmerPayments() {
  const bookingState = useBookingState();
  const rows = bookingState.payments;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <Shell title="Payments & History" description="Guest payments and platform payouts.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Received" value={inr(rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0))} icon={<FiDollarSign />} />
        <StatCard label="Pending" value={inr(rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0))} icon={<FiTrendingUp />} />
        <StatCard label="Platform fees" value={inr(rows.reduce((s, r) => s + r.fee, 0))} icon={<FiUsers />} />
      </div>
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <DataTable
          caption="Payment history"
          rows={rows}
          columns={[
            { key: "id", header: "Payment" },
            { key: "bookingId", header: "Booking" },
            { key: "date", header: "Date" },
            { key: "method", header: "Method" },
            { key: "amount", header: "Amount", render: (r) => inr(r.amount) },
            { key: "fee", header: "Fee", render: (r) => inr(r.fee) },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </Shell>
  );
}

/* ── Listings grid (rich view) ─────────────────────────────────────────── */

export function FarmerListingsBoard() {
  const { data, loading } = useMockData(mockApi.getFarmerListings);
  const rows = data ?? [];

  return (
    <Shell
      title="Farm Listings"
      description="Manage everything you offer to travellers."
      actions={<Button size="sm">New listing</Button>}
    >
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <Card key={l.id} padded={false} hover className="overflow-hidden">
              <div className="relative">
                <img src={l.image} alt={l.name} loading="lazy" className="h-40 w-full object-cover" />
                <span className="absolute left-3 top-3"><StatusBadge status={l.status} /></span>
              </div>
              <div className="space-y-3 p-5">
                <CardTitle className="truncate">{l.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{l.location}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge>{l.views} views</Badge>
                  <Badge>{l.bookingsCount} bookings</Badge>
                  <Badge tone="role">{inr(l.price)}</Badge>
                </div>
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" fullWidth><FiEdit2 /> Edit</Button>
                  <Button size="sm" variant="danger"><FiTrash2 /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
