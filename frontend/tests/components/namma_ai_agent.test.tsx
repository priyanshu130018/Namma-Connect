import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { NammaAIWorkspace } from "@/routes/customer/NammaAIWorkspace";
import * as aiService from "@/services/aiService";
import * as savedService from "@/services/savedService";

// Mock i18n
vi.mock("@/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
    changeLanguage: vi.fn(),
  }),
}));

describe("Namma AI Premium Agentic Travel-Agent Chat Workspace Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem("nc_access_token", "test_token_jwt");
    localStorage.setItem(
      "nc_user",
      JSON.stringify({
        id: "usr-traveler-1",
        email: "traveler@nammaconnect.in",
        full_name: "Karnataka Explorer",
        role: "customer",
      })
    );
  });

  const mockRunResponseItinerary: aiService.AgentRunResponse = {
    id: "msg-ai-1",
    message_id: "msg-ai-1",
    conversation_id: "conv-langgraph-123",
    role: "assistant",
    content: "I have prepared a 3-day itinerary for your Coorg trip with plantation stays and activities.",
    intent: "TRIP_PLANNING",
    current_agent_step: "ITINERARY_BUILT",
    trip_id: "trip-langgraph-999",
    extracted_requirements: {
      destination_district: "Kodagu (Coorg)",
      duration_days: 3,
      party_size: 2,
      max_budget: 15000,
      preferred_categories: ["nature", "coffee"],
    },
    budget: {
      stay: 3500,
      activities: 1200,
      food: 3600,
      transport: 1500,
      total: 9800,
      remaining: 5200,
      max_budget: 15000,
    },
    changed_items: ["it-1"],
    execution_trace: [
      { step: "UNDERSTANDING", message: "Extracted requirements for Kodagu (Coorg), 3 days, 2 guests" },
      { step: "LOADING_CONTEXT", message: "Retrieved travel style and personal recommendations" },
      { step: "SEARCH_COMPLETED", message: "Found 3 verified marketplace offerings in Kodagu (Coorg)" },
      { step: "ITINERARY_BUILT", message: "Assembled and budget-validated 3-day proposal" },
    ],
    search_results: [
      {
        id: "srv-coorg-01",
        title: "Organic Cardamom & Coffee Farm Stay",
        category: "Stays",
        district: "Kodagu (Coorg)",
        price: 3500,
        rating: 4.9,
        available: true,
      },
    ],
    selected_services: [
      {
        service_id: "srv-coorg-01",
        title: "Organic Cardamom & Coffee Farm Stay",
        price: 3500,
      },
    ],
    availability_results: [],
    itinerary: {
      total_days: 3,
      total_estimated_cost: 9400,
      currency: "INR",
      summary: "Relaxing nature getaway in Coorg",
      days: [
        {
          day_number: 1,
          date: "2026-10-15",
          title: "Arrival & Farm Stay",
          day_notes: "Arrival in Madikeri & Farm Stay Check-in",
          estimated_day_cost: 3500,
          items: [
            {
              id: "it-1",
              service_id: "srv-coorg-01",
              title: "Organic Cardamom & Coffee Farm Stay",
              category: "Stays",
              estimated_price: 3500,
              start_time: "10:00 AM",
              end_time: "12:00 PM",
            },
          ],
        },
        {
          day_number: 2,
          date: "2026-10-16",
          title: "Kodava Culinary Trail",
          day_notes: "Kodava Culinary & Plantation Trail",
          estimated_day_cost: 2900,
          items: [
            {
              id: "it-2",
              service_id: "srv-coorg-02",
              title: "Traditional Kodava Cooking Experience",
              category: "Workshops",
              estimated_price: 1200,
              start_time: "01:00 PM",
              end_time: "04:00 PM",
            },
          ],
        },
      ],
    },
    tool_calls: [],
    recommended_services: [],
    errors: [],
    created_at: new Date().toISOString(),
  };

  const mockRunResponseApproval: aiService.AgentRunResponse = {
    id: "msg-ai-approval",
    message_id: "msg-ai-approval",
    conversation_id: "conv-langgraph-123",
    role: "assistant",
    content: "Please confirm your reservation for Organic Cardamom & Coffee Farm Stay.",
    intent: "APPROVAL_REQUIRED",
    current_agent_step: "APPROVAL_PENDING",
    approval_required: true,
    approval_prompt: "Would you like me to proceed with reserving Organic Cardamom & Coffee Farm Stay for ₹3,500?",
    approval_status: "PENDING",
    search_results: [],
    selected_services: [],
    availability_results: [],
    execution_trace: [],
    tool_calls: [],
    recommended_services: [],
    errors: [],
    created_at: new Date().toISOString(),
  };

  const mockRunResponseBooking: aiService.AgentRunResponse = {
    id: "msg-ai-2",
    message_id: "msg-ai-2",
    conversation_id: "conv-langgraph-123",
    role: "assistant",
    content: "Booking confirmed! Your reservation code is BK-COORG-2026.",
    intent: "EXECUTE_BOOKING",
    current_agent_step: "BOOKING_EXECUTED",
    trip_id: "trip-langgraph-999",
    execution_trace: [
      { step: "VERIFY_AVAILABILITY", message: "Authoritative check confirmed inventory available" },
      { step: "CREATE_BOOKING", message: "Executed booking reservation with code BK-COORG-2026" },
    ],
    search_results: [],
    selected_services: [],
    availability_results: [],
    booking_state: {
      success: true,
      booking_id: "book-test-555",
      booking_code: "BK-COORG-2026",
      status: "CONFIRMED",
      payment_status: "PAID",
      total_amount: 3500,
      currency: "INR",
      payment_order_id: "order_razor_test_7788",
    },
    tool_calls: [],
    recommended_services: [],
    errors: [],
    created_at: new Date().toISOString(),
  };

  it("renders the 3-column desktop layout with sidebar, conversation, and dynamic panel", () => {
    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Namma AI Travel Agent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Autonomous/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Namaskara Karnataka! I am your Namma AI Travel Agent/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send message to Namma AI/i })
    ).toBeInTheDocument();
  });

  it("submits request and renders structured Trip Overview card with constraint chips", async () => {
    const runSpy = vi.spyOn(aiService, "runAgent").mockResolvedValue(mockRunResponseItinerary);

    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i);
    fireEvent.change(input, {
      target: { value: "Plan a 3 day Coorg trip for 2 people under ₹15,000" },
    });

    const sendBtn = screen.getByRole("button", { name: /Send message to Namma AI/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(runSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Plan a 3 day Coorg trip for 2 people under ₹15,000",
        })
      );
      expect(
        screen.getByText(
          /I have prepared a 3-day itinerary for your Coorg trip with plantation stays and activities/i
        )
      ).toBeInTheDocument();
      // Natural language constraint chips
      expect(screen.getAllByText(/Kodagu \(Coorg\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3 Days/i).length).toBeGreaterThan(0);
      // Trip Overview card
      expect(screen.getAllByText(/Trip Overview:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Within Budget/i).length).toBeGreaterThan(0);
    });
  });

  it("displays itinerary plan with day-by-day items and diff updated badge", async () => {
    vi.spyOn(aiService, "runAgent").mockResolvedValue(mockRunResponseItinerary);

    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i);
    fireEvent.change(input, {
      target: { value: "Plan a 3 day Coorg trip for 2 people under ₹15,000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send message to Namma AI/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Organic Cardamom & Coffee Farm Stay/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Traditional Kodava Cooking Experience/i).length).toBeGreaterThan(0);
      // Diff badge for updated item
      expect(screen.getAllByText(/UPDATED/i).length).toBeGreaterThan(0);
    });
  });

  it("displays human approval gate card with Approve and Not Now actions", async () => {
    const runSpy = vi.spyOn(aiService, "runAgent").mockResolvedValue(mockRunResponseApproval);

    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i);
    fireEvent.change(input, {
      target: { value: "Book Organic Cardamom stay" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send message to Namma AI/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ready to Confirm & Book/i)).toBeInTheDocument();
      expect(screen.getByText(/Would you like me to proceed with reserving/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Confirm & Pay/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Not Now/i })).toBeInTheDocument();
    });

    // Clicking Confirm & Pay triggers confirmation message
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Pay/i }));
    await waitFor(() => {
      expect(runSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/approve/i),
        })
      );
    });
  });

  it("displays verified booking confirmation receipt and timeline", async () => {
    vi.spyOn(aiService, "runAgent").mockResolvedValue(mockRunResponseBooking);

    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i);
    fireEvent.change(input, {
      target: { value: "Book it now" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send message to Namma AI/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Booking confirmed! Your reservation code is BK-COORG-2026/i)
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Trip Booked & Confirmed!/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/BK-COORG-2026/i).length).toBeGreaterThan(0);
    });
  });

  it("allows saving service to wishlist without booking", async () => {
    const mockSearchOnlyResponse: aiService.AgentRunResponse = {
      ...mockRunResponseItinerary,
      itinerary: undefined,
      current_agent_step: "SEARCH_COMPLETED",
      intent: "SEARCH_SERVICES",
      content: "Here are top plantation stays found in Coorg:",
      search_results: [
        {
          id: "srv-coorg-01",
          title: "Organic Cardamom & Coffee Farm Stay",
          category: "Stays",
          district: "Kodagu (Coorg)",
          price: 3500,
          rating: 4.9,
          available: true,
        },
      ],
    };

    const saveSpy = vi.spyOn(savedService, "saveService").mockResolvedValue(true);
    vi.spyOn(aiService, "runAgent").mockResolvedValue(mockSearchOnlyResponse);

    render(
      <MemoryRouter initialEntries={["/app/namma-ai"]}>
        <Routes>
          <Route path="/app/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tell Namma AI what you want to plan/i);
    fireEvent.change(input, {
      target: { value: "Find plantation stays" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send message to Namma AI/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Add to Trip/i).length).toBeGreaterThan(0);
    });

    const addBtn = screen.getAllByText(/Add to Trip/i)[0];
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith("srv-coorg-01");
    });
  });

  it("renders workspace correctly when accessed via /namma-ai route", () => {
    render(
      <MemoryRouter initialEntries={["/namma-ai"]}>
        <Routes>
          <Route path="/namma-ai" element={<NammaAIWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Namma AI Travel Agent/i })).toBeInTheDocument();
    expect(screen.getByText(/Conversational travel agent powered by LangGraph/i)).toBeInTheDocument();
  });
});
