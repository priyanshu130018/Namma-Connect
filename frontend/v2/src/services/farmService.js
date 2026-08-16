import { farmAPI } from "./api";
import api from "./api";

export const farmEndpoints = {
  list: "/farms",
  detail: (id) => `/farms/${id}`,
  nearby: "/farms/nearby",
  listings: "/farms/listings",
  activities: "/activities",
};

const getUser = () => { try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch { return null; } };

export const farmService = {
  getFarms: () => farmAPI.listFarms().then(r => r.data || []),

  getFarm: (id) => farmAPI.getListing(id).then(r => r.data),

  getExperiences: () => farmAPI.listFarms().then(r => r.data || []),

  getNearbyFarms: () => farmAPI.listFarms().then(r => r.data || []),

  getListings: () => {
    const userId = getUser()?.userId;
    return farmAPI.getListings(userId).then(r => r.data || []);
  },

  getActivities: () => api.get('/activities').then(r => r.data || []),

  addActivity: (payload) => api.post('/activities', payload).then(r => r.data),

  createFarm: (payload) => {
    const userId = getUser()?.userId;
    return farmAPI.createListing(userId, payload).then(r => r.data);
  },
};

export default farmService;
