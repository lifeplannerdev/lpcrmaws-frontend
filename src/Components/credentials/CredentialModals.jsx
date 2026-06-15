import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../../context/ApiContext';

export function AddCredentialModal({ isOpen, onClose, onSuccess, editData }) {
  const { authFetch, apiBaseUrl } = useApi();
  const [formData, setFormData] = useState({ title: '', username: '', web_mail: '', password: '', url: '', notes: '', category: '', shared_users: [], shared_roles: [] });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchStaffAndRoles();
      if (editData) {
        setFormData({
          title: editData.title || '',
          username: editData.username || '',
          web_mail: editData.web_mail || '',
          password: '',
          url: editData.url || '',
          notes: editData.notes || '',
          category: editData.category || '',
          shared_users: editData.shared_users || [],
          shared_roles: editData.shared_roles || []
        });
      } else {
        setFormData({ title: '', username: '', web_mail: '', password: '', url: '', notes: '', category: '', shared_users: [], shared_roles: [] });
      }
    }
  }, [isOpen, editData]);

  const fetchCategories = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-categories/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaffAndRoles = async () => {
    try {
      const [staffRes, rolesRes] = await Promise.all([
        authFetch(`${apiBaseUrl}/staff/`),
        authFetch(`${apiBaseUrl}/roles/`)
      ]);
      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaffList(data.results || data);
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRolesList(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col relative">
        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold">{editData ? 'Edit Credential' : 'Add Credential'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web Mail (Optional)</label>
            <input value={formData.web_mail} onChange={e => setFormData({...formData, web_mail: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
            <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value || null})} className="w-full px-4 py-2 border rounded-xl">
              <option value="">-- No Category --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share with Users</label>
            <div className="border rounded-xl max-h-32 overflow-y-auto bg-gray-50 p-2 space-y-1">
              {staffList.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.shared_users.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, shared_users: [...formData.shared_users, u.id]});
                      } else {
                        setFormData({...formData, shared_users: formData.shared_users.filter(id => id !== u.id)});
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700">{u.first_name} {u.last_name} ({u.email})</span>
                </label>
              ))}
              {staffList.length === 0 && <p className="text-sm text-gray-500 px-2 py-1">No users found</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share with Roles</label>
            <div className="border rounded-xl max-h-32 overflow-y-auto bg-gray-50 p-2 space-y-1">
              {rolesList.map(r => (
                <label key={r.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.shared_roles.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, shared_roles: [...formData.shared_roles, r.id]});
                      } else {
                        setFormData({...formData, shared_roles: formData.shared_roles.filter(id => id !== r.id)});
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700">{r.name}</span>
                </label>
              ))}
              {rolesList.length === 0 && <p className="text-sm text-gray-500 px-2 py-1">No roles found</p>}
            </div>
          </div>
          </div>
          <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-3xl z-10">
            <button onClick={onClose} type="button" className="px-5 py-2.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
              <Save size={18}/> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col relative">
        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold">Propose New Password</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            <p className="text-xs text-gray-500 mt-2">An admin must approve this update before it becomes active.</p>
          </div>
          </div>
          <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-3xl z-10">
            <button onClick={onClose} type="button" className="px-5 py-2.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 font-medium rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold">Password History</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
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
