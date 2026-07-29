import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Combobox } from '../common/Combobox';

const LeadsFilters = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterSource,
  setFilterSource,
  filterStaff,
  setFilterStaff,
  staffMembers,
  filterCampaign,
  setFilterCampaign,
  filterToday,
  setFilterToday,
}) => {
  const statusOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'enquiry', label: 'Enquiry' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'converted', label: 'Converted' },
    { id: 'registered', label: 'Registered' },
    { id: 'lost', label: 'Lost' },
  ];

  const priorityOptions = [
    { id: 'all', label: 'All Priorities' },
    { id: 'high', label: 'High Priority' },
    { id: 'medium', label: 'Medium Priority' },
    { id: 'low', label: 'Low Priority' },
  ];

  const sourceOptions = [
    { id: 'all', label: 'All Sources' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'website', label: 'Website' },
    { id: 'walk_in', label: 'Walk-in' },
    { id: 'automation', label: 'Automation' },
    { id: 'ads', label: 'Ads' },
    { id: 'voxbay call', label: 'Voxbay' },
    { id: 'bulk data', label: 'Bulk Data' },
    { id: 'other', label: 'Other' },
  ];

  const staffOptions = [
    { id: 'all', label: 'All Staff' },
    ...(staffMembers || []).map((staff) => ({
      id: staff.id,
      label: (staff.username || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || `Staff #${staff.id}`) + (staff.is_active === false ? ' (Inactive)' : ''),
    })),
  ];

  return (
    <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-gray-400 text-gray-900 font-medium"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Status Filter */}
          <Combobox
            options={statusOptions}
            value={statusOptions.find((o) => o.id === filterStatus) || statusOptions[0]}
            onChange={(opt) => setFilterStatus(opt.id)}
            displayValue={(opt) => opt?.label || 'Select Status'}
          />

          {/* Priority Filter */}
          <Combobox
            options={priorityOptions}
            value={priorityOptions.find((o) => o.id === filterPriority) || priorityOptions[0]}
            onChange={(opt) => setFilterPriority(opt.id)}
            displayValue={(opt) => opt?.label || 'Select Priority'}
          />

          {/* Source Filter */}
          <Combobox
            options={sourceOptions}
            value={sourceOptions.find((o) => o.id === filterSource) || sourceOptions[0]}
            onChange={(opt) => setFilterSource(opt.id)}
            displayValue={(opt) => opt?.label || 'Select Source'}
          />

          {/* Staff Filter */}
          <Combobox
            options={staffOptions}
            value={staffOptions.find((o) => String(o.id) === String(filterStaff)) || staffOptions[0]}
            onChange={(opt) => setFilterStaff(opt.id)}
            displayValue={(opt) => opt?.label || 'Select Staff'}
          />

          {/* Campaign Filter */}
          <input
            type="text"
            placeholder="Campaign Name..."
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 font-medium"
          />

          {/* Today Filter */}
          <label className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={filterToday}
              onChange={(e) => setFilterToday(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="font-semibold text-gray-700">Created Today</span>
          </label>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
              setFilterPriority('all');
              setFilterSource('all');
              setFilterStaff('all');
              setFilterCampaign('');
              setFilterToday(false);
            }}
            className="px-4 py-3 h-[46px] border-2 border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:border-red-300 flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-gray-700 hover:text-red-700 group mt-[2px]"
          >
            <Filter size={20} className="group-hover:rotate-12 transition-transform" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadsFilters;
