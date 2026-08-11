import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Edit2, Search } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const StudentRegistryPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { accessToken, refreshAccessToken } = useAuth();

  const fetchStudents = useCallback(async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/api/students/students/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Student Registry (FLAG)</h1>
          <p className="text-gray-500 mt-2">Accounts team: Add students, manage packages, and define fee policies.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <UserPlus size={20} /> Add Student
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Package</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Batch</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Fee Policy</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{student.name}</td>
                  <td className="px-6 py-4">{student.package_detail?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{student.batch_detail?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${student.fee_attendance_policy === 'STRICT' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {student.fee_attendance_policy}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-brand-600 hover:text-brand-800"><Edit2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentRegistryPage;
