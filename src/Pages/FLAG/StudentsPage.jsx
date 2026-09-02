import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Users, Search, Plus, Filter, Loader2, AlertTriangle, GraduationCap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Only FLAG Admin can create students, or if it's open to processing, we check the role.
  const canCreate = hasPermission('flag:admin');

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

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.batch_name && s.batch_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                          <button
                            onClick={() => navigate(`/flag/students/${student.id}`)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm"
                          >
                            View Profile
                          </button>
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
    </div>
  );
}
