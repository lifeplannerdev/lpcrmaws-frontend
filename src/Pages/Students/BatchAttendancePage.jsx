import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BatchAttendancePage = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [approvalData, setApprovalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { accessToken, refreshAccessToken } = useAuth();

  const fetchBatches = useCallback(async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/students/batches/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Fetch students AND existing attendance records for the selected batch+date
  const fetchStudents = useCallback(async (batchId, selectedDate) => {
    if (!batchId) return;
    setLoading(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const [studentsRes, attendancesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/students/?batch=${batchId}&is_active=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/students/attendances/?batch=${batchId}&date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const studentList = studentsRes.data.results || studentsRes.data;
      const existingRecords = attendancesRes.data.results || attendancesRes.data;

      // Build map: studentId -> { status, approval_status }
      const existingMap = {};
      existingRecords.forEach(r => {
        existingMap[r.student] = { status: r.status, approval_status: r.approval_status };
      });

      setStudents(studentList);

      // Pre-fill from existing DB records, or default to PRESENT
      const initialData = {};
      const initialApproval = {};
      studentList.forEach(s => {
        if (existingMap[s.id]) {
          initialData[s.id] = existingMap[s.id].status;
          initialApproval[s.id] = existingMap[s.id].approval_status;
        } else {
          initialData[s.id] = 'PRESENT';
          initialApproval[s.id] = null;
        }
      });
      setAttendanceData(initialData);
      setApprovalData(initialApproval);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  const handleBatchChange = (e) => {
    const val = e.target.value;
    setSelectedBatch(val);
    fetchStudents(val, date);
  };

  // Re-fetch when date changes (if batch already selected)
  useEffect(() => {
    if (selectedBatch) {
      fetchStudents(selectedBatch, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch) return;
    setSubmitting(true);
    
    const payload = {
      batch_id: parseInt(selectedBatch),
      date: date,
      attendances: Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status: status
      }))
    };

    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const res = await axios.post(`${API_BASE_URL}/students/attendances/bulk_submit/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);

      // Refresh to get updated approval_status from DB
      await fetchStudents(selectedBatch, date);

      const pending = res.data.data.filter(a => a.approval_status === 'PENDING');
      if (pending.length > 0) {
        alert(`${pending.length} attendances require Accounts Regularization due to fee dues.`);
      }
    } catch (err) {
      alert('Failed to submit attendance.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mark Attendance</h1>
        <p className="text-gray-500 mt-2">Select a batch and date to record daily attendance.</p>
      </div>

      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Batch</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none"
            value={selectedBatch}
            onChange={handleBatchChange}
          >
            <option value="">-- Choose a Batch --</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.current_grade_detail?.name})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="date"
              className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading students...</div>
      ) : students.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-700">Student Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.company}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleStatusChange(student.id, 'PRESENT')}
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg font-medium transition-all ${
                          attendanceData[student.id] === 'PRESENT' 
                            ? (student.fee_attendance_policy === 'STRICT' && student.has_fee_due)
                              ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500/50' // Pending Due
                              : 'bg-green-100 text-green-700 ring-2 ring-green-500/50' // Normal Present
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle2 size={18} /> {
                          (attendanceData[student.id] === 'PRESENT' && student.fee_attendance_policy === 'STRICT' && student.has_fee_due)
                          ? 'Pending' : 'Present'
                        }
                      </button>
                      
                      <button
                        onClick={() => handleStatusChange(student.id, 'ABSENT')}
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg font-medium transition-all ${
                          attendanceData[student.id] === 'ABSENT' 
                            ? 'bg-red-100 text-red-700 ring-2 ring-red-500/50' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <XCircle size={18} /> Absent
                      </button>
                      
                      <button
                        onClick={() => handleStatusChange(student.id, 'OFFDAY')}
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg font-medium transition-all ${
                          attendanceData[student.id] === 'OFFDAY' 
                            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500/50' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Clock size={18} /> Offday
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 bg-gray-50/80 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-500" />
              <span>Strict policies will automatically flag dues to Accounts for regularization.</span>
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      ) : selectedBatch ? (
        <div className="text-center py-12 text-gray-500">No active students in this batch.</div>
      ) : null}
    </div>
  );
};

export default BatchAttendancePage;
