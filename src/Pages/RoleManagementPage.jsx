import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import { useAuth } from '../context/AuthContext';
import { Can } from '../context/PermissionsContext';

export default function RoleManagementPage() {
  const { authTokens } = useAuth();
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
        axios.get(`${BASE_URL}/api/accounts/roles/`, {
          headers: { Authorization: `Bearer ${authTokens.access}` }
        }),
        axios.get(`${BASE_URL}/api/accounts/permissions/`, {
          headers: { Authorization: `Bearer ${authTokens.access}` }
        })
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
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
        await axios.put(`${BASE_URL}/api/accounts/roles/${editingRole.id}/`, formData, {
          headers: { Authorization: `Bearer ${authTokens.access}` }
        });
      } else {
        await axios.post(`${BASE_URL}/api/accounts/roles/`, formData, {
          headers: { Authorization: `Bearer ${authTokens.access}` }
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
        await axios.delete(`${BASE_URL}/api/accounts/roles/${id}/`, {
          headers: { Authorization: `Bearer ${authTokens.access}` }
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={handleCloseModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSave}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingRole ? 'Edit Role' : 'Create Role'}
                  </h3>
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
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-2 rounded-md">
                      {permissions.map(perm => (
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
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Save
                  </button>
                  <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
