
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { SettingsView } from './views/Settings';
import { CalendarView } from './views/Calendar';
import { SlotViewer } from './views/SlotViewer';
import { AIInsights } from './views/AIInsights';
import { VenuesView } from './views/Venues';
import { ClientsView } from './views/Clients';
import { TransactionsView } from './views/Transactions';
import { InvoicesView } from './views/Invoices';
import { ReportsView } from './views/Reports';
import { DataImportView } from './views/DataImport';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onTabChange={setActiveTab} />;
      case 'settings': return <SettingsView />;
      case 'calendar': return <CalendarView />;
      case 'slot-viewer': return <SlotViewer />;
      case 'ai-insights': return <AIInsights />;
      case 'venues': return <VenuesView />;
      case 'clients': return <ClientsView />;
      case 'transactions': return <TransactionsView />;
      case 'invoices': return <InvoicesView />;
      case 'reports': return <ReportsView />;
      case 'data-import': return <DataImportView />;
      default: return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
