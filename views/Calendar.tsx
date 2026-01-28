
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Venue, Booking, BookingStatus, PaymentStatus, Client, Transaction, TransactionType, PaymentMethod, AuditLog } from '../types';
import { Card, Button, Modal, Badge } from '../components/Shared';
import { generateSlots, formatCurrency, getTodayDate, generateId } from '../utils';

export const CalendarView: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [selectedVenue, setSelectedVenue] = useState(db.venues[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Booking Form State
  const [bookingClient, setBookingClient] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });

  const currentVenue = db.venues.find(v => v.id === selectedVenue);
  const slots = currentVenue ? generateSlots(currentVenue, selectedDate, db.bookings) : [];

  const handleBooking = () => {
    if (!bookingClient || !selectedSlot || !currentVenue) return;

    const bookingId = generateId('BK-' + selectedDate.replace(/-/g, ''));
    const newBooking: Booking = {
      id: bookingId,
      clientId: bookingClient,
      venueId: currentVenue.id,
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      duration: currentVenue.slotDuration,
      basePrice: currentVenue.basePrice,
      discount: discount,
      totalAmount: currentVenue.basePrice - discount,
      amountPaid: 0,
      paymentStatus: PaymentStatus.UNPAID,
      status: BookingStatus.ACTIVE,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setDb(prev => {
      const updated = { ...prev, bookings: [...prev.bookings, newBooking] };
      saveDB(updated);
      return updated;
    });
    
    logAction('CREATE_BOOKING', `Created booking ${bookingId} for venue ${currentVenue.name}`);
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteBooking = (booking: Booking) => {
    const hasPayments = (booking.amountPaid || 0) > 0;
    const confirmMsg = hasPayments 
      ? `This booking has payments of ${formatCurrency(booking.amountPaid)}. Deleting it will create a reversal expense and clear all records. Proceed?`
      : "Are you sure you want to permanently delete this booking and clear this slot?";

    if (!window.confirm(confirmMsg)) return;

    setDb(prev => {
      const updatedBookings = prev.bookings.filter(b => b.id !== booking.id);
      const updatedPayments = prev.payments.filter(p => p.bookingId !== booking.id);
      let updatedTransactions = [...prev.transactions];

      if (hasPayments) {
        const reversalTx: Transaction = {
          id: generateId('TX'),
          date: getTodayDate(),
          type: TransactionType.EXPENSE,
          category: 'Booking Deletion Reversal',
          amount: booking.amountPaid,
          paymentMethod: PaymentMethod.CASH,
          venueId: booking.venueId,
          notes: `Auto-reversal for deleted booking ${booking.id}.`,
          bookingId: booking.id
        };
        updatedTransactions = [reversalTx, ...updatedTransactions];
      }

      const log: AuditLog = {
        id: generateId('LOG'),
        timestamp: Date.now(),
        userId: prev.currentUser.id,
        action: 'DELETE_BOOKING_CALENDAR',
        details: `Deleted booking ${booking.id} from calendar view.`
      };

      const newState = {
        ...prev,
        bookings: updatedBookings,
        payments: updatedPayments,
        transactions: updatedTransactions,
        auditLogs: [log, ...prev.auditLogs]
      };

      saveDB(newState);
      return newState;
    });

    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  const handleAddQuickClient = () => {
    if (!newClient.name || !newClient.phone) return;
    const clientId = generateId('CL');
    const client: Client = {
      id: clientId,
      ...newClient,
      email: '',
      address: '',
      active: true,
      createdAt: Date.now()
    };
    
    setDb(prev => {
      const updated = { ...prev, clients: [...prev.clients, client] };
      saveDB(updated);
      return updated;
    });

    setBookingClient(clientId);
    setIsQuickClientOpen(false);
    setNewClient({ name: '', phone: '' });
  };

  const resetForm = () => {
    setBookingClient('');
    setDiscount(0);
    setSelectedSlot(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Venue</label>
            <select 
              value={selectedVenue} 
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {db.venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <Badge color="green">Available</Badge>
          <Badge color="slate">Booked</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedSlot(slot);
              setIsModalOpen(true);
            }}
            className={`
              p-6 rounded-2xl border-2 text-left transition-all relative group
              ${slot.booking 
                ? 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-400 hover:shadow-md' 
                : 'bg-white border-white hover:border-indigo-500 hover:shadow-lg active:scale-95 shadow-sm'
              }
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`text-xs font-bold uppercase tracking-wider ${slot.booking ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {slot.start} - {slot.end}
              </span>
              <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {slot.booking ? '⚙️' : '＋'}
              </span>
            </div>

            {slot.booking ? (
              <div>
                <p className="text-sm font-bold text-slate-800 line-clamp-1">
                  {db.clients.find(c => c.id === slot.booking.clientId)?.name || 'Anonymous'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge color={slot.booking.paymentStatus === 'PAID' ? 'green' : 'red'}>
                    {slot.booking.paymentStatus}
                  </Badge>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(currentVenue?.basePrice || 0)}</p>
                <p className="text-xs text-gray-400 mt-1">Available</p>
              </div>
            )}
          </button>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedSlot?.booking ? 'Manage Booking' : `New Booking: ${selectedSlot?.start} - ${selectedSlot?.end}`}
      >
        {selectedSlot?.booking ? (
          <div className="space-y-6">
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-black">{db.clients.find(c => c.id === selectedSlot.booking.clientId)?.name || 'Anonymous'}</h4>
                  <p className="text-xs text-indigo-400 font-mono mt-0.5">{selectedSlot.booking.id}</p>
                </div>
                <Badge color={selectedSlot.booking.paymentStatus === 'PAID' ? 'green' : 'red'}>
                  {selectedSlot.booking.paymentStatus}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="opacity-70 uppercase tracking-widest font-bold">Slot Time</div>
                <div className="text-right font-bold">{selectedSlot.start} - {selectedSlot.end}</div>
                <div className="opacity-70 uppercase tracking-widest font-bold">Total Amount</div>
                <div className="text-right font-bold">{formatCurrency(selectedSlot.booking.totalAmount)}</div>
                <div className="opacity-70 uppercase tracking-widest font-bold">Received</div>
                <div className="text-right font-bold text-green-400">{formatCurrency(selectedSlot.booking.amountPaid)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center italic">
                Booking Management Actions
              </p>
              <Button 
                variant="danger" 
                className="w-full !py-4 font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                onClick={() => handleDeleteBooking(selectedSlot.booking)}
              >
                <span>🗑️</span> Delete / Clear Slot
              </Button>
              <Button 
                variant="secondary" 
                className="w-full !py-3 font-bold"
                onClick={() => setIsModalOpen(false)}
              >
                Close View
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-gray-700">Select Client</label>
                <button 
                  onClick={() => setIsQuickClientOpen(true)}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  + New Client
                </button>
              </div>
              <select 
                value={bookingClient} 
                onChange={(e) => setBookingClient(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select a client...</option>
                {db.clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Base Price</label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-500">
                  {formatCurrency(currentVenue?.basePrice || 0)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Discount</label>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-indigo-700 font-medium">Total Amount Due</span>
                <span className="text-xl font-bold text-indigo-900">
                  {formatCurrency((currentVenue?.basePrice || 0) - discount)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button className="flex-1 !py-3 font-bold shadow-lg" onClick={handleBooking}>Confirm Booking</Button>
              <Button variant="secondary" className="flex-1 !py-3" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Client Modal */}
      <Modal isOpen={isQuickClientOpen} onClose={() => setIsQuickClientOpen(false)} title="Quick Add Client">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={newClient.name}
              onChange={(e) => setNewClient({...newClient, name: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <input 
              type="text" 
              value={newClient.phone}
              onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 017..."
            />
          </div>
          <Button className="w-full !py-3 font-bold" onClick={handleAddQuickClient}>Create & Select Client</Button>
        </div>
      </Modal>
    </div>
  );
};
