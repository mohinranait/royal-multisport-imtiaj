
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Card, Button, Badge } from '../components/Shared';

export const DataImportView: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const db = getDB();

  const handleSimulateImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      alert('Simulated import successful: 154 legacy records added to staging.');
      logAction('DATA_IMPORT', 'Performed legacy Google Sheets import simulation.');
    }, 2000);
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(db);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `Royal_Backup_${new Date().toISOString()}.json`);
    linkElement.click();
    logAction('BACKUP', 'System backup exported manually.');
  };

  return (
    <div className="max-w-3xl space-y-8">
      <Card className="p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Legacy Data Import</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Upload your exported Google Sheets (CSV format). Our system will automatically map headers for 
          Clients, Historical Bookings, and Transaction data. Legacy IDs will be preserved for auditing.
        </p>

        <div className="border-4 border-dashed border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center mb-8">
          <div className="text-5xl mb-4 opacity-20">📥</div>
          <p className="text-gray-400 text-sm mb-4">Drag and drop your CSV files here</p>
          <Button variant="secondary" onClick={handleSimulateImport} disabled={importing}>
            {importing ? 'Processing Records...' : 'Select Files'}
          </Button>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-900">Important Note</p>
            <p className="text-xs text-amber-700">Ensure date formats are YYYY-MM-DD and phone numbers include country codes to prevent duplicates.</p>
          </div>
        </div>
      </Card>

      <Card className="p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">System Backups</h3>
        <p className="text-sm text-gray-500 mb-6">Maintain data integrity by regularly exporting snapshots of your database.</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1" onClick={handleBackup}>Generate Full JSON Backup</Button>
          <Button variant="secondary" className="flex-1">Sync with Google Drive</Button>
        </div>
        
        <div className="mt-8 pt-6 border-t">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Backups</p>
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                <span className="text-gray-600 font-mono">backup_2023_10_{20+i}.json</span>
                <Badge color="blue">Cloud Sync</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
