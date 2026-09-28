import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Coffee,
  Wheat,
  Car,
  Utensils,
  Calendar,
  Compass,
  Lock,
  Bot,
  MapPin,
  Bookmark,
  CalendarCheck,
  BarChart3,
  Sprout,
} from "lucide-react";
import { Container, Section } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageMetadata } from "@/components/seo/PageMetadata";

export function HomePage() {
  const categories = [
    {
      title: "Agro-Workshops",
      desc: "Hands-on paddy planting, honey harvesting, pottery, and traditional village crafts.",
      icon: Wheat,
      tag: "Experiences",
    },
    {
      title: "Guided Nature Trails",
      desc: "Experienced naturalists and local farmers leading spice trails, birding, and heritage walks.",
      icon: Compass,
      tag: "Guides",
    },
    {
      title: "Rural Transits",
      desc: "Local 4x4 estate jeep shuttles, hill station transit, and rural transport assistance.",
      icon: Car,
      tag: "Transit",
    },
    {
      title: "Plantation Homestays",
      desc: "Heritage coffee estate cottages, eco-chalets, treehouses, and organic farm homestays.",
      icon: Coffee,
      tag: "Accommodations",
    },
    {
      title: "Farm-to-Table Dining",
      desc: "Authentic wood-fired regional meals, traditional Malnad feasts, and organic tastings.",
      icon: Utensils,
      tag: "Culinary",
    },
    {
      title: "Harvest Festivals",
      desc: "Seasonal agricultural celebrations, folk arts, and community harvest gatherings.",
      icon: Calendar,
      tag: "Cultural",
    },
  ];

  const features = [
    {
      icon: Compass,
      title: "Marketplace & Discovery",
      desc: "Explore verified eco-farms, authentic village activities, and local guides across South India.",
    },
    {
      icon: Sparkles,
      title: "Personalized Recommendations",
      desc: "Our 8-component hybrid recommendation engine tailors suggestions to your travel style and preferences.",
    },
    {
      icon: Bot,
      title: "Conversational AI Assistant",
      desc: "Ask questions, explore harvest seasons, and check real-time availability using intelligent conversational AI.",
    },
    {
      icon: CalendarCheck,
      title: "Agentic AI Trip Planner",
      desc: "Build multi-day, conflict-free travel itineraries grounded strictly in live provider catalog inventory.",
    },
    {
      icon: MapPin,
      title: "My Trips & Itineraries",
      desc: "Organize custom day-by-day itineraries, adjust activity schedules, and prepare for bookings.",
    },
    {
      icon: Lock,
      title: "Secure Bookings & Payments",
      desc: "Instant reservations with secure checkout and confirmed host manifests.",
    },
    {
      icon: Bookmark,
      title: "Saved Services",
      desc: "Bookmark your favorite farm stays and guided tours to review or incorporate into upcoming trip plans.",
    },
    {
      icon: BarChart3,
      title: "Provider Intelligence",
      desc: "Empowering rural hosts with availability controls, booking management, and actionable analytics.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageMetadata
        title="Discover Authentic Farm Tourism & Rural Stays"
        description="Experience shade-grown coffee plantations, traditional harvest workshops, and guided trails. Built with an Agentic AI Trip Planner and verified local hosts."
      />

      {/* 1. Hero Section */}

      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
        <Container className="relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Namma Connect V2 — Intelligent Rural Tourism</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Discover Authentic Farm Tourism & Rural Stays
          </h1>


          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Experience shade-grown coffee plantations, traditional harvest workshops, and guided trails. Built with an Agentic AI Trip Planner and verified local hosts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login?returnUrl=/explore">
              <Button size="lg" className="w-full sm:w-auto font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-900/40">
                <Compass className="h-4 w-4" /> Explore Services
              </Button>
            </Link>
            <Link to="/login?returnUrl=/my-trip">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold gap-2 border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800 rounded-2xl">
                <CalendarCheck className="h-4 w-4" /> Plan a Trip
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto font-bold gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 rounded-2xl">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* 2. Marketplace Category Preview */}
      <Section className="py-16 bg-white">
        <Container className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="secondary">Verified Catalog</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Explore Authentic Categories</h2>
            <p className="text-xs sm:text-sm text-slate-500">From plantation homestays to seasonal harvest workshops across South India.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Card key={idx} className="p-6 rounded-3xl border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-600">{cat.tag}</Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{cat.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* 3. Major Platform Features */}
      <Section className="py-16 bg-slate-50">
        <Container className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="default" className="bg-emerald-600 text-white font-bold">Platform Capabilities</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Engineered for Seamless Rural Journeys</h2>
            <p className="text-xs sm:text-sm text-slate-500">Every feature is backed by real catalog data, availability checks, and reliable infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Card key={idx} className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* 4. How It Works */}
      <Section className="py-16 bg-white">
        <Container className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="secondary">Step-by-Step</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How Namma Connect Works</h2>
            <p className="text-xs sm:text-sm text-slate-500">Clear workflows for both conscious travelers and rural hosts.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Customer Workflow */}
            <Card className="p-8 bg-slate-50 rounded-3xl border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">For Travelers</h3>
                  <p className="text-xs text-slate-500">From discovery to confirmed stays</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <strong className="text-slate-900">Discover & Recommend:</strong> Browse categories or let the recommendation engine find matching farm retreats.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <strong className="text-slate-900">Plan & Refine Itinerary:</strong> Use the AI Trip Planner to schedule multi-day activities and validate time conflicts.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <strong className="text-slate-900">Confirm & Book:</strong> Review transparent pricing, confirm dates, and complete secure payment.
                  </div>
                </div>
              </div>
            </Card>

            {/* Provider Workflow */}
            <Card className="p-8 bg-slate-50 rounded-3xl border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">For Farm Hosts & Guides</h3>
                  <p className="text-xs text-slate-500">Empowering rural entrepreneurship</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <strong className="text-slate-900">Join & Onboard:</strong> Register your farm estate or guiding service with straightforward verification.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <strong className="text-slate-900">Manage Availability:</strong> Set real-time weekly schedules, guest capacities, and blackout dates.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <strong className="text-slate-900">Receive Bookings & Analytics:</strong> Welcome guests with direct payout settlements and track performance metrics.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 5. Trust & Reliability Section */}
      <Section className="py-16 bg-slate-900 text-white">
        <Container className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Trust & Safety</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Built on Verification and Integrity</h2>
            <p className="text-xs sm:text-sm text-slate-400">Our platform guarantees transparency across every booking.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <Card className="p-6 bg-slate-800/80 border-slate-700 text-slate-300 rounded-3xl space-y-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Verified Hosts</h4>
              <p>Identity verification and listing review to ensure legitimate, safe rural experiences.</p>
            </Card>

            <Card className="p-6 bg-slate-800/80 border-slate-700 text-slate-300 rounded-3xl space-y-2">
              <Lock className="h-6 w-6 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Transparent Pricing</h4>
              <p>Direct host pricing with clear breakdown. Fair rates that directly empower local hosts and farming communities.</p>
            </Card>

            <Card className="p-6 bg-slate-800/80 border-slate-700 text-slate-300 rounded-3xl space-y-2">
              <Bot className="h-6 w-6 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Grounded AI</h4>

              <p>Zero fabricated availability. All AI recommendations are derived strictly from live backend inventory.</p>
            </Card>
          </div>
        </Container>
      </Section>
    </div>
  );
}
