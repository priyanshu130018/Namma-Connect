import { bookingAPI, farmAPI } from "./api";
import api from "./api";

const getUser = () => { try { return JSON.parse(localStorage.getItem('nc_user') || 'null'); } catch { return null; } };

export const bookingEndpoints = {
  list: "/bookings",
  detail: (id) => `/bookings/${id}`,
  cancel: (id) => `/bookings/${id}/cancel`,
  requests: "/bookings/requests",
  accept: (id) => `/bookings/requests/${id}/accept`,
  reject: (id) => `/bookings/requests/${id}/reject`,
  pay: "/payments",
  payments: "/payments",
};

export const bookingService = {
  getBookings: async () => {
    const userId = getUser()?.userId;
    return bookingAPI.getUserBookings(userId).then(r => Array.isArray(r.data) ? r.data : (r.data || []));
  },

  getBooking: async (id) => {
    const userId = getUser()?.userId;
    return bookingAPI.getUserBookings(userId).then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data || []);
      return all.find(b => b.id === id) || null;
    });
  },

  createBooking: (payload) => {
    const userId = getUser()?.userId;
    return bookingAPI.create(userId, payload).then(r => r.data);
  },

  cancelBooking: (id) => bookingAPI.updateStatus(id, 'cancelled').then(r => ({ok: true, ...r.data})),

  getRequests: async () => {
    const userId = getUser()?.userId;
    return bookingAPI.getUserBookings(userId).then(r => r.data?.received || []);
  },

  acceptRequest: (id) => {
    const userId = getUser()?.userId;
    return bookingAPI.updateFarmerStatus(id, userId, {status: 'confirmed'}).then(r => ({ok: true, status: 'confirmed', ...r.data}));
  },

  rejectRequest: (id) => {
    const userId = getUser()?.userId;
    return bookingAPI.updateFarmerStatus(id, userId, {status: 'cancelled'}).then(r => ({ok: true, status: 'cancelled', ...r.data}));
  },

  reopenRequest: (id) => {
    const userId = getUser()?.userId;
    return bookingAPI.updateFarmerStatus(id, userId, {status: 'pending'}).then(r => ({ok: true, status: 'pending'}));
  },

  payBooking: (id, method) => api.post('/payments', {booking_id: id, method}).then(r => ({ok: true, payment: r.data})),

  getPayments: async () => {
    const userId = getUser()?.userId;
    return api.get('/payments/' + userId).then(r => r.data || []);
  },

  markNotificationRead: (id) => api.post('/notifications/' + id + '/read').then(() => ({ok:true})),

  markAllNotificationsRead: (role) => api.post('/notifications/read-all').then(() => ({ok:true})),
};

export default bookingService;
