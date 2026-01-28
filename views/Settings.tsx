
import React, { useState } from 'react';
import { getDB, saveDB, logAction } from '../db';
import { Card, Button } from '../components/Shared';

export const SettingsView: React.FC = () => {
  const [db, setDb] = useState(getDB());
  const [settings, setSettings] = useState(db.settings);

  const handleSave = () => {
    const updatedDB = { ...db, settings };
    saveDB(updatedDB);
    setDb(updatedDB);
    logAction('UPDATE_SETTINGS', 'System settings updated');
    alert('Settings saved successfully!');
  };

  return (
    <div className="max-w-4xl space-y-8">
      <Card className="p-8">
        <h3 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Global Booking Config</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Default Slot Duration (Minutes)</label>
            <input 
              type="number" 
              value={settings.globalSlotDuration}
              onChange={(e) => setSettings({...settings, globalSlotDuration: Number(e.target.value)})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="mt-1 text-xs text-gray-400 italic">This affects newly created venues by default.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Default Base Price (BDT)</label>
            <input 
              type="number" 
              value={settings.globalBasePrice}
              onChange={(e) => setSettings({...settings, globalBasePrice: Number(e.target.value)})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Weekend Multiplier (1.2 = 20% extra)</label>
            <input 
              type="number" 
              step="0.1"
              value={settings.weekendMultiplier}
              onChange={(e) => setSettings({...settings, weekendMultiplier: Number(e.target.value)})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t flex justify-end">
          <Button onClick={handleSave} className="!px-10 !py-3">Save All Settings</Button>
        </div>
      </Card>

      <Card className="p-8">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Audit History</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
          {db.auditLogs.slice(0, 10).map((log, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-4">
              <div className="bg-indigo-100 p-2 rounded-lg text-lg">📝</div>
              <div>
                <p className="text-sm font-bold text-gray-800">{log.action}</p>
                <p className="text-xs text-gray-500">{log.details}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
