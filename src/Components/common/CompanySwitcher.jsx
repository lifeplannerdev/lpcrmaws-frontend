import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

const CompanySwitcher = ({ activeCompany, onChange }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Only show the switcher if the user has cross-company access
  if (!user || !hasPermission('system:access_flag')) {
    return null;
  }

  return (
    <div className="flex bg-gray-100 p-1 rounded-lg w-max mb-4 border border-gray-200">
      <button
        onClick={() => onChange('LP')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          activeCompany === 'LP' || !activeCompany
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        LP Group
      </button>
      <button
        onClick={() => onChange('FLAG')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          activeCompany === 'FLAG'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        FLAG
      </button>
    </div>
  );
};

export default CompanySwitcher;
