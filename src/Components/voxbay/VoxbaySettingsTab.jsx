import React, { useState, useEffect } from 'react';
import { Save, Settings2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function VoxbaySettingsTab() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/voxbay/settings/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Voxbay settings');
      const data = await res.json();
      setUsers(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchUsers();
  }, [accessToken]);

  const handleInputChange = (id, field, value) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value, _isDirty: true } : u))
    );
  };

  const handleSave = async () => {
    const updates = users.filter((u) => u._isDirty).map(u => ({
      id: u.id,
      voxbay_number: u.voxbay_number,
      voxbay_extension: u.voxbay_extension
    }));

    if (updates.length === 0) {
      setSuccessMsg('No changes to save.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/voxbay/settings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      
      const result = await res.json();
      setSuccessMsg(`Saved successfully! Updated ${result.updated} records.`);
      
      // Clear dirty flags
      setUsers(prev => prev.map(u => ({ ...u, _isDirty: false })));
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(s)) ||
      (u.team && u.team.toLowerCase().includes(s)) ||
      (u.roles && u.roles.toLowerCase().includes(s)) ||
      (u.voxbay_number && u.voxbay_number.toLowerCase().includes(s)) ||
      (u.voxbay_extension && u.voxbay_extension.toLowerCase().includes(s))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <Settings2 size={16} className="text-gray-400" />
            Voxbay Agent Settings
          </h3>
          <p className="text-xs text-gray-400 mt-1">Assign Voxbay DID numbers and Extensions to active staff. These values map calls to leads.</p>
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">{error}</span>}
          {successMsg && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{successMsg}</span>}
          
          <input 
            type="text" 
            placeholder="Search staff or team..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
          />
          
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || !users.some((u) => u._isDirty)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-200"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-10 flex justify-center text-gray-400">Loading staff data...</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-widest font-bold sticky top-0 border-b border-gray-100 z-10">
              <tr>
                <th className="px-4 py-3 text-left">Staff Member</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-left">Voxbay DID (Incoming)</th>
                <th className="px-4 py-3 text-left">Voxbay Extension (Outgoing)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">{user.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-medium">
                      {user.team ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {user.team}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.roles || '—'}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={user.voxbay_number || ''}
                        onChange={(e) => handleInputChange(user.id, 'voxbay_number', e.target.value)}
                        placeholder="e.g. 918089040107"
                        className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:border-indigo-400 transition-colors ${user._isDirty ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={user.voxbay_extension || ''}
                        onChange={(e) => handleInputChange(user.id, 'voxbay_extension', e.target.value)}
                        placeholder="e.g. 513"
                        className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:border-indigo-400 transition-colors ${user._isDirty ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-gray-400">
                    No active staff found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
