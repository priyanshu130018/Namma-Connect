import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HomePage } from "@/routes/public/Home";
import { AboutPage } from "@/routes/public/About";
import { ContactPage } from "@/routes/public/Contact";
import { FAQPage } from "@/routes/public/FAQ";
import { TermsPage } from "@/routes/public/Terms";
import { PrivacyPage } from "@/routes/public/Privacy";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

describe("Public Website Component & Page Suite", () => {
  it("renders Navbar with Brand Logo, Navigation (Home, About, Contact, FAQ) and Auth buttons", () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Namma/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^About$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^FAQ$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join Platform/i })).toBeInTheDocument();

    // Verify marketplace internal navigation is NOT on public navbar
    expect(screen.queryByText(/My Trip/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Travel AI/i)).not.toBeInTheDocument();
  });

  it("renders Footer with Platform, Partners, Company, and Legal links", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(screen.getByText(/How It Works/i)).toBeInTheDocument();
    expect(screen.getByText(/Become a Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Creator Collaboration/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });

  it("renders HomePage with Hero, How It Works, Categories, Trust, and CTA sections", () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Authentic Farm Tourism/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Explore NammaConnect/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Become a Partner/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /How Namma Connect Works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Marketplace Service Categories/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Built on Verified Credentials & Fair Direct Payouts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /The Customer Experience/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Become a NammaConnect Partner/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Creator Collaborations for Rural Tourism/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Smart Trip Planning with Travel AI/i })).toBeInTheDocument();
  });

  it("renders AboutPage with mission statement and pillars", () => {
    render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /About Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bridging the gap between rural agricultural heritage/i })).toBeInTheDocument();
    expect(screen.getByText(/Sustainable Agriculture & Heritage/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Living Income for Hosts/i)).toBeInTheDocument();
  });

  it("renders ContactPage and handles message form submission", () => {
    render(
      <BrowserRouter>
        <ContactPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Contact & Support/i })).toBeInTheDocument();
    expect(screen.getByText(/Email Support/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: "Aarav Gupta" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "aarav@example.com" } });
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: "Homestay query" } });
    fireEvent.change(screen.getByLabelText(/Message Details/i), { target: { value: "I want to visit Coorg next month." } });
    fireEvent.click(screen.getByRole("button", { name: /Send Message/i }));

    expect(screen.getByRole("heading", { name: /Message Received/i })).toBeInTheDocument();
  });

  it("renders FAQPage with all 8 documented categories and expands accordion on click", () => {
    render(
      <BrowserRouter>
        <FAQPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("heading", { name: /Frequently Asked Questions/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. Customers & Travelers/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Partners & Agro-Hosts/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Bookings & Reservations/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Payments & Escrow Payouts/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Verification & Safety Standards/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Content Creators & Storytellers/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Cancellations & Refunds/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Support & Assistance/i)).toBeInTheDocument();

    const trigger = screen.getByText(/How do I contact customer support in case of an issue\?/i);
    fireEvent.click(trigger);
    expect(screen.getByText(/You can reach our dedicated support desk via support@nammaconnect\.in/i)).toBeInTheDocument();
  });

  it("renders TermsPage and PrivacyPage with structured legal headers", () => {
    render(
      <BrowserRouter>
        <TermsPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeInTheDocument();

    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("heading", { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. Information We Collect/i)).toBeInTheDocument();
  });
});
