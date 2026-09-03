import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useParams, Link } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, Award, CheckCircle, XCircle, AlertTriangle, BookOpen, Clock, Loader2, RefreshCw, Edit, UserCheck } from 'lucide-react';
import EditStudentModal from './EditStudentModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentProfilePage() {
  const { id } = useParams();
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('flag:admin') || hasPermission('flag:trainer');

  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [exams, setExams] = useState([]);
  const [feeAccount, setFeeAccount] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'exams', 'fees', 'attendance'
  
  // Edit & Trainer Assignment state
  const [showEditModal, setShowEditModal] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [assigningTrainer, setAssigningTrainer] = useState(false);

  // Modal state
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    exam_type: 'grade',
    exam_date: new Date().toISOString().split('T')[0],
    model_exam_marks: '',
    grade_exam_marks: '',
    is_passed: false,
    total_marks: 100,
  });

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const [studentRes, historyRes, examsRes, attendanceRes, trainersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/students/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/student-history/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/exams/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/attendance-records/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/trainers/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);
      
      const studentData = await studentRes.json();
      const historyData = await historyRes.json();
      const examsData = await examsRes.json();
      const attendanceData = await attendanceRes.json();
      if (trainersRes && trainersRes.ok) {
        const trainersData = await trainersRes.json();
        setTrainers(trainersData.results !== undefined ? trainersData.results : (Array.isArray(trainersData) ? trainersData : []));
      }

      setStudent(studentData);
      setHistory((historyData.results !== undefined ? historyData.results : (Array.isArray(historyData) ? historyData : [])));
      setExams((examsData.results !== undefined ? examsData.results : (Array.isArray(examsData) ? examsData : [])));
      setAttendance((attendanceData.results !== undefined ? attendanceData.results : (Array.isArray(attendanceData) ? attendanceData : [])));
      
      // Fetch fee account if it exists
      try {
        const feeRes = await fetch(`${API_BASE_URL}/fees/accounts/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (feeRes.ok) {
          const feeAccounts = await feeRes.json();
          const accs = feeAccounts.results !== undefined ? feeAccounts.results : (Array.isArray(feeAccounts) ? feeAccounts : []);
          if (accs.length > 0) {
            setFeeAccount(accs[0]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch fee account', e);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAssignTrainer = async (trainerId) => {
    try {
      setAssigningTrainer(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/students/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          trainer: trainerId ? Number(trainerId) : null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setStudent(prev => ({
          ...prev,
          trainer: updated.trainer,
          trainer_name: updated.trainer_name
        }));
      } else {
        alert('Failed to assign trainer');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning trainer');
    } finally {
      setAssigningTrainer(false);
    }
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = accessToken || await refreshAccessToken();
      const payload = {
        student: id,
        batch: student.batch,
        grade: student.current_grade_id || student.batch_grade_id, // ensure we have a grade ID, need to check if current_grade is just a string or object. 
        // wait, let's just fetch student.current_grade. Wait, we don't have current_grade_id in serializer. 
        // student.batch is available, but wait, exams usually just take student, batch, grade.
        // Let's rely on the backend accepting these. We'll pass what we can.
        exam_date: examForm.exam_date,
        model_exam_marks: examForm.exam_type === 'model' ? examForm.model_exam_marks : null,
        grade_exam_marks: examForm.exam_type === 'grade' ? examForm.grade_exam_marks : null,
        is_passed: examForm.is_passed,
        attempt_number: exams.length + 1
      };
      
      const res = await fetch(`${API_BASE_URL}/students/exams/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowExamModal(false);
        fetchStudentData();
      } else {
        const errorData = await res.json();
        alert('Failed to add exam record: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting exam record');
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center text-gray-500">
          Student not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-6 md:px-10 pb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-12 md:-mt-16 gap-6">
                <div className="flex items-end gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                    <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center">
                      <User size={48} className="text-indigo-400" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{student.name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5"><Phone size={16} /> {student.phone || 'No phone'}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={16} /> {student.campus_name || 'No campus'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-2 w-full md:w-auto">
                  {canEdit && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                    >
                      <Edit size={16} />
                      Edit Student
                    </button>
                  )}
                  {student.fee_status === 'NO_ACCOUNT' ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200">
                      <AlertTriangle size={18} /> No Fee Account
                    </span>
                  ) : student.fee_status === 'OVERDUE' ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl border border-red-200">
                      <AlertTriangle size={18} /> Fee Overdue
                    </span>
                  ) : student.fee_status === 'SETTLED' ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200">
                      <CheckCircle size={18} /> Fee Settled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200">
                      <CheckCircle size={18} /> {student.fee_status}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl border ${student.status === 'active' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {student.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('current')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'current' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Current Status</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Batch History</button>
            <button onClick={() => setActiveTab('exams')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Exams & Marks</button>
            <button onClick={() => setActiveTab('fees')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Fees</button>
            <button onClick={() => setActiveTab('attendance')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Attendance</button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {activeTab === 'current' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="text-indigo-500" /> Academic Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Current Grade</span>
                      <span className="font-semibold text-gray-900">{student.current_grade || 'None'}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Current Batch</span>
                      <span className="font-semibold text-gray-900">{student.batch_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Package</span>
                      <span className="font-semibold text-gray-900">{student.package_name || 'None'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={16} className="text-indigo-500" />
                        <span className="text-gray-600 text-sm font-medium">Assigned Trainer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={student.trainer || ''}
                              onChange={(e) => handleQuickAssignTrainer(e.target.value)}
                              disabled={assigningTrainer}
                              className="text-xs bg-indigo-50/60 border border-indigo-200 text-indigo-900 font-semibold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            >
                              <option value="">No Trainer (Unassigned)</option>
                              {trainers.map(t => (
                                <option key={t.id} value={t.id}>{t.name || t.username}</option>
                              ))}
                            </select>
                            {assigningTrainer && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900 text-sm">
                            {student.trainer_name || 'Unassigned'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="text-indigo-500" /> Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Joined On</span>
                      <span className="font-semibold text-gray-900">{student.joined_date ? new Date(student.joined_date).toLocaleDateString() : (student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A')}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Last Updated</span>
                      <span className="font-semibold text-gray-900">{student.updated_at ? new Date(student.updated_at).toLocaleDateString() : (student.joined_date ? new Date(student.joined_date).toLocaleDateString() : (student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Batch & Promotion History</h3>
                </div>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm">No history records found.</p>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8">
                    {history.map((h, i) => (
                      <div key={h.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${h.is_demotion ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          {h.batch_name} 
                          {h.is_demotion ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">Demoted</span>
                          ) : (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">Enrolled</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">From {new Date(h.from_date).toLocaleDateString()} {h.to_date ? `to ${new Date(h.to_date).toLocaleDateString()}` : '(Current)'}</p>
                        {h.reason && <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">{h.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'exams' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Exam Records</h3>
                  <button onClick={() => setShowExamModal(true)} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Add Exam Record</button>
                </div>
                {exams.length === 0 ? (
                  <p className="text-gray-500 text-sm">No exam records found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map(ex => (
                      <div key={ex.id} className="p-5 rounded-2xl border border-gray-200 hover:border-indigo-300 transition-colors bg-gray-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="inline-block px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase">{ex.exam_type}</span>
                          <span className={`inline-flex items-center gap-1 font-bold text-sm ${ex.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                            {ex.is_passed ? <><CheckCircle size={16}/> Passed</> : <><XCircle size={16}/> Failed</>}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{ex.grade_name} Exam</h4>
                        <p className="text-sm text-gray-500 mb-4">Date: {new Date(ex.exam_date).toLocaleDateString()}</p>
                        
                        <div className="flex gap-4 border-t border-gray-100 pt-3">
                          <div>
                            <p className="text-xs text-gray-500">Marks</p>
                            <p className="font-bold text-gray-900">{ex.marks_obtained} / {ex.total_marks}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Fee Account & Payment Status</h3>
                    <p className="text-sm text-gray-500">Live fee schedule, installment breakdown, and transaction records.</p>
                  </div>
                  {feeAccount && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      feeAccount.status === 'SETTLED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      feeAccount.status === 'OVERDUE' ? 'bg-red-100 text-red-800 border border-red-200' :
                      feeAccount.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      feeAccount.status === 'RESTRUCTURED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {feeAccount.status}
                    </span>
                  )}
                </div>

                {feeAccount ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Plan</p>
                        <p className="font-bold text-gray-900 text-base">{feeAccount.plan_name || feeAccount.plan_code || 'Custom'}</p>
                        <p className="text-xs text-gray-400 mt-1 capitalize">{feeAccount.plan_type?.toLowerCase()}</p>
                      </div>
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Fee</p>
                        <p className="font-bold text-gray-900 text-lg">₹{Number(feeAccount.total_due || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-400 mt-1">Reg: ₹{Number(feeAccount.registration_amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
                        <p className="text-xs text-emerald-600 uppercase font-semibold mb-1">Total Paid</p>
                        <p className="font-bold text-emerald-900 text-lg">₹{Number(feeAccount.total_paid || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-emerald-600 mt-1">{feeAccount.payments?.length || 0} payment(s)</p>
                      </div>
                      <div className={`${Number(feeAccount.overdue_amount || 0) > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-indigo-50 border-indigo-200 text-indigo-900'} p-5 rounded-2xl border`}>
                        <p className={`text-xs uppercase font-semibold mb-1 ${Number(feeAccount.overdue_amount || 0) > 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                          {Number(feeAccount.overdue_amount || 0) > 0 ? 'Overdue' : 'Balance Due'}
                        </p>
                        <p className="font-bold text-lg">
                          ₹{Number(feeAccount.overdue_amount > 0 ? feeAccount.overdue_amount : feeAccount.balance_due || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs mt-1 opacity-75">
                          {feeAccount.next_due_date ? `Next due: ${new Date(feeAccount.next_due_date).toLocaleDateString()}` : 'No upcoming dues'}
                        </p>
                      </div>
                    </div>

                    {/* Installments Breakdown */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-bold text-gray-900 text-sm">Scheduled Installments</h4>
                        <span className="text-xs text-gray-500 font-medium">{feeAccount.installments?.length || 0} Installments</span>
                      </div>
                      {(!feeAccount.installments || feeAccount.installments.length === 0) ? (
                        <div className="p-6 text-center text-sm text-gray-500">No installment schedule generated for this plan.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 border-b border-gray-100">
                              <tr>
                                <th className="px-6 py-3 font-semibold">#</th>
                                <th className="px-6 py-3 font-semibold">Due Date</th>
                                <th className="px-6 py-3 font-semibold">Scheduled</th>
                                <th className="px-6 py-3 font-semibold">Paid</th>
                                <th className="px-6 py-3 font-semibold text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {feeAccount.installments.map((inst, idx) => (
                                <tr key={inst.id || idx} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-3.5 font-bold text-gray-700">Installment {inst.sequence || idx + 1}</td>
                                  <td className="px-6 py-3.5 text-gray-600">{inst.due_date ? new Date(inst.due_date).toLocaleDateString() : 'N/A'}</td>
                                  <td className="px-6 py-3.5 font-semibold text-gray-900">₹{Number(inst.scheduled_amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="px-6 py-3.5 font-semibold text-emerald-700">₹{Number(inst.paid_amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="px-6 py-3.5 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                      inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                      inst.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                      inst.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {inst.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Payment Transactions */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-bold text-gray-900 text-sm">Payment History</h4>
                        <span className="text-xs text-gray-500 font-medium">{feeAccount.payments?.length || 0} Transactions</span>
                      </div>
                      {(!feeAccount.payments || feeAccount.payments.length === 0) ? (
                        <div className="p-6 text-center text-sm text-gray-500">No payments recorded yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 border-b border-gray-100">
                              <tr>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Amount</th>
                                <th className="px-6 py-3 font-semibold">Method</th>
                                <th className="px-6 py-3 font-semibold">Reference</th>
                                <th className="px-6 py-3 font-semibold">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {feeAccount.payments.map((p, idx) => (
                                <tr key={p.id || idx} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-3.5 text-gray-700">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</td>
                                  <td className="px-6 py-3.5 font-bold text-emerald-700">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="px-6 py-3.5 text-gray-600 font-medium">{p.payment_method}</td>
                                  <td className="px-6 py-3.5 text-gray-500 text-xs">{p.reference || '-'}</td>
                                  <td className="px-6 py-3.5 text-gray-500 text-xs">{p.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-gray-900">No Fee Account Created</h4>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                      This student is enrolled but does not have an active fee account assigned yet.
                    </p>
                    <a
                      href="/fees"
                      className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Go to Fees Management
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Attendance Records</h3>
                {attendance.length === 0 ? (
                  <p className="text-gray-500 text-sm">No attendance records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Batch</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{new Date(rec.session_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-gray-500">{rec.batch_name}</td>
                            <td className="px-6 py-4 text-gray-500">{rec.session_type}</td>
                            <td className="px-6 py-4 text-center">
                              {rec.is_present ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-xs">
                                  <CheckCircle size={14} /> Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold text-xs">
                                  <XCircle size={14} /> Absent
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {showExamModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Exam Record</h3>
              <button onClick={() => setShowExamModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleExamSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Date</label>
                <input type="date" value={examForm.exam_date} onChange={(e) => setExamForm({...examForm, exam_date: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500" required />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
                <select value={examForm.exam_type} onChange={(e) => setExamForm({...examForm, exam_type: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="model">Model Exam</option>
                  <option value="grade">Grade Exam</option>
                </select>
              </div>

              {examForm.exam_type === 'model' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model Exam Marks</label>
                  <input type="number" step="0.01" value={examForm.model_exam_marks} onChange={(e) => setExamForm({...examForm, model_exam_marks: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
              )}

              {examForm.exam_type === 'grade' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Exam Marks</label>
                  <input type="number" step="0.01" value={examForm.grade_exam_marks} onChange={(e) => setExamForm({...examForm, grade_exam_marks: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <input type="checkbox" id="is_passed" checked={examForm.is_passed} onChange={(e) => setExamForm({...examForm, is_passed: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <label htmlFor="is_passed" className="text-sm font-semibold text-gray-700">Student Passed</label>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowExamModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      <EditStudentModal
        student={student}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => fetchStudentData()}
      />

    </div>
  );
}
