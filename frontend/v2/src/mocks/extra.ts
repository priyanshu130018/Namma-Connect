/**
 * Additional mock fixtures for the Phase-2 dashboard features.
 * Kept in a separate module so the original mock file stays untouched.
 */
import { farms, experiences, bookings } from "@/mocks";

export const activities = [
  { id: "ac1", title: "Sunrise Coffee Harvest Walk", farm: "Green Valley Organic Farm", location: "Coorg", category: "Farming", price: 700, duration: "2 hrs", slots: 8, booked: 5, rating: 4.9, status: "active", image: experiences[0]!.image },
  { id: "ac2", title: "Kerala Sadya Cooking Class", farm: "Sunrise Paddy Retreat", location: "Alleppey", category: "Food", price: 950, duration: "3 hrs", slots: 6, booked: 6, rating: 4.8, status: "active", image: experiences[1]!.image },
  { id: "ac3", title: "Bullock Cart Village Tour", farm: "Nandi Dairy Homestead", location: "Chikkaballapur", category: "Culture", price: 450, duration: "1.5 hrs", slots: 12, booked: 3, rating: 4.3, status: "paused", image: experiences[2]!.image },
  { id: "ac4", title: "Spice Estate Night Trek", farm: "Hillcrest Spice Estate", location: "Munnar", category: "Adventure", price: 1200, duration: "4 hrs", slots: 10, booked: 9, rating: 4.7, status: "active", image: experiences[3]!.image },
  { id: "ac5", title: "Pottery & Clay Craft", farm: "Malnad Areca Grove", location: "Sagara", category: "Craft", price: 600, duration: "2 hrs", slots: 8, booked: 2, rating: 4.5, status: "draft", image: experiences[4]!.image },
  { id: "ac6", title: "Mango Orchard Picnic", farm: "Konkan Mango Orchard", location: "Ratnagiri", category: "Food", price: 800, duration: "3 hrs", slots: 15, booked: 11, rating: 4.6, status: "active", image: experiences[5]!.image },
];

export const history = [
  { id: "BK-1902", item: "Hillcrest Spice Estate", type: "Farm stay", date: "2026-05-11", guests: 4, amount: 9600, status: "completed", rated: true },
  { id: "BK-1877", item: "Pottery & Clay Craft", type: "Activity", date: "2026-04-02", guests: 2, amount: 1200, status: "completed", rated: false },
  { id: "BK-1840", item: "Nandi Dairy Homestead", type: "Farm stay", date: "2026-03-18", guests: 3, amount: 4500, status: "cancelled", rated: false },
  { id: "BK-1811", item: "Mango Orchard Picnic", type: "Activity", date: "2026-02-25", guests: 5, amount: 4000, status: "completed", rated: true },
  { id: "BK-1780", item: "Sunrise Paddy Retreat", type: "Farm stay", date: "2026-01-09", guests: 2, amount: 3600, status: "completed", rated: true },
];

export const helpArticles = [
  { id: "h1", q: "How do I cancel or reschedule a booking?", a: "Open Bookings, choose the booking and use Manage. Free cancellation applies up to 48 hours before check-in." },
  { id: "h2", q: "When are payouts released to hosts?", a: "Payouts are settled every Tuesday for stays completed at least 24 hours earlier, directly to your linked bank account." },
  { id: "h3", q: "How do I get my listing verified?", a: "Upload your ID and land document under Profile. Verification usually completes within 2 working days." },
  { id: "h4", q: "How does a creator collaboration work?", a: "Farmers send a brief with dates and deliverables. Creators accept, shoot on site, and upload media for approval." },
  { id: "h5", q: "What payment methods are supported?", a: "UPI, credit and debit cards, netbanking and wallets. All payments are processed over an encrypted gateway." },
  { id: "h6", q: "How do refunds work?", a: "Approved refunds return to the original payment method within 5-7 working days." },
];

