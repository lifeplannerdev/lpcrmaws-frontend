import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

export default function StatusSelector({
  value,
  onChange,
  disabled = false,
}) {
  // Statuses a user can manually select
  const selectableStatuses = [
    { value: 'PENDING',     label: 'Pending',     color: 'bg-gray-50 border-gray-300 text-gray-700'    },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
    { value: 'COMPLETED',   label: 'Completed',   color: 'bg-green-50 border-green-300 text-green-700'  },
    { value: 'CANCELLED',   label: 'Cancelled',   color: 'bg-slate-50 border-slate-300 text-slate-600'  },
  ];

  // OVERDUE and PENDING_APPROVAL are managed via workflows
  const isOverdue = value === 'OVERDUE';
  const isPendingApproval = value === 'PENDING_APPROVAL';

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
        <AlertCircle className="w-4 h-4 text-indigo-600" />
        Task Status
      </label>

      {/* Read-only overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-2 px-4 py-3 mb-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-700 font-semibold text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This task is marked as <span className="font-bold">OVERDUE</span> — status is managed automatically.
        </div>
      )}

      {/* Read-only pending approval banner */}
      {isPendingApproval && (
        <div className="flex items-center gap-2 px-4 py-3 mb-3 bg-purple-50 border-2 border-purple-300 rounded-xl text-purple-700 font-semibold text-sm">
          <Clock className="w-4 h-4 flex-shrink-0" />
          This task is marked as <span className="font-bold">PENDING APPROVAL</span> — awaiting Managing Director review.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {selectableStatuses.map((s) => (
          <label
            key={s.value}
            className={`relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              value === s.value
                ? s.color + ' shadow-md scale-105'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
            } ${disabled || isOverdue ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="status"
              value={s.value}
              checked={value === s.value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute opacity-0"
              disabled={disabled || isOverdue}
            />
            <span className="font-semibold text-sm">{s.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
