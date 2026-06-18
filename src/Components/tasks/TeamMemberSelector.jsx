// Components/tasks/TeamMemberSelector.jsx
import React, { useRef, useEffect } from 'react';
import { User, Search, ChevronDown, Check, AlertCircle } from 'lucide-react';

export default function TeamMemberSelector({
  value,
  onChange,
  teamMembers,
  error,
  disabled = false,
  isDropdownOpen,
  setIsDropdownOpen,
  searchQuery,
  setSearchQuery,
}) {
  const dropdownRef = useRef(null);

  // Role display config — no `icon` field (was undefined before, now removed)
  const roleConfig = {
    ADM_EXEC:      { label: 'Admission Executive', color: 'bg-purple-100 text-purple-700' },
    ADM_MANAGER:   { label: 'Admin Manager',        color: 'bg-blue-100 text-blue-700'    },
    ADM_COUNSELLOR:{ label: 'Admission Counsellor', color: 'bg-violet-100 text-violet-700'},
    MEDIA:         { label: 'Media',                color: 'bg-pink-100 text-pink-700'    },
    FOE:           { label: 'Front of Exec',        color: 'bg-cyan-100 text-cyan-700'    },
    TRAINER:       { label: 'Trainer',              color: 'bg-green-100 text-green-700'  },
    ACCOUNTS:      { label: 'Accounts',             color: 'bg-amber-100 text-amber-700'  },
    PROCESSING:    { label: 'Processing',           color: 'bg-lime-100 text-lime-700'    },
    DOCUMENTATION: { label: 'Documentation',        color: 'bg-teal-100 text-teal-700'    },
    CM:            { label: 'Central Manager',      color: 'bg-teal-100 text-teal-700'    },
    OPS:           { label: 'Operations',           color: 'bg-orange-100 text-orange-700'},
    CEO:           { label: 'Chief Executive',      color: 'bg-indigo-100 text-indigo-700'},
  };

  const getInitials = (username) => {
    if (!username) return '?';
    const parts = username.split('_');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (username) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-teal-500 to-teal-600',
    ];
    const index = username ? username.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const formatUsername = (username) => {
    if (!username) return 'Unknown';
    return username.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleInfo = (role) => {
    if (!role) return { label: 'Unknown Role', color: 'bg-gray-100 text-gray-700' };
    return roleConfig[role] || {
      label: role.replace(/_/g, ' '),
      color: 'bg-gray-100 text-gray-700',
    };
  };

  // Search filter
  const filteredMembers = teamMembers.filter((member) => {
    const q = searchQuery.toLowerCase();
    return (
      formatUsername(member.username).toLowerCase().includes(q) ||
      getRoleInfo(member.role).label.toLowerCase().includes(q)
    );
  });

  // Group by role
  const groupedMembers = filteredMembers.reduce((acc, member) => {
    if (!acc[member.role]) acc[member.role] = [];
    acc[member.role].push(member);
    return acc;
  }, {});

  const selectedMember = teamMembers.find((m) => m.id === parseInt(value));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsDropdownOpen]);

  const handleSelectMember = (memberId) => {
    onChange(memberId.toString());
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        <User className="w-4 h-4 text-indigo-600" />
        Assign To <span className="text-red-500">*</span>
      </label>

      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        className={`w-full px-4 py-3 bg-slate-50 border ${
          error ? 'border-red-500' : 'border-slate-200'
        } rounded-xl cursor-pointer hover:border-indigo-300 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          {selectedMember ? (
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(selectedMember.username)}`}>
                {getInitials(selectedMember.username)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{formatUsername(selectedMember.username)}</div>
                <div className="text-xs text-slate-500">{getRoleInfo(selectedMember.role).label}</div>
              </div>
            </div>
          ) : (
            <span className="text-slate-400">Select team member</span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute z-50 mt-2 w-full md:w-[calc(50%-12px)] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-96 overflow-hidden">

          {/* Search input */}
          <div className="p-3 border-b border-slate-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Members list */}
          <div className="max-h-80 overflow-y-auto">
            {Object.keys(groupedMembers).length === 0 ? (
              <div className="p-4 text-center text-slate-500">No members found</div>
            ) : (
              Object.entries(groupedMembers).map(([role, members]) => {
                const roleInfo = getRoleInfo(role);
                return (
                  <div key={role}>
                    {/* Role header — FIX: removed roleInfo.icon (was undefined) */}
                    <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {roleInfo.label}
                        </span>
                        <span className="text-xs text-slate-500">({members.length})</span>
                      </div>
                    </div>

                    {members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleSelectMember(member.id)}
                        className={`px-4 py-3 cursor-pointer transition-all ${
                          value === member.id.toString()
                            ? 'bg-indigo-50 border-l-4 border-indigo-600'
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${getAvatarColor(member.username)}`}>
                            {getInitials(member.username)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {formatUsername(member.username)}
                              {value === member.id.toString() && (
                                <Check size={16} className="text-indigo-600" />
                              )}
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
