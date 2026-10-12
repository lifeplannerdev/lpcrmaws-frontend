import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Users, Search, Plus, Filter, Loader2, AlertTriangle, GraduationCap, Edit, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import EditStudentModal from './EditStudentModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentsPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Only FLAG Admin can create/delete students
  const canCreate = hasPermission('flag:admin');
  const canEdit = hasPermission('flag:admin') || hasPermission('flag:trainer');
  const canDelete = hasPermission('flag:admin') || user?.is_superuser;
  const isTrainerOnly = (hasPermission('flag:trainer') || user?.role_names?.includes('TRAINER')) && !hasPermission('flag:admin') && !user?.is_superuser;

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/students/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStudents((data.results !== undefined ? data.results : (Array.isArray(data) ? data : [])));
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setDeleting(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/students/${studentToDelete.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
        setStudentToDelete(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Failed to delete student: ' + (err.detail || err.error || res.statusText));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting student.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.batch_name && s.batch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.campus_name && s.campus_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and view all enrolled German students</p>
              {isTrainerOnly && (
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg mt-1.5">
                  My Assigned Students
                </span>
              )}
            </div>
            {canCreate && (
              <Link 
                to="/flag/students/new"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Register Student
              </Link>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search students by name, phone, or batch..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Filter size={18} /> Filters
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No students found</h3>
                <p className="text-sm text-gray-500 mt-1">Adjust your search or register a new student.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student Name</th>
                      <th className="px-6 py-4 font-semibold">Contact</th>
                      <th className="px-6 py-4 font-semibold">Batch & Campus</th>
                      <th className="px-6 py-4 font-semibold">Current Grade</th>
                      <th className="px-6 py-4 font-semibold text-center">Fee Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{student.name}</span>
                            <span className="text-xs text-gray-500">ID: {student.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {student.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{student.batch_name || 'Unassigned'}</span>
                            <span className="text-xs text-gray-500">{student.campus_name || 'No Campus'}</span>
                            {student.trainer_name && (
                              <span className="text-[11px] text-indigo-600 font-semibold mt-0.5">Trainer: {student.trainer_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                            <GraduationCap size={14} />
                            {student.current_grade || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {student.fee_status === 'NO_ACCOUNT' ? (
                            <span className="text-gray-600 font-semibold bg-gray-50 px-2 py-1 rounded-md text-xs border border-gray-200">No Account</span>
                          ) : student.fee_status === 'OVERDUE' ? (
                            <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-md text-xs border border-red-100">Overdue</span>
                          ) : student.fee_status === 'SETTLED' ? (
                            <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md text-xs border border-green-100">Settled</span>
                          ) : (
                            <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">{student.fee_status}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {canEdit && (
                              <button
                                onClick={() => setEditingStudent(student)}
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold text-sm transition-colors"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/flag/students/${student.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm"
                            >
                              View Profile
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => setStudentToDelete(student)}
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 font-semibold text-sm transition-colors ml-1"
                                title="Delete Student"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Student</h3>
                <p className="text-xs text-gray-500">Permanent action</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-gray-900">{studentToDelete.name}</strong>? All related records including batch enrollments, attendance, and exam marks will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition disabled:opacity-60 shadow-md shadow-rose-200"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? 'Deleting...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      <EditStudentModal
        student={editingStudent}
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        onSuccess={() => fetchStudents()}
      />
    </div>
  );
}
