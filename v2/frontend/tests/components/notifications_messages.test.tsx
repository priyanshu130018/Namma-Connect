import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CustomerNotificationsPage } from "@/routes/customer/Notifications";
import { CustomerMessagesPage } from "@/routes/customer/Messages";
import * as commService from "@/services/communicationService";
import {
  NotificationListResponseData,
  ConversationItem,
  ConversationDetail,
} from "@/types";

const mockNotificationsData: NotificationListResponseData = {
  unread_count: 2,
  notifications: [
    {
      id: "notif-01",
      user_id: "usr-01",
      title: "Booking Confirmed: Highland Arabica Coffee Estate",
      message: "Your stay in Coorg is confirmed. Your check-in pass and digital itinerary are ready.",
      type: "booking",
      resource_type: "booking",
      resource_id: "NC-BKG-SAMPLE-01",
      is_read: false,
      created_at: "2026-08-20T10:00:00Z",
    },
    {
      id: "notif-02",
      user_id: "usr-01",
      title: "Payment Successful",
      message: "Payment of ₹18,000 for your plantation retreat booking has been verified.",
      type: "payment",
      resource_type: "booking",
      resource_id: "NC-BKG-SAMPLE-01",
      is_read: false,
      created_at: "2026-08-20T10:05:00Z",
    },
    {
      id: "notif-03",
      user_id: "usr-01",
      title: "UIDAI Identity KYC Verified",
      message: "Your identity records have been approved by compliance.",
      type: "system",
      resource_type: null,
      resource_id: null,
      is_read: true,
      created_at: "2026-08-18T10:00:00Z",
    },
  ],
};

const mockConversations: ConversationItem[] = [
  {
    id: "conv-01",
    participant_id: "host-01",
    participant_name: "Somanna (Kodagu Organics Host)",
    subject: "Highland Arabica Coffee Estate Stay",
    last_message_text: "Yes, traditional Akki Rotti and filter coffee are included!",
    last_message_at: "2026-08-20T11:00:00Z",
    unread_count: 1,
    created_at: "2026-08-20T10:00:00Z",
  },
];

const mockThreadDetail: ConversationDetail = {
  conversation: mockConversations[0],
  messages: [
    {
      id: "msg-01",
      conversation_id: "conv-01",
      sender_id: "host-01",
      sender_name: "Somanna (Kodagu Organics Host)",
      content: "Namaskara! We have reserved the Heritage Cottage for your upcoming stay.",
      is_read: true,
      created_at: "2026-08-20T10:15:00Z",
    },
    {
      id: "msg-02",
      conversation_id: "conv-01",
      sender_id: "usr-01",
      sender_name: "Traveler One",
      content: "Thank you Somanna! Will estate breakfast be included?",
      is_read: true,
      created_at: "2026-08-20T10:20:00Z",
    },
    {
      id: "msg-03",
      conversation_id: "conv-01",
      sender_id: "host-01",
      sender_name: "Somanna (Kodagu Organics Host)",
      content: "Yes, traditional Akki Rotti and filter coffee are included!",
      is_read: false,
      created_at: "2026-08-20T11:00:00Z",
    },
  ],
};

describe("Notifications & Messages Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CustomerNotificationsPage with notifications and handles mark as read", async () => {
    vi.spyOn(commService, "getNotifications").mockResolvedValue(mockNotificationsData);
    const markReadSpy = vi.spyOn(commService, "markNotificationRead").mockResolvedValue({
      ...mockNotificationsData.notifications[0],
      is_read: true,
    });
    const markAllReadSpy = vi.spyOn(commService, "markAllNotificationsRead").mockResolvedValue({
      marked_count: 2,
    });

    render(
      <BrowserRouter>
        <CustomerNotificationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Notifications Center")).toBeInTheDocument();
      expect(screen.getByText("Booking Confirmed: Highland Arabica Coffee Estate")).toBeInTheDocument();
      expect(screen.getByText("Payment Successful")).toBeInTheDocument();
      expect(screen.getByText("UIDAI Identity KYC Verified")).toBeInTheDocument();
    });

    // Mark single notification read
    const markButtons = screen.getAllByRole("button", { name: /Mark as read/i });
    fireEvent.click(markButtons[0]);

    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith("notif-01");
    });

    // Mark all as read
    const markAllBtn = screen.getByRole("button", { name: /Mark all as read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(markAllReadSpy).toHaveBeenCalled();
    });
  });

  it("renders CustomerMessagesPage, loads thread and sends message", async () => {
    vi.spyOn(commService, "getConversations").mockResolvedValue(mockConversations);
    vi.spyOn(commService, "getConversationThread").mockResolvedValue(mockThreadDetail);
    const sendSpy = vi.spyOn(commService, "sendMessage").mockResolvedValue({
      id: "msg-04",
      conversation_id: "conv-01",
      sender_id: "usr-01",
      sender_name: "Traveler One",
      content: "Looking forward to checking in around 3 PM!",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    render(
      <BrowserRouter>
        <CustomerMessagesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Host & Partner Messages")).toBeInTheDocument();
      expect(screen.getAllByText("Somanna (Kodagu Organics Host)")[0]).toBeInTheDocument();
      expect(
        screen.getByText("Namaskara! We have reserved the Heritage Cottage for your upcoming stay.")
      ).toBeInTheDocument();
    });

    // Send a message
    const input = screen.getByPlaceholderText(/Type a message to your host.../i);
    fireEvent.change(input, { target: { value: "Looking forward to checking in around 3 PM!" } });

    const sendBtn = screen.getByRole("button", { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith({
        conversation_id: "conv-01",
        content: "Looking forward to checking in around 3 PM!",
      });
    });
  });
});
