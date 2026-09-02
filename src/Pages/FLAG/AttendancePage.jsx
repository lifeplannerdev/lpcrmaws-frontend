import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { Check, X, Clock, Calendar, AlertTriangle, Search, Filter, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AttendancePage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark', 'view'
  const [attendanceData, setAttendanceData] = useState({});
  const [viewAttendanceRecords, setViewAttendanceRecords] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/?status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const fetchedBatches = (data.results !== undefined ? data.results : (Array.isArray(data) ? data : []));
      setBatches(fetchedBatches);
      if (fetchedBatches.length > 0) {
        setSelectedBatch(fetchedBatches[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      if (activeTab === 'mark') {
        loadBatchStudents();
      } else {
        loadBatchStudentsAndViewData();
      }
    }
  }, [selectedBatch, date, activeTab]);

  const loadBatchStudents = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/students/?batch=${selectedBatch}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const stData = (data.results !== undefined ? data.results : (Array.isArray(data) ? data : []));
      setStudents(stData);
      
      const initialAtt = {};
      stData.forEach(s => {
        initialAtt[s.id] = s.has_pending_fees ? 'pending' : 'present';
      });
      setAttendanceData(initialAtt);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchStudentsAndViewData = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      
      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/students/?batch=${selectedBatch}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/attendance-records/?session__batch=${selectedBatch}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const sData = await studentsRes.json();
      const aData = await attendanceRes.json();
      
      const stData = (sData.results !== undefined ? sData.results : (Array.isArray(sData) ? sData : []));
      const attData = (aData.results !== undefined ? aData.results : (Array.isArray(aData) ? aData : []));
      
      setStudents(stData);
      setViewAttendanceRecords(attData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (student?.has_pending_fees) return; // Cannot toggle pending fees

    setAttendanceData(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : prev[studentId] === 'absent' ? 'late' : 'present'
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = accessToken || await refreshAccessToken();
      
      // Step 1: Create Session
      const sessionRes = await fetch(`${API_BASE_URL}/students/attendance-sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          batch: selectedBatch,
          date: date,
          is_finalized: true
        })
      });
      
      const session = await sessionRes.json();
      if (!sessionRes.ok) {
        alert(session.detail || 'Failed to create session. It might already exist for this date.');
        setSaving(false);
        return;
      }

      // Step 2: Create Records
      const promises = students.map(s => {
        return fetch(`${API_BASE_URL}/students/attendance-records/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            session: session.id,
            student: s.id,
            status: attendanceData[s.id]
          })
        });
      });

      await Promise.all(promises);
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
              <p className="text-sm text-gray-500 mt-1">Record and view attendance for batches</p>
            </div>
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
              <button 
                onClick={() => setActiveTab('mark')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'mark' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Mark Attendance
              </button>
              <button 
                onClick={() => setActiveTab('view')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'view' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                View Attendance
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Batch</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={selectedBatch || ''}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            {activeTab === 'mark' && (
              <div className="w-full md:w-1/4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
              <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No active students</h3>
              <p className="text-sm text-gray-500 mt-1">This batch has no students.</p>
            </div>
          ) : activeTab === 'mark' ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Attendance Grid</h3>
                <div className="flex gap-4 text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600"><Check size={16}/> Present</span>
                  <span className="flex items-center gap-1.5 text-rose-600"><X size={16}/> Absent</span>
                  <span className="flex items-center gap-1.5 text-yellow-600"><Clock size={16}/> Late</span>
                  <span className="flex items-center gap-1.5 text-orange-600"><AlertTriangle size={16}/> Pending</span>
                </div>
              </div>
              
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold">ID</th>
                      <th className="px-6 py-4 font-semibold">Fee Status</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">#{student.id}</td>
                        <td className="px-6 py-4">
                          {student.has_pending_fees ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-bold border border-red-100">
                              <AlertTriangle size={12}/> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold border border-green-100">
                              <Check size={12}/> Clear
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {attendanceData[student.id] === 'present' && <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-lg border border-emerald-200">Present</span>}
                          {attendanceData[student.id] === 'absent' && <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 font-bold text-sm rounded-lg border border-rose-200">Absent</span>}
                          {attendanceData[student.id] === 'late' && <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 font-bold text-sm rounded-lg border border-yellow-200">Late</span>}
                          {attendanceData[student.id] === 'pending' && <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 font-bold text-sm rounded-lg border border-orange-200">Pending</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleAttendance(student.id)}
                            disabled={student.has_pending_fees}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors
                              ${student.has_pending_fees ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'}`}
                          >
                            Toggle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Attendance
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Attendance Overview</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold text-center">Total Classes</th>
                      <th className="px-6 py-4 font-semibold text-center">Present</th>
                      <th className="px-6 py-4 font-semibold text-center">Percentage</th>
                      <th className="px-6 py-4 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(student => {
                      const studentRecords = viewAttendanceRecords.filter(r => r.student === student.id);
                      const totalClasses = studentRecords.length;
                      const presentClasses = studentRecords.filter(r => r.status === 'present').length;
                      const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
                      
                      const isExpanded = expandedStudent === student.id;

                      return (
                        <React.Fragment key={student.id}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900">{student.name}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{totalClasses}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{presentClasses}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 font-bold text-sm rounded-lg ${percentage >= 75 ? 'bg-green-100 text-green-700' : percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                              >
                                {isExpanded ? 'Hide Records' : 'View Records'}
                              </button>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan="5" className="px-8 py-6">
                                {studentRecords.length === 0 ? (
                                  <p className="text-sm text-gray-500">No records found for this student.</p>
                                ) : (
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                        <tr>
                                          <th className="px-4 py-3">Date</th>
                                          <th className="px-4 py-3">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {studentRecords.sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(rec => (
                                          <tr key={rec.id}>
                                            <td className="px-4 py-3 text-gray-700">{new Date(rec.session_date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                              {rec.status === 'present' ? <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-1 rounded">Present</span> :
                                               rec.status === 'absent' ? <span className="text-red-600 font-semibold text-xs bg-red-50 px-2 py-1 rounded">Absent</span> :
                                               <span className="text-gray-600 font-semibold text-xs bg-gray-50 px-2 py-1 rounded capitalize">{rec.status}</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
