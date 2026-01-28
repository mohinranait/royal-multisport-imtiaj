
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { TransactionType, PaymentMethod, Transaction, PaymentStatus } from '../types';
import { Card, Button, Badge, Modal } from '../components/Shared';
import { formatCurrency, generateId, getTodayDate } from '../utils';

export const TransactionsView: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Editing state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Deletion state
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Manual Transaction Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: getTodayDate(),
    type: TransactionType.EXPENSE,
    category: '',
    amount: 0,
    paymentMethod: PaymentMethod.CASH,
    venueId: db.venues[0]?.id || '',
    notes: ''
  });

  const filtered = db.transactions.filter(tx => {
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = 
      tx.category.toLowerCase().includes(lowerSearch) || 
      tx.notes.toLowerCase().includes(lowerSearch) ||
      tx.id.toLowerCase().includes(lowerSearch);
    return matchesType && matchesSearch;
  });

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setFormData({
      date: getTodayDate(),
      type: TransactionType.EXPENSE,
      category: '',
      amount: 0,
      paymentMethod: PaymentMethod.CASH,
      venueId: db.venues[0]?.id || '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({ ...tx });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!formData.category || (formData.amount || 0) <= 0 || !formData.venueId) {
      alert('Please fill in all required fields (Category, Amount > 0, and Venue).');
      return;
    }

    let updatedBookings = [...db.bookings];
    let updatedPayments = [...db.payments];
    let updatedTransactions = [...db.transactions];

    if (editingTransaction) {
      // Handle Edit Logic
      const txIndex = updatedTransactions.findIndex(t => t.id === editingTransaction.id);
      
      // If amount changed and it's linked to a booking, we must adjust the booking
      if (editingTransaction.bookingId && formData.amount !== editingTransaction.amount) {
        const bookingIndex = updatedBookings.findIndex(b => b.id === editingTransaction.bookingId);
        if (bookingIndex !== -1) {
          const booking = updatedBookings[bookingIndex];
          const diff = (formData.amount || 0) - editingTransaction.amount;
          const newAmountPaid = Math.max(0, booking.amountPaid + diff);
          
          let newPaymentStatus = PaymentStatus.UNPAID;
          if (newAmountPaid > 0 && newAmountPaid < booking.totalAmount) {
            newPaymentStatus = PaymentStatus.PARTIAL;
          } else if (newAmountPaid >= booking.totalAmount) {
            newPaymentStatus = PaymentStatus.PAID;
          }

          updatedBookings[bookingIndex] = {
            ...booking,
            amountPaid: newAmountPaid,
            paymentStatus: newPaymentStatus,
            updatedAt: Date.now()
          };

          // Update corresponding payment record amount if it exists
          const paymentIndex = updatedPayments.findIndex(p => 
            p.bookingId === editingTransaction.bookingId && 
            p.amount === editingTransaction.amount && 
            !p.isReversed
          );
          if (paymentIndex !== -1) {
            updatedPayments[paymentIndex] = {
              ...updatedPayments[paymentIndex],
              amount: formData.amount || 0
            };
          }
        }
      }

      updatedTransactions[txIndex] = {
        ...editingTransaction,
        ...(formData as Transaction),
        id: editingTransaction.id // ensure ID persists
      };

      logAction('EDIT_TRANSACTION', `Updated transaction ${editingTransaction.id}: ${formData.category}`);
    } else {
      // Handle Create Logic
      const newTx: Transaction = {
        id: generateId('TX'),
        date: formData.date || getTodayDate(),
        type: formData.type || TransactionType.EXPENSE,
        category: formData.category!,
        amount: formData.amount || 0,
        paymentMethod: formData.paymentMethod || PaymentMethod.CASH,
        venueId: formData.venueId!,
        notes: formData.notes || '',
      };
      updatedTransactions = [newTx, ...updatedTransactions];
      logAction('MANUAL_TRANSACTION', `Created ${newTx.type} entry: ${newTx.category} of ${newTx.amount}`);
    }

    const updatedDB = {
      ...db,
      transactions: updatedTransactions,
      bookings: updatedBookings,
      payments: updatedPayments
    };

    setDb(updatedDB);
    saveDB(updatedDB);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingTransaction || !deleteReason.trim()) {
      alert('Please provide a reason for deletion.');
      return;
    }

    const txId = deletingTransaction.id;
    let updatedBookings = [...db.bookings];
    let updatedPayments = [...db.payments];

    if (deletingTransaction.bookingId) {
      const bookingIndex = updatedBookings.findIndex(b => b.id === deletingTransaction.bookingId);
      if (bookingIndex !== -1) {
        const booking = updatedBookings[bookingIndex];
        const newAmountPaid = Math.max(0, booking.amountPaid - deletingTransaction.amount);
        
        let newPaymentStatus = PaymentStatus.UNPAID;
        if (newAmountPaid > 0 && newAmountPaid < booking.totalAmount) {
          newPaymentStatus = PaymentStatus.PARTIAL;
        } else if (newAmountPaid >= booking.totalAmount) {
          newPaymentStatus = PaymentStatus.PAID;
        }

        updatedBookings[bookingIndex] = {
          ...booking,
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          updatedAt: Date.now()
        };

        const paymentIndex = updatedPayments.findIndex(p => 
          p.bookingId === deletingTransaction.bookingId && 
          p.amount === deletingTransaction.amount &&
          !p.isReversed
        );
        if (paymentIndex !== -1) {
          updatedPayments[paymentIndex] = { ...updatedPayments[paymentIndex], isReversed: true };
        }
      }
    }

    const updatedTransactions = db.transactions.filter(tx => tx.id !== txId);

    const updatedDB = {
      ...db,
      transactions: updatedTransactions,
      bookings: updatedBookings,
      payments: updatedPayments
    };

    setDb(updatedDB);
    saveDB(updatedDB);
    logAction('DELETE_TRANSACTION', `Deleted transaction ${txId}. Reason: ${deleteReason}`);
    setDeletingTransaction(null);
    setDeleteReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', TransactionType.INCOME, TransactionType.EXPENSE].map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filterType === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search category, notes, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button onClick={handleOpenCreate} className="whitespace-nowrap">+ New Entry</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4">
                    <Badge color={tx.type === TransactionType.INCOME ? 'green' : 'red'}>{tx.category}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {db.venues.find(v => v.id === tx.venueId)?.name || 'General'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 italic max-w-xs truncate" title={tx.notes}>
                    {tx.notes || '--'}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-sm whitespace-nowrap ${tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(tx)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                        title="Edit Transaction"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setDeletingTransaction(tx)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Delete Transaction"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No transactions found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Entry / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTransaction ? `Edit Transaction: ${editingTransaction.id}` : "New Transaction Entry"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input 
                type="date" 
                className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}
              >
                <option value={TransactionType.EXPENSE}>Expense</option>
                <option value={TransactionType.INCOME}>Income</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
            <input 
              type="text" 
              placeholder="e.g. Electricity, Maintenance, Rent"
              className="w-full border rounded-lg p-2 text-sm bg-gray-50"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (BDT)</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full border rounded-lg p-2 text-sm bg-gray-50 font-bold"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                value={formData.paymentMethod}
                onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
              >
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.BKASH}>Bkash</option>
                <option value={PaymentMethod.BANK}>Bank</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Venue</label>
            <select 
              className="w-full border rounded-lg p-2 text-sm bg-gray-50"
              value={formData.venueId}
              onChange={e => setFormData({...formData, venueId: e.target.value})}
            >
              {db.venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
            <textarea 
              rows={2}
              placeholder="Optional description (searchable)..."
              className="w-full border rounded-lg p-2 text-sm bg-gray-50"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button className="flex-1" onClick={handleSaveTransaction}>
              {editingTransaction ? 'Update Entry' : 'Record Transaction'}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deletingTransaction} 
        onClose={() => { setDeletingTransaction(null); setDeleteReason(''); }} 
        title="Confirm Transaction Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-800 font-medium">Warning: This action is permanent.</p>
            {deletingTransaction?.bookingId && (
              <p className="text-xs text-red-600 mt-1">
                Note: This transaction is linked to a booking. Deleting it will reduce the booking's paid amount and may change its payment status.
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Transaction ID:</span>
              <span className="font-mono text-xs">{deletingTransaction?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-bold text-gray-900">{formatCurrency(deletingTransaction?.amount || 0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reason for Deletion</label>
            <textarea 
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Explain why this transaction is being removed..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="danger" className="flex-1" onClick={handleConfirmDelete}>Confirm Delete</Button>
            <Button variant="secondary" className="flex-1" onClick={() => { setDeletingTransaction(null); setDeleteReason(''); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
