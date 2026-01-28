
import { Venue, Client, Booking, Payment, Transaction, Invoice, AppSettings, AuditLog, UserRole, PaymentStatus, BookingStatus, TransactionType, PaymentMethod } from './types';

const STORAGE_KEY = 'ROYAL_MULTISPORT_DB';

interface DB {
  venues: Venue[];
  clients: Client[];
  bookings: Booking[];
  payments: Payment[];
  transactions: Transaction[];
  invoices: Invoice[];
  settings: AppSettings;
  auditLogs: AuditLog[];
  currentUser: { id: string; name: string; role: UserRole };
}

const DEFAULT_DB: DB = {
  venues: [
    { id: 'V1', name: 'Main Cricket Turf', address: 'Dhaka, Bangladesh', notes: 'Best for 6v6', active: true, openingTime: '08:00', closingTime: '23:00', slotDuration: 90, basePrice: 2000 },
    { id: 'V2', name: 'Football Arena', address: 'Uttara, Sector 4', notes: 'Synthetic grass', active: true, openingTime: '06:00', closingTime: '22:00', slotDuration: 60, basePrice: 1500 }
  ],
  clients: [
    { id: 'CL-000001', name: 'Zayed Ahmed', phone: '01700000001', email: 'zayed@example.com', address: 'Banani', active: true, createdAt: Date.now() },
    { id: 'CL-000002', name: 'Rohan Kabir', phone: '01800000002', email: 'rohan@example.com', address: 'Gulshan', active: true, createdAt: Date.now() }
  ],
  bookings: [],
  payments: [],
  transactions: [],
  invoices: [],
  settings: {
    globalSlotDuration: 90,
    globalBasePrice: 2000,
    weekendMultiplier: 1.2,
    peakPricingHours: ['18:00', '19:30', '21:00']
  },
  auditLogs: [],
  currentUser: { id: 'admin-1', name: 'System Admin', role: UserRole.ADMIN }
};

export const getDB = (): DB => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : DEFAULT_DB;
};

export const saveDB = (db: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const logAction = (action: string, details: string) => {
  const db = getDB();
  const log: AuditLog = {
    id: `LOG-${Date.now()}`,
    timestamp: Date.now(),
    userId: db.currentUser.id,
    action,
    details
  };
  db.auditLogs.unshift(log);
  saveDB(db);
};