export const helpTopics = [
  { id: "t1", title: "Bookings & cancellations", articles: 12 },
  { id: "t2", title: "Payments & refunds", articles: 9 },
  { id: "t3", title: "Listings & verification", articles: 7 },
  { id: "t4", title: "Collaborations", articles: 5 },
  { id: "t5", title: "Account & security", articles: 8 },
  { id: "t6", title: "Trust & safety", articles: 6 },
];

export const brandDeals = [
  { id: "BD-11", brand: "Farm Fresh Organics", campaign: "Monsoon harvest reel series", budget: 45000, deliverables: "3 reels + 5 stories", deadline: "2026-08-30", status: "active" },
  { id: "BD-12", brand: "Coorg Coffee Co.", campaign: "Estate to cup film", budget: 80000, deliverables: "1 film + 2 reels", deadline: "2026-09-14", status: "pending" },
  { id: "BD-13", brand: "Kerala Tourism", campaign: "Backwater weekend", budget: 120000, deliverables: "Vlog + photo set", deadline: "2026-07-10", status: "completed" },
  { id: "BD-14", brand: "GreenLeaf Spices", campaign: "Spice trail unboxing", budget: 22000, deliverables: "2 reels", deadline: "2026-08-20", status: "declined" },
];

export const instagramStats = {
  handle: "@ishita.travels",
  followers: 48200,
  reach: 312000,
  engagement: 6.4,
  posts: 214,
  topPosts: [
    { id: "ig1", caption: "Sunrise over the coffee rows", likes: 12400, comments: 320, image: farms[0]!.image },
    { id: "ig2", caption: "Sadya, made from scratch", likes: 9800, comments: 210, image: experiences[1]!.image },
    { id: "ig3", caption: "Night trek in Munnar", likes: 15600, comments: 480, image: experiences[3]!.image },
  ],
  weekly: [
    { label: "Mon", value: 4200 }, { label: "Tue", value: 5100 }, { label: "Wed", value: 3800 },
    { label: "Thu", value: 6400 }, { label: "Fri", value: 7200 }, { label: "Sat", value: 9100 }, { label: "Sun", value: 8300 },
  ],
};

export const youtubeStats = {
  channel: "Ishita Rao Travels",
  subscribers: 126000,
  watchHours: 41200,
  avgViewDuration: "4:12",
  videos: 78,
  topVideos: [
    { id: "yt1", title: "48 hours on a Coorg coffee estate", views: 284000, published: "2026-06-11", image: farms[0]!.image },
    { id: "yt2", title: "Cooking a full Kerala Sadya", views: 152000, published: "2026-05-02", image: experiences[1]!.image },
    { id: "yt3", title: "Night trekking a spice estate", views: 96000, published: "2026-04-19", image: experiences[3]!.image },
  ],
  weekly: [
    { label: "Mon", value: 3100 }, { label: "Tue", value: 4200 }, { label: "Wed", value: 3900 },
    { label: "Thu", value: 5200 }, { label: "Fri", value: 6100 }, { label: "Sat", value: 7400 }, { label: "Sun", value: 6800 },
  ],
};

export const creatorRequests = [
  { id: "CR-21", creator: "Ishita Rao", handle: "@ishita.travels", followers: "48.2K", niche: "Travel", dates: "12-14 Aug", ask: "2 nights stay + meals", status: "pending" },
  { id: "CR-22", creator: "Manav Shetty", handle: "@manavframes", followers: "22.7K", niche: "Food", dates: "19 Aug", ask: "Day visit", status: "pending" },
  { id: "CR-23", creator: "Priya Desai", handle: "@priyawrites", followers: "64.1K", niche: "Culture", dates: "02-03 Sep", ask: "Stay + transport", status: "accepted" },
  { id: "CR-24", creator: "Karan Bhat", handle: "@karan.shoots", followers: "11.3K", niche: "Adventure", dates: "28 Jul", ask: "Day visit", status: "declined" },
];

