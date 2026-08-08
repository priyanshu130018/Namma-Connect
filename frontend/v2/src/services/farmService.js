/**
 * Farm service — mock implementation.
 *
 * Endpoint structure (future-ready; swap internals for real HTTP calls):
 *   GET    /farms              → list all farms / experiences
 *   GET    /farms/:id          → single farm detail
 *   GET    /farms/nearby       → farms near the user
 *   GET    /farms/listings     → farmer's own listings
 *   GET    /activities         → bookable activities
 *   POST   /activities         → add a new activity (farmer)
 */
import { mockApi } from "./mockApi";

export const farmEndpoints = {
  list: "/farms",
  detail: (id) => `/farms/${id}`,
  nearby: "/farms/nearby",
  listings: "/farms/listings",
  activities: "/activities",
};

export const farmService = {
  /** GET /farms */
  getFarms: () => mockApi.getFarms(),

  /** GET /farms/:id */
  getFarm: (id) => mockApi.getFarm(id),

  /** GET /farms (experiences view) */
  getExperiences: () => mockApi.getExperiences(),

  /** GET /farms/nearby */
  getNearbyFarms: () => mockApi.getNearbyFarms(),

  /** GET /farms/listings (farmer) */
  getListings: () => mockApi.getFarmerListings(),

  /** GET /activities */
  getActivities: () => mockApi.getActivities(),

  /** POST /activities — mock: echoes the payload back with an id */
  addActivity: (payload) =>
    Promise.resolve({ id: `act-${Date.now()}`, status: "pending", ...payload }),

  /** POST /farms — mock create-farm */
  createFarm: (payload) =>
    Promise.resolve({ id: `farm-${Date.now()}`, status: "pending", ...payload }),
};

export default farmService;
