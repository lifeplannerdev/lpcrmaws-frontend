import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

const COMPANIES = [
  { key: '',    label: 'All',     color: 'text-blue-600' },
  { key: 'LP',  label: 'LP Group', color: 'text-blue-600' },
  { key: 'FLAG',label: 'FLAG',    color: 'text-emerald-600' },
  { key: 'FDS', label: 'FDS',     color: 'text-amber-600' },
];

const CompanySwitcher = ({ activeCompany, onChange, showAll = false }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Only show the switcher if the user has cross-company access
  if (!user || !hasPermission('staff:access_flag')) {
    return null;
  }

  const options = showAll ? COMPANIES : COMPANIES.filter(c => c.key !== '');

  return (
    <div className="flex bg-gray-100 p-1 rounded-lg w-max mb-4 border border-gray-200">
      {options.map(({ key, label, color }) => {
        const isActive = activeCompany === key || (!activeCompany && key === '');
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              isActive
                ? `bg-white ${color} shadow-sm`
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default CompanySwitcher;
