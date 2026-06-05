import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../context/ApiContext';

export function AddCredentialModal({ isOpen, onClose, onSuccess, editData }) {
  const { authFetch, apiBaseUrl } = useApi();
  const [formData, setFormData] = useState({ title: '', username: '', password: '', url: '', notes: '', shared_users: [], shared_roles: [] });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          title: editData.title || '',
          username: editData.username || '',
          password: '',
          url: editData.url || '',
          notes: editData.notes || '',
          shared_users: editData.shared_users || [],
          shared_roles: editData.shared_roles || []
        });
      } else {
        setFormData({ title: '', username: '', password: '', url: '', notes: '', shared_users: [], shared_roles: [] });
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = editData ? `${apiBaseUrl}/credentials/${editData.id}/` : `${apiBaseUrl}/credentials/`;
      const method = editData ? 'PATCH' : 'POST';
      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd = "";
    for(let i=0; i<16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password: pwd }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">{editData ? 'Edit Credential' : 'Add Credential'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password {editData ? '(Leave blank to keep unchanged)' : ''}</label>
            <div className="flex gap-2">
              <input type="text" required={!editData} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
              <button type="button" onClick={generatePassword} className="px-3 bg-gray-100 rounded-xl hover:bg-gray-200" title="Generate Password"><RefreshCw size={18}/></button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL (Optional)</label>
            <input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
        </form>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2">
            <Save size={18}/> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProposeUpdateModal({ isOpen, onClose, credentialId, onSuccess }) {
  const { authFetch, apiBaseUrl } = useApi();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/credentials/${credentialId}/propose_update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_password: password })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Propose New Password</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            <p className="text-xs text-gray-500 mt-2">An admin must approve this update before it becomes active.</p>
          </div>
        </form>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryModal({ isOpen, onClose, credentialId }) {
  const { authFetch, apiBaseUrl } = useApi();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen && credentialId) {
      authFetch(`${apiBaseUrl}/credentials/${credentialId}/history/`)
        .then(r => r.json())
        .then(data => setHistory(data));
    }
  }, [isOpen, credentialId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Password History</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No history available.</p>
          ) : (
            <div className="space-y-4">
              {history.map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm font-mono bg-white px-2 py-1 rounded inline-block border">{item.decrypted_password}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Changed by {item.changed_by_name} on {new Date(item.changed_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
