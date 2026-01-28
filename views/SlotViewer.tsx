
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Booking, PaymentStatus, PaymentMethod, TransactionType, BookingStatus, Transaction, AuditLog } from '../types';
import { Card, Button, Badge, Modal } from '../components/Shared';
import { formatCurrency, generateId, getTodayDate } from '../utils';

export const SlotViewer: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [filterText, setFilterText] = useState('');
  
  // Modals state
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [additionalDiscount, setAdditionalDiscount] = useState(0);

  // Edit Form state
  const [editFormData, setEditFormData] = useState<Partial<Booking>>({});

  const filteredBookings = db.bookings
    .filter(b => {
      const client = db.clients.find(c => c.id === b.clientId);
      const searchTerm = filterText.toLowerCase();
      return b.id.toLowerCase().includes(searchTerm) || 
             client?.name.toLowerCase().includes(searchTerm) || 
             client?.phone.includes(searchTerm);
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleOpenPayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setPaymentAmount(Math.max(0, booking.totalAmount - booking.amountPaid));
    setPaymentDate(getTodayDate());
    setAdditionalDiscount(0);
    setPaymentRef('');
  };

  const handleAddPayment = () => {
    if (!selectedBookingForPayment) return;

    const newDiscount = selectedBookingForPayment.discount + additionalDiscount;
    const newTotalAmount = selectedBookingForPayment.basePrice - newDiscount;
    const newAmountPaid = selectedBookingForPayment.amountPaid + paymentAmount;
    
    let newStatus = PaymentStatus.PARTIAL;
    if (newAmountPaid >= newTotalAmount) {
      newStatus = PaymentStatus.PAID;
    } else if (newAmountPaid <= 0) {
      newStatus = PaymentStatus.UNPAID;
    }

    const updatedBooking: Booking = {
      ...selectedBookingForPayment,
      discount: newDiscount,
      totalAmount: newTotalAmount,
      amountPaid: newAmountPaid,
      paymentStatus: newStatus,
      updatedAt: Date.now()
    };

    const paymentId = generateId('PAY');
    const newPayment = {
      id: paymentId,
      bookingId: selectedBookingForPayment.id,
      date: new Date(paymentDate).getTime(),
      amount: paymentAmount,
      method: paymentMethod,
      reference: paymentRef,
      createdBy: db.currentUser.id,
      isReversed: false
    };

    const transaction = {
      id: generateId('TX'),
      date: paymentDate,
      type: TransactionType.INCOME,
      category: 'Booking Payment',
      amount: paymentAmount,
      paymentMethod,
      venueId: selectedBookingForPayment.venueId,
      notes: `Payment for ${selectedBookingForPayment.id}${paymentRef ? ' - ' + paymentRef : ''}${additionalDiscount > 0 ? ' (Includes addtl discount: ' + additionalDiscount + ')' : ''}`,
      bookingId: selectedBookingForPayment.id
    };

    setDb(prev => {
      const updated = {
        ...prev,
        bookings: prev.bookings.map(b => b.id === selectedBookingForPayment.id ? updatedBooking : b),
        payments: [...prev.payments, newPayment],
        transactions: [...prev.transactions, transaction]
      };
      saveDB(updated);
      return updated;
    });

    setSelectedBookingForPayment(null);
  };

  const handleDeleteBooking = (booking: Booking) => {
    const hasPayments = (booking.amountPaid || 0) > 0;
    const confirmMsg = hasPayments 
      ? `This booking has existing payments of ${formatCurrency(booking.amountPaid)}. Deleting it will create a balancing reversal transaction and remove all linked history. Continue?`
      : "Are you absolutely sure you want to delete this booking record? The slot will be permanently cleared.";

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
          notes: `System-generated reversal for deleted booking ${booking.id}.`,
          bookingId: booking.id
        };
        updatedTransactions = [reversalTx, ...updatedTransactions];
      }

      const log: AuditLog = {
        id: generateId('LOG'),
        timestamp: Date.now(),
        userId: prev.currentUser.id,
        action: 'DELETE_BOOKING_STRICT',
        details: `Permanently removed booking ${booking.id}. ${hasPayments ? 'Reversed ' + booking.amountPaid + ' BDT.' : 'No payments found.'}`
      };

      const updatedDB = {
        ...prev,
        bookings: updatedBookings,
        transactions: updatedTransactions,
        payments: updatedPayments,
        auditLogs: [log, ...prev.auditLogs]
      };

      saveDB(updatedDB);
      return updatedDB;
    });
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setEditFormData({ ...booking });
  };

  const handleSaveEdit = () => {
    if (!editingBooking || !editFormData.venueId || !editFormData.date || !editFormData.startTime) return;

    const hasConflict = db.bookings.some(b => 
      b.id !== editingBooking.id &&
      b.status === BookingStatus.ACTIVE &&
      b.venueId === editFormData.venueId &&
      b.date === editFormData.date &&
      b.startTime === editFormData.startTime
    );

    if (hasConflict) {
      alert("Conflict detected: This slot is already booked in the calendar!");
      return;
    }

    const base = editFormData.basePrice || 0;
    const disc = editFormData.discount || 0;
    const newTotal = base - disc;
    
    let newPayStatus = PaymentStatus.UNPAID;
    const paid = editingBooking.amountPaid;
    if (paid > 0 && paid < newTotal) newPayStatus = PaymentStatus.PARTIAL;
    else if (paid >= newTotal && newTotal > 0) newPayStatus = PaymentStatus.PAID;

    const updatedBooking: Booking = {
      ...editingBooking,
      ...editFormData,
      totalAmount: newTotal,
      paymentStatus: newPayStatus,
      updatedAt: Date.now()
    } as Booking;

    setDb(prev => {
      const updated = {
        ...prev,
        bookings: prev.bookings.map(b => b.id === editingBooking.id ? updatedBooking : b)
      };
      saveDB(updated);
      return updated;
    });

    setEditingBooking(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 flex flex-col md:flex-row gap-4 items-center bg-white border-indigo-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by ID, Client Name or Phone..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Badge color="slate">{filteredBookings.length} Total Bookings</Badge>
          <Badge color="green">{filteredBookings.filter(b => b.paymentStatus === 'PAID').length} Paid</Badge>
        </div>
      </Card>

      <Card className="overflow-hidden border-indigo-50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Ref ID</th>
                <th className="px-6 py-4">Client Information</th>
                <th className="px-6 py-4">Venue & Schedule</th>
                <th className="px-6 py-4 text-right">Accounting</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredBookings.map(b => {
                const client = db.clients.find(c => c.id === b.clientId);
                const venue = db.venues.find(v => v.id === b.venueId);
                const isCancelled = b.status === BookingStatus.CANCELLED;
                
                return (
                  <tr key={b.id} className={`${isCancelled ? 'opacity-50 grayscale bg-gray-50' : ''} hover:bg-indigo-50/30 transition-colors`}>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{b.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{client?.name || 'Walk-in'}</div>
                      <div className="text-[10px] font-semibold text-indigo-500">{client?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{venue?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{b.date} • {b.startTime}-{b.endTime}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-slate-900">{formatCurrency(b.totalAmount)}</div>
                      <div className={`text-[10px] font-bold ${b.amountPaid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        Rec: {formatCurrency(b.amountPaid)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={isCancelled ? 'red' : b.paymentStatus === PaymentStatus.PAID ? 'green' : b.paymentStatus === PaymentStatus.PARTIAL ? 'yellow' : 'slate'}>
                        {isCancelled ? 'CANCELLED' : b.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {!isCancelled && b.paymentStatus !== PaymentStatus.PAID && (
                          <Button variant="primary" className="!px-3 !py-1 text-[10px] font-black uppercase tracking-tighter" onClick={() => handleOpenPayment(b)}>Pay</Button>
                        )}
                        {!isCancelled && (
                          <Button variant="secondary" className="!px-3 !py-1 text-[10px] font-bold" onClick={() => openEditModal(b)}>Edit</Button>
                        )}
                        <Button 
                          variant="secondary" 
                          className="!px-3 !py-1 text-[10px] font-bold text-red-500 border-red-100 hover:bg-red-50" 
                          onClick={() => handleDeleteBooking(b)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 italic">
                    <div className="text-3xl mb-2 opacity-20">📂</div>
                    <p>No matches found in history.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Modal */}
      <Modal isOpen={!!selectedBookingForPayment} onClose={() => setSelectedBookingForPayment(null)} title="Transaction Recording">
        <div className="space-y-5">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-inner">
            <div className="flex justify-between items-center opacity-70 text-xs uppercase tracking-widest mb-1">
              <span>Outstanding Balance</span>
              <span>Ref: {selectedBookingForPayment?.id}</span>
            </div>
            <div className="text-3xl font-black text-indigo-400">
              {formatCurrency((selectedBookingForPayment?.totalAmount || 0) - (selectedBookingForPayment?.amountPaid || 0) - additionalDiscount)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Payment Date</label>
              <input 
                type="date" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Adjust Discount</label>
              <input 
                type="number" 
                value={additionalDiscount}
                onChange={(e) => setAdditionalDiscount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Amount to Collect</label>
            <input 
              type="number" 
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full bg-indigo-50 border-2 border-indigo-200 text-indigo-900 rounded-xl p-4 text-xl font-black focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[PaymentMethod.CASH, PaymentMethod.BKASH, PaymentMethod.BANK].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-3 px-1 text-xs font-black rounded-xl border-2 transition-all uppercase tracking-tighter ${paymentMethod === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Reference (TXN ID)</label>
            <input 
              type="text" 
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 99XJ-112"
            />
          </div>

          <Button className="w-full mt-4 !py-4 font-black uppercase tracking-widest shadow-xl" onClick={handleAddPayment}>Process Transaction</Button>
        </div>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal isOpen={!!editingBooking} onClose={() => setEditingBooking(null)} title="Modify Booking Parameters">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Venue Assignment</label>
              <select 
                value={editFormData.venueId}
                onChange={e => setEditFormData({...editFormData, venueId: e.target.value})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {db.venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Scheduled Date</label>
              <input 
                type="date"
                value={editFormData.date}
                onChange={e => setEditFormData({...editFormData, date: e.target.value})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Slot Start</label>
              <input 
                type="time"
                value={editFormData.startTime}
                onChange={e => setEditFormData({...editFormData, startTime: e.target.value})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Slot End</label>
              <input 
                type="time"
                value={editFormData.endTime}
                onChange={e => setEditFormData({...editFormData, endTime: e.target.value})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Base Price</label>
              <input 
                type="number"
                value={editFormData.basePrice}
                onChange={e => setEditFormData({...editFormData, basePrice: Number(e.target.value)})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Discount Apply</label>
              <input 
                type="number"
                value={editFormData.discount}
                onChange={e => setEditFormData({...editFormData, discount: Number(e.target.value)})}
                className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-900 rounded-2xl mt-4 border border-slate-800 shadow-2xl text-white">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Adjusted Total</span>
              <span className="text-2xl font-black">
                {formatCurrency((editFormData.basePrice || 0) - (editFormData.discount || 0))}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500">Already Received:</span>
              <span className="text-sm font-bold text-green-400">{formatCurrency(editingBooking?.amountPaid || 0)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button className="flex-1 !py-4 font-black uppercase tracking-widest shadow-lg" onClick={handleSaveEdit}>Commit Changes</Button>
            <Button variant="secondary" className="flex-1 !py-4 font-bold" onClick={() => setEditingBooking(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
