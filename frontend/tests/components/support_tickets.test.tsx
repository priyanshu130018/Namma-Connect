import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Routes, Route } from "react-router-dom";
import {
  CustomerSupportHubPage,
  CustomerSupportTicketsPage,
  CustomerSupportTicketDetailPage,
} from "@/routes/customer/Support";
import { SupportModal } from "@/components/customer/SupportModal";
import * as supportService from "@/services/supportService";
import { SupportTicket, SupportTicketListResponseData } from "@/types";

const mockTicket: SupportTicket = {
  id: "tick-01",
  ticket_code: "NC-TICK-9081A",
  user_id: "usr-01",
  user_name: "Customer One",
  user_email: "cust1@example.com",
  booking_id: "NC-BKG-8812",
  category: "Booking",
  subject: "Early check-in inquiry for estate stay",
  description: "We are arriving at 10:30 AM. Can we drop our luggage early?",
  status: "OPEN",
  priority: "MEDIUM",
  responses: [
    {
      sender_name: "NammaConnect Support Agent",
      sender_role: "admin",
      message: "We have contacted host Somanna. Luggage drop is confirmed for 11:00 AM.",
      created_at: "2026-08-20T12:00:00Z",
    },
  ],
  created_at: "2026-08-20T10:00:00Z",
};

const mockTicketsData: SupportTicketListResponseData = {
  tickets: [mockTicket],
  total: 1,
};

describe("Customer Support & Tickets Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CustomerSupportHubPage and handles ticket creation", async () => {
    vi.spyOn(supportService, "getMySupportTickets").mockResolvedValue(mockTicketsData);
    const createSpy = vi.spyOn(supportService, "createSupportTicket").mockResolvedValue({
      ...mockTicket,
      ticket_code: "NC-TICK-NEW01",
      subject: "WiFi speed in Heritage Cottage",
    });

    render(
      <BrowserRouter>
        <CustomerSupportHubPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Help & Concierge Support")).toBeInTheDocument();
      expect(screen.getByText("Booking Questions")).toBeInTheDocument();
      expect(screen.getByText(/Early check-in inquiry/i)).toBeInTheDocument();
    });

    // Toggle Create Support Ticket form
    const createBtn = screen.getByRole("button", { name: /Create Support Ticket/i });
    fireEvent.click(createBtn);

    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: "WiFi speed in Heritage Cottage" },
    });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
      target: { value: "Need high speed internet for remote work during stay." },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "WiFi speed in Heritage Cottage",
          description: "Need high speed internet for remote work during stay.",
        })
      );
      expect(screen.getByText(/Support Ticket Created: NC-TICK-NEW01/i)).toBeInTheDocument();
    });
  });

  it("renders CustomerSupportTicketsPage with status badges and tabs", async () => {
    vi.spyOn(supportService, "getMySupportTickets").mockResolvedValue(mockTicketsData);

    render(
      <BrowserRouter>
        <CustomerSupportTicketsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My Support Tickets")).toBeInTheDocument();
      expect(screen.getByText("NC-TICK-9081A")).toBeInTheDocument();
      expect(screen.getByText(/Ref: NC-BKG-8812/i)).toBeInTheDocument();
      expect(screen.getByText("1 responses")).toBeInTheDocument();
    });
  });

  it("renders CustomerSupportTicketDetailPage and submits reply", async () => {
    vi.spyOn(supportService, "getSupportTicketDetail").mockResolvedValue(mockTicket);
    const replySpy = vi.spyOn(supportService, "replySupportTicket").mockResolvedValue({
      ...mockTicket,
      responses: [
        ...mockTicket.responses,
        {
          sender_name: "Customer One",
          sender_role: "customer",
          message: "Thank you so much! See you at 11 AM.",
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/app/support/tickets/tick-01"]}>
        <Routes>
          <Route path="/app/support/tickets/:ticket_id" element={<CustomerSupportTicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("NC-TICK-9081A")).toBeInTheDocument();
      expect(screen.getByText("Early check-in inquiry for estate stay")).toBeInTheDocument();
      expect(
        screen.getByText("We have contacted host Somanna. Luggage drop is confirmed for 11:00 AM.")
      ).toBeInTheDocument();
    });

    const replyInput = screen.getByPlaceholderText(/Type your response to the support agent.../i);
    fireEvent.change(replyInput, { target: { value: "Thank you so much! See you at 11 AM." } });

    const sendBtn = screen.getByRole("button", { name: /Send Response/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(replySpy).toHaveBeenCalledWith("tick-01", "Thank you so much! See you at 11 AM.");
    });
  });

  it("renders SupportModal and submits grievance ticket", async () => {
    const createSpy = vi.spyOn(supportService, "createSupportTicket").mockResolvedValue({
      ...mockTicket,
      ticket_code: "NC-TICK-MODAL1",
    });

    render(
      <BrowserRouter>
        <SupportModal isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText("Customer Help & Support")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: "Cancellation query" },
    });
    fireEvent.change(screen.getByLabelText(/Describe your issue/i), {
      target: { value: "Can I reschedule to the following weekend?" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      expect(screen.getByText(/Support Ticket Created: NC-TICK-MODAL1/i)).toBeInTheDocument();
    });
  });
});
