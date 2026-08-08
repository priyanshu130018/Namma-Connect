/**
 * Mock data layer — realistic fixtures for every dashboard.
 * Shape mirrors what the FastAPI backend is expected to return so the
 * services layer can be swapped to real endpoints without UI changes.
 */

export type Status = string;

const img = (id: number, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=60`;

export const farms = [
  { id: "f1", name: "Green Valley Organic Farm", location: "Coorg, Karnataka", price: 2400, rating: 4.8, reviews: 132, category: "Organic", image: img(1500382017468 - 0 + 0) , tags: ["Farm stay", "Organic", "Coffee"], beds: 3, capacity: 6, owner: "Ravi Kumar", verified: true, latitude: 12.4244, longitude: 75.7382 },
  { id: "f2", name: "Sunrise Paddy Retreat", location: "Kuttanad, Kerala", price: 1800, rating: 4.6, reviews: 88, category: "Paddy", image: img(1464226184884 - 0), tags: ["Backwaters", "Paddy", "Boating"], beds: 2, capacity: 4, owner: "Anitha Menon", verified: true, latitude: 9.4981, longitude: 76.3388 },
  { id: "f3", name: "Hillcrest Spice Estate", location: "Munnar, Kerala", price: 3200, rating: 4.9, reviews: 210, category: "Spice", image: img(1470071459604 - 0), tags: ["Spice tour", "Trekking"], beds: 4, capacity: 8, owner: "Joseph Thomas", verified: true, latitude: 10.0889, longitude: 77.0595 },
  { id: "f4", name: "Nandi Dairy Homestead", location: "Chikkaballapur, Karnataka", price: 1500, rating: 4.4, reviews: 54, category: "Dairy", image: img(1500595046743 - 0), tags: ["Dairy", "Family"], beds: 2, capacity: 5, owner: "Suresh Gowda", verified: false, latitude: 13.4355, longitude: 77.7315 },
  { id: "f5", name: "Malnad Areca Grove", location: "Sagara, Karnataka", price: 2100, rating: 4.5, reviews: 76, category: "Plantation", image: img(1441974231531 - 0), tags: ["Plantation", "Waterfalls"], beds: 3, capacity: 6, owner: "Deepa Rao", verified: true, latitude: 14.1674, longitude: 75.0403 },
  { id: "f6", name: "Konkan Mango Orchard", location: "Ratnagiri, Maharashtra", price: 2600, rating: 4.7, reviews: 143, category: "Orchard", image: img(1523712999610 - 0), tags: ["Mango", "Beach"], beds: 5, capacity: 10, owner: "Prakash Patil", verified: true, latitude: 16.9902, longitude: 73.312 },
];

export const experiences = [
  { id: "e1", title: "Sunrise Coffee Harvest Walk", category: "Farming", host: "Ravi Kumar", location: "Coorg", price: 700, duration: "2 hrs", rating: 4.9, slots: 8, image: img(1447933601403 - 0) },
  { id: "e2", title: "Traditional Kerala Sadya Cooking", category: "Food", host: "Anitha Menon", location: "Alleppey", price: 950, duration: "3 hrs", rating: 4.8, slots: 6, image: img(1466637574441 - 0) },
  { id: "e3", title: "Bullock Cart Village Tour", category: "Culture", host: "Suresh Gowda", location: "Chikkaballapur", price: 450, duration: "1.5 hrs", rating: 4.3, slots: 12, image: img(1500382017468 - 0) },
  { id: "e4", title: "Spice Estate Night Trek", category: "Adventure", host: "Joseph Thomas", location: "Munnar", price: 1200, duration: "4 hrs", rating: 4.7, slots: 10, image: img(1464822759023 - 0) },
  { id: "e5", title: "Pottery & Clay Craft Session", category: "Craft", host: "Deepa Rao", location: "Sagara", price: 600, duration: "2 hrs", rating: 4.5, slots: 8, image: img(1493106641515 - 0) },
  { id: "e6", title: "Mango Orchard Picnic", category: "Food", host: "Prakash Patil", location: "Ratnagiri", price: 800, duration: "3 hrs", rating: 4.6, slots: 15, image: img(1553279768 - 0) },
];

export const bookings = [
  { id: "BK-2041", item: "Green Valley Organic Farm", type: "Farm stay", guest: "Aarav Sharma", host: "Ravi Kumar", date: "2026-08-14", nights: 2, guests: 3, amount: 4800, status: "confirmed", payment: "paid", location: "Coorg, Karnataka", image: farms[0]!.image },
  { id: "BK-2042", item: "Traditional Kerala Sadya Cooking", type: "Experience", guest: "Meera Nair", host: "Anitha Menon", date: "2026-08-19", nights: 0, guests: 2, amount: 1900, status: "pending", payment: "pending", location: "Alleppey, Kerala", image: experiences[1]!.image },
  { id: "BK-2043", item: "Hillcrest Spice Estate", type: "Farm stay", guest: "Rohit Verma", host: "Joseph Thomas", date: "2026-07-28", nights: 3, guests: 4, amount: 9600, status: "completed", payment: "paid", location: "Munnar, Kerala", image: farms[2]!.image },
  { id: "BK-2044", item: "Nandi Dairy Homestead", type: "Farm stay", guest: "Sneha Iyer", host: "Suresh Gowda", date: "2026-09-02", nights: 1, guests: 2, amount: 1500, status: "cancelled", payment: "failed", location: "Chikkaballapur", image: farms[3]!.image },
  { id: "BK-2045", item: "Spice Estate Night Trek", type: "Experience", guest: "Dev Patel", host: "Joseph Thomas", date: "2026-08-25", nights: 0, guests: 5, amount: 6000, status: "confirmed", payment: "paid", location: "Munnar, Kerala", image: experiences[3]!.image },
];

export const payments = [
  { id: "PAY-9001", bookingId: "BK-2041", date: "2026-08-01", method: "UPI", amount: 4800, fee: 240, status: "paid" },
  { id: "PAY-9002", bookingId: "BK-2042", date: "2026-08-05", method: "Card", amount: 1900, fee: 95, status: "pending" },
  { id: "PAY-9003", bookingId: "BK-2043", date: "2026-07-20", method: "Netbanking", amount: 9600, fee: 480, status: "paid" },
  { id: "PAY-9004", bookingId: "BK-2044", date: "2026-08-28", method: "UPI", amount: 1500, fee: 0, status: "failed" },
  { id: "PAY-9005", bookingId: "BK-2045", date: "2026-08-06", method: "Wallet", amount: 6000, fee: 300, status: "paid" },
];

export const reviews = [
  { id: "r1", author: "Aarav Sharma", target: "Green Valley Organic Farm", rating: 5, date: "2026-07-12", text: "Woke up to mist over the coffee rows. The host walked us through the whole harvest process — easily the best weekend of the year." },
  { id: "r2", author: "Meera Nair", target: "Kerala Sadya Cooking", rating: 4, date: "2026-06-30", text: "Learned to make five dishes from scratch. A little rushed at the end but genuinely authentic." },
  { id: "r3", author: "Rohit Verma", target: "Hillcrest Spice Estate", rating: 5, date: "2026-06-02", text: "The night trek through the cardamom slopes was unforgettable. Rooms were spotless." },
  { id: "r4", author: "Sneha Iyer", target: "Nandi Dairy Homestead", rating: 3, date: "2026-05-18", text: "Kids loved the cows. Wi-Fi was patchy, but that's part of the charm." },
];

export const wishlist = farms.slice(0, 4).map((f) => ({ ...f, savedOn: "2026-07-22" }));

export const savedRoutes = [
  { id: "sr1", name: "Western Ghats Coffee Trail", stops: 4, days: 5, distance: "310 km" },
  { id: "sr2", name: "Kerala Backwater Loop", stops: 3, days: 4, distance: "180 km" },
];

export const checklist = [
  { id: "c1", label: "Book farm stay & confirm arrival time", group: "Before you go", done: true },
  { id: "c2", label: "Carry government photo ID", group: "Before you go", done: true },
  { id: "c3", label: "Download offline maps", group: "Before you go", done: false },
  { id: "c4", label: "Light rain jacket & poncho", group: "Packing", done: false },
  { id: "c5", label: "Closed walking shoes", group: "Packing", done: true },
  { id: "c6", label: "Mosquito repellent & sunscreen", group: "Packing", done: false },
  { id: "c7", label: "Power bank and universal adapter", group: "Packing", done: false },
  { id: "c8", label: "Cash for local markets (UPI is patchy)", group: "On the trip", done: false },
  { id: "c9", label: "Ask host about farm safety rules", group: "On the trip", done: false },
];

export const nearbyFarms = farms.map((f, i) => ({
  ...f,
  distanceKm: [4.2, 8.7, 12.4, 18.1, 24.6, 31.2][i] ?? 10,
  open: i % 3 !== 2,
}));

export const conversations = [
  { id: "m1", name: "Ravi Kumar", role: "Farmer", last: "See you at the gate at 7am!", time: "2m", unread: 2, messages: [
    { from: "them", text: "Namaskara! Your booking for Saturday is confirmed.", time: "09:12" },
    { from: "me", text: "Thank you! Is breakfast included?", time: "09:15" },
    { from: "them", text: "Yes — farm breakfast at 8:30, all organic.", time: "09:16" },
    { from: "them", text: "See you at the gate at 7am!", time: "09:20" },
  ] },
  { id: "m2", name: "Anitha Menon", role: "Host", last: "I'll send the ingredient list.", time: "1h", unread: 0, messages: [
    { from: "me", text: "Do we need to bring anything for the cooking class?", time: "08:02" },
    { from: "them", text: "I'll send the ingredient list.", time: "08:30" },
  ] },
  { id: "m3", name: "Namma Connect Support", role: "Support", last: "Your refund has been processed.", time: "1d", unread: 0, messages: [
    { from: "them", text: "Your refund has been processed.", time: "Yesterday" },
  ] },
  { id: "m4", name: "Ishita Rao", role: "Creator", last: "Sharing the shot list tonight.", time: "3d", unread: 0, messages: [
    { from: "them", text: "Hi! I'd love to feature your farm in my next reel series.", time: "Mon" },
    { from: "me", text: "That sounds great. What dates work for you?", time: "Mon" },
    { from: "them", text: "Sharing the shot list tonight.", time: "Tue" },
  ] },
];

export const notifications = [
  { id: "n1", category: "booking", title: "Booking confirmed", body: "Green Valley Organic Farm · 14–16 Aug · 3 guests", time: "2 min ago", type: "success", read: false },
  { id: "n2", category: "payment", title: "Payment pending", body: "Complete payment for BK-2042 within 24 hours to hold your slot", time: "1 hour ago", type: "warning", read: false },
  { id: "n3", category: "message", title: "New message from Ravi Kumar", body: "See you at the gate at 7am!", time: "3 hours ago", type: "info", read: false },
  { id: "n4", category: "review", title: "Review request", body: "How was your stay at Hillcrest Spice Estate? Share your experience.", time: "Yesterday", type: "info", read: true },
  { id: "n5", category: "payment", title: "Payout processed", body: "₹4,560 for BK-2039 has been transferred to your account", time: "Yesterday", type: "success", read: true },
  { id: "n6", category: "booking", title: "Booking request received", body: "Sneha Iyer requested Nandi Dairy Homestead for 2 Sep", time: "2 days ago", type: "info", read: true },
  { id: "n7", category: "review", title: "New 5★ review", body: "Rohit Verma rated Hillcrest Spice Estate 5 stars", time: "2 days ago", type: "success", read: true },
  { id: "n8", category: "system", title: "Profile reminder", body: "Add a profile photo to build trust with hosts and guests", time: "3 days ago", type: "warning", read: true },
];

/* ── Farmer ────────────────────────────────────────────────────────────── */

export const farmerListings = farms.slice(0, 4).map((f, i) => ({
  ...f,
  status: ["published", "published", "draft", "review"][i] ?? "published",
  views: [1240, 860, 120, 430][i] ?? 200,
  bookingsCount: [18, 11, 0, 4][i] ?? 2,
}));

export const bookingRequests = [
  { id: "RQ-101", guest: "Aarav Sharma", experience: "Green Valley Organic Farm · Farm stay", dates: "14–16 Aug 2026", guests: 3, amount: 4800, note: "Anniversary trip, prefer a quiet room.", status: "pending" },
  { id: "RQ-102", guest: "Sneha Iyer", experience: "Coffee Estate Walk", dates: "22 Aug 2026", guests: 2, amount: 1500, note: "Travelling with a toddler.", status: "pending" },
  { id: "RQ-103", guest: "Dev Patel", experience: "Green Valley Organic Farm · Farm stay", dates: "02–04 Sep 2026", guests: 5, amount: 7200, note: "Group of college friends.", status: "approved" },
  { id: "RQ-104", guest: "Meera Nair", experience: "Spice Garden Tour", dates: "18 Aug 2026", guests: 4, amount: 3600, note: "Vegetarian meals preferred for all guests.", status: "pending" },
  { id: "RQ-105", guest: "Rohan Kulkarni", experience: "Dairy Milking Experience", dates: "25–26 Aug 2026", guests: 2, amount: 2800, note: "Early morning slot if possible.", status: "approved" },
  { id: "RQ-106", guest: "Ananya Menon", experience: "Coffee Estate Walk", dates: "30 Aug 2026", guests: 6, amount: 5400, note: "Photography-focused visit, needs flexible timing.", status: "rejected" },
  { id: "RQ-107", guest: "Vikram Reddy", experience: "Green Valley Organic Farm · Farm stay", dates: "05–07 Sep 2026", guests: 3, amount: 5100, note: "Needs airport pickup from Mangaluru.", status: "rejected" },
];

export const collabRequests = [
  { id: "CL-11", creator: "Ishita Rao", followers: "82K", platform: "Instagram", farm: "Green Valley Organic Farm", ask: "2-night stay for a reel series", dates: "18–20 Aug 2026", message: "Hi! I'm shooting a farm-to-table reel series and your organic farm looks perfect. I'd love to stay 2 nights in exchange for 3 reels and a story highlight.", fee: 12000, status: "pending" },
  { id: "CL-12", creator: "Karan Mehta", followers: "310K", platform: "YouTube", farm: "Coffee Estate Walk", ask: "Farm documentary shoot", dates: "02–05 Sep 2026", message: "I'm producing a 20-minute documentary on Coorg coffee estates. Your walk-through format is exactly what the episode needs — happy to share raw footage too.", fee: 45000, status: "approved" },
  { id: "CL-13", creator: "Tara Fernandes", followers: "24K", platform: "Instagram", farm: "Spice Garden Tour", ask: "Recipe collaboration", dates: "Flexible, Sep 2026", message: "I run a coastal-cuisine page and want to develop 3 recipes using spices from your garden, with full credit and a behind-the-scenes carousel.", fee: 6000, status: "rejected" },
  { id: "CL-14", creator: "Nisha Verma", followers: "56K", platform: "YouTube", farm: "Dairy Milking Experience", ask: "Sunrise vlog feature", dates: "24 Aug 2026", message: "Planning a 'morning on an Indian farm' vlog — the 5:30 AM milking session would be the highlight. One dedicated video plus Shorts.", fee: 9000, status: "pending" },
  { id: "CL-15", creator: "Arjun Bhatt", followers: "120K", platform: "Instagram", farm: "Green Valley Organic Farm", ask: "Harvest festival coverage", dates: "10–12 Sep 2026", message: "Covering harvest festivals across Karnataka this season. Would love 2 days on-site for a photo essay and live coverage of the event.", fee: 15000, status: "pending" },
  { id: "CL-16", creator: "Priya Nambiar", followers: "45K", platform: "YouTube", farm: "Coffee Estate Walk", ask: "Weekend getaway vlog", dates: "29–31 Aug 2026", message: "My audience loves slow-travel content. I'd feature the estate walk and stay in a weekend vlog with a pinned comment linking your listing.", fee: 18000, status: "approved" },
  { id: "CL-17", creator: "Sahil Khan", followers: "12K", platform: "Instagram", farm: "Spice Garden Tour", ask: "Product photography set", dates: "05 Sep 2026", message: "Building my product-photography portfolio — I'd shoot your packaged spices and deliver 20 edited photos for your listings.", fee: 4000, status: "rejected" },
];

export const weather = {
  location: "Coorg, Karnataka",
  now: { temp: 24, condition: "Light showers", humidity: 82, wind: 12, rainChance: 70 },
  week: [
    { day: "Mon", high: 26, low: 19, condition: "Showers", rain: 70 },
    { day: "Tue", high: 27, low: 19, condition: "Cloudy", rain: 40 },
    { day: "Wed", high: 28, low: 20, condition: "Sunny", rain: 10 },
    { day: "Thu", high: 27, low: 20, condition: "Sunny", rain: 15 },
    { day: "Fri", high: 25, low: 18, condition: "Heavy rain", rain: 90 },
    { day: "Sat", high: 26, low: 19, condition: "Showers", rain: 60 },
    { day: "Sun", high: 27, low: 19, condition: "Cloudy", rain: 30 },
  ],
  advisory: "Heavy rain expected Friday — move harvest activities to Wednesday and secure guest walkways.",
};

export const cropCalendar = [
  { crop: "Arabica Coffee", stage: "Berry development", months: [6, 7, 8, 9], action: "Shade management" },
  { crop: "Black Pepper", stage: "Flowering", months: [5, 6, 7], action: "Fungal spray" },
  { crop: "Paddy", stage: "Transplanting", months: [6, 7], action: "Water level check" },
  { crop: "Cardamom", stage: "Harvest", months: [8, 9, 10], action: "Daily picking" },
];

export const availability = [
  { date: "2026-08-10", open: true, capacity: 6, booked: 2 },
  { date: "2026-08-11", open: true, capacity: 6, booked: 6 },
  { date: "2026-08-12", open: false, capacity: 6, booked: 0 },
  { date: "2026-08-13", open: true, capacity: 6, booked: 3 },
  { date: "2026-08-14", open: true, capacity: 6, booked: 5 },
  { date: "2026-08-15", open: true, capacity: 6, booked: 1 },
  { date: "2026-08-16", open: false, capacity: 6, booked: 0 },
];

export const revenueMonthly = [
  { label: "Feb", value: 42000 },
  { label: "Mar", value: 51000 },
  { label: "Apr", value: 47500 },
  { label: "May", value: 62000 },
  { label: "Jun", value: 58000 },
  { label: "Jul", value: 71000 },
  { label: "Aug", value: 66500 },
];

export const trafficWeekly = [
  { label: "W1", value: 320 },
  { label: "W2", value: 410 },
  { label: "W3", value: 380 },
  { label: "W4", value: 520 },
  { label: "W5", value: 610 },
  { label: "W6", value: 580 },
];

/* ── Creator ───────────────────────────────────────────────────────────── */

export const portfolio = [
  { id: "p1", title: "Monsoon mornings in Coorg", type: "Reel", views: "128K", likes: "9.4K", date: "2026-07-18", image: farms[0]!.image },
  { id: "p2", title: "A day with a paddy farmer", type: "Video", views: "342K", likes: "21K", date: "2026-07-02", image: farms[1]!.image },
  { id: "p3", title: "Spice estate photo essay", type: "Photo set", views: "54K", likes: "4.1K", date: "2026-06-20", image: farms[2]!.image },
  { id: "p4", title: "Farm-to-table in 60 seconds", type: "Reel", views: "212K", likes: "17K", date: "2026-06-08", image: experiences[1]!.image },
  { id: "p5", title: "Sunrise over the areca grove", type: "Photo set", views: "38K", likes: "2.8K", date: "2026-05-27", image: farms[4]!.image },
  { id: "p6", title: "Mango season diaries", type: "Video", views: "96K", likes: "7.2K", date: "2026-05-11", image: farms[5]!.image },
];

export const creatorCollabs = [
  { id: "CC-1", brand: "Green Valley Organic Farm", type: "Farm stay", deliverables: "2 reels + 1 photo set", fee: 12000, deadline: "2026-08-20", status: "active" },
  { id: "CC-2", brand: "Konkan Mango Orchard", type: "Brand", deliverables: "1 YouTube feature", fee: 45000, deadline: "2026-09-05", status: "pending" },
  { id: "CC-3", brand: "Hillcrest Spice Estate", type: "Farm stay", deliverables: "Photo essay", fee: 8000, deadline: "2026-07-01", status: "completed" },
];

export const creatorBookings = [
  { id: "CB-31", client: "Aarav Sharma", service: "Guided photo walk", date: "2026-08-16", amount: 3500, status: "confirmed" },
  { id: "CB-32", client: "Meera Nair", service: "Farm reel shoot", date: "2026-08-21", amount: 9000, status: "pending" },
  { id: "CB-33", client: "Dev Patel", service: "Drone coverage", date: "2026-07-30", amount: 15000, status: "completed" },
];

export const creatorEarningsMonthly = [
  { label: "Feb", value: 18500 },
  { label: "Mar", value: 24000 },
  { label: "Apr", value: 21000 },
  { label: "May", value: 32500 },
  { label: "Jun", value: 28000 },
  { label: "Jul", value: 41000 },
  { label: "Aug", value: 36500 },
];

export const creatorBookingMix = [
  { label: "Farm stay collabs", value: 38 },
  { label: "Brand deals", value: 27 },
  { label: "Photo shoots", value: 20 },
  { label: "Video features", value: 15 },
];

export const creatorTransactions = [
  { id: "TX-901", date: "05 Aug 2026", brand: "Green Valley Organic Farm", type: "Farm stay collab", amount: 12000, status: "paid" },
  { id: "TX-902", date: "28 Jul 2026", brand: "Hillcrest Spice Estate", type: "Photo essay", amount: 8000, status: "paid" },
  { id: "TX-903", date: "21 Jul 2026", brand: "Coorg Coffee Trails", type: "Reel package", amount: 15500, status: "paid" },
  { id: "TX-904", date: "12 Jul 2026", brand: "Konkan Mango Orchard", type: "YouTube feature", amount: 45000, status: "pending" },
  { id: "TX-905", date: "03 Jul 2026", brand: "Riverbank Bamboo Stay", type: "Brand shoot", amount: 9500, status: "paid" },
  { id: "TX-906", date: "24 Jun 2026", brand: "Malnad Homestays", type: "Weekend vlog", amount: 13200, status: "processing" },
  { id: "TX-907", date: "15 Jun 2026", brand: "Green Valley Organic Farm", type: "Story takeover", amount: 6000, status: "paid" },
];

export const socialAccounts = [
  { id: "s1", platform: "Instagram", handle: "@ishita.travels", followers: "82.4K", engagement: "6.2%", connected: true },
  { id: "s2", platform: "YouTube", handle: "Ishita Rao", followers: "31.2K", engagement: "4.8%", connected: true },
  { id: "s3", platform: "TikTok", handle: "—", followers: "—", engagement: "—", connected: false },
];

export const followers = [
  { id: "u1", name: "Aarav Sharma", handle: "@aarav.s", since: "2026-07-12", tier: "Top fan" },
  { id: "u2", name: "Meera Nair", handle: "@meeranair", since: "2026-06-30", tier: "Follower" },
  { id: "u3", name: "Rohit Verma", handle: "@rohitv", since: "2026-06-11", tier: "Follower" },
  { id: "u4", name: "Sneha Iyer", handle: "@sneha.iyer", since: "2026-05-28", tier: "Top fan" },
  { id: "u5", name: "Dev Patel", handle: "@devp", since: "2026-05-02", tier: "Follower" },
];

export const engagementWeekly = [
  { label: "Mon", value: 1200 },
  { label: "Tue", value: 1850 },
  { label: "Wed", value: 1420 },
  { label: "Thu", value: 2600 },
  { label: "Fri", value: 3100 },
  { label: "Sat", value: 2800 },
  { label: "Sun", value: 2100 },
];

/* ── Admin ─────────────────────────────────────────────────────────────── */

export const users = [
  { id: "U-1001", name: "Aarav Sharma", email: "aarav@example.com", role: "tourist", joined: "2026-03-14", status: "active", verified: true },
  { id: "U-1002", name: "Ravi Kumar", email: "ravi@greenvalley.in", role: "farmer", joined: "2026-01-08", status: "active", verified: true },
  { id: "U-1003", name: "Ishita Rao", email: "ishita@creators.in", role: "creator", joined: "2026-02-20", status: "active", verified: true },
  { id: "U-1004", name: "Suresh Gowda", email: "suresh@nandidairy.in", role: "farmer", joined: "2026-06-02", status: "pending", verified: false },
  { id: "U-1005", name: "Tara Fernandes", email: "tara@creators.in", role: "creator", joined: "2026-06-18", status: "pending", verified: false },
  { id: "U-1006", name: "Rohit Verma", email: "rohit@example.com", role: "tourist", joined: "2026-04-01", status: "suspended", verified: true },
  { id: "U-1007", name: "Priya Desai", email: "priya@nammaconnect.in", role: "admin", joined: "2025-11-11", status: "active", verified: true },
];

export const verificationQueue = [
  { id: "V-21", name: "Suresh Gowda", role: "farmer", document: "Land record + Aadhaar", submitted: "2026-08-02", status: "pending" },
  { id: "V-22", name: "Tara Fernandes", role: "creator", document: "PAN + portfolio links", submitted: "2026-08-04", status: "pending" },
  { id: "V-23", name: "Deepa Rao", role: "farmer", document: "GST certificate", submitted: "2026-07-29", status: "approved" },
];

export const approvalQueue = [
  { id: "AP-51", title: "Malnad Areca Grove", kind: "Farm listing", owner: "Deepa Rao", submitted: "2026-08-03", status: "pending", image: farms[4]!.image },
  { id: "AP-52", title: "Pottery & Clay Craft Session", kind: "Activity", owner: "Deepa Rao", submitted: "2026-08-01", status: "pending", image: experiences[4]!.image },
  { id: "AP-53", title: "Konkan Mango Orchard", kind: "Farm listing", owner: "Prakash Patil", submitted: "2026-07-25", status: "approved", image: farms[5]!.image },
];

export const fraudAlerts = [
  { id: "FR-7", severity: "high", title: "Duplicate listing images detected", detail: "AP-51 shares 3 images with an existing listing.", time: "20 min ago" },
  { id: "FR-8", severity: "medium", title: "Unusual refund pattern", detail: "User U-1006 requested 4 refunds in 7 days.", time: "2 hours ago" },
  { id: "FR-9", severity: "low", title: "Login from new region", detail: "Admin account accessed from Pune.", time: "Yesterday" },
];

export const tickets = [
  { id: "T-301", subject: "Refund not received", user: "Sneha Iyer", priority: "high", updated: "10 min ago", status: "open" },
  { id: "T-302", subject: "Cannot upload listing photos", user: "Suresh Gowda", priority: "medium", updated: "1 hour ago", status: "pending" },
  { id: "T-303", subject: "Change registered email", user: "Rohit Verma", priority: "low", updated: "Yesterday", status: "completed" },
];

export const blogPosts = [
  { id: "B-1", title: "10 farm stays to visit this monsoon", author: "Priya Desai", category: "Guides", date: "2026-07-30", status: "published", views: 4820 },
  { id: "B-2", title: "How agri-tourism supports small farmers", author: "Ravi Kumar", category: "Impact", date: "2026-07-12", status: "published", views: 2140 },
  { id: "B-3", title: "A creator's guide to shooting on a working farm", author: "Ishita Rao", category: "Creators", date: "2026-08-05", status: "draft", views: 0 },
];

export const roles = [
  { id: "R-1", name: "Tourist", users: 12840, permissions: ["Browse", "Book", "Review"] },
  { id: "R-2", name: "Farmer", users: 1420, permissions: ["Listings", "Bookings", "Payouts"] },
  { id: "R-3", name: "Creator", users: 860, permissions: ["Portfolio", "Collaborations", "Payouts"] },
  { id: "R-4", name: "Admin", users: 12, permissions: ["All access", "Moderation", "Billing"] },
];

export const platformStats = {
  users: 15132,
  bookings: 4380,
  gmv: 12840000,
  activeListings: 612,
};

export const aiSuggestions = [
  { id: "a1", title: "3-day Coorg coffee immersion", summary: "Farm stay at Green Valley, sunrise harvest walk, and a spice estate day trip.", days: 3, budget: 9800, farms: ["Green Valley Organic Farm", "Hillcrest Spice Estate"] },
  { id: "a2", title: "Kerala backwaters & food trail", summary: "Paddy retreat with a Sadya cooking class and a canoe village tour.", days: 4, budget: 12400, farms: ["Sunrise Paddy Retreat"] },
  { id: "a3", title: "Weekend family farm break", summary: "Dairy homestead near Bangalore with bullock cart rides for the kids.", days: 2, budget: 5200, farms: ["Nandi Dairy Homestead"] },
];
