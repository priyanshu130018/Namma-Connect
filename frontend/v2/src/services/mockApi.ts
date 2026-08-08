/**
 * Mock API layer.
 * Same call signature a real HTTP client would have (async + latency), so
 * swapping these to FastAPI endpoints later is a one-file change.
 */
import * as db from "@/mocks";
import * as ex from "@/mocks/extra";

const delay = <T,>(data: T, ms = 320): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));

export type SearchResultItem = {
  kind: "farm" | "experience" | "activity";
  id: string;
  title: string;
  location: string;
  price: number;
  category: string;
  rating: number;
  image: string;
  meta: string;
};

export type SearchParams = {
  q?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
};

export const mockApi = {
  // Tourist
  getFarms: () => delay(db.farms),
  getFarm: (id: string) => delay(db.farms.find((f) => f.id === id) ?? null),
  getExperiences: () => delay(db.experiences),

  /** GET /search — global search across farms, experiences and activities. */
  search: (params: SearchParams = {}) => {
    const items: SearchResultItem[] = [
      ...db.farms.map((f) => ({
        kind: "farm" as const,
        id: f.id,
        title: f.name,
        location: f.location,
        price: f.price,
        category: f.category,
        rating: f.rating,
        image: f.image,
        meta: `${f.beds} beds · up to ${f.capacity} guests`,
      })),
      ...db.experiences.map((e) => ({
        kind: "experience" as const,
        id: e.id,
        title: e.title,
        location: e.location,
        price: e.price,
        category: e.category,
        rating: e.rating,
        image: e.image,
        meta: `${e.duration} · hosted by ${e.host}`,
      })),
      ...ex.activities.map((a) => ({
        kind: "activity" as const,
        id: a.id,
        title: a.title,
        location: a.location,
        price: a.price,
        category: a.category,
        rating: a.rating,
        image: a.image,
        meta: `${a.duration} · ${a.farm}`,
      })),
    ];
    const q = params.q?.trim().toLowerCase();
    const filtered = items.filter(
      (i) =>
        (!q ||
          i.title.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)) &&
        (!params.location || i.location.includes(params.location)) &&
        (params.minPrice == null || i.price >= params.minPrice) &&
        (params.maxPrice == null || i.price <= params.maxPrice) &&
        (!params.category || i.category === params.category),
    );
    return delay(
      {
        items: filtered,
        locations: [...new Set(items.map((i) => i.location))].sort(),
        categories: [...new Set(items.map((i) => i.category))].sort(),
      },
      450,
    );
  },
  getBookings: () => delay(db.bookings),
  getBooking: (id: string) => delay(db.bookings.find((b) => b.id === id) ?? null),
  getPayments: () => delay(db.payments),
  getReviews: () => delay(db.reviews),
  getWishlist: () => delay(db.wishlist),
  getSavedRoutes: () => delay(db.savedRoutes),
  getChecklist: () => delay(db.checklist),
  getNearbyFarms: () => delay(db.nearbyFarms),
  getConversations: () => delay(db.conversations),
  getNotifications: () => delay(db.notifications),
  planTrip: (_prompt: string) => delay(db.aiSuggestions, 900),

  // Farmer
  getFarmerListings: () => delay(db.farmerListings),
  getBookingRequests: () => delay(db.bookingRequests),
  getCollabRequests: () => delay(db.collabRequests),
  getWeather: () => delay(db.weather),
  getCropCalendar: () => delay(db.cropCalendar),
  getAvailability: () => delay(db.availability),
  getRevenue: () => delay(db.revenueMonthly),
  getTraffic: () => delay(db.trafficWeekly),

  // Creator
  getPortfolio: () => delay(db.portfolio),
  getCreatorCollabs: () => delay(db.creatorCollabs),
  getCreatorBookings: () => delay(db.creatorBookings),
  getSocialAccounts: () => delay(db.socialAccounts),
  getFollowers: () => delay(db.followers),
  getEngagement: () => delay(db.engagementWeekly),
  getCreatorEarnings: () => delay(db.creatorEarningsMonthly),
  getCreatorBookingMix: () => delay(db.creatorBookingMix),
  getCreatorTransactions: () => delay(db.creatorTransactions),

  // Admin
  getUsers: () => delay(db.users),
  getVerificationQueue: () => delay(db.verificationQueue),
  getApprovalQueue: () => delay(db.approvalQueue),
  getFraudAlerts: () => delay(db.fraudAlerts),
  getTickets: () => delay(db.tickets),
  getBlogPosts: () => delay(db.blogPosts),
  getRoles: () => delay(db.roles),
  getPlatformStats: () => delay(db.platformStats),

  // Shared / Phase 2
  getActivities: () => delay(ex.activities),
  getHistory: () => delay(ex.history),
  getHelpArticles: () => delay(ex.helpArticles),
  getHelpTopics: () => delay(ex.helpTopics),
  getReports: () => delay(ex.reportSummary),
  getCalendar: () => delay(ex.upcomingCalendar),

  // Farmer
  getCreatorRequests: () => delay(ex.creatorRequests),

  // Creator
  getBrandDeals: () => delay(ex.brandDeals),
  getInstagram: () => delay(ex.instagramStats),
  getYoutube: () => delay(ex.youtubeStats),

  // Admin
  getVerifiedUsers: () => delay(ex.verifiedUsers),
  getFarmApprovals: () => delay(ex.farmApprovals),
  getActivityApprovals: () => delay(ex.activityApprovals),
  getFraudSignals: () => delay(ex.fraudSignals),
};

export default mockApi;
