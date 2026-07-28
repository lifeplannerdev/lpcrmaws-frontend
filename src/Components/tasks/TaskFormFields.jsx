// Components/tasks/TaskFormFields.jsx
import React from 'react';
import { Calendar, FileText, AlertCircle } from 'lucide-react';
import TeamMemberSelector from './TeamMemberSelector';

export default function TaskFormFields({ 
  formData, 
  errors, 
  teamMembers, 
  onFieldChange, 
  disabled = false,
  isDropdownOpen,
  setIsDropdownOpen,
  searchQuery,
  setSearchQuery
}) {
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-8">
      {/* Title Field */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <FileText className="w-4 h-4 text-indigo-600" />
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          className={`w-full px-4 py-3.5 bg-slate-50 border ${
            errors.title ? 'border-red-500' : 'border-slate-200'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          placeholder="Enter a clear and concise task title"
          disabled={disabled}
        />
        {errors.title && (
          <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
            <AlertCircle size={14} />
            <span>{errors.title}</span>
          </div>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <FileText className="w-4 h-4 text-indigo-600" />
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          rows="5"
          className={`w-full px-4 py-3.5 bg-slate-50 border ${
            errors.description ? 'border-red-500' : 'border-slate-200'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-900 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          placeholder="Provide detailed information about the task objectives and requirements"
          disabled={disabled}
        />
        {errors.description && (
          <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
            <AlertCircle size={14} />
            <span>{errors.description}</span>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Member Selector */}
        <TeamMemberSelector
          value={formData.assignTo}
          onChange={(value) => onFieldChange('assignTo', value)}
          teamMembers={teamMembers}
          error={errors.assigned_to}
          disabled={disabled}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Deadline Field */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => onFieldChange('deadline', e.target.value)}
            min={getTodayDate()}
            onKeyDown={(e) => e.preventDefault()}
            className={`w-full px-4 py-3.5 bg-slate-50 border ${
              errors.deadline ? 'border-red-500' : 'border-slate-200'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={disabled}
          />
          {errors.deadline && (
            <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
              <AlertCircle size={14} />
              <span>{errors.deadline}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}