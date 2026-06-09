import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../Components/layouts/Navbar';
import { Loader2, Settings, Plus, Edit, Trash2, X, Save } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ReportTimingSettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    user: '',
    agenda_policy: 'MORNING_OF',
    agenda_deadline: '10:00:00',
    report_deadline: '18:00:00',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/reports/settings/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSettings(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/staffs/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      Promise.all([fetchSettings(), fetchUsers()]).finally(() => setLoading(false));
    }
  }, [accessToken]);

  const handleEdit = (setting) => {
    setEditingId(setting.id);
    setFormData({
      user: setting.user,
      agenda_policy: setting.agenda_policy,
      agenda_deadline: setting.agenda_deadline,
      report_deadline: setting.report_deadline,
    });
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this setting?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/reports/settings/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchSettings();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await axios.patch(`${API_BASE_URL}/admin/reports/settings/${editingId}/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/admin/reports/settings/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
      setShowModal(false);
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-indigo-600" />
              Report Timing Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage agenda and report deadlines for employees.</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ user: '', agenda_policy: 'MORNING_OF', agenda_deadline: '10:00:00', report_deadline: '18:00:00' });
              setShowModal(true);
              setError(null);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Settings
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Employee</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Agenda Policy</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Agenda Deadline</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Report Deadline</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                      No settings configured.
                    </td>
                  </tr>
                ) : (
                  settings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{setting.user_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{setting.agenda_policy.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{setting.agenda_deadline}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{setting.report_deadline}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(setting)} className="text-blue-600 hover:text-blue-800 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(setting.id)} className="text-red-600 hover:text-red-800 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Settings' : 'New Settings'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
                
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      value={formData.user}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select an employee...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.username || `User #${u.id}`}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda Policy</label>
                  <select
                    value={formData.agenda_policy}
                    onChange={(e) => setFormData({ ...formData, agenda_policy: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="MORNING_OF">Morning Of</option>
                    <option value="EVENING_BEFORE">Evening Before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda Deadline</label>
                  <input
                    type="time"
                    step="1"
                    value={formData.agenda_deadline}
                    onChange={(e) => setFormData({ ...formData, agenda_deadline: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Deadline</label>
                  <input
                    type="time"
                    step="1"
                    value={formData.report_deadline}
                    onChange={(e) => setFormData({ ...formData, report_deadline: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
