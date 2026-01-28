
import React from 'react';
import { getDB } from '../db';
import { Card, Badge } from '../components/Shared';
import { formatCurrency, getTodayDate } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const Dashboard: React.FC<{ onTabChange: (id: string) => void }> = ({ onTabChange }) => {
  const db = getDB();
  const today = getTodayDate();
  
  const todayBookings = db.bookings.filter(b => b.date === today && b.status === 'ACTIVE');
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const unpaidTotal = db.bookings.reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0);
  
  const paymentSplit = db.payments.reduce((acc, p) => {
    if (!p.isReversed) {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(paymentSplit).map(([name, value]) => ({ name, value }));
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

  const upcomingBookings = db.bookings
    .filter(b => b.date >= today && b.status === 'ACTIVE')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-500">Today's Bookings</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{todayBookings.length}</h3>
            <Badge color="blue">Live</Badge>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(todayRevenue)}</h3>
            <Badge color="green">+12%</Badge>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-500">Unpaid Total</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(unpaidTotal)}</h3>
            <Badge color="red">Pending</Badge>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-500">Total Clients</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{db.clients.length}</h3>
            <Badge color="slate">Total</Badge>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-6">Payment Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-6">Venue Popularity</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={db.venues.map(v => ({ name: v.name, bookings: db.bookings.filter(b => b.venueId === v.id).length }))}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => onTabChange('calendar')} className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <span className="text-2xl mb-2">📅</span>
            <span className="text-sm font-medium">New Booking</span>
          </button>
          <button onClick={() => onTabChange('clients')} className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <span className="text-2xl mb-2">👤</span>
            <span className="text-sm font-medium">Add Client</span>
          </button>
          <button onClick={() => onTabChange('transactions')} className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <span className="text-2xl mb-2">💳</span>
            <span className="text-sm font-medium">New Transaction</span>
          </button>
          <button onClick={() => onTabChange('data-import')} className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <span className="text-2xl mb-2">📤</span>
            <span className="text-sm font-medium">Import Data</span>
          </button>
        </div>
      </Card>

      {/* Upcoming Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">Recent & Upcoming Bookings</h4>
          <button onClick={() => onTabChange('calendar')} className="text-sm text-[#24C002] font-medium hover:underline">View Calendar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Booking ID</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Venue</th>
                <th className="px-6 py-3">Date/Time</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-xs text-gray-600">{b.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {db.clients.find(c => c.id === b.clientId)?.name || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {db.venues.find(v => v.id === b.venueId)?.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{b.date}</div>
                    <div className="text-xs text-gray-400">{b.startTime} - {b.endTime}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(b.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <Badge color={b.paymentStatus === 'PAID' ? 'green' : b.paymentStatus === 'PARTIAL' ? 'yellow' : 'red'}>
                      {b.paymentStatus}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No upcoming bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
