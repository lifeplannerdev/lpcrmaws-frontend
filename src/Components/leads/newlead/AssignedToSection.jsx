// Components/leads/newlead/AssignedToSection.jsx
import React, { useEffect, useState } from 'react';
import { UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionsContext';
import { Combobox } from '../../common/Combobox';

const AssignedToSection = ({ formData, errors, onChange }) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/leads/available-users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      const filteredUsers = filterUsersByPermissions(data);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAvailableUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsersByPermissions = (users) => {
    if (hasPermission('leads:edit_any') || hasPermission('leads:assign_any') || hasPermission('staff:view_any')) {
      return users;
    }

    if (hasPermission('leads:edit_tenant') || hasPermission('leads:assign_tenant')) {
      return users.filter(u => 
        u.role === 'ADM_MANAGER' || 
        u.role === 'ADM_EXEC' || 
        u.role === 'FOE' ||
        u.role === 'ADM_COUNSELLOR'
      );
    }

    return users.filter(u => u.id === user?.id);
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'ADMIN': 'General Manager',
      'OPS': 'Operations Manager',
      'ADM_MANAGER': 'Admission Manager',
      'ADM_COUNSELLOR': 'Admission Counsellor',
      'ADM_EXEC': 'Admission Executive',
      'CM': 'Center Manager',
      'BDM': 'Business Development Manager',
      'FOE': 'FOE Cum TC',
    };
    return roleMap[role] || role;
  };

  const staffOptions = availableUsers.map(staff => ({
    id: staff.id,
    label: `${staff.first_name} ${staff.last_name} - ${getRoleDisplayName(staff.role)}`,
  }));

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Assignment</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Assigned To Combobox */}
        <div>
          <Combobox
            label={<>Assign To <span className="text-red-500">*</span></>}
            options={staffOptions}
            value={staffOptions.find((o) => String(o.id) === String(formData.assignedTo)) || null}
            onChange={(opt) => onChange({ target: { name: 'assignedTo', value: opt ? opt.id : '' } })}
            placeholder={loading ? 'Loading users...' : 'Select a staff member'}
            displayValue={(opt) => opt?.label || ''}
            error={errors.assignedTo}
          />

          {!loading && availableUsers.length === 0 && (
            <p className="mt-2 text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                No staff members available for assignment.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignedToSection;
