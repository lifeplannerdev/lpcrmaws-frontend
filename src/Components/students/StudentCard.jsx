import React from 'react';
import { Mail, Phone, BookOpen, Calendar, Edit, Trash2, Eye, User, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  DROPPED: 'bg-red-100 text-red-700 border-red-200',
  dropped: 'bg-red-100 text-red-700 border-red-200',
  INACTIVE: 'bg-red-100 text-red-700 border-red-200',
  inactive: 'bg-red-100 text-red-700 border-red-200',
  pausedDropped: 'bg-red-100 text-red-700 border-red-200',
};

const StudentCard = React.memo(({ student, onDelete }) => {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`;
  const canEditStudents = (user?.permissions || []).includes('edit_students');

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      await axios.delete(`${API_BASE_URL}/students/${student.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Call the onDelete callback to refresh the student list
      if (onDelete) {
        onDelete(student.id);
      }

      alert('Student deleted successfully!');
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  return (
    <div className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={student.name}
            className="w-16 h-16 rounded-xl bg-gray-200 shadow-md group-hover:scale-110 transition-transform"
          />
          <div>
            <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
              {student.name}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                statusColors[student.status] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {typeof student.status === 'string' ? student.status.toUpperCase() : student.status}
            </span>
          </div>
        </div>
      <div className="text-right text-sm text-gray-600">
        <div className="flex items-center gap-1 justify-end">
          <User size={16} className="text-indigo-500" />
          <span className="font-medium">{student.trainer_name || 'No Trainer'}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1 font-medium">
          {student.academic_batch_details 
            ? `${student.academic_batch_details.name} (${student.academic_batch_details.academic_year})` 
            : `Batch ${student.batch || 'N/A'}`}
        </div>
        {student.fee_summary && (
          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <span>Fee</span>
            <span>{student.fee_summary.status}</span>
            <span>•</span>
            <span>₹{student.fee_summary.balance_due}</span>
          </div>
        )}
      </div>
      </div>

      {/* Class & Admission */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <BookOpen size={16} className="text-indigo-600" />
          <span className="font-medium">Class: {student.student_class || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} className="text-gray-400" />
          <span>Admitted: {student.admission_date}</span>
        </div>
      </div>

      {/* Notes */}
      {student.notes && (
        <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          {student.notes}
        </div>
      )}

      {/* Contact */}
      <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail size={14} className="text-gray-400" />
          <span className="truncate">{student.email || 'No email'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone size={14} className="text-gray-400" />
          <span>{student.phone_number || 'No phone'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => navigate(`/students/view/${student.id}`)} 
          className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-indigo-200 hover:border-indigo-300"
        >
          <Eye size={16} />
          View
        </button>
        {canEditStudents ? (
          <button 
            onClick={() => navigate(`/students/edit/${student.id}`)} 
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-blue-200 hover:border-blue-300"
          >
            <Edit size={16} />
            Edit
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 text-gray-400 bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border border-gray-200 cursor-not-allowed"
          >
            <Edit size={16} />
            Read Only
          </button>
        )}
        
        {/* ATTENDANCE BUTTON */}
        <button 
          onClick={() => navigate(`/students/${student.id}/attendance`)} 
          className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-purple-200 hover:border-purple-300"
        >
          <ClipboardCheck size={16} />
          Attendance
        </button>
        
        {/* DELETE BUTTON */}
        {canEditStudents ? (
          <button 
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-red-200 hover:border-red-300"
          >
            <Trash2 size={16} />
            Delete
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 text-gray-400 bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border border-gray-200 cursor-not-allowed"
          >
            <Trash2 size={16} />
            Locked
          </button>
        )}
      </div>
    </div>
  );
});

StudentCard.displayName = 'StudentCard';

export default StudentCard;
