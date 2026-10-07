import { useState } from "react";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ChevronDown, HelpCircle } from "lucide-react";
import { PageMetadata } from "@/components/seo/PageMetadata";

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);


  const faqCategories = [
    {
      category: "1. Customers & Travelers",
      items: [
        {
          q: "How do I create an account and explore farm stays?",
          a: "You can create a free Namma Connect account on the /register page using your email and password. Once signed in to the customer portal, you can explore verified estates, compare amenities, and filter by harvest seasons.",
        },
        {
          q: "Are farm meals and regional cuisine included in stays?",
          a: "Most homestays and agro-cottages include traditional home-cooked breakfast. Specific inclusions for lunch and dinner are clearly detailed in each listing's description and pricing tiers.",
        },
      ],
    },
    {
      category: "2. Partners & Agro-Hosts",
      items: [
        {
          q: "Who can register as a Namma Connect partner?",
          a: "We welcome plantation owners, smallholder farmers, local drivers, naturalists, guides, homestay families, and rural artisans located across South India.",
        },
        {
          q: "What is the process to list an experience or stay?",
          a: "Hosts can apply through the Become a Partner portal. Once basic identity and listing details are verified, hosts can set pricing, availability schedules, and capacity limits directly.",
        },
      ],
    },
    {
      category: "3. Bookings & Reservations",
      items: [
        {
          q: "How does live availability work?",
          a: "Our backend manages authoritative real-time inventory calendars. When you select dates and complete your reservation, your booking is confirmed with a verified reservation manifest.",
        },
        {
          q: "Can I make special requests or dietary adjustments?",
          a: "Yes. During checkout and inside the reservation view, you can enter specific host requests, such as dietary preferences or transportation assistance.",
        },
      ],
    },
    {
      category: "4. Payments & Settlements",
      items: [
        {
          q: "Which payment methods are supported?",
          a: "Namma Connect supports major Indian payment options including UPI (Google Pay, PhonePe, Paytm), Net Banking, and credit/debit cards via secure payment gateway processing.",
        },
        {
          q: "How are host payouts managed?",
          a: "Provider earnings are tracked transparently in the provider dashboard and settled directly to the host's verified bank account following confirmed service fulfillment.",
        },
      ],
    },
    {
      category: "5. Verification & Safety Standards",
      items: [
        {
          q: "How does Namma Connect verify hosts and listings?",
          a: "Host partner applications are reviewed and verified with basic identity and property details before listings are approved for public booking.",
        },
        {
          q: "Are the farms suitable for families and groups?",
          a: "Yes. Listings highlight suitability for families, groups, or solo travelers, along with detailed amenity lists and safety guidelines.",
        },
      ],
    },
    {
      category: "6. AI Assistant & Trip Planner",
      items: [
        {
          q: "How does the Agentic AI Trip Planner work?",
          a: "The Agentic AI Trip Planner uses your destination, duration, party size, budget, and travel preferences to generate conflict-free multi-day schedules grounded strictly in live catalog services and real-time availability.",
        },
        {
          q: "Can I customize the generated trip plan?",
          a: "Yes. You can add, replace, or reorder activities in your day-by-day itinerary inside My Trips before proceeding to book.",
        },
      ],
    },
    {
      category: "7. Cancellations & Refunds",
      items: [
        {
          q: "What is the cancellation and refund policy?",
          a: "Cancellations and refunds are managed according to individual service policies and booking status. Eligible cancellations can be initiated from the Bookings page in the customer portal, with refunds processed through the original payment method.",
        },
      ],
    },
    {
      category: "8. Support & Assistance",
      items: [
        {
          q: "How do I contact customer support in case of an issue?",
          a: "You can submit an inquiry through our public Contact page or file a support ticket from your account portal for direct assistance from our operations team.",
        },
      ],
    },
  ];


  return (
    <Section className="py-8 sm:py-12 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <PageMetadata
        title="Frequently Asked Questions"
        description="Answers to questions about booking rural stays, host onboarding, verified availability, payments, and the AI Trip Planner."
      />

      <Container size="sm" className="space-y-8">

        <PageHeader
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about booking stays, hosting on your farm, payments, and AI trip planning."
        />


        <div className="space-y-8">
          {faqCategories.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-harvest-700 dark:text-harvest-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-harvest-900 dark:text-harvest-300">
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
                      className="bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                        className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-harvest-700 dark:hover:text-harvest-400 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-harvest-700 dark:text-harvest-400" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-50 dark:border-slate-800/80">
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
