import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export function TermsPage() {
  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <Container size="sm">
        <PageHeader
          title="Terms of Service"
          subtitle="Last updated: August 2026. Please review our platform service terms and booking policies."
        />

        <Card className="p-8 bg-white rounded-3xl border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed mt-6">
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h3>
            <p>
              By accessing, browsing, or using the Namma Connect platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must discontinue platform use immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">2. Host Verification & Farm Standards</h3>
            <p>
              Hosts warrant that all farm listings, amenities, crop descriptions, and safety measures provided are accurate and comply with local agricultural and land tenure regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">3. Booking Authoritative Pricing & Payments</h3>
            <p>
              All booking amounts, platform fees, and cancellation policies are authoritative calculations executed on the Namma Connect backend. Guests agree to complete payments through verified platform channels (Razorpay).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">4. Community Code of Conduct</h3>
            <p>
              Guests and hosts must respect agricultural working environments, biodiversity, local cultural norms, and sustainable eco-practices during any farm stay or workshop.
            </p>
          </section>
        </Card>
      </Container>
    </Section>
  );
}
