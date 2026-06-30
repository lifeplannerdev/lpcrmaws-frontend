import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, AlertTriangle, Search, Filter,
  ChevronRight, Calendar, IndianRupee, FileText, CheckCircle, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FeesAnalyticsWorkspace = () => {
  const { accessToken } = useAuth();
  
  const fetchWithAuth = async (url) => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error("API failed");
    return res.json();
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, students: [] });
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [filters, setFilters] = useState({
    branch: '',
    batch: '',
    status: 'all'
  });
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [student360, setStudent360] = useState(null);
  const [loading360, setLoading360] = useState(false);

  useEffect(() => {
    fetchMetadata();
    fetchAnalytics();
  }, [filters.branch, filters.batch]);

  const fetchMetadata = async () => {
    try {
      const [branchRes, batchRes] = await Promise.all([
        fetchWithAuth('/branches/'),
        fetchWithAuth('/academic-batches/')
      ]);
      setBranches(branchRes);
      setBatches(batchRes);
    } catch (err) {
      console.error("Failed to fetch metadata", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.batch) params.append('batch', filters.batch);
      
      const data = await fetchWithAuth(`/fees/analytics/overview/?${params.toString()}`);
      setData(data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudent360 = async (studentId) => {
    try {
      setLoading360(true);
      const data = await fetchWithAuth(`/fees/analytics/student/${studentId}/`);
      setStudent360(data);
    } catch (err) {
      console.error("Failed to fetch student 360", err);
    } finally {
      setLoading360(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    fetchStudent360(student.id);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  let filteredStudents = data.students || [];
  if (filters.status === 'on_track') {
    filteredStudents = filteredStudents.filter(s => s.is_on_track);
  } else if (filters.status === 'off_track') {
    filteredStudents = filteredStudents.filter(s => !s.is_on_track);
  }

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Users size={20} />
              </div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.summary.total_students || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <p className="text-sm font-medium text-gray-500">On Track</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{data.summary.on_track || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <p className="text-sm font-medium text-gray-500">Off Track</p>
            </div>
            <p className="text-3xl font-bold text-rose-600">{data.summary.off_track || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <IndianRupee size={20} />
              </div>
              <p className="text-sm font-medium text-gray-500">Total Overdue</p>
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(data.summary.total_overdue || 0)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Col: Students List */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Filter Branch</label>
              <select 
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100"
                value={filters.branch}
                onChange={e => setFilters({...filters, branch: e.target.value})}
              >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Filter Batch</label>
              <select 
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100"
                value={filters.batch}
                onChange={e => setFilters({...filters, batch: e.target.value})}
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Payment Status</label>
              <select 
                className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100"
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="on_track">On Track</option>
                <option value="off_track">Off Track (Overdue)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">Loading analytics...</td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">No students match your filters.</td>
                    </tr>
                  ) : filteredStudents.map(student => (
                    <tr 
                      key={student.id} 
                      onClick={() => handleStudentClick(student)}
                      className={`cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{student.student_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{student.branch_name || 'No branch'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-700">{student.batch_name || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {student.is_on_track ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                            On Track
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                            Overdue {formatCurrency(student.overdue_amount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: 360 View */}
        <div className="lg:w-1/2">
          {!selectedStudent ? (
            <div className="bg-slate-50 rounded-3xl border border-slate-200/60 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Users size={48} className="mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a Student</h3>
              <p className="text-sm">Click on any student from the list to view their 360-degree fee and attendance profile.</p>
            </div>
          ) : loading360 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-full min-h-[400px] flex items-center justify-center text-gray-500">
              Loading 360 profile...
            </div>
          ) : student360 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden h-full flex flex-col relative">
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900"></div>
              
              <div className="relative pt-12 px-8 pb-6 flex-1 overflow-y-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-50 relative z-10 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{student360.student_info.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{student360.student_info.branch || 'No branch'}</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{student360.student_info.batch || 'No batch'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {student360.fee_account ? (
                      student360.fee_account.overdue_amount > 0 ? (
                        <div className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-sm font-bold flex items-center gap-1.5">
                          <AlertTriangle size={16} /> OFF TRACK
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-1.5">
                          <CheckCircle size={16} /> ON TRACK
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm italic">No Fee Account</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Fee Summary */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <IndianRupee size={16} className="text-indigo-500"/> Fee Summary
                    </h3>
                    {student360.fee_account ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Due</span>
                          <span className="font-semibold">{formatCurrency(student360.fee_account.total_due)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Paid</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(student360.fee_account.total_paid)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                          <span className="text-gray-500 font-medium">Balance</span>
                          <span className="font-bold text-indigo-700">{formatCurrency(student360.fee_account.balance_due)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No fee structure assigned.</p>
                    )}
                  </div>

                  {/* Attendance Summary */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-500"/> Attendance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Sessions</span>
                        <span className="font-semibold">{student360.attendance_summary.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Present</span>
                        <span className="font-semibold text-emerald-600">{student360.attendance_summary.present}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                        <span className="text-gray-500 font-medium">Absent</span>
                        <span className="font-bold text-rose-600">{student360.attendance_summary.absent}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline section */}
                {student360.fee_account && student360.fee_account.installments && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500"/> Installment Schedule
                    </h3>
                    <div className="space-y-2">
                      {student360.fee_account.installments.map((inst, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${inst.status === 'PAID' ? 'bg-emerald-500' : inst.status === 'OVERDUE' ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
                            <span className="text-sm font-medium text-gray-900">Inst {inst.sequence}</span>
                            <span className="text-xs text-gray-500">{new Date(inst.due_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-900 font-medium">{formatCurrency(inst.scheduled_amount)}</span>
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inst.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{inst.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FeesAnalyticsWorkspace;
