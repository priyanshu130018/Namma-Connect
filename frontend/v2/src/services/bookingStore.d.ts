export interface BookingRecord {
  id: string;
  item: string;
  type: string;
  guest: string;
  host: string;
  location: string;
  image: string | null;
  date: string;
  nights: number;
  dates: string;
  guests: number;
  amount: number;
  note: string;
  status: string; // pending | confirmed | completed | cancelled
  payment: string; // paid | unpaid | failed
  mine: boolean;
  [key: string]: unknown;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  date: string;
  method: string;
  amount: number;
  fee: number;
  status: string;
  [key: string]: unknown;
}

export interface NotificationRecord {
  id: string;
  category: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  audience: string; // all | tourist | farmer | creator | admin
  [key: string]: unknown;
}

export interface BookingState {
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  notifications: NotificationRecord[];
}

export declare const bookingStore: {
  subscribe(fn: () => void): () => void;
  getState(): BookingState;
  touristBookings(): BookingRecord[];
  farmerRequests(): BookingRecord[];
  findBooking(id: string): BookingRecord | undefined;
  allPayments(): PaymentRecord[];
  notificationsFor(role: string): NotificationRecord[];
  unreadCount(role: string): number;
  createBooking(
    payload: Partial<BookingRecord> & { item: string },
  ): Promise<{ ok: boolean; booking: BookingRecord }>;
  acceptBooking(id: string): Promise<{ ok: boolean; status?: string }>;
  rejectBooking(id: string): Promise<{ ok: boolean; status?: string }>;
  reopenBooking(id: string): Promise<{ ok: boolean; status?: string }>;
  cancelBooking(id: string): Promise<{ ok: boolean; status?: string }>;
  payBooking(id: string, method?: string): Promise<{ ok: boolean; payment?: PaymentRecord }>;
  markNotificationRead(id: string): void;
  markAllNotificationsRead(role: string): void;
};
