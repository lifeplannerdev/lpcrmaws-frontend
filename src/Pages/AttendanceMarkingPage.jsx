// AttendanceMarkingPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar'
import { useAuth } from '../context/AuthContext';
import AttendanceMarkingHeader from '../Components/studentattendence/AttendanceMarkingHeader'
import DateSelector from '../Components/studentattendence/Dateselector'
import AttendanceStats from '../Components/studentattendence/Attendancestats'
import StudentAttendanceList from '../Components/studentattendence/StudentAttendanceList'
import SubmitButton from '../Components/studentattendence/SubmitButton'
import Alert from '../Components/common/Alert'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AttendanceMarkingPage() {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [approvalRecords, setApprovalRecords] = useState({});
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // New filters
  const [trainerFilter, setTrainerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);

  // Fetch students for the trainer (excludes COMPLETED students)
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) return;
      
      const params = new URLSearchParams();
      if (trainerFilter) params.append('trainer', trainerFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (branchFilter) params.append('branch_id', branchFilter);

      const res = await fetch(`${API_BASE_URL}/attendance/students/?${params.toString()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch students');
      }

      const data = await res.json();
      const studentsList = data.results || [];
      setStudents(studentsList);
      
      // Don't initialize records here - let fetchAttendance handle it
      
    } catch (err) {
      console.error('Failed to load students', err);
      setMessage({ type: 'error', text: 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  // In AttendanceMarkingPage.jsx - fetchAttendance function
const fetchAttendance = useCallback(async (studentsList) => {
  try {
    let token = accessToken || await refreshAccessToken();
    if (!token) return;

    // Use the correct endpoint: /attendance/detail/ (not /details/)
    const res = await fetch(
      `${API_BASE_URL}/attendance/detail/?date=${selectedDate}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch attendance');
    }

    const data = await res.json();
    const existingAttendance = data.results || [];

    // Create a map of existing attendance records
    const attendanceMap = {};
    const approvalMap = {};
    existingAttendance.forEach(record => {
      attendanceMap[record.student] = record.status;
      approvalMap[record.student] = record.approval_status;
    });

    // Initialize records for all students
    const initialRecords = {};
    const initialApproval = {};
    const studentsToUse = studentsList || students;
    
    studentsToUse.forEach(student => {
      // Use existing attendance if available, otherwise default to ABSENT
      initialRecords[student.id] = attendanceMap[student.id] || 'ABSENT';
      initialApproval[student.id] = approvalMap[student.id] || null;
    });

    setAttendanceRecords(initialRecords);
    setApprovalRecords(initialApproval);
    
    // Select all students by default
    setSelectedStudents(studentsToUse.map(s => s.id));

  } catch (err) {
    console.error('Failed to fetch attendance', err);
    // If fetch fails, initialize with ABSENT as default
    const initialRecords = {};
    const initialApproval = {};
    const studentsToUse = studentsList || students;
    studentsToUse.forEach(student => {
      initialRecords[student.id] = 'ABSENT';
      initialApproval[student.id] = null;
    });
    setAttendanceRecords(initialRecords);
    setApprovalRecords(initialApproval);
    setSelectedStudents(studentsToUse.map(s => s.id));
  }
}, [accessToken, refreshAccessToken, selectedDate, students]);

  // Load students on mount and when filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents, trainerFilter, locationFilter, branchFilter]);

  // Load branches
  useEffect(() => {
    const fetchBranches = async () => {
      let token = accessToken;
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/branches/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setBranches(data || []);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    fetchBranches();
  }, [accessToken]);

  // Fetch attendance when students are loaded or date changes
  useEffect(() => {
    if (students.length > 0) {
      fetchAttendance(students);
    }
  }, [selectedDate, students.length]); // Re-fetch when date changes

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    // fetchAttendance will be called by useEffect
  };

  // Handle individual student selection
  const handleToggleSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handle select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  // Handle attendance status change
  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Bulk mark selected students with a specific status
  const handleBulkMarkSelected = (status) => {
    const updatedRecords = { ...attendanceRecords };
    selectedStudents.forEach(studentId => {
      updatedRecords[studentId] = status;
    });
    setAttendanceRecords(updatedRecords);
    
    const statusLabel = status === 'PRESENT' ? 'present' : 
                        status === 'ABSENT' ? 'absent' : 'no session';
    setMessage({ 
      type: 'success', 
      text: `${selectedStudents.length} student(s) marked as ${statusLabel}` 
    });
    setTimeout(() => setMessage(null), 2000);
  };

  // Submit attendance
  const handleSubmit = async () => {
    try {
      setSaving(true);
      setMessage(null);

      let token = accessToken || await refreshAccessToken();
      if (!token) return;

      const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        student: parseInt(studentId),
        status: status
      }));

      const res = await fetch(`${API_BASE_URL}/attendance/quick-mark/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          records: records
        })
      });

      if (!res.ok) throw new Error('Failed to save attendance');

      setMessage({ 
        type: 'success', 
        text: `Attendance marked successfully for ${records.length} students on ${selectedDate}` 
      });

      // Refresh attendance data after successful save
      await fetchAttendance(students);

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save attendance', err);
      setMessage({ 
        type: 'error', 
        text: 'Failed to save attendance. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Quick mark all as present
  const markAllPresent = () => {
    const allPresent = {};
    students.forEach(student => {
      allPresent[student.id] = 'PRESENT';
    });
    setAttendanceRecords(allPresent);
    setMessage({ 
      type: 'success', 
      text: 'All students marked as present' 
    });
    setTimeout(() => setMessage(null), 2000);
  };

  // Get status counts
  const getStatusCounts = () => {
    const counts = { PRESENT: 0, ABSENT: 0, NO_SESSION: 0 };
    Object.values(attendanceRecords).forEach(status => {
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AttendanceMarkingHeader />

        {message && (
          <Alert
            type={message.type}
            message={message.text}
            className="mb-6"
          />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Trainer ID</label>
            <input 
              type="text" 
              placeholder="Filter by Trainer ID..."
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input 
              type="text" 
              placeholder="Filter by Location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DateSelector
          selectedDate={selectedDate}
          onDateChange={handleDateChange}  
          onMarkAllPresent={markAllPresent}
          selectedStudents={selectedStudents}
          onBulkMarkSelected={handleBulkMarkSelected}
        />

        <AttendanceStats
          totalStudents={students.length}
          statusCounts={statusCounts}
        />

        <StudentAttendanceList 
          students={students}
          attendanceRecords={attendanceRecords}
          approvalRecords={approvalRecords}
          onStatusChange={handleStatusChange}
          loading={loading}
          selectedStudents={selectedStudents}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />

        <SubmitButton
          onSubmit={handleSubmit}
          saving={saving}
          disabled={students.length === 0}
        />
      </div>
    </div>
  );
}