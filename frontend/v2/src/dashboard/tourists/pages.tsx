import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import {
  FiBell,
  FiCheckSquare,
  FiClock,
  FiCreditCard,
  FiEye,
  FiHeart,
  FiMap,
  FiMapPin,
  FiMessageSquare,
  FiNavigation,
  FiSearch,
  FiSend,
  FiStar,
  FiTrash2,
  FiTrendingUp,
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
  ProgressBar,
  SkeletonGrid,
  StatusBadge,
  Tabs,
} from "@/components/kit/UI";
import { FarmsOverviewMap } from "@/components/map/Map";
import { DEFAULT_POINT, distanceKm, getFarmCoords, type LatLng } from "@/lib/farmGeo";
import { useMockData } from "@/hooks/useMockData";
import { useBookingState } from "@/hooks/useBookingStore";
import { bookingStore } from "@/services/bookingStore";
import mockApi from "@/services/mockApi";
import { MessagesPage, NotificationsPage } from "@/dashboard/shared/pages";
import { firstError, maxLength, notPastDate } from "@/lib/validation";

type Experience = {
  id: string;
  title: string;
  host: string;
  location: string;
  category: string;
  price: number;
  rating: number;
  duration: string;
  slots: number;
  image: string;
};

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
    <DashboardLayout role="tourist" title={title} description={description} actions={actions}>
      {children}
    </DashboardLayout>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
      <FiStar className="text-warning" /> {value.toFixed(1)}
    </span>
  );
}

/* ── Explore Farms ─────────────────────────────────────────────────────── */

