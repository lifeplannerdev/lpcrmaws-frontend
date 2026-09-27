import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Info, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentWiseAttendanceReport() {
  const { accessToken, refreshAccessToken } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  const [filterBatch, setFilterBatch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const token = accessToken || await refreshAccessToken();
        let allStudents = [];
        let url = `${API_BASE_URL}/students/students/`;
        
        while (url) {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.results !== undefined) {
            allStudents = [...allStudents, ...data.results];
            url = data.next; // DRF returns full URL for next
          } else {
            allStudents = Array.isArray(data) ? data : [];
            url = null;
          }
        }
        setStudents(allStudents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSelectStudent = async (studentId) => {
    setSelectedStudent(studentId);
    setFilterBatch('');
    setFilterGrade('');
    setLoadingRecords(true);
    
    try {
      const token = accessToken || await refreshAccessToken();
      
      let allRecords = [];
      let url = `${API_BASE_URL}/students/attendance-records/?student=${studentId}`;
      
      while (url) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.results !== undefined) {
          allRecords = [...allRecords, ...data.results];
          url = data.next;
        } else {
          allRecords = Array.isArray(data) ? data : [];
          url = null;
        }
      }
      
      const enhancedRecords = allRecords.map(r => ({
        ...r,
        batch_name: r.batch_name || 'Unknown Batch',
        grade_name: r.grade_name || 'N/A'
      }));

      setAttendanceRecords(enhancedRecords);

      const uniqueBatches = [...new Set(enhancedRecords.map(r => r.batch_name))];
      const uniqueGrades = [...new Set(enhancedRecords.map(r => r.grade_name))];
      
      setAvailableBatches(uniqueBatches);
      setAvailableGrades(uniqueGrades);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toString().includes(searchQuery)
  );

  const filteredRecords = attendanceRecords.filter(r => {
    if (filterBatch && r.batch_name !== filterBatch) return false;
    if (filterGrade && r.grade_name !== filterGrade) return false;
    return true;
  }).sort((a, b) => new Date(b.session_date) - new Date(a.session_date));

  const totalClasses = filteredRecords.length;
  const presentClasses = filteredRecords.filter(r => r.status === 'present').length;
  const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
        
        <div className="w-full md:w-1/3 border-r border-gray-100 pr-0 md:pr-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Select Student</h3>
          
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No students found.</p>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.id}
                  onClick={() => handleSelectStudent(student.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedStudent === student.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'}`}
                >
                  <p className={`font-semibold ${selectedStudent === student.id ? 'text-indigo-900' : 'text-gray-900'}`}>{student.name}</p>
                  <p className={`text-xs ${selectedStudent === student.id ? 'text-indigo-600' : 'text-gray-500'}`}>ID: #{student.id} &bull; {student.batch_name || 'No Batch'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="w-full md:w-2/3">
          {!selectedStudent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Info className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Student Selected</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">Select a student from the list to view their comprehensive attendance report across all batches and grades.</p>
            </div>
          ) : loadingRecords ? (
            <div className="h-full flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex gap-4 w-full sm:w-auto">
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filter Batch</label>
                    <select 
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                    >
                      <option value="">All Batches</option>
                      {availableBatches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filter Grade</label>
                    <select 
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                    >
                      <option value="">All Grades</option>
                      {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                    <p className="font-bold text-xl text-gray-900">{totalClasses}</p>
                  </div>
                  <div className="text-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold">Present</p>
                    <p className="font-bold text-xl text-emerald-600">{presentClasses}</p>
                  </div>
                  <div className={`text-center px-4 py-2 rounded-xl border shadow-sm ${percentage >= 75 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : percentage >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    <p className="text-xs uppercase font-bold opacity-80">Attendance</p>
                    <p className="font-bold text-xl">{percentage}%</p>
                  </div>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">No attendance records found for the selected filters.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Date</th>
                          <th className="px-6 py-3 font-semibold">Batch</th>
                          <th className="px-6 py-3 font-semibold">Grade Context</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3.5 font-medium text-gray-900">{new Date(rec.session_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="px-6 py-3.5 text-gray-600">{rec.batch_name}</td>
                            <td className="px-6 py-3.5 text-gray-600">
                              <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200">
                                {rec.grade_name}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {rec.status === 'present' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs border border-emerald-200">
                                  <CheckCircle size={14} /> Present
                                </span>
                              ) : rec.status === 'absent' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold text-xs border border-rose-200">
                                  <XCircle size={14} /> Absent
                                </span>
                              ) : rec.status === 'late' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs border border-amber-200">
                                  <Clock size={14} /> Late
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 rounded-lg font-bold text-xs border border-orange-200 capitalize">
                                  <AlertTriangle size={14} /> {rec.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
