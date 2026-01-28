
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Venue } from '../types';
import { Card, Button, Modal, Badge } from '../components/Shared';
import { generateId, formatCurrency } from '../utils';

export const VenuesView: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  
  const [formData, setFormData] = useState<Partial<Venue>>({
    name: '', 
    address: '', 
    notes: '', 
    active: true, 
    openingTime: '08:00', 
    closingTime: '22:00', 
    slotDuration: 90, 
    basePrice: 2000
  });

  const handleSave = () => {
    if (!formData.name) {
      alert("Venue name is required");
      return;
    }
    
    let updatedVenues;
    if (editingVenue) {
      updatedVenues = db.venues.map(v => v.id === editingVenue.id ? { ...editingVenue, ...formData } as Venue : v);
    } else {
      const newVenue: Venue = { id: generateId('V'), ...formData } as Venue;
      updatedVenues = [...db.venues, newVenue];
    }

    const updatedDB = { ...db, venues: updatedVenues };
    setDb(updatedDB);
    saveDB(updatedDB);
    logAction(editingVenue ? 'EDIT_VENUE' : 'ADD_VENUE', `Venue ${formData.name} was ${editingVenue ? 'updated' : 'created'}.`);
    setIsModalOpen(false);
    setEditingVenue(null);
  };

  const toggleStatus = (venue: Venue) => {
    const updatedDB = {
      ...db,
      venues: db.venues.map(v => v.id === venue.id ? { ...v, active: !v.active } : v)
    };
    setDb(updatedDB);
    saveDB(updatedDB);
    logAction('TOGGLE_VENUE_STATUS', `Venue ${venue.name} status changed to ${!venue.active ? 'Active' : 'Inactive'}`);
  };

  const openAddModal = () => {
    setEditingVenue(null);
    setFormData({ 
      name: '', 
      address: '', 
      notes: '', 
      openingTime: '08:00', 
      closingTime: '22:00', 
      slotDuration: 90, 
      basePrice: 2000, 
      active: true 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData(venue);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Managed Venues</h3>
          <p className="text-sm text-gray-500 mt-1">Configure your playing surfaces, operating hours, and pricing.</p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <span className="text-lg">+</span> Add New Venue
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {db.venues.map(venue => (
          <Card key={venue.id} className="group hover:shadow-md transition-all border-t-4 border-t-[#24C002]">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 group-hover:text-[#24C002] transition-colors">{venue.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                    <span className="text-xs">📍</span>
                    <p className="text-xs truncate max-w-[200px]">{venue.address || 'No address set'}</p>
                  </div>
                </div>
                <Badge color={venue.active ? 'green' : 'slate'}>{venue.active ? 'Active' : 'Inactive'}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 py-4 border-y border-gray-50 my-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Operating Hours</p>
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700 text-sm">
                    <span>🕒</span>
                    {venue.openingTime} - {venue.closingTime}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Slot Duration</p>
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700 text-sm">
                    <span>⏱️</span>
                    {venue.slotDuration} Minutes
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Base Price</p>
                  <div className="flex items-center gap-1.5 font-bold text-[#24C002] text-sm">
                    <span>💰</span>
                    {formatCurrency(venue.basePrice)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Venue ID</p>
                  <div className="flex items-center gap-1.5 font-mono text-gray-400 text-[10px]">
                    {venue.id}
                  </div>
                </div>
              </div>

              {venue.notes && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Internal Notes</p>
                  <p className="text-xs text-gray-600 italic line-clamp-2">"{venue.notes}"</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 !py-2 text-xs font-bold" 
                  onClick={() => openEditModal(venue)}
                >
                  Edit Configuration
                </Button>
                <Button 
                  variant="secondary" 
                  className={`flex-1 !py-2 text-xs font-bold ${venue.active ? 'hover:text-red-600 hover:border-red-200' : 'hover:text-green-600 hover:border-green-200'}`} 
                  onClick={() => toggleStatus(venue)}
                >
                  {venue.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVenue ? 'Edit Venue Configuration' : 'Register New Venue'}
      >
        <div className="space-y-5">
          <section className="space-y-4">
            <h5 className="text-xs font-black text-[#24C002] uppercase tracking-tighter border-b pb-1">Basic Information</h5>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Venue Name</label>
              <input 
                type="text" 
                placeholder="e.g. Center Court Alpha"
                className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Physical Address</label>
              <input 
                type="text" 
                placeholder="Street address, City"
                className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>
          </section>

          <section className="space-y-4">
            <h5 className="text-xs font-black text-[#24C002] uppercase tracking-tighter border-b pb-1">Scheduling & Pricing</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opening Time</label>
                <input 
                  type="time" 
                  className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  value={formData.openingTime} 
                  onChange={e => setFormData({...formData, openingTime: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Closing Time</label>
                <input 
                  type="time" 
                  className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  value={formData.closingTime} 
                  onChange={e => setFormData({...formData, closingTime: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slot Duration (Mins)</label>
                <input 
                  type="number" 
                  step="15"
                  placeholder="90"
                  className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                  value={formData.slotDuration} 
                  onChange={e => setFormData({...formData, slotDuration: Number(e.target.value)})} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Price (BDT)</label>
                <input 
                  type="number" 
                  placeholder="2000"
                  className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-[#24C002]" 
                  value={formData.basePrice} 
                  onChange={e => setFormData({...formData, basePrice: Number(e.target.value)})} 
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h5 className="text-xs font-black text-[#24C002] uppercase tracking-tighter border-b pb-1">Additional Details</h5>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes / Instructions</label>
              <textarea 
                rows={3}
                placeholder="Special instructions for staff or maintenance..."
                className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
              />
            </div>
          </section>

          <div className="pt-4 flex gap-4">
            <Button className="flex-1 !py-3 font-bold shadow-lg" onClick={handleSave}>
              {editingVenue ? 'Update Venue' : 'Create Venue'}
            </Button>
            <Button variant="secondary" className="flex-1 !py-3" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
