
import React, { useState } from 'react';
import { UserRole } from '../types';
import { getDB } from '../db';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'calendar', label: 'Calendar', icon: '📅', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'slot-viewer', label: 'Slot Viewer', icon: '👁️', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'clients', label: 'Clients', icon: '👥', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'venues', label: 'Venues', icon: '🏟️', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'transactions', label: 'Transactions', icon: '💸', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'invoices', label: 'Invoices', icon: '📄', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'reports', label: 'Reports', icon: '📈', roles: [UserRole.ADMIN, UserRole.STAFF] },
  { id: 'settings', label: 'Settings', icon: '⚙️', roles: [UserRole.ADMIN] },
  { id: 'data-import', label: 'Import/Backup', icon: '💾', roles: [UserRole.ADMIN] },
  { id: 'ai-insights', label: 'AI Insights', icon: '🤖', roles: [UserRole.ADMIN] },
];

export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; onTabChange: (id: string) => void }> = ({ children, activeTab, onTabChange }) => {
  const db = getDB();
  const user = db.currentUser;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-lg"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold tracking-tight text-indigo-400">ROYAL MULTISPORT</h1>
            <p className="text-xs text-slate-400 mt-1">Management Portal</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 space-y-1 py-4 scrollbar-hide">
            {NAV_ITEMS.map((item) => {
              if (!item.roles.includes(user.role)) return null;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center p-2 rounded-lg bg-slate-800">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{new Date().toDateString()}</span>
            <div className="h-8 w-px bg-gray-200"></div>
            <button className="text-gray-400 hover:text-indigo-600">
              <span className="text-xl">🔔</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
};
