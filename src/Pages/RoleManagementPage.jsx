import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { useAuth } from '../context/AuthContext';
import { Can } from '../context/PermissionsContext';

export default function RoleManagementPage() {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500">Manage database-driven roles and granular permissions.</p>
        </div>
        <Can perform="staff:edit_any">
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            + Create Role
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map(role => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{role.description}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {role.permissions.length} perms
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Can perform="staff:edit_any">
                    <button onClick={() => handleOpenModal(role)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onClick={() => handleDelete(role.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative">
            <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
              <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-3xl z-10">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingRole ? 'Edit Role' : 'Create Role'}
                </h3>
                <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Role Name</label>
                    <input 
                      type="text" 
                      required 
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input 
                      type="text" 
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">Permissions</label>
                    <div className="mt-2 space-y-4">
                      {Object.entries(
                        permissions.reduce((acc, perm) => {
                          const prefix = perm.name.split(':')[0] || 'other';
                          const groupName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                          if (!acc[groupName]) acc[groupName] = [];
                          acc[groupName].push(perm);
                          return acc;
                        }, {})
                      ).map(([groupName, groupPerms]) => (
                        <div key={groupName} className="border border-gray-200 p-4 rounded-xl bg-slate-50">
                          <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">{groupName}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {groupPerms.map(perm => (
                              <div key={perm.id} className="flex items-start">
                                <div className="flex items-center h-5">
                                  <input
                                    id={`perm-${perm.id}`}
                                    type="checkbox"
                                    checked={formData.permission_ids.includes(perm.id)}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                  />
                                </div>
                                <div className="ml-2 text-sm">
                                  <label htmlFor={`perm-${perm.id}`} className="font-medium text-gray-700">
                                    {perm.name}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
              <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3 rounded-b-3xl z-10">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
