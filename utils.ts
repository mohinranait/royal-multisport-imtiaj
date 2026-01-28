
import { Venue, Booking } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0
  }).format(amount);
};

export const generateSlots = (venue: Venue, date: string, bookings: Booking[]) => {
  const slots = [];
  let currentTime = venue.openingTime;
  const closingTime = venue.closingTime;

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const endMins = timeToMinutes(closingTime);
  let currentMins = timeToMinutes(currentTime);

  while (currentMins + venue.slotDuration <= endMins) {
    const slotStart = minutesToTime(currentMins);
    const slotEnd = minutesToTime(currentMins + venue.slotDuration);
    
    const existingBooking = bookings.find(b => 
      b.venueId === venue.id && 
      b.date === date && 
      b.startTime === slotStart && 
      b.status === 'ACTIVE'
    );

    slots.push({
      start: slotStart,
      end: slotEnd,
      venueId: venue.id,
      date,
      booking: existingBooking || null
    });

    currentMins += venue.slotDuration;
  }

  return slots;
};

export const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const getTodayDate = () => new Date().toISOString().split('T')[0];
