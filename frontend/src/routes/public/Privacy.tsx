import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export function PrivacyPage() {
  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <Container size="sm">
        <PageHeader
          title="Privacy Policy"
          subtitle="How Namma Connect protects, processes, and respects your personal and verification data."
        />

        <Card className="p-8 bg-white rounded-3xl border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed mt-6">
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">1. Information We Collect</h3>
            <p>
              We collect user account information (full name, verified email, phone number), booking itineraries, and KYC documents necessary to establish trust between travelers and agricultural hosts.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">2. Identity KYC & Aadhaar Masking</h3>
            <p>
              Host Aadhaar numbers, PAN credentials, and government identity cards are stored in encrypted vaults with strict compliance protocols (UIDAI Aadhaar masking).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">3. Payment Information</h3>
            <p>
              Payment data, UPI identifiers, and credit card credentials are processed directly by RBI-authorized payment aggregators (Razorpay). Namma Connect never stores raw card or UPI PIN data on its servers.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">4. Your Data Rights</h3>
            <p>
              You may request an export or permanent deletion of your account and personal data at any time by contacting our Privacy Officer at privacy@nammaconnect.in.
            </p>
          </section>
        </Card>
      </Container>
    </Section>
  );
}
