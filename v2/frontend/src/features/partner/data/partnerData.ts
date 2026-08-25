export type ServiceReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER REVIEW"
  | "CHANGES REQUIRED"
  | "APPROVED"
  | "PUBLISHED";

export interface PartnerServiceItem {
  id: string;
  title: string;
  providerType: "Farmer" | "Guide" | "Travel / Driver" | "Hotel" | "Creator" | "Artisan" | "Homestay Owner";
  category: string;
  price: number;
  unit: string;
  status: ServiceReviewStatus;
  location: string;
  capacity: number;
  activeBookings: number;
  imageUrl: string;
  description: string;
  reviewFeedback?: string;
  specificDetails?: Record<string, any>;
}

export const SAMPLE_PARTNER_SERVICES: PartnerServiceItem[] = [
  {
    id: "srv-p-01",
    title: "Highland Arabica Coffee Estate Stay & Cupping",
    providerType: "Farmer",
    category: "Stay",
    price: 3499,
    unit: "night",
    status: "PUBLISHED",
    location: "Madikeri, Coorg, Karnataka",
    capacity: 6,
    activeBookings: 3,
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
    description: "120-acre certified organic coffee estate offering harvest walking tours and premium cupping sessions.",
    specificDetails: {
      farmSize: "120 Acres",
      crops: ["Arabica Coffee", "Black Pepper", "Cardamom"],
      farmPractices: "Organic / Zero-Chemical",
    },
  },
  {
    id: "srv-p-02",
    title: "Organic Honey Harvesting & Apiary Walk",
    providerType: "Farmer",
    category: "Experiences",
    price: 1250,
    unit: "person",
    status: "PUBLISHED",
    location: "Madikeri, Coorg, Karnataka",
    capacity: 12,
    activeBookings: 5,
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb2252a?w=800&auto=format&fit=crop&q=80",
    description: "Hands-on beekeeping and wild honey extraction experience led by master apiarists.",
    specificDetails: {
      duration: "3 Hours",
      gearProvided: "Protective Suits & Gloves",
      takeaway: "250g Raw Forest Honey Jar",
    },
  },
  {
    id: "srv-p-03",
    title: "Malnad Spice Canopy Nature Trail",
    providerType: "Guide",
    category: "Guides & Tours",
    price: 850,
    unit: "person",
    status: "UNDER REVIEW",
    location: "Siddapur, Kodagu, Karnataka",
    capacity: 8,
    activeBookings: 0,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    description: "Botanical nature walk through ancient nutmeg and vanilla canopies.",
    reviewFeedback: "Awaiting final GPS coordinates verification by regional moderator.",
  },
  {
    id: "srv-p-04",
    title: "Monsoon Agro-Villa with Private Stream",
    providerType: "Homestay Owner",
    category: "Stay",
    price: 4200,
    unit: "night",
    status: "DRAFT",
    location: "Virajpet, Coorg, Karnataka",
    capacity: 4,
    activeBookings: 0,
    imageUrl: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800&auto=format&fit=crop&q=80",
    description: "Secluded wood & stone cottage adjoining a natural perennial forest stream.",
  },
];

export interface PartnerBookingItem {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  checkInDate: string;
  checkOutDate: string;
  status: "upcoming" | "completed" | "cancelled";
  guestsCount: number;
  totalAmount: number;
  netPayout: number;
  specialRequests?: string;
}

export const SAMPLE_PARTNER_BOOKINGS: PartnerBookingItem[] = [
  {
    id: "bk-p-01",
    bookingCode: "NC-2026-8812",
    serviceId: "srv-p-01",
    serviceTitle: "Highland Arabica Coffee Estate Stay & Cupping",
    customerName: "Rahul Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "rahul.sharma@example.com",
    checkInDate: "2026-09-15",
    checkOutDate: "2026-09-17",
    status: "upcoming",
    guestsCount: 2,
    totalAmount: 6998,
    netPayout: 6648,
    specialRequests: "Vegetarian breakfast preferred. Arriving around 1 PM.",
  },
  {
    id: "bk-p-02",
    bookingCode: "NC-2026-9034",
    serviceId: "srv-p-02",
    serviceTitle: "Organic Honey Harvesting & Apiary Walk",
    customerName: "Priya Nair",
    customerPhone: "+91 94471 22334",
    customerEmail: "priya.nair@example.com",
    checkInDate: "2026-09-22",
    checkOutDate: "2026-09-22",
    status: "upcoming",
    guestsCount: 4,
    totalAmount: 5000,
    netPayout: 4750,
    specialRequests: "Two children included in the group.",
  },
  {
    id: "bk-p-03",
    bookingCode: "NC-2026-7241",
    serviceId: "srv-p-01",
    serviceTitle: "Highland Arabica Coffee Estate Stay & Cupping",
    customerName: "Anand Kulkarni",
    customerPhone: "+91 98220 55667",
    customerEmail: "anand.k@example.com",
    checkInDate: "2026-08-10",
    checkOutDate: "2026-08-12",
    status: "completed",
    guestsCount: 2,
    totalAmount: 6998,
    netPayout: 6648,
  },
  {
    id: "bk-p-04",
    bookingCode: "NC-2026-5590",
    serviceId: "srv-p-02",
    serviceTitle: "Organic Honey Harvesting & Apiary Walk",
    customerName: "Deepak Verma",
    customerPhone: "+91 98111 99887",
    customerEmail: "deepak.v@example.com",
    checkInDate: "2026-08-02",
    checkOutDate: "2026-08-02",
    status: "cancelled",
    guestsCount: 2,
    totalAmount: 2500,
    netPayout: 0,
    specialRequests: "Cancelled within 48-hour free window.",
  },
];

