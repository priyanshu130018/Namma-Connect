import { Link } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageMetadata } from "@/components/seo/PageMetadata";
import {
  Sprout,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Lock,
  Bot,
} from "lucide-react";

export function AboutPage() {
  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <PageMetadata
        title="About Us - Community Tourism & Rural Discovery"
        description="Namma Connect is a verified community tourism platform connecting conscious travelers with authentic rural experiences and local agro-hosts."
      />

      <Container className="space-y-12">

        <PageHeader
          title="About Namma Connect"
          subtitle="A verified community tourism and agricultural discovery platform connecting conscious travelers with authentic rural experiences."
        />

        {/* 1. Core Mission Card */}
        <Card className="p-8 sm:p-12 bg-white rounded-3xl border-slate-200 shadow-sm space-y-6">
          <div className="max-w-3xl space-y-4">
            <Badge variant="default" className="bg-emerald-600 text-white font-bold">Our Founding Mission</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Bridging the gap between rural agricultural wisdom and modern conscious travel.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Namma Connect V2 is engineered as a high-performance modular marketplace connecting travelers, organic farm hosts, naturalists, and local artisans. By pairing intelligent hybrid recommendations and an Agentic AI Trip Planner with verified provider services, we deliver authentic travel while ensuring economic empowerment reaches rural communities directly.
            </p>
          </div>
        </Card>

        {/* 2. Platform Roles Breakdown */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="secondary">Role Ecosystem</Badge>
            <h2 className="text-2xl font-extrabold text-slate-900">How Different Roles Experience Namma Connect</h2>
            <p className="text-xs sm:text-sm text-slate-500">Every participant in the Namma Connect ecosystem has dedicated tools and capabilities.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer / User Role */}
            <Card className="p-8 bg-white rounded-3xl border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Customer / Traveler</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conscious travelers looking for genuine countryside stays, harvest activities, and seamless trip planning.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Discover & Search:</strong> Explore 6 verified categories including Farm Stays, Guided Trails, and Harvest Workshops.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Personalized Feed:</strong> Receive tailored recommendations based on browsing affinity and verified ratings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>AI Assistant & Trip Planner:</strong> Converse with AI to construct multi-day conflict-free itineraries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>My Trips & Bookings:</strong> Save favorites, manage day-by-day itineraries, and complete secure reservations.</span>
                  </li>
                </ul>
              </div>

              <Link to="/register" className="pt-4">
                <Button className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl">
                  Join as Traveler
                </Button>
              </Link>
            </Card>

            {/* Provider / Host Role */}
            <Card className="p-8 bg-white rounded-3xl border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Sprout className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Provider / Agro-Host</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Plantation owners, smallholder farmers, local naturalists, rural drivers, and artisans hosting guests.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Service Management:</strong> Create and publish listings with custom pricing, tier options, and photo galleries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Live Availability:</strong> Manage weekly schedules and block private dates without double-booking.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Booking Manifests:</strong> Receive reservation requests, confirm guest slots, and communicate directly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Provider Intelligence:</strong> Track earnings, view performance analytics, and improve NC Quality Scores.</span>
                  </li>
                </ul>
              </div>

              <Link to="/login?returnUrl=/app/become-partner" className="pt-4">
                <Button variant="outline" className="w-full font-bold border-amber-300 text-amber-900 hover:bg-amber-50 rounded-2xl">
                  Become a Partner
                </Button>
              </Link>
            </Card>

            {/* Platform / Admin Governance */}
            <Card className="p-8 bg-white rounded-3xl border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Platform Governance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The central coordination layer ensuring trust, identity verification, payment settlement, and safety standards.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <span><strong>Partner Vetting:</strong> Verification of host profiles, property details, and listing authenticity.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <span><strong>Financial Integrity:</strong> Encrypted payment processing and verified refund management.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <span><strong>Service Moderation:</strong> Quality reviews, image sanitization, and category classification.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <span><strong>Support & Redressal:</strong> Dedicated ticketing queue to assist travelers and resolve host inquiries.</span>
                  </li>
                </ul>
              </div>

              <Link to="/faq" className="pt-4">
                <Button variant="ghost" className="w-full font-bold text-slate-700 hover:bg-slate-100 rounded-2xl">
                  Read Safety FAQ
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* 3. Four Core Principles */}
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl font-bold text-slate-900">Our Quality Standards</h3>
            <p className="text-xs text-slate-500">Core architectural and operational principles of Namma Connect.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white rounded-3xl border-slate-200 space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sprout className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Ecological Heritage</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Dedicated focus on shade-grown, organic, and regenerative rural environments.</p>
            </Card>

            <Card className="p-6 bg-white rounded-3xl border-slate-200 space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Verified Providers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Strict host vetting and real guest reviews ensure genuine hospitality.</p>
            </Card>

            <Card className="p-6 bg-white rounded-3xl border-slate-200 space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Grounded AI</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Trip itineraries and AI recommendations derived strictly from real catalog availability.</p>
            </Card>

            <Card className="p-6 bg-white rounded-3xl border-slate-200 space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Secure Settlement</h4>
              <p className="text-xs text-slate-600 leading-relaxed">Encrypted transactions, verified settlement, and structured refund processing.</p>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}

