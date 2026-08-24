import { useState } from "react";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqCategories = [
    {
      category: "1. Customers & Travelers",
      items: [
        {
          q: "How do I create an account and explore farm stays?",
          a: "You can create a free NammaConnect account on the /register page using your email and password. Once signed in to the customer portal (/app), you can explore verified estates, compare amenities, and filter by harvest seasons.",
        },
        {
          q: "Are farm meals and regional cuisine included in stays?",
          a: "Most homestays and agro-cottages include traditional home-cooked breakfast (such as Malnad Akki Rotti or Coorg Kadambuttu). Inclusions for lunch and dinner are clearly marked in each service listing.",
        },
      ],
    },
    {
      category: "2. Partners & Agro-Hosts",
      items: [
        {
          q: "Who can register as a NammaConnect partner?",
          a: "We welcome plantation owners, smallholder farmers, local drivers, certified naturalists/guides, homestay families, and rural artisans located across South India.",
        },
        {
          q: "What is the fee to list an experience or stay?",
          a: "Listing your property or activity is 100% free with no monthly subscription. A nominal 5% platform fee is deducted only on confirmed guest check-outs to cover payment gateway and server operations.",
        },
      ],
    },
    {
      category: "3. Bookings & Reservations",
      items: [
        {
          q: "How does live availability work?",
          a: "Our backend manages authoritative real-time inventory calendars. When you select dates and complete your reservation, your booking is confirmed instantly with a reservation manifest.",
        },
        {
          q: "Can I make special requests or dietary adjustments?",
          a: "Yes. During checkout and inside the reservation view, you can enter specific host requests, such as vegetarian meals, spice preferences, or estate jeep pickup.",
        },
      ],
    },
    {
      category: "4. Payments & Escrow Payouts",
      items: [
        {
          q: "Which payment methods are supported?",
          a: "NammaConnect supports all major Indian UPI apps (Google Pay, PhonePe, Paytm), Net Banking, RuPay, Visa, and Mastercard credit/debit cards via secure Razorpay checkout.",
        },
        {
          q: "When are payouts released to farm hosts?",
          a: "To protect travelers and ensure service delivery, host payouts are held in escrow and settled directly into the host's verified bank account (T+1) within 24 hours after check-in.",
        },
      ],
    },
    {
      category: "5. Verification & Safety Standards",
      items: [
        {
          q: "How does NammaConnect verify hosts and land ownership?",
          a: "Every host undergoes a 2-step verification process: physical inspection of land revenue records / survey numbers, and digital Aadhaar/PAN KYC matching.",
        },
        {
          q: "Are the farms safe for families and children?",
          a: "Yes. Listings highlight family suitability, fenced plantation boundaries, child-friendly agro-activities, and hygiene standards.",
        },
      ],
    },
    {
      category: "6. Content Creators & Storytellers",
      items: [
        {
          q: "How can videographers and creators collaborate with hosts?",
          a: "Verified digital creators can create media packages, showcase portfolios, and submit storytelling proposals to hosts for complimentary stays and promotional compensation.",
        },
      ],
    },
    {
      category: "7. Cancellations & Refunds",
      items: [
        {
          q: "What is the standard cancellation timeline?",
          a: "Full 100% refunds are provided for cancellations made at least 48 hours prior to the scheduled check-in date. Cancellations within 48 hours receive a 50% refund to compensate the host for reserved preparations.",
        },
      ],
    },
    {
      category: "8. Support & Assistance",
      items: [
        {
          q: "How do I contact customer support in case of an issue?",
          a: "You can reach our dedicated support desk via support@nammaconnect.in or submit a grievance directly through the Contact Support page.",
        },
      ],
    },
  ];

  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <Container size="sm" className="space-y-8">
        <PageHeader
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about booking stays, hosting on your farm, payments, and creator partnerships."
        />

        <div className="space-y-8">
          {faqCategories.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-harvest-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-harvest-900">
                  {group.category}
                </h3>
              </div>

              <div className="space-y-2">
                {group.items.map((faq, fIdx) => {
                  const globalIdx = gIdx * 10 + fIdx;
                  const isOpen = openIndex === globalIdx;

                  return (
                    <Card
                      key={fIdx}
                      className="bg-white rounded-2xl border-slate-200 overflow-hidden shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                        className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:text-harvest-700 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-harvest-700" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-50">
                          {faq.a}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
