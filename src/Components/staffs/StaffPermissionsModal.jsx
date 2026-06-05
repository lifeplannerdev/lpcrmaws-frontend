import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';

const PERMISSION_OPTIONS = [
  { id: 'view_overview', label: 'View Overview', group: 'Navigation' },
  { id: 'view_leads', label: 'View Leads', group: 'Navigation' },
  { id: 'view_staff', label: 'View Staff', group: 'Navigation' },
  { id: 'view_students', label: 'View Students', group: 'Navigation' },
  { id: 'edit_students', label: 'Manage Students', group: 'Navigation' },
  { id: 'view_all_tasks', label: 'View All Tasks', group: 'Tasks' },
  { id: 'view_my_tasks', label: 'View My Tasks', group: 'Tasks' },
  { id: 'edit_tasks', label: 'Edit & Assign Tasks', group: 'Tasks' },
  { id: 'view_staff_reports', label: 'View Staff Reports', group: 'Reports' },
  { id: 'view_my_reports', label: 'View My Reports', group: 'Reports' },
  { id: 'view_voxbay', label: 'View Call Analytics', group: 'Other' },
  { id: 'view_penalties', label: 'View Penalties', group: 'HR' },
  { id: 'edit_penalties', label: 'Manage Penalties', group: 'HR' },
  { id: 'view_attendance_docs', label: 'View Attendance Docs', group: 'HR' },
  { id: 'view_candidates', label: 'View Candidates', group: 'HR' },
  { id: 'edit_candidates', label: 'Manage Candidates', group: 'HR' },
  { id: 'mark_attendance', label: 'Mark Student Attendance', group: 'Trainer' },
  { id: 'view_fees', label: 'View Fees', group: 'Fees' },
  { id: 'manage_fees', label: 'Manage Fees', group: 'Fees' },
  { id: 'restructure_fees', label: 'Restructure Fees', group: 'Fees' },
  { id: 'record_partial_payment', label: 'Record Partial Payment', group: 'Fees' },
  { id: 'issue_fee_notice', label: 'Issue Fee Notice', group: 'Fees' },
  { id: 'view_fee_reports', label: 'View Fee Reports', group: 'Fees' },
  { id: 'view_asset', label: 'View Assets', group: 'HR' },
  { id: 'manage_asset', label: 'Manage Assets', group: 'HR' },
  { id: 'view_staff_assets', label: 'View Staff Assets Tab', group: 'Staff' },
  { id: 'edit_staff_contact_logic', label: 'Manage Contact Logic', group: 'Staff' },
  { id: 'credentials:view', label: 'View Credentials', group: 'Credentials' },
  { id: 'credentials:manage', label: 'Manage Credentials', group: 'Credentials' },
  { id: 'credentials:share', label: 'Share Credentials', group: 'Credentials' },
  { id: 'access_flag', label: 'Cross-Company Access (FLAG)', group: 'System' },
];

export default function StaffPermissionsModal({ isOpen, onClose, staffId, currentPermissions, onSave, authFetch, apiBaseUrl }) {
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPermissions(Array.isArray(currentPermissions) ? currentPermissions : []);
      setError('');
    }
  }, [isOpen, currentPermissions]);

  if (!isOpen) return null;

  const handleToggle = (permId) => {
    setPermissions(prev => 
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`${apiBaseUrl}/staff/${staffId}/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update permissions');
      }

      onSave(permissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group permissions for better UI
  const groupedPermissions = PERMISSION_OPTIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Granular Permissions</h2>
            <p className="text-sm text-gray-500 mt-1">Customize specific access rights for this staff member.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group}>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                  {group}
                </h3>
                <div className="space-y-3">
                  {perms.map(perm => {
                    const isSelected = permissions.includes(perm.id);
                    return (
                      <div 
                        key={perm.id} 
                        onClick={() => handleToggle(perm.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {perm.label}
                        </span>
                        <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out ${isSelected ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                          <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition duration-200 ease-in-out ${isSelected ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
