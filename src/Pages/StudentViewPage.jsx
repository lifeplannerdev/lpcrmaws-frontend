import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, BookOpen, Calendar, User, Clock3, CreditCard, History, ShieldAlert } from 'lucide-react';
import Navbar from '../Components/layouts/Navbar';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DROPPED: 'bg-red-100 text-red-700',
};

export default function StudentViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  const [student, setStudent] = useState(null);
  const [feeAccount, setFeeAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStudent();
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

      const response = await axios.get(
        `${API_BASE_URL}/students/${id}/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStudent(response.data);
      setFeeAccount(response.data.fee_summary || null);
    } catch (err) {
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeAccount = async () => {
    try {
      setFeeLoading(true);
      const token = accessToken || await refreshAccessToken();
      const response = await axios.get(
        `${API_BASE_URL}/fees/accounts/?student=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const account = Array.isArray(response.data) ? response.data[0] : null;
      if (account) setFeeAccount(account);
    } catch (err) {
      console.error('Failed to load fee account', err);
    } finally {
      setFeeLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Loading student details...</div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-red-500">{error || 'Student not found'}</div>
        </div>
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
          <ArrowLeft size={20} />
            Back to Students
          </button>

        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <img
                src={avatar}
                alt={student.name}
                className="w-24 h-24 rounded-full bg-white p-1"
              />
              <div className="text-white">
                <h1 className="text-3xl font-bold">{student.name}</h1>
                <p className="text-indigo-100 mt-1">Student ID: {student.id}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[student.status]}`}>
                {student.status}
              </span>
            </div>

            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex gap-6">
                {[
                  { id: 'overview', label: 'Overview' },
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
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <BookOpen size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Class</p>
                        <p className="font-medium">{student.student_class || 'N/A'}</p>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-3 text-gray-700">
                      <BookOpen size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs text-gray-500">Batch</p>
                        <p className="font-medium">
                          {student.academic_batch_details 
                            ? `${student.academic_batch_details.name} (${student.academic_batch_details.academic_year}) - ${student.academic_batch_details.grade}` 
                            : student.batch || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Policy</h2>
                  <div className="flex items-start gap-3 text-gray-700">
                    <Clock3 size={18} className="text-indigo-600 mt-1" />
                    <p>Attendance remains tied to trainer assignment. Fee warnings can be shown here without blocking special-case students unless policy requires it.</p>
                  </div>
                </div>
              </div>
            )}

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
                      {feeAccount.status === 'OVERDUE' && (
                        <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-3 flex items-start gap-2 text-red-700">
                          <ShieldAlert size={18} className="mt-0.5" />
                          <p className="text-sm">This account is overdue. Accounting can restructure the plan from the fee workspace.</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Installments & Payments</h2>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Installments</h3>
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
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Payments</h3>
                          <div className="space-y-2">
                            {(feeAccount.payments || []).length === 0 ? (
                              <p className="text-sm text-gray-500">No payments recorded.</p>
                            ) : feeAccount.payments.slice(0, 5).map((item) => (
                              <div key={item.id} className="rounded-xl border border-gray-100 p-3 bg-white">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{item.receipt_number}</div>
                                    <div className="text-xs text-gray-500">{item.payment_method} • {new Date(item.payment_date).toLocaleString()}</div>
                                  </div>
                                  <div className="font-semibold text-green-700">₹{item.amount}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    <CreditCard className="mx-auto mb-3 text-gray-300" size={28} />
                    No structured fee account is linked yet. Accounting can create one from the fee workspace.
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 p-5 bg-white">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Fee Notes</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{student.notes || 'No notes available.'}</p>
                  <p className="text-sm text-gray-500 mt-3">Trainers can review fee status in read-only mode. Accounting controls restructuring and partial payment entry in the fee workspace.</p>
                </div>
              </div>
            )}

            {student.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{student.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
