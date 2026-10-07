import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Book, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import Navbar from '../Components/layouts/Navbar';

export default function PenaltyLibraryPage() {
  const { accessToken } = useAuth();
  const [penaltyTypes, setPenaltyTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', description: '', default_amount: 0 });

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchPenaltyTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/penalty-types/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setPenaltyTypes(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch penalty types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchPenaltyTypes();
  }, [accessToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.patch(`${API_BASE}/penalty-types/${editingId}/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        await axios.post(`${API_BASE}/penalty-types/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', description: '', default_amount: 0 });
      setEditingId(null);
      fetchPenaltyTypes();
    } catch (err) {
      console.error(err);
      alert('Failed to save penalty type');
    }
  };

  const handleEdit = (pt) => {
    setFormData({ name: pt.name, description: pt.description, default_amount: pt.default_amount });
    setEditingId(pt.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this penalty type?')) return;
    try {
      await axios.delete(`${API_BASE}/penalty-types/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchPenaltyTypes();
    } catch (err) {
      console.error(err);
      alert('Failed to delete penalty type');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Book className="text-indigo-600" /> Penalty Library
          </h1>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', default_amount: 0 });
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus size={18} /> Add Penalty Type
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">Default Amount (₹)</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {penaltyTypes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No penalty types found.</td>
                  </tr>
                ) : (
                  penaltyTypes.map((pt) => (
                    <tr key={pt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{pt.name}</td>
                      <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{pt.description || '-'}</td>
                      <td className="px-6 py-4 text-red-600 font-medium">₹{pt.default_amount}</td>
                      <td className="px-6 py-4 flex gap-2 justify-end">
                        <button onClick={() => handleEdit(pt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(pt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingId ? 'Edit' : 'Add'} Penalty Type</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Missing Agenda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.default_amount}
                    onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Save size={16} /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
