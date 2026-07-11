import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, BookOpen, Calendar, User, Clock3, CreditCard, ShieldAlert, Edit, ArrowUpCircle, RotateCcw } from 'lucide-react';
import Navbar from '../Components/layouts/Navbar';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import { BATCH_CHOICES } from '../Components/utils/studentConstants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DROPPED: 'bg-red-100 text-red-700',
  EXAM_PREPARATION: 'bg-purple-100 text-purple-700',
  PENDING_ENROLLMENT: 'bg-yellow-100 text-yellow-700',
  PENDING_BATCH_ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
};

export default function StudentViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const [student, setStudent] = useState(null);
  const [feeAccount, setFeeAccount] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [academicBatches, setAcademicBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Academic Action states
  const [actionType, setActionType] = useState(''); // 'PROMOTE' or 'FALLBACK'
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedAcademicBatch, setSelectedAcademicBatch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canEditStudents = hasPermission('students:edit_any') || hasPermission('students:edit_tenant') || hasPermission('students:edit_own') || user?.role === 'Trainer';
  const canEditFees = hasPermission('fees:edit_any') || hasPermission('fees:edit_tenant');

  useEffect(() => {
    fetchStudent();
    fetchTimeline();
    fetchAcademicBatches();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'fees' && student) {
      fetchFeeAccount();
    }
  }, [activeTab, student]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      let token = accessToken || await refreshAccessToken();
      const response = await axios.get(`${API_BASE_URL}/students/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(response.data);
      setFeeAccount(response.data.fee_summary || null);
    } catch (err) {
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      let token = accessToken || await refreshAccessToken();
      const response = await axios.get(`${API_BASE_URL}/students/${id}/timeline/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeline(response.data);
    } catch (err) {
      console.error('Failed to load timeline', err);
    }
  };

  const fetchAcademicBatches = async () => {
    try {
      let token = accessToken || await refreshAccessToken();
      const response = await axios.get(`${API_BASE_URL}/academic-batches/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAcademicBatches(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  const fetchFeeAccount = async () => {
    try {
      setFeeLoading(true);
      const token = accessToken || await refreshAccessToken();
      const response = await axios.get(`${API_BASE_URL}/fees/accounts/?student=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const account = Array.isArray(response.data) ? response.data[0] : null;
      if (account) setFeeAccount(account);
    } catch (err) {
      console.error('Failed to load fee account', err);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleGrantClearance = async () => {
    try {
      setLoading(true);
      let token = accessToken || await refreshAccessToken();
      await axios.patch(`${API_BASE_URL}/students/${id}/`, { status: 'PENDING_BATCH_ASSIGNMENT' }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchStudent();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicAction = async () => {
    if (!actionType || !selectedAcademicBatch) return;
    if (actionType === 'PROMOTE' && !selectedBatch) return;
    
    try {
      setActionLoading(true);
      let token = accessToken || await refreshAccessToken();
      await axios.post(`${API_BASE_URL}/students/${id}/academic-action/`, {
        action: actionType,
        academic_batch_id: selectedAcademicBatch,
        batch: selectedBatch
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setActionType('');
      setSelectedAcademicBatch('');
      setSelectedBatch('');
      await fetchStudent();
      await fetchTimeline();
    } catch (err) {
      alert('Failed to process academic action');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleExamPrep = async () => {
    try {
      setActionLoading(true);
      let token = accessToken || await refreshAccessToken();
      await axios.post(`${API_BASE_URL}/students/${id}/academic-action/`, {
        action: 'EXAM_PREP',
        academic_batch_id: student.academic_batch
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      await fetchStudent();
      await fetchTimeline();
    } catch (err) {
      alert('Failed to mark for exam prep');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-gray-500">Loading student details...</div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-red-500">{error || 'Student not found'}</div>
      </div>
    );
  }

  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Students
          </button>
          {canEditStudents && (
             <button
                onClick={() => navigate(`/students/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
             >
                <Edit size={16} /> Edit Student
             </button>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <img src={avatar} alt={student.name} className="w-24 h-24 rounded-full bg-white p-1" />
              <div className="text-white">
                <h1 className="text-3xl font-bold">{student.name}</h1>
                <p className="text-indigo-100 mt-1">Student ID: {student.id}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6 flex items-center">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[student.status] || 'bg-gray-100 text-gray-700'}`}>
                {student.status.replace(/_/g, ' ')}
              </span>
              <span className={`ml-3 px-4 py-2 rounded-full text-sm font-medium ${(student.fee_setup_status === 'PENDING_FEE_SETUP' || (!student.fee_setup_status && !student.fee_summary)) ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                Fee: {student.fee_setup_status || (student.fee_summary ? student.fee_summary.status : 'PENDING_FEE_SETUP')}
              </span>
            </div>

            {student.status === 'PENDING_ENROLLMENT' && (
              <div className="mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-yellow-600" size={24} />
                  <div>
                    <h3 className="font-bold text-yellow-800">Pending Financial Clearance</h3>
                    <p className="text-sm text-yellow-700">This student is awaiting fee setup and financial clearance.</p>
                  </div>
                </div>
                {canEditFees && (
                  <button onClick={handleGrantClearance} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow transition-colors whitespace-nowrap">
                    Grant Clearance
                  </button>
                )}
              </div>
            )}

            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex gap-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'academic', label: 'Academic Journey' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'fees', label: 'Fees' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Mail size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{student.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Phone size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{student.phone_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Academic Details</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Calendar size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Admission Date</p>
                        <p className="font-medium">{student.admission_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <User size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Trainer</p>
                        <p className="font-medium">{student.trainer_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACADEMIC TAB */}
            {activeTab === 'academic' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-indigo-100 p-5 bg-indigo-50/50">
                    <h2 className="text-lg font-semibold text-indigo-900 mb-4">Current Assignment</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-indigo-600 font-medium">Batch Level</p>
                        <p className="text-xl font-bold text-gray-900">{student.batch || 'Not Assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 font-medium">Academic Batch (Cohort)</p>
                        <p className="font-semibold text-gray-900">{student.academic_batch_details ? student.academic_batch_details.name : 'Not Assigned'}</p>
                      </div>
                    </div>
                  </div>

                  {canEditStudents && student.status !== 'COMPLETED' && student.status !== 'DROPPED' && (
                    <div className="rounded-2xl border border-gray-200 p-5 bg-white">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Actions</h2>
                      {!actionType ? (
                        <div className="space-y-3">
                          <button 
                            onClick={() => setActionType('PROMOTE')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <ArrowUpCircle size={18} /> Promote to Next Batch
                          </button>
                          <button 
                            onClick={() => setActionType('FALLBACK')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <RotateCcw size={18} /> Fallback / Re-assign Cohort
                          </button>
                          {student.status !== 'EXAM_PREPARATION' && (
                            <button 
                              onClick={handleExamPrep}
                              disabled={actionLoading}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 font-medium rounded-lg transition-colors"
                            >
                              <BookOpen size={18} /> Mark as Exam Preparation
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900">{actionType === 'PROMOTE' ? 'Promote Student' : 'Fallback Student'}</h3>
                          
                          {actionType === 'PROMOTE' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">New Batch Level</label>
                              <select 
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                              >
                                <option value="">Select Level</option>
                                {BATCH_CHOICES.map(b => (
                                  <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Academic Batch (Cohort)</label>
                            <select 
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={selectedAcademicBatch}
                              onChange={(e) => setSelectedAcademicBatch(e.target.value)}
                            >
                              <option value="">Select Cohort</option>
                              {academicBatches.map(ab => (
                                <option key={ab.id} value={ab.id}>{ab.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button 
                              onClick={() => setActionType('')}
                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleAcademicAction}
                              disabled={actionLoading || !selectedAcademicBatch || (actionType === 'PROMOTE' && !selectedBatch)}
                              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50"
                            >
                              {actionLoading ? 'Saving...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Student Journey</h2>
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">No events recorded in the timeline yet.</p>
                ) : (
                  <div className="space-y-6 border-l-2 border-indigo-100 pl-6 ml-3">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="relative">
                        <div className="absolute -left-[35px] bg-indigo-500 rounded-full w-4 h-4 border-4 border-white"></div>
                        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">{event.event_type.replace('_', ' ')}</span>
                            <span className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-900 font-medium mb-2">{event.description}</p>
                          <p className="text-xs text-gray-500">By {event.created_by_name || 'System'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {student.attendance_summary && Object.entries(student.attendance_summary).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase">{key}</div>
                        <div className="text-2xl font-bold text-gray-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FEES TAB */}
            {activeTab === 'fees' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Due', value: feeAccount?.total_due || student.fee_summary?.total_due || 0, color: 'text-gray-900' },
                    { label: 'Paid', value: feeAccount?.total_paid || student.fee_summary?.total_paid || 0, color: 'text-green-700' },
                    { label: 'Balance', value: feeAccount?.balance_due || student.fee_summary?.balance_due || 0, color: 'text-indigo-700' },
                    { label: 'Overdue', value: feeAccount?.overdue_amount || student.fee_summary?.overdue_amount || 0, color: 'text-red-600' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-gray-200 p-4 bg-slate-50">
                      <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
                      <div className={`mt-1 text-2xl font-bold ${item.color}`}>{`₹${Number(item.value || 0).toLocaleString('en-IN')}`}</div>
                    </div>
                  ))}
                </div>

                {feeLoading ? (
                  <div className="py-10 text-center text-gray-500">Loading fee details...</div>
                ) : feeAccount ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
                      <div className="space-y-3 text-gray-700">
                        <div className="flex justify-between"><span>Plan</span><strong>{feeAccount.plan_name || feeAccount.plan_code || feeAccount.plan_type}</strong></div>
                        <div className="flex justify-between"><span>Status</span><strong>{feeAccount.status}</strong></div>
                        <div className="flex justify-between"><span>Version</span><strong>{feeAccount.version}</strong></div>
                        <div className="flex justify-between"><span>Next Due</span><strong>{feeAccount.next_due_date || 'N/A'}</strong></div>
                        <div className="flex justify-between"><span>Last Payment</span><strong>{feeAccount.last_payment_date || 'N/A'}</strong></div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Installments</h2>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {(feeAccount.installments || []).length === 0 ? (
                            <p className="text-sm text-gray-500">No installment schedule found.</p>
                          ) : feeAccount.installments.map((item) => (
                            <div key={item.id} className="rounded-xl border border-gray-100 p-3 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{item.label || `Installment ${item.sequence_number}`}</div>
                                  <div className="text-xs text-gray-500">{item.due_date} • {item.status}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">₹{item.scheduled_amount}</div>
                                  <div className="text-xs text-gray-500">Balance ₹{item.balance_amount}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    <CreditCard className="mx-auto mb-3 text-gray-300" size={28} />
                    No structured fee account is linked yet.
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
