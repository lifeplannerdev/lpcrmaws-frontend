import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import Navbar from '../../Components/layouts/Navbar';
import {
  ArrowLeft, GraduationCap, Phone, Mail, CalendarDays, BookOpen,
  IndianRupee, CheckCircle2, XCircle, Clock, AlertTriangle, Edit2,
  Save, X, TrendingUp, ShieldCheck, User, RefreshCw, CalendarCheck
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-violet-500 to-purple-600','from-indigo-500 to-blue-600','from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600',
];
const BigAvatar = ({ name }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const gradient = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-2xl shadow-xl flex-shrink-0`}>
      {initials}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, color = 'text-indigo-600' }) => (
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0`}>
      <Icon size={15} className={color} />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || <span className="text-gray-300 font-normal">Not set</span>}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, sub, color }) => (
  <div className={`rounded-2xl p-4 border ${color}`}>
    <p className="text-2xl font-black">{value}</p>
    <p className="text-xs font-semibold mt-0.5">{label}</p>
    {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
  </div>
);

const AttendanceDot = ({ status, approvalStatus }) => {
  const MAP = {
    PRESENT: 'bg-emerald-500 title-present',
    ABSENT:  'bg-red-500',
    OFFDAY:  'bg-blue-400',
    null:    'bg-gray-200',
  };
  const pending = approvalStatus === 'PENDING';
  return (
    <div
      title={status || 'Not Marked'}
      className={`w-5 h-5 rounded-md ${MAP[status] || MAP[null]} ${pending ? 'ring-2 ring-orange-400' : ''} transition-transform hover:scale-125 cursor-default`}
    />
  );
};

// ─── Tab bar ─────────────────────────────────────────────────────────────────
const TABS = ['profile', 'attendance', 'fees'];
const TAB_LABELS = { profile: 'Profile', attendance: 'Attendance', fees: 'Fee Status' };
const TAB_ICONS  = { profile: User, attendance: CalendarCheck, fees: IndianRupee };

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  // Permission flags
  const canViewStudent  = hasAnyPermission('students') || hasPermission('attendance:mark') || hasPermission('students:registry_manage');
  const canEditProfile  = hasPermission('students:registry_manage');
  const canViewFees     = hasPermission('fees:manage') || hasPermission('fees:partial_payment') || hasAnyPermission('fees');
  const canMarkAttend   = hasPermission('attendance:mark');

  const [student, setStudent]         = useState(null);
  const [batches, setBatches]         = useState([]);
  const [packages, setPackages]       = useState([]);
  const [attendance, setAttendance]   = useState([]);
  const [feeAccount, setFeeAccount]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('profile');
  const [editing, setEditing]         = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState(null);

  const getToken = useCallback(async () => accessToken || await refreshAccessToken(), [accessToken, refreshAccessToken]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [sRes, bRes, pRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/students/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/packages/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStudent(sRes.data);
      setEditForm({ name: sRes.data.name, mobile_number: sRes.data.mobile_number || '', email: sRes.data.email || '', fee_attendance_policy: sRes.data.fee_attendance_policy });
      setBatches(bRes.data.results || bRes.data || []);
      setPackages(pRes.data.results || pRes.data || []);

      // Attendance — last 30 days
      const to   = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
      const aRes = await axios.get(`${API_BASE_URL}/students/attendances/?student=${id}&date_from=${from}&date_to=${to}`, { headers: { Authorization: `Bearer ${token}` } });
      setAttendance(aRes.data.results || aRes.data || []);

      // Fee account (only if permitted)
      if (canViewFees) {
        try {
          const fRes = await axios.get(`${API_BASE_URL}/fees/accounts/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } });
          const accounts = fRes.data.results || fRes.data || [];
          setFeeAccount(accounts[0] || null);
        } catch { /* no fee account */ }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, getToken, canViewFees]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const token = await getToken();
      await axios.patch(`${API_BASE_URL}/students/students/${id}/`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      setMsg({ type: 'success', text: 'Profile updated.' });
      setEditing(false);
      fetchAll();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  // Attendance stats
  const atStats = {
    present: attendance.filter(r => r.status === 'PRESENT').length,
    absent:  attendance.filter(r => r.status === 'ABSENT').length,
    offday:  attendance.filter(r => r.status === 'OFFDAY').length,
  };
  const atTotal = atStats.present + atStats.absent;
  const atPct = atTotal > 0 ? Math.round((atStats.present / atTotal) * 100) : null;

  // Build date map for mini grid
  const atMap = {};
  attendance.forEach(r => { atMap[r.date] = r; });
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toISOString().split('T')[0];
  });

  if (!canViewStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-red-100">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded-xl" />
          <div className="bg-white rounded-3xl border border-gray-100 p-8 flex gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-3xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded-lg w-48" />
              <div className="h-4 bg-gray-100 rounded-lg w-32" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-500">Student not found.</p>
        </div>
      </div>
    );
  }

  const visibleTabs = TABS.filter(t => t !== 'fees' || canViewFees);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
          <ArrowLeft size={16} /> Back to Students
        </button>

        {/* Hero card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <BigAvatar name={student.name} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">{student.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${student.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${student.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
                {student.has_fee_due && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-orange-100 text-orange-700 border-orange-200">
                    <AlertTriangle size={11} /> Fee Due
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                {student.batch_detail && <span className="flex items-center gap-1"><GraduationCap size={14} />{student.batch_detail.name} · {student.batch_detail.current_grade_detail?.name}</span>}
                {student.package_detail && <span className="flex items-center gap-1"><BookOpen size={14} />{student.package_detail.name}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-sm">
                <RefreshCw size={14} />
              </button>
              {canEditProfile && activeTab === 'profile' && !editing && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md">
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {editing && (
                <>
                  <button onClick={() => { setEditing(false); setMsg(null); }} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                    <X size={14} />
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-60">
                    <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-t border-gray-100 px-6">
            <div className="flex gap-1 py-2">
              {visibleTabs.map(tab => {
                const Icon = TAB_ICONS[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setEditing(false); setMsg(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Icon size={14} />{TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {msg.text}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3">Personal Info</h3>
              {editing ? (
                <div className="space-y-4">
                  {[['name','Full Name','text'],['mobile_number','Mobile','tel'],['email','Email','email']].map(([field, label, type]) => (
                    <div key={field}>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
                      <input
                        type={type}
                        value={editForm[field] || ''}
                        onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Fee Attendance Policy</label>
                    <select
                      value={editForm.fee_attendance_policy}
                      onChange={e => setEditForm(p => ({ ...p, fee_attendance_policy: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="STRICT">Strict</option>
                      <option value="LENIENT">Lenient</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoRow icon={User}        label="Full Name"    value={student.name}          color="text-indigo-600" />
                  <InfoRow icon={Phone}       label="Mobile"       value={student.mobile_number}  color="text-green-600" />
                  <InfoRow icon={Mail}        label="Email"        value={student.email}          color="text-sky-600" />
                  <InfoRow icon={CalendarDays} label="Enrolled"    value={new Date(student.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} color="text-slate-500" />
                  <InfoRow icon={ShieldCheck} label="Fee Policy"   value={student.fee_attendance_policy} color={student.fee_attendance_policy === 'STRICT' ? 'text-red-500' : 'text-emerald-500'} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3">Academic Info</h3>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Batch</label>
                    <select
                      value={editForm.batch || student.batch || ''}
                      onChange={e => setEditForm(p => ({ ...p, batch: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">No batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.current_grade_detail?.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Package</label>
                    <select
                      value={editForm.package || student.package || ''}
                      onChange={e => setEditForm(p => ({ ...p, package: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">No package</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoRow icon={GraduationCap} label="Batch"         value={student.batch_detail?.name}          color="text-indigo-600" />
                  <InfoRow icon={TrendingUp}     label="Current Grade" value={student.batch_detail?.current_grade_detail?.name} color="text-purple-600" />
                  <InfoRow icon={BookOpen}       label="Package"       value={student.package_detail?.name}        color="text-violet-600" />
                  <InfoRow icon={GraduationCap}  label="Company"       value={student.company}                     color="text-gray-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Present (30d)"  value={atStats.present} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <StatCard label="Absent (30d)"   value={atStats.absent}  color="bg-red-50 text-red-700 border-red-200" />
              <StatCard label="Offdays (30d)"  value={atStats.offday}  color="bg-blue-50 text-blue-700 border-blue-200" />
              <StatCard
                label="Attendance %"
                value={atPct !== null ? `${atPct}%` : '—'}
                color={atPct === null ? 'bg-gray-50 text-gray-400 border-gray-200' : atPct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : atPct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}
                sub="Based on last 30 days"
              />
            </div>

            {/* Mini dot grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Last 30 Days</h3>
              <div className="flex flex-wrap gap-2">
                {last30.map(d => {
                  const rec = atMap[d];
                  return (
                    <div key={d} className="flex flex-col items-center gap-1">
                      <AttendanceDot status={rec?.status || null} approvalStatus={rec?.approval_status} />
                      <span className="text-[10px] text-gray-300">{new Date(d).getDate()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                {[['bg-emerald-500','Present'],['bg-red-500','Absent'],['bg-blue-400','Offday'],['bg-gray-200','Not Marked']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${c}`} />{l}</span>
                ))}
              </div>
            </div>

            {/* Records list */}
            {attendance.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700">Recent Records</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {[...attendance].reverse().map(rec => {
                    const STATUS = { PRESENT: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 }, ABSENT: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle }, OFFDAY: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock } };
                    const cfg = STATUS[rec.status] || STATUS.ABSENT;
                    const Icon = cfg.icon;
                    return (
                      <div key={rec.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                            <Icon size={15} className={cfg.color} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{new Date(rec.date).toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}</p>
                            <p className="text-xs text-gray-400">{rec.marked_by_name ? `Marked by ${rec.marked_by_name}` : 'Unmarked'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{rec.status}</span>
                          {rec.approval_status === 'PENDING' && (
                            <span className="text-xs text-orange-600 font-semibold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                              <AlertTriangle size={10} /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FEE TAB ── */}
        {activeTab === 'fees' && canViewFees && (
          <div className="space-y-6">
            {!feeAccount ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <IndianRupee size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No fee account found for this student.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total Due"   value={`₹${Number(feeAccount.total_due||0).toLocaleString('en-IN')}`}     color="bg-slate-50 text-slate-700 border-slate-200" />
                  <StatCard label="Total Paid"  value={`₹${Number(feeAccount.total_paid||0).toLocaleString('en-IN')}`}    color="bg-emerald-50 text-emerald-700 border-emerald-200" />
                  <StatCard label="Balance Due" value={`₹${Number(feeAccount.balance_due||0).toLocaleString('en-IN')}`}   color="bg-indigo-50 text-indigo-700 border-indigo-200" />
                  <StatCard 
                    label="Status"      
                    value={feeAccount.status}                       
                    color={['OVERDUE'].includes(feeAccount.status) ? 'bg-red-50 text-red-700 border-red-200' : ['ACTIVE', 'PARTIAL'].includes(feeAccount.status) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} 
                  />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-3">Fee Account Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={IndianRupee} label="Plan Name"           value={feeAccount.plan_name}        color="text-indigo-600" />
                    <InfoRow icon={IndianRupee} label="Plan Type"           value={feeAccount.plan_type}        color="text-purple-600" />
                    <InfoRow icon={CalendarDays} label="Due Day of Month"   value={`${feeAccount.due_day}th`}   color="text-slate-500" />
                    <InfoRow icon={AlertTriangle} label="Registration Amt"  value={`₹${Number(feeAccount.registration_amount||0).toLocaleString('en-IN')}`} color="text-amber-600" />
                  </div>
                  {feeAccount.status === 'OVERDUE' && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                      <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-red-700">Fee Overdue</p>
                        <p className="text-xs text-red-500 mt-0.5">This student's fee account is overdue by ₹{Number(feeAccount.overdue_amount||0).toLocaleString('en-IN')}. Attendance may require regularization.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* EMIs / Installments */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-bold text-gray-800">EMI Schedule (Installments)</h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600 shadow-sm">{feeAccount.installments?.length || 0} Installments</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Label</th>
                          <th className="px-6 py-3 font-semibold">Due Date</th>
                          <th className="px-6 py-3 font-semibold text-right">Scheduled</th>
                          <th className="px-6 py-3 font-semibold text-right">Paid</th>
                          <th className="px-6 py-3 font-semibold text-right">Balance</th>
                          <th className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {feeAccount.installments?.length > 0 ? feeAccount.installments.map(inst => (
                          <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-800">{inst.label || `Installment #${inst.sequence_number}`}</td>
                            <td className="px-6 py-3 text-gray-600">{new Date(inst.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                            <td className="px-6 py-3 text-right font-medium text-gray-700">₹{Number(inst.scheduled_amount).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-right font-medium text-emerald-600">₹{Number(inst.paid_amount).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-right font-bold text-indigo-600">₹{Number(inst.balance_amount).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : inst.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                {inst.status}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">No installments found for this plan.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payments History */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-bold text-gray-800">Payment History</h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600 shadow-sm">{feeAccount.payments?.length || 0} Payments</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Receipt No.</th>
                          <th className="px-6 py-3 font-semibold">Date</th>
                          <th className="px-6 py-3 font-semibold">Method</th>
                          <th className="px-6 py-3 font-semibold">Collected By</th>
                          <th className="px-6 py-3 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {feeAccount.payments?.length > 0 ? feeAccount.payments.map(pay => (
                          <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 font-semibold text-indigo-600">{pay.receipt_number}</td>
                            <td className="px-6 py-3 text-gray-600">{new Date(pay.payment_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                            <td className="px-6 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {pay.payment_method}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-gray-500">{pay.created_by_name}</td>
                            <td className="px-6 py-3 text-right font-black text-emerald-600">₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No payments recorded yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
