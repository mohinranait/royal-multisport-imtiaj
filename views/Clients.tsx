
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Client, Booking } from '../types';
import { Card, Button, Badge, Modal } from '../components/Shared';
import { formatCurrency, generateId } from '../utils';

export const ClientsView: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    active: true
  });

  const filteredClients = db.clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const getClientStats = (clientId: string) => {
    const bookings = db.bookings.filter(b => b.clientId === clientId && b.status === 'ACTIVE');
    const totalSpent = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalDue = bookings.reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0);
    return { count: bookings.length, totalSpent, totalDue, allBookings: bookings };
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '', address: '', active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ ...client });
    setIsModalOpen(true);
  };

  const handleSaveClient = () => {
    if (!formData.name || !formData.phone) {
      alert('Name and Phone are required fields.');
      return;
    }

    let updatedClients;
    if (editingClient) {
      updatedClients = db.clients.map(c => 
        c.id === editingClient.id ? { ...editingClient, ...formData } as Client : c
      );
      logAction('EDIT_CLIENT', `Updated profile for client ${editingClient.id}: ${formData.name}`);
    } else {
      const newClient: Client = {
        id: generateId('CL'),
        name: formData.name,
        phone: formData.phone,
        email: formData.email || '',
        address: formData.address || '',
        active: true,
        createdAt: Date.now()
      };
      updatedClients = [newClient, ...db.clients];
      logAction('ADD_CLIENT', `Manually registered new client: ${newClient.name} (${newClient.phone})`);
    }

    const updatedDB = { ...db, clients: updatedClients };
    setDb(updatedDB);
    saveDB(updatedDB);
    
    // Update selected client if we were viewing it
    if (selectedClient && selectedClient.id === editingClient?.id) {
      setSelectedClient({ ...selectedClient, ...formData } as Client);
    }

    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '', address: '', active: true });
    setIsModalOpen(false);
  };

  // Profile View Component
  const renderProfile = (client: Client) => {
    const stats = getClientStats(client.id);
    const history = db.bookings
      .filter(b => b.clientId === client.id)
      .sort((a, b) => b.createdAt - a.createdAt);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSelectedClient(null)}>
            ← Back to Registry
          </Button>
          <h3 className="text-xl font-bold text-gray-800">Client Profile</h3>
        </div>

        {/* Profile Header */}
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="w-24 h-24 bg-[#24C002] text-white rounded-3xl flex items-center justify-center font-bold text-4xl shadow-lg">
              {client.name.charAt(0)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-extrabold text-gray-900">{client.name}</h2>
                <Badge color={client.active ? 'green' : 'slate'}>{client.active ? 'Active Member' : 'Inactive'}</Badge>
              </div>
              <p className="text-gray-500 font-medium">Customer ID: <span className="font-mono text-[#24C002]">{client.id}</span></p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="opacity-70">📞</span> {client.phone}
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="opacity-70">✉️</span> {client.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="opacity-70">🗓️</span> Joined {new Date(client.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button onClick={() => handleOpenEdit(client)}>Edit Details</Button>
              <Button variant="secondary">Message Client</Button>
            </div>
          </div>
        </Card>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-b-4 border-b-indigo-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bookings</p>
            <h4 className="text-2xl font-black text-gray-900">{stats.count}</h4>
          </Card>
          <Card className="p-6 border-b-4 border-b-green-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue Generated</p>
            <h4 className="text-2xl font-black text-green-600">{formatCurrency(stats.totalSpent)}</h4>
          </Card>
          <Card className="p-6 border-b-4 border-b-red-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
            <h4 className="text-2xl font-black text-red-600">{formatCurrency(stats.totalDue)}</h4>
          </Card>
        </div>

        {/* Detailed Info & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Client Details</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Address</label>
                  <p className="text-sm text-gray-700 mt-1">{client.address || 'No address provided.'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Email</label>
                  <p className="text-sm text-gray-700 mt-1">{client.email || 'No email provided.'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Last Activity</label>
                  <p className="text-sm text-gray-700 mt-1">
                    {history[0] ? `${history[0].date} (${history[0].startTime})` : 'No past bookings.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-800">Booking History</h4>
                <Badge color="slate">{history.length} Records</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Venue</th>
                      <th className="px-6 py-3">Paid</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map(b => (
                      <tr key={b.id} className="text-sm hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{b.date}</div>
                          <div className="text-[10px] text-gray-400">{b.startTime} - {b.endTime}</div>
                        </td>
                        <td className="px-6 py-4">
                          {db.venues.find(v => v.id === b.venueId)?.name}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700">
                          {formatCurrency(b.amountPaid)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge color={b.status === 'CANCELLED' ? 'red' : b.paymentStatus === 'PAID' ? 'green' : 'yellow'}>
                            {b.status === 'CANCELLED' ? 'CANCELLED' : b.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                          No history found for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (selectedClient) {
    return renderProfile(selectedClient);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Clients Registry</h3>
          <p className="text-sm text-gray-500">Manage your customer database and financial history.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <Button onClick={handleOpenAdd} className="whitespace-nowrap">
            + Add Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredClients.length > 0 ? filteredClients.map(client => {
          const stats = getClientStats(client.id);
          return (
            <Card key={client.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{client.name}</h4>
                  <p className="text-xs text-gray-500">{client.phone} • {client.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 flex-1 max-w-xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bookings</p>
                  <p className="text-sm font-semibold">{stats.count}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Outstanding</p>
                  <p className="text-sm font-semibold text-red-600">{formatCurrency(stats.totalDue)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="!py-1 !px-4 text-xs"
                  onClick={() => setSelectedClient(client)}
                >
                  Profile
                </Button>
                <Button 
                  variant="secondary" 
                  className="!py-1 !px-4 text-xs"
                  onClick={() => handleOpenEdit(client)}
                >
                  Edit
                </Button>
              </div>
            </Card>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400">No clients found matching your search.</p>
          </div>
        )}
      </div>

      {/* Client Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingClient ? "Edit Client Profile" : "Register New Client"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Zayed Ahmed"
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number *</label>
            <input 
              type="text" 
              placeholder="e.g. 017XXXXXXXX"
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. zayed@example.com"
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
            <textarea 
              rows={2}
              placeholder="Client's location/address..."
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button className="flex-1" onClick={handleSaveClient}>
              {editingClient ? "Update Profile" : "Save Client Profile"}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
