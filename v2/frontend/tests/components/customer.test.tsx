import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TravelAIFloating } from "@/components/customer/TravelAIFloating";
import { SupportModal } from "@/components/customer/SupportModal";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { RECOMMENDED_SERVICES } from "@/features/customer/data/customerData";

describe("Customer Application Components", () => {
  it("renders ServiceCard with title, location, price, and provider", () => {
    const service = RECOMMENDED_SERVICES[0];
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    );
    expect(screen.getByText(service.title)).toBeInTheDocument();
    expect(screen.getByText(service.providerName)).toBeInTheDocument();
    expect(screen.getByText(/Starting from/i)).toBeInTheDocument();
  });

  it("renders TravelAIFloating and opens chat drawer on click", () => {
    render(<TravelAIFloating />);
    const aiButton = screen.getByRole("button", { name: /open travel ai/i });
    expect(aiButton).toBeInTheDocument();

    fireEvent.click(aiButton);
    expect(screen.getByRole("heading", { name: /Travel AI|Namma AI/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask anything about stays/i)).toBeInTheDocument();
  });

  it("renders SupportModal when open", () => {
    const onClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/Customer Help & Support/i)).toBeInTheDocument();
    expect(screen.getByText(/Booking Questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancellations & Refunds/i)).toBeInTheDocument();
  });

  it("renders CustomerNavbar with Brand, Notifications, Messages, and Profile", () => {
    render(
      <BrowserRouter>
        <CustomerNavbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/Namma/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Messages/i)).toBeInTheDocument();
  });

  it("renders CustomerSidebar with ONLY Explore, My Trip, Collaborations, Become a Partner", () => {
    const onToggle = vi.fn();
    render(
      <BrowserRouter>
        <CustomerSidebar isCollapsed={false} onToggleCollapse={onToggle} />
      </BrowserRouter>
    );
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("My Trip")).toBeInTheDocument();
    expect(screen.getByText("Collaborations")).toBeInTheDocument();
    expect(screen.getByText("Become a Partner")).toBeInTheDocument();

    // Ensure forbidden primary sidebar items are not present as primary buttons
    expect(screen.queryByRole("link", { name: /^Profile$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Settings$/i })).not.toBeInTheDocument();
  });
});
