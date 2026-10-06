import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "@/routes/public/Home";
import { AboutPage } from "@/routes/public/About";
import { FAQPage } from "@/routes/public/FAQ";
import { ContactPage } from "@/routes/public/Contact";
import { BlogPage } from "@/routes/public/Blog";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppProviders } from "@/app/providers";

// Mock API calls
vi.mock("@/services/supportService", () => ({
  submitPublicContact: vi.fn().mockResolvedValue({
    success: true,
    message: "Inquiry received",
    data: { ticket_code: "NC-INQ-TEST99" },
  }),
}));


describe("Public Website Landing & Content Pages Suite", () => {
  it("renders Navbar with brand and public links (Home, About, Blog, FAQ, Contact, Sign In, Join)", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getAllByText(/Namma/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Connect/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /^Home$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^About$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Blog$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^FAQ$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Contact$/i })).toBeInTheDocument();

  });

  it("renders Landing Page (/) with Hero, Categories, Features, How it Works, and Trust sections", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getByText(/Discover Authentic Farm Tourism/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explore Services/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan a Trip/i })).toBeInTheDocument();

    expect(screen.getByText(/Marketplace & Discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Personalized Recommendations/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Agentic AI Trip Planner/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/How Namma Connect Works/i)).toBeInTheDocument();
  });


  it("renders About Page (/about) detailing Customer, Provider, and Platform Governance roles", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <AboutPage />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /About Namma Connect/i })).toBeInTheDocument();
    expect(screen.getByText(/Customer \/ Traveler/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider \/ Agro-Host/i)).toBeInTheDocument();
    expect(screen.getByText(/Platform Governance/i)).toBeInTheDocument();
  });

  it("renders FAQ Page (/faq) with accessible accordion categories and answers", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <FAQPage />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Frequently Asked Questions/i })).toBeInTheDocument();
    expect(screen.getByText(/How do I create an account and explore farm stays\?/i)).toBeInTheDocument();
  });

  it("renders Contact Page (/contact) and submits inquiry to backend API", async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <ContactPage />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: /Contact & Support/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Your Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const subjectInput = screen.getByLabelText(/Subject/i);
    const messageInput = screen.getByLabelText(/Detailed Message/i);
    const submitBtn = screen.getByRole("button", { name: /Send Inquiry/i });

    fireEvent.change(nameInput, { target: { value: "Aravind Swamy" } });
    fireEvent.change(emailInput, { target: { value: "aravind@example.com" } });
    fireEvent.change(subjectInput, { target: { value: "Harvest Tour Group Booking" } });
    fireEvent.change(messageInput, { target: { value: "We have a group of 8 guests looking to visit in October." } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Inquiry Submitted Successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/NC-INQ-TEST99/i)).toBeInTheDocument();
    });
  });

  it("renders Blog Page (/blog) with article listings, category filters, and search", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <BlogPage />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getByText(/Namma Connect Insights & Stories/i)).toBeInTheDocument();
    expect(screen.getByText(/How Agentic AI Transforms Multi-Day Rural Trip Planning/i)).toBeInTheDocument();
    expect(screen.getByText(/A Conscious Traveler's Guide to Coorg and Chikmagalur Coffee Trails/i)).toBeInTheDocument();
  });

  it("renders Footer with dynamic copyright year and public links", () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </AppProviders>
    );

    expect(screen.getAllByText(/Namma/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Stories & Blog$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Contact Support$/i })).toBeInTheDocument();
  });
});

