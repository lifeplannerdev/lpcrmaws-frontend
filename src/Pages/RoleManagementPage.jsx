import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Can } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import { Shield, ShieldCheck, Plus, Edit2, Trash2, X, Search, Lock, Layers } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RoleManagementPage() {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', permission_ids: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/roles/`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get(`${API_BASE_URL}/permissions/`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);
      setRoles(rolesRes.data.results || rolesRes.data || []);
      setPermissions(permsRes.data.results || permsRes.data || []);
    } catch (error) {
      console.error("Error fetching roles/permissions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permission_ids: role.permissions.map(p => p.id)
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permission_ids: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const ids = prev.permission_ids;
      if (ids.includes(permId)) {
        return { ...prev, permission_ids: ids.filter(id => id !== permId) };
      } else {
        return { ...prev, permission_ids: [...ids, permId] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await axios.put(`${API_BASE_URL}/roles/${editingRole.id}/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/roles/`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving role", error);
      alert("Error saving role.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await axios.delete(`${API_BASE_URL}/roles/${id}/`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        fetchData();
      } catch (error) {
        console.error("Error deleting role", error);
        alert("Error deleting role.");
      }
    }
  };

  const filteredRoles = roles.filter(r => 
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Role Management</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage database-driven roles and granular access permissions.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm w-48 sm:w-64"
              />
            </div>
            <Can perform="staff:edit_any">
              <button 
                onClick={() => handleOpenModal()} 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            </Can>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading roles and permissions...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredRoles.map(role => (
                    <tr key={role.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {role.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm text-slate-900">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                        {role.description || <span className="text-slate-400 italic">No description</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
                          <Layers className="w-3.5 h-3.5 text-blue-500" />
                          {role.permissions.length} perms
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Can perform="staff:edit_any">
                          <button 
                            onClick={() => handleOpenModal(role)} 
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-medium transition-colors mr-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(role.id)} 
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-sm">
                        No roles found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
              <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {editingRole ? 'Edit Role' : 'Create New Role'}
                      </h3>
                      <p className="text-xs text-slate-500">Configure role identity and assign granular access permissions</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Role Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. ADM_COUNSELLOR"
                      className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <input 
                      type="text" 
                      placeholder="Brief summary of duties and responsibilities"
                      className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Permissions ({formData.permission_ids.length} selected)</label>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(
                        permissions.reduce((acc, perm) => {
                          const prefix = perm.name.split(':')[0] || 'other';
                          const groupName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                          if (!acc[groupName]) acc[groupName] = [];
                          acc[groupName].push(perm);
                          return acc;
                        }, {})
                      ).map(([groupName, groupPerms]) => (
                        <div key={groupName} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                            <span>{groupName}</span>
                            <span className="text-slate-400 font-normal">
                              {groupPerms.filter(p => formData.permission_ids.includes(p.id)).length} / {groupPerms.length}
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {groupPerms.map(perm => {
                              const isChecked = formData.permission_ids.includes(perm.id);
                              return (
                                <label 
                                  key={perm.id} 
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                    isChecked 
                                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold shadow-xs' 
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="truncate">{perm.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    className="px-5 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    {editingRole ? 'Update Role' : 'Create Role'}
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