export const reportSummary = [
  { id: "rp1", name: "Monthly bookings report", period: "July 2026", generated: "2026-08-01", format: "PDF", size: "184 KB" },
  { id: "rp2", name: "Revenue & payouts", period: "Q2 2026", generated: "2026-07-05", format: "XLSX", size: "92 KB" },
  { id: "rp3", name: "Guest satisfaction summary", period: "July 2026", generated: "2026-08-02", format: "PDF", size: "121 KB" },
  { id: "rp4", name: "Cancellations & refunds", period: "July 2026", generated: "2026-08-02", format: "CSV", size: "38 KB" },
];

export const verifiedUsers = [
  { id: "U-1001", name: "Ravi Kumar", role: "farmer", email: "ravi@example.com", verifiedOn: "2026-05-12", document: "Aadhaar + Land record", trust: 96 },
  { id: "U-1003", name: "Ishita Rao", role: "creator", email: "ishita@example.com", verifiedOn: "2026-06-01", document: "Aadhaar + PAN", trust: 91 },
  { id: "U-1004", name: "Anitha Menon", role: "farmer", email: "anitha@example.com", verifiedOn: "2026-04-22", document: "Aadhaar", trust: 88 },
  { id: "U-1007", name: "Aarav Sharma", role: "tourist", email: "aarav@example.com", verifiedOn: "2026-07-03", document: "Passport", trust: 84 },
];

export const farmApprovals = [
  { id: "FA-31", farm: "Konkan Mango Orchard", owner: "Prakash Patil", location: "Ratnagiri", submitted: "2026-08-01", docs: 4, status: "pending", image: farms[5]!.image },
  { id: "FA-32", farm: "Malnad Areca Grove", owner: "Deepa Rao", location: "Sagara", submitted: "2026-07-29", docs: 3, status: "pending", image: farms[4]!.image },
  { id: "FA-33", farm: "Nandi Dairy Homestead", owner: "Suresh Gowda", location: "Chikkaballapur", submitted: "2026-07-20", docs: 5, status: "approved", image: farms[3]!.image },
  { id: "FA-34", farm: "Riverbend Paddy Camp", owner: "Nikhil Jain", location: "Kollam", submitted: "2026-07-18", docs: 2, status: "rejected", image: farms[1]!.image },
];

export const activityApprovals = [
  { id: "AA-12", activity: "Spice Estate Night Trek", host: "Joseph Thomas", category: "Adventure", price: 1200, submitted: "2026-08-03", status: "pending", image: experiences[3]!.image },
  { id: "AA-13", activity: "Pottery & Clay Craft", host: "Deepa Rao", category: "Craft", price: 600, submitted: "2026-08-01", status: "pending", image: experiences[4]!.image },
  { id: "AA-14", activity: "Mango Orchard Picnic", host: "Prakash Patil", category: "Food", price: 800, submitted: "2026-07-26", status: "approved", image: experiences[5]!.image },
];

export const fraudSignals = [
  { id: "FS-1", signal: "Payment velocity", entity: "U-1006", score: 87, level: "high", detail: "9 payment attempts in 4 minutes", time: "12 min ago" },
  { id: "FS-2", signal: "Duplicate media", entity: "AP-51", score: 74, level: "high", detail: "Listing images reused from an existing farm", time: "1 hour ago" },
  { id: "FS-3", signal: "Refund abuse", entity: "U-1012", score: 61, level: "medium", detail: "4 refunds requested in 7 days", time: "3 hours ago" },
  { id: "FS-4", signal: "Device mismatch", entity: "U-1020", score: 43, level: "low", detail: "Login from 3 devices in 24 hours", time: "Yesterday" },
];

export const upcomingCalendar = bookings.slice(0, 4).map((b, i) => ({
  id: b.id,
  title: b.item,
  date: b.date,
  guests: b.guests,
  status: b.status,
  slot: ["09:00 AM", "11:30 AM", "02:00 PM", "05:00 PM"][i] ?? "10:00 AM",
}));
