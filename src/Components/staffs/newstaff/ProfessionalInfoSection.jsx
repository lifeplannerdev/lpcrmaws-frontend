import React from 'react';
import { Briefcase, Shield, Users, DollarSign, MapPin, Building, CheckSquare } from 'lucide-react';
import FormField from '../../common/FormField';
import IconContainer from '../../common/IconContainer';
import { roleOptions, teamOptions } from '../../utils/staffConstants';

const ProfessionalInfoSection = React.memo(({ formData, errors, onChange, branches = [], hasDualAccess = false, dbRolesList = [], onDbRolesChange }) => {
  return (
    <div className="mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconContainer 
          icon={Briefcase} 
          gradient="from-indigo-500 to-purple-600"
          size="sm"
        />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Professional Information
          </h2>
          <p className="text-sm text-gray-500 font-medium">Role and team details</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            Roles (Select at least one)
          </label>
          {errors.db_roles && <p className="text-sm text-red-600 mb-2">{errors.db_roles}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-2 border-gray-100 rounded-xl p-4 bg-gray-50">
            {dbRolesList.map(r => (
              <label key={r.id} className="flex items-start gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  className="mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={formData.db_roles?.includes(r.id) || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newRoles = checked 
                      ? [...(formData.db_roles || []), r.id]
                      : (formData.db_roles || []).filter(id => id !== r.id);
                    onDbRolesChange(newRoles);
                  }}
                />
                <span className="text-sm font-medium text-gray-700">{r.name}</span>
              </label>
            ))}
            {dbRolesList.length === 0 && <span className="text-sm text-gray-500">No roles available. Please create them in Role Management.</span>}
          </div>
        </div>

        <FormField
          label="Team/Department"
          name="team"
          type="select"
          value={formData.team}
          onChange={onChange}
          placeholder="Select a team"
          icon={Users}
          options={teamOptions.map(team => ({ value: team, label: team }))}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Salary"
          name="salary"
          type="number"
          value={formData.salary || ''}
          onChange={onChange}
          error={errors.salary}
          placeholder="Enter salary"
          icon={DollarSign}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Voxbay Agent Number"
          name="voxbayNumber"
          type="text"
          value={formData.voxbayNumber || ''}
          onChange={onChange}
          error={errors.voxbayNumber}
          placeholder="e.g. 918593050107"
          icon={CheckSquare}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Voxbay Extension"
          name="voxbayExtension"
          type="text"
          value={formData.voxbayExtension || ''}
          onChange={onChange}
          error={errors.voxbayExtension}
          placeholder="e.g. 259"
          icon={CheckSquare}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        {formData.db_roles?.some(roleId => {
          const roleObj = dbRolesList.find(r => r.id === roleId);
          return roleObj?.name.toUpperCase() === 'TRAINER';
        }) && (
          <FormField
            label="Branch"
            name="branch"
            type="select"
            value={formData.branch || ''}
            onChange={onChange}
            error={errors.branch}
            placeholder="Select a branch"
            icon={MapPin}
            options={branches.map(branch => ({ value: branch.id, label: branch.name }))}
            className="px-4 py-3 border-2 rounded-xl font-medium"
          />
        )}

        <FormField
          label="Company"
          name="company"
          type="select"
          value={formData.company || ''}
          onChange={onChange}
          placeholder="Select a company"
          icon={Building}
          options={[
            { value: 'LP', label: 'LP Group' },
            { value: 'FLAG', label: 'FLAG' },
            { value: 'FDS', label: 'FILMAATIC Dance Studio' }
          ]}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        {/* Active Status Premium Toggle */}
        <div className="sm:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Active Status</h3>
            <p className="text-xs text-gray-500 mt-1">Inactive staff cannot log in, but their historical data is preserved.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={onChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
});

ProfessionalInfoSection.displayName = 'ProfessionalInfoSection';

export default ProfessionalInfoSection;