import { Link } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sprout,
  ShieldCheck,
  Users,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";

export function AboutPage() {
  const pillars = [
    {
      icon: Sprout,
      title: "Sustainable Agriculture & Heritage",
      desc: "We exclusively support chemical-free, regenerative, and shade-grown plantation ecosystems preserving South India's biodiversity.",
    },
    {
      icon: HeartHandshake,
      title: "Direct Living Income for Hosts",
      desc: "Transparent 5% platform commission ensures 95% of booking fees reach rural farming families and local guides directly.",
    },
    {
      icon: ShieldCheck,
      title: "Rigorous Verification & Trust",
      desc: "Physical farm audits, land title verification, and Aadhaar KYC checks ensure guest safety and legitimate rural experiences.",
    },
    {
      icon: Users,
      title: "Creator Storytelling Synergy",
      desc: "Bridging the gap between digital creators and agricultural estates to produce viral rural storytelling and media kits.",
    },
  ];

  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <Container className="space-y-10">
        <PageHeader
          title="About Namma Connect"
          subtitle="Empowering farming communities, celebrating sustainable agriculture, and connecting urban travelers with authentic rural wisdom."
        />

        {/* 1. Core Mission Card */}
        <Card className="p-8 sm:p-12 bg-white rounded-3xl border-slate-200 shadow-sm space-y-6">
          <div className="max-w-3xl space-y-4">
            <Badge variant="default">Our Founding Mission</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Bridging the gap between rural agricultural heritage and modern conscious travel.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Namma Connect was established to build a sustainable, verified service marketplace for smallholder farmers, plantation estate owners, rural guides, and local artisans. By opening authentic farm stays, harvest workshops, and culinary heritage trails to conscious travelers, we ensure that tourism revenue directly enriches rural families.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-2xl bg-harvest-50/60 border border-harvest-100 space-y-1">
              <span className="font-bold text-harvest-800 text-sm">For Travelers</span>
              <p className="text-slate-600">Guaranteed real farm life, transparent pricing, verified host reviews, and memorable agro-trails.</p>
            </div>
            <div className="p-4 rounded-2xl bg-harvest-50/60 border border-harvest-100 space-y-1">
              <span className="font-bold text-harvest-800 text-sm">For Farm Hosts</span>
              <p className="text-slate-600">Direct booking management, automated daily payouts, calendar controls, and guest manifests.</p>
            </div>
            <div className="p-4 rounded-2xl bg-harvest-50/60 border border-harvest-100 space-y-1">
              <span className="font-bold text-harvest-800 text-sm">For Rural Creators</span>
              <p className="text-slate-600">Direct brand deal negotiations, fixed rate cards, portfolio showcase, and countryside storytelling.</p>
            </div>
          </div>
        </Card>

        {/* 2. Four Platform Pillars */}
        <div id="trust" className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl font-bold text-slate-900">How We Ensure Marketplace Quality</h3>
            <p className="text-xs text-slate-500">Four non-negotiable principles guiding the NammaConnect platform.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <Card key={i} className="p-6 bg-white rounded-3xl border-slate-200 space-y-3">
                  <div className="h-11 w-11 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{pillar.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 3. Service Offerings Overview */}
        <Card id="services" className="p-8 sm:p-10 bg-white rounded-3xl border-slate-200 space-y-6">
          <div className="space-y-2">
            <Badge variant="warning">Service Breadth</Badge>
            <h3 className="text-xl font-bold text-slate-900">Documented Service Offerings</h3>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Available services span 6 verified categories including Farm Stays, Guided Trails, Agro-Workshops, Travel Transits, Organic Dining, and Seasonal Harvest Festivals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Plantation Cottages & Homestays</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Guided Canopy Walks & Spice Trails</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Organic Coffee & Honey Harvesting</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>4x4 Estate Jeeps & Rural Transits</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Regional Farm-to-Table Dining</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Traditional Pottery & Weaving Arts</span>
            </div>
          </div>
        </Card>

        {/* 4. Bottom Action Banner */}
        <div className="rounded-3xl bg-harvest-900 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold">Join the NammaConnect Community</h3>
            <p className="text-xs text-harvest-200">Start discovering verified farm retreats or list your agricultural estate today.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/register">
              <Button className="font-bold bg-white text-harvest-900 hover:bg-slate-100 rounded-2xl">
                Create Account
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-harvest-700 text-white hover:bg-harvest-800 rounded-2xl">
                Contact Team
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
