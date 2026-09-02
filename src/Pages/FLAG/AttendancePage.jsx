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
  const [attendanceData, setAttendanceData] = useState({});

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
      loadBatchStudents();
    }
  }, [selectedBatch, date]);

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
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Record daily attendance for batches</p>
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
            
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
              <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No active students</h3>
              <p className="text-sm text-gray-500 mt-1">This batch has no students to mark attendance for.</p>
            </div>
          ) : (
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
          )}

        </div>
      </div>
    </div>
  );
}
