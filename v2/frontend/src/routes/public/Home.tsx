import { Link } from "react-router-dom";
import {
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Coffee,
  Wheat,
  Camera,
  Car,
  Utensils,
  Calendar,
  Compass,
  CheckCircle2,
  Lock,
  Bot,
  Users,
} from "lucide-react";
import { Container, Section } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";

export function HomePage() {
  const { t } = useTranslation();
  const serviceCategories = [
    {
      title: "Experiences",
      description: "Hands-on paddy transplanting, honey harvesting, pottery, and traditional village crafts.",
      icon: Wheat,
      badge: "Agro-Workshops",
    },
    {
      title: "Guides & Tours",
      description: "Certified naturalists and local farmers leading spice trails, birding, and heritage walks.",
      icon: Compass,
      badge: "Guided Nature",
    },
    {
      title: "Travel Services",
      description: "Local 4x4 estate jeep shuttles, hill station transit, and rural transport assistance.",
      icon: Car,
      badge: "Transport",
    },
    {
      title: "Stay",
      description: "Heritage coffee estate cottages, eco-chalets, treehouses, and organic farm homestays.",
      icon: Coffee,
      badge: "Accommodations",
    },
    {
      title: "Food & Dining",
      description: "Farm-to-table dining feasts, wood-fired Malnad regional meals, and organic tastings.",
      icon: Utensils,
      badge: "Culinary",
    },
    {
      title: "Events",
      description: "Seasonal harvest festivals, village folk arts, and community agricultural gatherings.",
      icon: Calendar,
      badge: "Cultural",
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Discover & Compare",
      description: "Browse verified local eco-farms, explore transparent inclusions, and compare offerings.",
    },
    {
      step: "02",
      title: "Check Live Availability",
      description: "View real-time booking calendars with authoritative backend dates and guest quotas.",
    },
    {
      step: "03",
      title: "Book & Pay Securely",
      description: "Reserve with instant checkout and encrypted payment settlement protection.",
    },
    {
      step: "04",
      title: "Enjoy Authentic Farm Life",
      description: "Experience genuine rural hospitality while 95%+ of revenue reaches host families.",
    },
  ];

  const partnerTypes = [
    { title: "Farmer / Agro-Host", desc: "Open plantation cottages and offer farm tours" },
    { title: "Guide & Naturalist", desc: "Host guided treks and wildlife observation walks" },
    { title: "Travel / Driver", desc: "Provide 4x4 station pickups and estate transit" },
    { title: "Hotel & Eco-Lodge", desc: "List nature chalets and sustainable boutique stays" },
    { title: "Creator / Storyteller", desc: "Produce drone cinematography and visual reels" },
    { title: "Rural Artisan", desc: "Teach traditional weaving, pottery, and woodcraft" },
    { title: "Homestay Host", desc: "Share local cuisine and heritage family hospitality" },
  ];

  return (
    <div className="flex flex-col">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-harvest-50/60 via-white to-slate-50 pt-16 sm:pt-24 pb-24 sm:pb-32">
        <div className="pointer-events-none absolute -top-32 -right-32 h-[450px] w-[450px] rounded-full bg-harvest-200/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-32 h-[350px] w-[350px] rounded-full bg-amber-100/40 blur-3xl" />

        <Container className="relative text-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-harvest-200 bg-harvest-50 px-4 py-1.5 text-xs font-bold text-harvest-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-harvest-700" />
            <span>Connecting Travelers with Trusted Local Agro-Hosts & Creators</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]">
            {t("home.heroTitle")} <br />
            <span className="text-harvest-700 dark:text-harvest-500">Direct Community Prosperity.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {t("home.heroSubtitle")}
          </p>

          {/* Global Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem("heroSearch") as HTMLInputElement;
              const query = input?.value?.trim() || "";
              window.location.href = `/app/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`;
            }}
            className="max-w-xl mx-auto pt-2 flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-harvest-600/5"
          >
            <input
              type="text"
              name="heroSearch"
              placeholder={t("search.placeholder")}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
            />
            <Button
              type="submit"
              size="sm"
              className="font-bold rounded-xl bg-harvest-600 hover:bg-harvest-700 text-white shrink-0"
            >
              {t("common.search")}
            </Button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/app/explore" className="w-full sm:w-auto">
              <Button size="lg" className="w-full font-bold gap-2 rounded-2xl shadow-md bg-harvest-600 hover:bg-harvest-700 text-white">
                <span>Explore NammaConnect</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login?returnUrl=/app/become-partner" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full rounded-2xl border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                {t("nav.becomePartner")}
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* ── 2. How the Marketplace Works ── */}
      <Section className="bg-white border-y border-slate-100">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <Badge variant="default">The Platform Flow</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How Namma Connect Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              A transparent, end-to-end booking flow connecting travelers, farm hosts, and rural creators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between space-y-3">
                <span className="text-2xl font-black text-harvest-700 font-mono">
                  {step.step}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── 3. Service Categories ── */}
      <Section id="categories" className="bg-slate-50">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <Badge variant="warning">Curated Offerings</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Marketplace Service Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Explore authentic rural categories available upon entering the authenticated customer portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Link key={idx} to="/login" className="block group">
                  <Card hover className="p-6 h-full flex flex-col justify-between space-y-4 rounded-3xl border-slate-200 bg-white">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-12 w-12 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {cat.badge}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-harvest-700 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-harvest-700 pt-2 border-t border-slate-100">
                      <span>View in Application</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ── 4. Trust & Verification ── */}
      <Section id="trust" className="bg-slate-900 text-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="rounded-full bg-harvest-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30 inline-block">
                Trust & Verification Standard
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Built on Verified Credentials & Fair Direct Payouts
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Every host listing is reviewed by platform compliance officers before publishing. We protect guest safety, ensure land deed legitimacy, and execute transparent direct bank payouts.
              </p>
              <div className="space-y-2.5 pt-2 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Land title deed & physical estate audit verification</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Aadhaar KYC identity matching for host accounts</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Authoritative server-side pricing with zero hidden check-in fees</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Automated Razorpay bank settlements directly into farmer accounts</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-800/80 p-6 space-y-2">
                <ShieldCheck className="h-8 w-8 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Host Verification</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Strict vetting of farm deeds, guest amenities, and agricultural credentials.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-800/80 p-6 space-y-2">
                <HeartHandshake className="h-8 w-8 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Fair Living Income</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Low 5% platform fee guarantees maximum revenue reaches rural families.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-800/80 p-6 space-y-2">
                <Lock className="h-8 w-8 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Escrow Protection</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Funds held securely and released upon confirmed traveler check-in.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-800/80 p-6 space-y-2">
                <Users className="h-8 w-8 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Community Driven</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sustainable tourism preserving local traditions, heritage crops, and crafts.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 5. Customer Experience ── */}
      <Section className="bg-white">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <Badge variant="default">Traveler Lifecycle</Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              The Customer Experience
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Simple steps from creating your account to checking into authentic plantations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono font-bold text-harvest-700 text-sm">Step 1</span>
              <h4 className="font-bold text-slate-900 text-sm">Create Account</h4>
              <p className="text-slate-600">Sign up in seconds with basic personal information.</p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono font-bold text-harvest-700 text-sm">Step 2</span>
              <h4 className="font-bold text-slate-900 text-sm">Explore Stays & Trails</h4>
              <p className="text-slate-600">Filter by harvest season, region, capacity, and amenities.</p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono font-bold text-harvest-700 text-sm">Step 3</span>
              <h4 className="font-bold text-slate-900 text-sm">Book & Check In</h4>
              <p className="text-slate-600">Receive instant reservation manifests with host contact details.</p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono font-bold text-harvest-700 text-sm">Step 4</span>
              <h4 className="font-bold text-slate-900 text-sm">Manage Your Trip</h4>
              <p className="text-slate-600">Track itinerary itineraries, weather updates, and route guides.</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 6. Become a Partner Section ── */}
      <Section className="bg-gradient-to-br from-harvest-50 to-amber-100/60 border-y border-amber-200/60">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-harvest-800">
                Partner Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Become a NammaConnect Partner
              </h2>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                Are you a farm owner, local driver, nature guide, homestay host, or rural artisan? Join India's premier verified agricultural network.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {partnerTypes.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-harvest-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>{p.title}</strong>: <span className="text-slate-600">{p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link to="/login?returnUrl=/app/become-partner">
                  <Button size="lg" className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-md">
                    <span>Become a Partner</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">How Partner Onboarding Works</h3>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-harvest-100 text-harvest-800 font-bold flex items-center justify-center shrink-0">1</div>
                  <p>Create your personal account & click "Become a Partner" in the portal.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-harvest-100 text-harvest-800 font-bold flex items-center justify-center shrink-0">2</div>
                  <p>Select your provider category (Farmer, Guide, Driver, Hotel, Artisan, etc.).</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-harvest-100 text-harvest-800 font-bold flex items-center justify-center shrink-0">3</div>
                  <p>Upload land ownership papers or Aadhaar identity proof for verification.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-harvest-100 text-harvest-800 font-bold flex items-center justify-center shrink-0">4</div>
                  <p>Once approved, start publishing services and managing guest check-ins.</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 7. Creator Collaboration Section ── */}
      <Section className="bg-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-800">
                <Camera className="h-3.5 w-3.5 text-purple-600" />
                <span>Media Production & Storytelling</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Creator Collaborations for Rural Tourism
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Connect digital creators, drone videographers, and food writers directly with agricultural hosts. Create media kits, receive brand project deals, and produce viral countryside campaigns.
              </p>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span>Showcase 4K cinematic portfolios and plantation photography</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span>Set rate cards for Instagram reels, YouTube documentaries, and stills</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span>Receive inbound host collaboration proposals with agreed stipends</span>
                </div>
              </div>
              <div className="pt-2">
                <Link to="/register">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl gap-2 shadow-md">
                    <span>Join as a Creator</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6 rounded-3xl border-purple-100 bg-purple-50/40 space-y-2">
                <Camera className="h-8 w-8 text-purple-600" />
                <h4 className="text-sm font-bold text-slate-900">Media Portfolio</h4>
                <p className="text-xs text-slate-600">Showcase high-resolution plantation and tribal harvesting shoots.</p>
              </Card>
              <Card className="p-6 rounded-3xl border-purple-100 bg-purple-50/40 space-y-2">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <h4 className="text-sm font-bold text-slate-900">Fixed Rate Packages</h4>
                <p className="text-xs text-slate-600">Package reels and long-form features with transparent commercial usage.</p>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 8. Travel AI Capability Feature ── */}
      <Section className="bg-slate-50 border-t border-slate-100">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant="default" className="mb-1">Platform Intelligence</Badge>
                  <h3 className="text-xl font-bold text-slate-900">Smart Trip Planning with Travel AI</h3>
                </div>
              </div>
              <Link to="/register">
                <Button size="sm" className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white gap-2">
                  <span>Try Inside Customer App</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              Inside the authenticated customer portal, NammaConnect features a dedicated Travel AI assistant. Travel AI helps you plan personalized agricultural itineraries, check seasonal crop harvest cycles, compare homestay amenities, and prepare booking reservations in natural language.
            </p>
          </div>
        </Container>
      </Section>

      {/* ── 9. Final CTA ── */}
      <Section className="bg-gradient-to-b from-white to-harvest-50/80 text-center py-20">
        <Container size="sm" className="space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ready to Experience Authentic Rural Tourism?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
            Create your account today to book verified coffee plantation stays, nature treks, and harvest experiences directly from local hosts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl shadow-md">
                <span>Explore NammaConnect</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login?returnUrl=/app/become-partner" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full rounded-2xl border-slate-300 text-slate-700 font-bold">
                Become a Partner
              </Button>
            </Link>
          </div>
        </Container>
      </Section>
    </div>
  );
}
