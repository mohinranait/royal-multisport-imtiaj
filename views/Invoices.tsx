
import React, { useState } from 'react';
import { getDB } from '../db';
import { Card, Button, Badge, Modal } from '../components/Shared';
import { formatCurrency } from '../utils';
import { Booking, Client, Venue } from '../types';

interface InvoiceData {
  id: string;
  booking: Booking;
  client: Client | undefined;
  venue: Venue | undefined;
}

export const InvoicesView: React.FC = () => {
  const db = getDB();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  
  const invoices = db.bookings.map(b => {
    const client = db.clients.find(c => c.id === b.clientId);
    const venue = db.venues.find(v => v.id === b.venueId);
    return {
      id: `INV-${b.id.split('-').pop()}`,
      booking: b,
      client,
      venue
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleQuickPrint = (inv: InvoiceData) => {
    setSelectedInvoice(inv);
    // Tiny delay to allow the modal/content to render before opening print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-indigo-600 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] text-indigo-100 font-black uppercase tracking-widest mb-1">Total Receivables</p>
            <h4 className="text-3xl font-black">
              {formatCurrency(db.bookings.reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0))}
            </h4>
            <p className="text-[10px] mt-2 opacity-70 italic">Outstanding balances across all clients</p>
          </div>
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">📄</div>
        </Card>
      </div>

      <Card className="overflow-hidden border-indigo-50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Scheduled Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="text-sm hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{inv.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{inv.client?.name || 'Walk-in'}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{inv.client?.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{inv.booking.date}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(inv.booking.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <Badge color={inv.booking.paymentStatus === 'PAID' ? 'green' : inv.booking.paymentStatus === 'PARTIAL' ? 'yellow' : 'red'}>
                      {inv.booking.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="secondary" 
                        className="!py-1.5 !px-3 text-[10px] font-black uppercase tracking-widest" 
                        onClick={() => setSelectedInvoice(inv)}
                        title="Preview"
                      >
                        👁️ View
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="!py-1.5 !px-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 border-slate-200" 
                        onClick={() => handleQuickPrint(inv)}
                        title="Print PDF"
                      >
                        🖨️ Print
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Modal */}
      <Modal 
        isOpen={!!selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
        title="Official Document Viewer"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div id="printable-invoice" className="p-8 bg-white border border-slate-100 rounded-xl shadow-inner print:p-0 print:border-0 print:shadow-none print:m-0">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">ROYAL MULTISPORT</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management Portal</p>
                  <div className="mt-4 text-xs text-slate-500 space-y-0.5">
                    <p>Dhaka, Bangladesh</p>
                    <p>Contact: +880 1700-000000</p>
                    <p>royalmultisport.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900 mb-1">INVOICE</h2>
                  <p className="text-xs font-mono text-slate-400">{selectedInvoice.id}</p>
                  <p className="text-xs text-slate-500 mt-4">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill To:</h4>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">{selectedInvoice.client?.name || 'Walk-in Client'}</p>
                    <p className="text-slate-500">{selectedInvoice.client?.phone}</p>
                    <p className="text-slate-500 text-[11px] mt-1">{selectedInvoice.client?.address || 'No Address Provided'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Status:</h4>
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                    {selectedInvoice.booking.paymentStatus}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-900/10">
                    <tr>
                      <th className="py-2 font-bold text-slate-400 uppercase text-[10px]">Description</th>
                      <th className="py-2 text-right font-bold text-slate-400 uppercase text-[10px]">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-4">
                        <p className="font-bold text-slate-900">{selectedInvoice.venue?.name}</p>
                        <p className="text-xs text-slate-400">{selectedInvoice.booking.date} • {selectedInvoice.booking.startTime} - {selectedInvoice.booking.endTime}</p>
                      </td>
                      <td className="py-4 text-right font-medium text-slate-900">
                        {formatCurrency(selectedInvoice.booking.basePrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculations */}
              <div className="flex justify-end border-t border-slate-100 pt-6">
                <div className="w-full max-w-[200px] space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.booking.basePrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-orange-500 font-bold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedInvoice.booking.discount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(selectedInvoice.booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-600 font-bold pt-1">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(selectedInvoice.booking.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-indigo-600 bg-indigo-50 p-2 rounded-lg mt-2">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(selectedInvoice.booking.totalAmount - selectedInvoice.booking.amountPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-slate-50 text-center">
                <p className="text-[10px] text-slate-400 italic">Thank you for choosing Royal Multisport Management.</p>
                <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-widest font-black">Computer Generated Invoice • Signature Not Required</p>
              </div>
            </div>

            <div className="flex gap-4 print:hidden">
              <Button className="flex-1 !py-3 font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg" onClick={handlePrint}>
                <span>🖨️</span> Print / Save as PDF
              </Button>
              <Button variant="secondary" className="flex-1 !py-3" onClick={() => setSelectedInvoice(null)}>
                Close Preview
              </Button>
            </div>
            
            <style>{`
              @media print {
                /* Hide everything by default */
                body * {
                  visibility: hidden;
                  overflow: visible !important;
                }
                
                /* Show the invoice specifically */
                #printable-invoice, #printable-invoice * {
                  visibility: visible;
                }

                /* Reset fixed layout constraints that break printing */
                html, body, #root, main, .flex-1, .overflow-y-auto {
                  height: auto !important;
                  overflow: visible !important;
                  position: static !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }

                /* Position the invoice at the very top of the print canvas */
                #printable-invoice {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  max-width: 100%;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 40px !important;
                }

                /* Hide standard UI elements that might ghost through */
                header, aside, button, .print\\:hidden {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        )}
      </Modal>
    </div>
  );
};