export interface PartnerCollaborationItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  campaignTitle: string;
  proposedDates: string;
  deliverables: string[];
  budget: number;
  status: "requests" | "accepted" | "rejected" | "completed";
  creatorReach: string;
  message: string;
}

export const SAMPLE_PARTNER_COLLABORATIONS: PartnerCollaborationItem[] = [
  {
    id: "collab-p-01",
    creatorId: "cr-01",
    creatorName: "Arjun Nambiar",
    creatorHandle: "@arjun_wildtrails",
    campaignTitle: "Coffee Blossom Season 4K Drone Showcase",
    proposedDates: "Oct 10 - Oct 12, 2026",
    deliverables: ["2x Instagram Reels", "1x High-Res Photo Pack (15 shots)", "1x YouTube Short"],
    budget: 15000,
    status: "requests",
    creatorReach: "185K+ Followers",
    message: "Hi Somanna! I would love to film your upcoming blossom bloom with 4K drone cinematography in exchange for a 2-night stay and production stipend.",
  },
  {
    id: "collab-p-02",
    creatorId: "cr-02",
    creatorName: "Ananya Deshmukh",
    creatorHandle: "@ananya_eatslocal",
    campaignTitle: "Heritage Kodava Cuisine & Coffee Feature",
    proposedDates: "Sep 28 - Sep 30, 2026",
    deliverables: ["1x Long-form Video Feature", "3x Instagram Stories"],
    budget: 20000,
    status: "accepted",
    creatorReach: "320K+ Followers",
    message: "Excited to spotlight your farm-to-table breakfast and generational Akki Rotti recipe.",
  },
  {
    id: "collab-p-03",
    creatorId: "cr-03",
    creatorName: "Vikramaditya Roy",
    creatorHandle: "@vikram_lenscraft",
    campaignTitle: "Night Sky Agro-Timelapse Series",
    proposedDates: "Aug 15 - Aug 16, 2026",
    deliverables: ["5x 4K Timelapses", "Print Media Kit"],
    budget: 12000,
    status: "completed",
    creatorReach: "95K+ Followers",
    message: "Project completed and media links transferred to your partner profile.",
  },
];

export interface EarningsRangeData {
  range: "7 Days" | "30 Days" | "1 Year";
  grossRevenue: number;
  platformFee: number;
  netPayout: number;
  totalBookings: number;
  chartData: { label: string; amount: number }[];
}

export const SAMPLE_EARNINGS_DATA: Record<"7 Days" | "30 Days" | "1 Year", EarningsRangeData> = {
  "7 Days": {
    range: "7 Days",
    grossRevenue: 18996,
    platformFee: 950,
    netPayout: 18046,
    totalBookings: 4,
    chartData: [
      { label: "Mon", amount: 3499 },
      { label: "Tue", amount: 0 },
      { label: "Wed", amount: 5000 },
      { label: "Thu", amount: 3499 },
      { label: "Fri", amount: 0 },
      { label: "Sat", amount: 6998 },
      { label: "Sun", amount: 0 },
    ],
  },
  "30 Days": {
    range: "30 Days",
    grossRevenue: 74500,
    platformFee: 3725,
    netPayout: 70775,
    totalBookings: 18,
    chartData: [
      { label: "Week 1", amount: 14500 },
      { label: "Week 2", amount: 22000 },
      { label: "Week 3", amount: 19000 },
      { label: "Week 4", amount: 19000 },
    ],
  },
  "1 Year": {
    range: "1 Year",
    grossRevenue: 840000,
    platformFee: 42000,
    netPayout: 798000,
    totalBookings: 215,
    chartData: [
      { label: "Jan", amount: 65000 },
      { label: "Feb", amount: 58000 },
      { label: "Mar", amount: 72000 },
      { label: "Apr", amount: 84000 },
      { label: "May", amount: 92000 },
      { label: "Jun", amount: 60000 },
      { label: "Jul", amount: 45000 },
      { label: "Aug", amount: 74500 },
      { label: "Sep", amount: 80000 },
      { label: "Oct", amount: 95000 },
      { label: "Nov", amount: 110000 },
      { label: "Dec", amount: 125000 },
    ],
  },
};
