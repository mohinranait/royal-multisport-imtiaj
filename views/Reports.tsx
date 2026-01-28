
import React, { useState, useMemo } from 'react';
import { getDB } from '../db';
import { Card, Badge } from '../components/Shared';
import { formatCurrency, getTodayDate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TransactionType, BookingStatus } from '../types';

export const ReportsView: React.FC = () => {
  const db = getDB();
  
  // Default range: Start of current month to today
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(getTodayDate());

  const filteredData = useMemo(() => {
    const start = startDate;
    const end = endDate;

    const txs = db.transactions.filter(t => t.date >= start && t.date <= end);
    const bookings = db.bookings.filter(b => b.date >= start && b.date <= end && b.status === BookingStatus.ACTIVE);
    
    // Financials
    const income = txs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expenses = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expenses;

    // Operational Stats
    const totalBookings = bookings.length;
    const avgSlotCost = totalBookings > 0 ? income / totalBookings : 0;

    // Utilization Logic
    // Total possible slots per day = sum of (closing - opening) / duration for each venue
    const calculateDailyCapacity = () => {
      return db.venues.reduce((acc, v) => {
        const [oh, om] = v.openingTime.split(':').map(Number);
        const [ch, cm] = v.closingTime.split(':').map(Number);
        const totalMinutes = (ch * 60 + cm) - (oh * 60 + om);
        return acc + Math.floor(totalMinutes / v.slotDuration);
      }, 0);
    };

    const daysCount = Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1);
    const totalPossibleSlots = calculateDailyCapacity() * daysCount;
    const bookingPercentage = totalPossibleSlots > 0 ? (totalBookings / totalPossibleSlots) * 100 : 0;

    // Chart Data
    const venueStats = db.venues.map(v => {
      const vBookings = bookings.filter(b => b.venueId === v.id);
      const vRevenue = vBookings.reduce((sum, b) => sum + b.amountPaid, 0);
      return { name: v.name, revenue: vRevenue, count: vBookings.length };
    });

    const paymentStats = Object.entries(txs.filter(t => t.type === TransactionType.INCOME).reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    return {
      income,
      expenses,
      profit,
      avgSlotCost,
      bookingPercentage,
      totalBookings,
      venueStats,
      paymentStats
    };
  }, [startDate, endDate, db]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Date Range Picker */}
      <Card className="p-4 flex flex-col md:flex-row items-end gap-4 bg-white border-indigo-100 shadow-sm">
        <div className="flex-1 w-full grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">From Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">To Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="hidden md:block h-10 w-px bg-slate-100"></div>
        <div className="flex gap-2">
          <Badge color="indigo">{filteredData.totalBookings} Bookings in Range</Badge>
        </div>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Income</p>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(filteredData.income)}</h3>
          <p className="text-[10px] text-green-600 font-bold mt-1">Cash Inflow</p>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-red-500 bg-gradient-to-br from-white to-red-50/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(filteredData.expenses)}</h3>
          <p className="text-[10px] text-red-600 font-bold mt-1">Operational Costs</p>
        </Card>

        <Card className={`p-6 border-l-4 ${filteredData.profit >= 0 ? 'border-l-[#24C002]' : 'border-l-orange-600'} bg-slate-900 text-white`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-70">Net Profit</p>
          <h3 className={`text-3xl font-black ${filteredData.profit >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>
            {formatCurrency(filteredData.profit)}
          </h3>
          <p className="text-[10px] font-bold mt-1 opacity-50">Estimated Bottom Line</p>
        </Card>
      </div>

      {/* Operational Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Slot Revenue</p>
            <h4 className="text-2xl font-black text-slate-900">{formatCurrency(filteredData.avgSlotCost)}</h4>
            <p className="text-[10px] text-indigo-500 font-bold mt-1">Revenue per Booking</p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">💰</div>
        </Card>

        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilization Rate</p>
            <h4 className="text-2xl font-black text-slate-900">{filteredData.bookingPercentage.toFixed(1)}%</h4>
            <p className="text-[10px] text-green-500 font-bold mt-1">Capacity Filled</p>
          </div>
          <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-2xl">📈</div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Income vs Expenses</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Income', amount: filteredData.income },
                { name: 'Expense', amount: filteredData.expenses }
              ]}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Revenue by Venue</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.venueStats} layout="vertical">
                <XAxis type="number" fontSize={10} hide />
                <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Payment Method Distribution</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={filteredData.paymentStats} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {filteredData.paymentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-slate-50 border-dashed border-2 border-slate-200 flex flex-col justify-center items-center text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Top Performer</h4>
          {filteredData.venueStats.length > 0 ? (
            <>
              <p className="text-lg font-bold text-[#24C002]">
                {filteredData.venueStats.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current).name}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Generated the highest revenue in the selected date range.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Not enough data for this period.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
