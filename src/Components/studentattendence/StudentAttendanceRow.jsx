import React from 'react';
import StatusButton from './StatusButton';
import { attendenceStatusOptions } from '../utils/attendenceStatusOptions';

export default function StudentAttendanceRow({
  student,
  selectedStatus,
  approvalStatus,
  onStatusChange,
  isSelected,
  onToggleSelect
}) {
  const isPending = approvalStatus === 'PENDING_FEE_APPROVAL' || 
    (selectedStatus === 'PRESENT' && student.fee_summary?.status === 'OVERDUE' && student.fee_attendance_policy !== 'FLEXIBLE');

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
              <div 
                className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${student.fee_summary.status === 'OVERDUE' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-50 text-indigo-700'}`}
                title={student.fee_summary.status === 'OVERDUE' ? 'Fee is OVERDUE. Attendance will require approval.' : ''}
              >
                <span>Fee {student.fee_summary.status}</span>
                <span>•</span>
                <span>Balance ₹{student.fee_summary.balance_due}</span>
                {student.fee_summary.status === 'OVERDUE' && (
                  <span className="ml-1 text-orange-600">(Needs Approval)</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {attendenceStatusOptions.map((option) => {
            // Override presentation if it's "PRESENT" but actually pending
            let displayOption = { ...option };
            if (option.value === 'PRESENT' && isPending) {
              displayOption.label = 'Pending';
              displayOption.color = 'bg-yellow-100 text-yellow-700 border-yellow-500';
              // Optionally override icon here if we import Clock or AlertTriangle, but keeping Check is fine for now
            }

            return (
              <StatusButton
                key={option.value}
                option={displayOption}
                isSelected={selectedStatus === option.value}
                onClick={() => onStatusChange(student.id, option.value)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