export function ExploreFarms() {
  const { data, loading } = useMockData(mockApi.getFarms);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("all");
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState(4000);
  const [minRating, setMinRating] = useState(0);
  const [view, setView] = useState<"list" | "map">("list");
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  const findNearby = () => {
    setLocating(true);
    const apply = (p: LatLng) => {
      setUserLoc(p);
      setView("map");
      setLocating(false);
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => apply({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => apply(DEFAULT_POINT),
        { timeout: 5000 },
      );
    } else {
      apply(DEFAULT_POINT);
    }
  };

  const farms = data ?? [];
  const locations = Array.from(new Set(farms.map((f) => f.location.split(",")[1]?.trim() ?? f.location)));
  const categories = Array.from(new Set(farms.map((f) => f.category)));

  const results = farms.filter(
    (f) =>
      f.name.toLowerCase().includes(q.toLowerCase()) &&
      (location === "all" || f.location.includes(location)) &&
      (category === "all" || f.category === category) &&
      f.price <= maxPrice &&
      f.rating >= minRating,
  );

  return (
    <Shell title="Explore Farms" description="Browse verified farm stays across South India.">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="View mode">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "map" ? <FiMap size={13} /> : null}
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={findNearby} disabled={locating}>
            <FiNavigation size={13} />
            {locating ? "Locating…" : userLoc ? "Nearby farms: on" : "Find nearby farms"}
          </Button>
        </div>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search farms by name…"
            aria-label="Search farms"
            className="pl-9"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Location">
            <Select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="all">All locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label={`Max price · ${inr(maxPrice)}`}>
            <input
              type="range"
              min={1000}
              max={4000}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[var(--color-role)]"
              aria-label="Maximum price"
            />
          </Field>
          <Field label="Minimum rating">
            <Select value={String(minRating)} onChange={(e) => setMinRating(Number(e.target.value))}>
              <option value="0">Any rating</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </Select>
          </Field>
        </div>
      </Card>

      {loading ? (
        <SkeletonGrid />
      ) : results.length === 0 ? (
        <EmptyState title="No farms match those filters" description="Try widening your price or rating range." />
      ) : view === "map" ? (
        <div className="space-y-3">
          {userLoc ? (
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FiNavigation className="text-role" />
              Showing {results.length} farm{results.length === 1 ? "" : "s"} around you — distances shown in each popup.
            </p>
          ) : null}
          <Card padded={false} className="overflow-hidden">
            <FarmsOverviewMap
              height={420}
              farms={results.map((f) => ({
                id: f.id,
                name: f.name,
                location: f.location,
                price: f.price,
                rating: f.rating,
                coords: getFarmCoords(f),
              }))}
              userLocation={userLoc}
            />
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((f) => (
            <Card key={f.id} padded={false} hover className="overflow-hidden">
              <img src={f.image} alt={f.name} loading="lazy" className="h-44 w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{f.name}</CardTitle>
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <FiMapPin size={13} /> {f.location}
                      {userLoc ? (
                        <span className="shrink-0 font-medium text-role">
                          · ~{Math.round(distanceKm(userLoc, getFarmCoords(f)))} km
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Rating value={f.rating} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-base font-semibold text-foreground">{inr(f.price)}</span> / night
                  </p>
                  <Button size="sm">View details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Experiences ───────────────────────────────────────────────────────── */

export function TouristExperiences() {
  const { data, loading } = useMockData(mockApi.getExperiences);
  const [cat, setCat] = useState("all");
  const [booking, setBooking] = useState<Experience | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* Controlled booking form + validation */
  const [form, setForm] = useState({ date: "", guests: "2", note: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dateErr = firstError(form.date, notPastDate());
  const noteErr = firstError(form.note, maxLength(200, "Keep it under 200 characters"));
  const formValid = !dateErr && !noteErr;
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const openBooking = (e: Experience) => {
    setForm({ date: "", guests: "2", note: "" });
    setTouched({});
    setBooking(e);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  // POST /bookings — creates a pending booking visible to the host instantly.
  const confirmBooking = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!booking) return;
    setTouched({ date: true, note: true });
    if (!formValid) return;
    const guests = Number(form.guests || 1);
    setSubmitting(true);
    const res = await bookingStore.createBooking({
      item: booking.title,
      type: "Experience",
      host: booking.host,
      location: booking.location,
      image: booking.image,
      date: form.date,
      nights: 0,
      guests,
      note: form.note,
      amount: booking.price * guests,
    });
    setSubmitting(false);
    if (res.ok) {
      setBooking(null);
      setToast(`Booking ${res.booking.id} requested — the host will confirm shortly. Track it under Bookings.`);
    }
  };

  const list = data ?? [];
  const cats = ["all", ...Array.from(new Set(list.map((e) => e.category)))];
  const filtered = cat === "all" ? list : list.filter((e) => e.category === cat);

  return (
    <Shell title="Experiences & Activities" description="Hands-on activities hosted by farmers and local creators.">
      <Tabs
        tabs={cats.map((c) => ({ value: c, label: c === "all" ? "All" : c }))}
        value={cat}
        onChange={setCat}
        className="w-fit max-w-full"
      />
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Card key={e.id} padded={false} hover className="flex flex-col overflow-hidden">
              <img src={e.image} alt={e.title} loading="lazy" className="h-40 w-full object-cover" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{e.title}</CardTitle>
                  <Rating value={e.rating} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Hosted by {e.host} · {e.location}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="role">{e.category}</Badge>
                  <Badge>
                    <FiClock size={11} /> {e.duration}
                  </Badge>
                  <Badge>
                    <FiUsers size={11} /> {e.slots} slots
                  </Badge>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold text-foreground">{inr(e.price)}</span>
                  <Button size="sm" onClick={() => openBooking(e)}>
                    Book now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!booking}
        onClose={() => !submitting && setBooking(null)}
        title={booking?.title}
        description="Reserve your slot — the host confirms, then you pay to lock it in."
        footer={
          <>
            <Button variant="outline" onClick={() => setBooking(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="experience-booking-form" disabled={submitting || !formValid}>
              {submitting ? "Sending request…" : "Confirm booking"}
            </Button>
          </>
        }
      >
        <form id="experience-booking-form" onSubmit={confirmBooking}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" error={touched["date"] ? dateErr || undefined : undefined}>
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                onBlur={() => touch("date")}
                className={touched["date"] && dateErr ? "border-destructive" : ""}
              />
            </Field>
            <Field label="Guests">
              <Select value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes for the host" className="sm:col-span-2" error={touched["note"] ? noteErr || undefined : undefined}>
              <TextArea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                onBlur={() => touch("note")}
                className={touched["note"] && noteErr ? "border-destructive" : ""}
                placeholder="Dietary needs, arrival time… (optional)"
              />
            </Field>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Estimated total:{" "}
            <span className="font-semibold text-foreground">
              {inr((booking?.price ?? 0) * Number(form.guests || 0))}
            </span>{" "}
            for {form.guests} {Number(form.guests) === 1 ? "guest" : "guests"} · payable after the host confirms
          </p>
        </form>
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">
          <FiCheckSquare className="shrink-0 text-success" />
          {toast}
        </div>
      ) : null}
    </Shell>
  );
}

/* ── Booking details ───────────────────────────────────────────────────── */

export function TouristBookingDetail() {
  const params = useParams() as { id?: string };
  const { data, loading } = useMockData(() => mockApi.getBooking(params.id ?? ""), [params.id]);

  const timeline = [
    { label: "Booking created", time: "01 Aug, 10:12" },
    { label: "Payment received", time: "01 Aug, 10:14" },
    { label: "Host confirmed", time: "01 Aug, 14:40" },
    { label: "Check-in", time: "14 Aug, 12:00" },
  ];

  if (loading) {
    return (
      <Shell title="Booking details">
        <SkeletonGrid count={3} />
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell title="Booking details">
        <EmptyState title="Booking not found" description="This booking may have been removed." />
      </Shell>
    );
  }

  return (
    <Shell title={data.item} description={`${data.id} · ${data.type}`} actions={<StatusBadge status={data.status} />}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padded={false} className="overflow-hidden">
            <img src={data.image} alt={data.item} className="h-56 w-full object-cover" />
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Detail label="Check-in" value={data.date} />
              <Detail label="Nights" value={data.nights || "Single day"} />
              <Detail label="Guests" value={data.guests} />
              <Detail label="Location" value={data.location} />
              <Detail label="Host" value={data.host} />
              <Detail label="Booking type" value={data.type} />
            </div>
          </Card>

          <Card>
            <CardTitle>Timeline</CardTitle>
            <ol className="mt-4 space-y-4">
              {timeline.map((t, i) => (
                <li key={t.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2.5 rounded-full bg-role" />
                    {i < timeline.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3">
            <CardTitle>Payment</CardTitle>
            <Row label="Subtotal" value={inr(data.amount)} />
            <Row label="Service fee" value={inr(Math.round(data.amount * 0.05))} />
            <div className="border-t border-border pt-3">
              <Row label="Total paid" value={inr(Math.round(data.amount * 1.05))} strong />
            </div>
            <StatusBadge status={data.payment} />
          </Card>
          <Card className="space-y-3">
            <CardTitle>Need help?</CardTitle>
            <Button fullWidth variant="outline">Message host</Button>
            <Button fullWidth variant="danger">Cancel booking</Button>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

/* ── Payments ──────────────────────────────────────────────────────────── */

export function TouristPayments() {
  const bookingState = useBookingState();
  const rows = bookingState.payments;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);
  const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <Shell title="Payments" description="Every transaction linked to your bookings.">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total spent" value={inr(paid)} icon={<FiCreditCard />} />
        <StatCard label="Transactions" value={rows.length} icon={<FiClock />} />
        <StatCard label="Pending" value={rows.filter((p) => p.status === "pending").length} icon={<FiBell />} />
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
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </Shell>
  );
}

/* ── Reviews ───────────────────────────────────────────────────────────── */

export function TouristReviews() {
  const { data, loading } = useMockData(mockApi.getReviews);
  const [draft, setDraft] = useState(0);
  const rows = data ?? [];

  return (
    <Shell title="Reviews" description="Reviews you've written for farms and experiences.">
      <Card className="space-y-4">
        <CardTitle>Write a review</CardTitle>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={draft === n}
              aria-label={`${n} star`}
              onClick={() => setDraft(n)}
              className={n <= draft ? "text-warning" : "text-muted-foreground"}
            >
              <FiStar size={22} fill={n <= draft ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <TextArea placeholder="Share what made the stay memorable…" />
        <div className="flex justify-end">
          <Button size="sm">Publish review</Button>
        </div>
      </Card>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={r.author} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{r.target}</p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <FiStar key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Wishlist / saved routes ───────────────────────────────────────────── */

export function TouristWishlist() {
  const { data, loading } = useMockData(mockApi.getWishlist);
  const { data: routes } = useMockData(mockApi.getSavedRoutes);
  const [removed, setRemoved] = useState<string[]>([]);
  const items = (data ?? []).filter((f) => !removed.includes(f.id));

  return (
    <Shell
      title="Wishlist & Saved Routes"
      description="Everything you've saved for later."
      actions={items.length > 0 ? <Badge tone="role">{items.length} saved</Badge> : undefined}
    >
      {loading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FiHeart />}
          title="No items in wishlist"
          description="Save farms and experiences you love and they'll show up here."
          action={
            <Link to="/tourist/explore">
              <Button size="sm">Explore farms</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((f) => (
            <Card
              key={f.id}
              padded={false}
              className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative overflow-hidden">
                <img
                  src={f.image}
                  alt={f.name}
                  loading="lazy"
                  className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3">
                  <Badge tone="role">{f.category}</Badge>
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur">
                  Saved {f.savedOn}
                </span>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{f.name}</CardTitle>
                  <Rating value={f.rating} />
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FiMapPin className="shrink-0" /> {f.location}
                </p>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">
                    {inr(f.price)}
                    <span className="text-xs font-normal text-muted-foreground"> /night</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRemoved((r) => [...r, f.id])}
                    >
                      <FiTrash2 /> Remove
                    </Button>
                    <Link to="/tourist/experiences">
                      <Button size="sm">
                        <FiEye /> View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Saved routes</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(routes ?? []).map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="truncate">{r.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.stops} stops · {r.days} days · {r.distance}
                </p>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ── AI Trip Planner ───────────────────────────────────────────────────── */

export function TouristTripPlanner() {
  const [prompt, setPrompt] = useState("A relaxed 3-day farm trip near Bangalore for two");
  const [days, setDays] = useState("3");
  const [budget, setBudget] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof mockApi.planTrip>> | null>(null);

  const plan = async () => {
    setLoading(true);
    const res = await mockApi.planTrip(prompt);
    setResults(res);
    setLoading(false);
  };

  return (
    <Shell title="AI Trip Planner" description="Describe the trip you want and we'll match farms and experiences.">
      <Card className="space-y-4">
        <Field label="What kind of trip do you want?">
          <TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Days">
            <Select value={days} onChange={(e) => setDays(e.target.value)}>
              {["2", "3", "4", "5", "7"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Budget (₹)">
            <TextInput value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Travellers">
            <Select defaultValue="2">
              {[1, 2, 3, 4, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={plan} disabled={loading}>
          <FiTrendingUp /> {loading ? "Planning…" : "Generate itinerary"}
        </Button>
      </Card>

      {loading ? <SkeletonGrid count={3} /> : null}

      {results ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {results.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <Badge tone="role">{r.days} days</Badge>
              <CardTitle>{r.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{r.summary}</p>
              <ul className="space-y-1 text-sm text-foreground">
                {r.farms.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <FiMapPin size={13} className="text-role" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-foreground">{inr(r.budget)}</span>
                <Button size="sm">Save route</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

/* ── Travel checklist ──────────────────────────────────────────────────── */

export function TouristChecklist() {
  const { data, loading } = useMockData(mockApi.getChecklist);
  const [items, setItems] = useState<{ id: string; label: string; group: string; done: boolean }[]>([]);
  const list = items.length ? items : (data ?? []);
  const done = list.filter((i) => i.done).length;
  const groups = Array.from(new Set(list.map((i) => i.group)));

  const toggle = (id: string) =>
    setItems(list.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  return (
    <Shell title="Travel Checklist" description="Stay ready before, during and after the trip.">
      <Card className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {done} of {list.length} complete
          </span>
          <span className="text-muted-foreground">
            {list.length ? Math.round((done / list.length) * 100) : 0}%
          </span>
        </div>
        <ProgressBar value={list.length ? (done / list.length) * 100 : 0} />
      </Card>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {groups.map((g) => (
            <Card key={g} className="space-y-3">
              <CardTitle>{g}</CardTitle>
              <ul className="space-y-2">
                {list
                  .filter((i) => i.group === g)
                  .map((i) => (
                    <li key={i.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={i.done}
                          onChange={() => toggle(i.id)}
                          className="mt-0.5 size-4 accent-[var(--color-role)]"
                        />
                        <span
                          className={
                            i.done
                              ? "text-sm text-muted-foreground line-through"
                              : "text-sm text-foreground"
                          }
                        >
                          {i.label}
                        </span>
                      </label>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── Nearby farms ──────────────────────────────────────────────────────── */

export function TouristNearby() {
  const { data, loading } = useMockData(mockApi.getNearbyFarms);
  const list = data ?? [];

  return (
    <Shell title="Nearby Farms" description="Farms sorted by distance from your current location.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card padded={false} className="relative min-h-[320px] overflow-hidden">
          <div className="absolute inset-0 bg-role-soft" aria-hidden />
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative h-full min-h-[320px] p-4">
            {list.map((f, i) => (
              <span
                key={f.id}
                className="absolute flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm"
                style={{ top: `${12 + i * 14}%`, left: `${10 + ((i * 23) % 65)}%` }}
              >
                <FiMapPin size={11} className="text-role" /> {f.distanceKm} km
              </span>
            ))}
            <span className="absolute bottom-4 left-4 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
              Map preview · live map connects later
            </span>
          </div>
        </Card>

        <div className="space-y-3">
          {loading
            ? <SkeletonGrid count={3} />
            : list.map((f) => (
                <Card key={f.id} className="flex items-center gap-4">
                  <img src={f.image} alt={f.name} loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.location}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="role">{f.distanceKm} km away</Badge>
                      <Badge tone={f.open ? "success" : "danger"}>{f.open ? "Open" : "Closed"}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Route</Button>
                </Card>
              ))}
        </div>
      </div>
    </Shell>
  );
}

/* ── Messages ──────────────────────────────────────────────────────────── */

export function TouristMessages() {
  return <MessagesPage role="tourist" />;
}

/* ── Notifications ─────────────────────────────────────────────────────── */

export function TouristNotifications() {
  return <NotificationsPage role="tourist" />;
}
