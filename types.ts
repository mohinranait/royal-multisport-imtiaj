
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BKASH = 'BKASH',
  BANK = 'BANK'
}

export enum BookingStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  notes: string;
  active: boolean;
  openingTime: string; // "HH:mm"
  closingTime: string; // "HH:mm"
  slotDuration: number; // in minutes
  basePrice: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
  createdAt: number;
}

export interface Booking {
  id: string;
  clientId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number;
  basePrice: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  cancellationReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  date: number;
  amount: number;
  method: PaymentMethod;
  reference: string;
  createdBy: string;
  isReversed: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  venueId: string;
  notes: string;
  bookingId?: string; // Optional link to a booking
}

export interface Invoice {
  id: string;
  bookingId: string;
  clientId: string;
  date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
}

export interface AppSettings {
  globalSlotDuration: number;
  globalBasePrice: number;
  weekendMultiplier: number;
  peakPricingHours: string[]; // ["18:00", "19:00", ...]
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  details: string;
}
