import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { CheckCircle, XCircle, Clock, Calendar, Search, Loader2, Save, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AttendancePage() {
  const { accessToken, refreshAccessToken } = useAuth();
  
  const [academicBatches, setAcademicBatches] = useState([]);
  const [gradeBatches, setGradeBatches] = useState([]);
  
  const [selectedAcademicBatch, setSelectedAcademicBatch] = useState('');
  const [selectedGradeBatch, setSelectedGradeBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAcademicBatches();
  }, []);

  useEffect(() => {
    if (selectedAcademicBatch) {
      fetchGradeBatches(selectedAcademicBatch);
    } else {
      setGradeBatches([]);
      setSelectedGradeBatch('');
    }
  }, [selectedAcademicBatch]);

  useEffect(() => {
    if (selectedGradeBatch && date) {
      loadStudentsAndAttendance();
    } else {
      setStudents([]);
      setAttendanceData({});
    }
  }, [selectedGradeBatch, date]);

  const fetchAcademicBatches = async () => {
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/?status=active`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAcademicBatches(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeBatches = async (academicBatchId) => {
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/grade-batches/?academic_batch=${academicBatchId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const batches = data.results || data;
      setGradeBatches(batches);
      if (batches.length > 0) setSelectedGradeBatch(batches[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      
      // 1. Fetch Students in Grade Batch
      let allStudents = [];
      let studentUrl = `${API_BASE_URL}/students/students/?grade_batch=${selectedGradeBatch}&status=active`;
      while (studentUrl) {
        const res = await fetch(studentUrl, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.results !== undefined) {
          allStudents = [...allStudents, ...data.results];
          studentUrl = data.next;
        } else {
          allStudents = Array.isArray(data) ? data : [];
          studentUrl = null;
        }
      }
      setStudents(allStudents);

      // 2. Fetch Existing Attendance for this date
      const sessionRes = await fetch(`${API_BASE_URL}/students/attendance-sessions/?grade_batch=${selectedGradeBatch}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
      const sessionData = await sessionRes.json();
      const sessions = sessionData.results || sessionData;
      
      const attMap = {};
      
      if (sessions.length > 0) {
        const sessionId = sessions[0].id;
        const recordsRes = await fetch(`${API_BASE_URL}/students/attendance-records/?session=${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        const recordsData = await recordsRes.json();
        const records = recordsData.results || recordsData;
        records.forEach(r => {
          attMap[r.student] = r.status;
        });
      }

      // 3. Fill defaults for missing students
      allStudents.forEach(s => {
        if (!attMap[s.id]) {
          attMap[s.id] = 'present'; // Default backfill assumption
        }
      });
      setAttendanceData(attMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newMap = {};
    students.forEach(s => newMap[s.id] = status);
    setAttendanceData(newMap);
  };

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleSave = async (autoAdvance = false) => {
    try {
      setSaving(true);
      const token = accessToken || await refreshAccessToken();
      
      const records = Object.keys(attendanceData).map(studentId => ({
        student: studentId,
        status: attendanceData[studentId]
      }));

      const res = await fetch(`${API_BASE_URL}/students/attendance-sessions/bulk_entry/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          grade_batch: selectedGradeBatch,
          date: date,
          records: records
        })
      });
      
      if (res.ok) {
        // alert('Attendance saved successfully!');
        if (autoAdvance) {
          changeDate(1);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save attendance');
      }
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
      <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Attendance Backfill UI</h1>
          <p className="text-gray-500">Rapidly enter and backfill attendance for your grade batches.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Batch</label>
              <select 
                value={selectedAcademicBatch} 
                onChange={e => setSelectedAcademicBatch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
              >
                <option value="">-- Select Cohort --</option>
                {academicBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.package_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Batch</label>
              <select 
                value={selectedGradeBatch} 
                onChange={e => setSelectedGradeBatch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                disabled={!selectedAcademicBatch}
              >
                <option value="">-- Select Grade --</option>
                {gradeBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.grade_code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <div className="flex items-center gap-2">
                <button onClick={() => changeDate(-1)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                />
                <button onClick={() => changeDate(1)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedGradeBatch && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Students in Batch</h2>
                <p className="text-sm text-gray-500">Select attendance status for {date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-semibold transition-colors">
                  <CheckSquare size={16} /> Mark All Present
                </button>
                <button onClick={() => markAll('absent')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors">
                  <XCircle size={16} /> Mark All Absent
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No active students found in this grade batch.</div>
            ) : (
              <div>
                <div className="divide-y divide-gray-100">
                  {students.map(student => (
                    <div key={student.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-bold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">Joined: {student.joined_date}</div>
                      </div>
                      <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        {['present', 'absent', 'late', 'leave'].map(status => (
                          <button
                            key={status}
                            onClick={() => toggleStudent(student.id, status)}
                            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                              attendanceData[student.id] === status
                                ? status === 'present' ? 'bg-green-500 text-white shadow-sm'
                                : status === 'absent' ? 'bg-red-500 text-white shadow-sm'
                                : status === 'late' ? 'bg-yellow-500 text-white shadow-sm'
                                : 'bg-blue-500 text-white shadow-sm'
                                : 'text-gray-500 hover:bg-white/50'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-3">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Attendance
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                    Save & Next Day
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
