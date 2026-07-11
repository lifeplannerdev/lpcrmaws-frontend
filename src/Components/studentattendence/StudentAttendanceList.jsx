import React from 'react';
import { Users } from 'lucide-react';
import Card from '../common/Card'
import StudentAttendanceRow from './StudentAttendanceRow';
import EmptyState from '../common/EmptyState';

export default function StudentAttendanceList({ 
  students, 
  attendanceRecords, 
  approvalRecords,
  onStatusChange, 
  loading,
  selectedStudents,
  onToggleSelect,
  onToggleSelectAll
}) {
  const allSelected = students.length > 0 && selectedStudents.length === students.length;
  const someSelected = selectedStudents.length > 0 && selectedStudents.length < students.length;

  return (
    <Card padding="p-0" className="mb-6 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            Student Attendance ({students.length})
          </h2>
          
          {/* Select All Checkbox */}
          {students.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={onToggleSelectAll}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <label className="text-sm font-semibold text-gray-700 cursor-pointer" onClick={onToggleSelectAll}>
                {allSelected ? 'Deselect All' : someSelected ? `Selected (${selectedStudents.length})` : 'Select All'}
              </label>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="p-12">
          <EmptyState
            icon={Users}
            title="No active students found"
            description="There are no active students to mark attendance for"
          />
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {students.map((student) => (
            <StudentAttendanceRow
              key={student.id}
              student={student}
              selectedStatus={attendanceRecords[student.id]}
              approvalStatus={approvalRecords?.[student.id]}
              onStatusChange={onStatusChange}
              isSelected={selectedStudents.includes(student.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </Card>
  );
}