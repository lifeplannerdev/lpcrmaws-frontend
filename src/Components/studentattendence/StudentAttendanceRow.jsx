import React from 'react';
import StatusButton from './StatusButton';
import { attendenceStatusOptions } from '../utils/attendenceStatusOptions';

export default function StudentAttendanceRow({
  student,
  selectedStatus,
  onStatusChange,
  isSelected,
  onToggleSelect
}) {
  return (
    <div className={`p-4 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(student.id)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          />
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`}
            alt={student.name}
            className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Batch {student.batch}</span>
              <span className="text-gray-400">•</span>
              <span>{student.student_class}</span>
            </div>
            {student.fee_summary && (
              <div className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${student.fee_summary.status === 'OVERDUE' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
                <span>Fee {student.fee_summary.status}</span>
                <span>•</span>
                <span>Balance ₹{student.fee_summary.balance_due}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {attendenceStatusOptions.map((option) => (
            <StatusButton
              key={option.value}
              option={option}
              isSelected={selectedStatus === option.value}
              onClick={() => onStatusChange(student.id, option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
