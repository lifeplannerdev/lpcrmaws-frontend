import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import Navbar from '../../Components/layouts/Navbar';
import {
  CalendarDays, GraduationCap, ChevronDown, RefreshCw, Users,
  CheckCircle2, XCircle, Clock, Minus, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const getDatesInRange = (from, to) => {
  const dates = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const monthStart = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().split('T')[0];
};
const monthEnd = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().split('T')[0];
};

// ─── Status Cell ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  PRESENT: { bg: 'bg-emerald-500', text: 'text-white', label: 'P', title: 'Present' },
  ABSENT:  { bg: 'bg-red-500',     text: 'text-white', label: 'A', title: 'Absent' },
  OFFDAY:  { bg: 'bg-blue-400',    text: 'text-white', label: 'O', title: 'Off Day' },
  null:    { bg: 'bg-gray-100',    text: 'text-gray-300', label: '—', title: 'Not Marked' },
};

const Cell = ({ status, approvalStatus }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE[null];
  const isPending = approvalStatus === 'PENDING';
  return (
    <div
      title={`${s.title}${isPending ? ' (Pending Regularization)' : ''}`}
      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mx-auto transition-transform hover:scale-110 cursor-default ${s.bg} ${s.text} ${isPending ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
    >
      {isPending ? '⏳' : s.label}
    </div>
  );
};

// ─── Mini Select ──────────────────────────────────────────────────────────────
const Select = ({ value, onChange, children, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
    >
      {children}
    </select>
    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  </div>
);

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const Pill = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${color}`}>
    <Icon size={15} /> {label}: <span className="font-black">{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB A — Batch Grid Report
// ═══════════════════════════════════════════════════════════════════════════════
function BatchGridReport({ getToken }) {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const dateFrom = monthStart(monthOffset);
  const dateTo   = monthEnd(monthOffset);
  const dates    = getDatesInRange(dateFrom, dateTo);
  const monthLabel = new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Fetch batches
  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data.results || res.data || [];
      setBatches(list);
      if (list.length > 0) setSelectedBatch(String(list[0].id));
    })();
  }, [getToken]);

  const fetchReport = useCallback(async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      const token = await getToken();
      const [sRes, aRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/students/?batch=${selectedBatch}&is_active=true`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/attendances/?batch=${selectedBatch}&date_from=${dateFrom}&date_to=${dateTo}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStudents(sRes.data.results || sRes.data || []);
      setRecords(aRes.data.results || aRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, dateFrom, dateTo, getToken]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Build lookup: studentId → date → record
  const lookup = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!map[r.student]) map[r.student] = {};
      map[r.student][r.date] = r;
    });
    return map;
  }, [records]);

  // Per-student summary
  const summary = useMemo(() => {
    return students.map(s => {
      const recs = Object.values(lookup[s.id] || {});
      const present = recs.filter(r => r.status === 'PRESENT').length;
      const absent  = recs.filter(r => r.status === 'ABSENT').length;
      const offday  = recs.filter(r => r.status === 'OFFDAY').length;
      const total   = present + absent + offday;
      const pct     = total > 0 ? Math.round((present / total) * 100) : null;
      return { ...s, present, absent, offday, pct };
    });
  }, [students, lookup]);

  // Totals
  const totals = useMemo(() => {
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent  = records.filter(r => r.status === 'ABSENT').length;
    const offday  = records.filter(r => r.status === 'OFFDAY').length;
    const total   = present + absent + offday;
    return { present, absent, offday, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Select value={selectedBatch} onChange={setSelectedBatch} className="w-64">
          <option value="">-- Select Batch --</option>
          {batches.map(b => (
            <option key={b.id} value={String(b.id)}>{b.name} ({b.current_grade_detail?.name})</option>
          ))}
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setMonthOffset(p => p - 1)} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-sm">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-gray-700 min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={() => setMonthOffset(p => p + 1)} disabled={monthOffset >= 0} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 disabled:opacity-40 transition-colors shadow-sm">
            <ChevronRight size={16} />
          </button>
          <button onClick={fetchReport} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-500' : ''} />
          </button>
        </div>
      </div>

      {/* Summary pills */}
      {!loading && records.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Pill icon={CheckCircle2} label="Present" value={totals.present} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
          <Pill icon={XCircle}     label="Absent"  value={totals.absent}  color="bg-red-50 text-red-700 border-red-200" />
          <Pill icon={Clock}       label="Offday"  value={totals.offday}  color="bg-blue-50 text-blue-700 border-blue-200" />
          <Pill icon={TrendingUp}  label="Avg Attendance" value={`${totals.pct}%`} color="bg-indigo-50 text-indigo-700 border-indigo-200" />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {[['bg-emerald-500','Present (P)'],['bg-red-500','Absent (A)'],['bg-blue-400','Offday (O)'],['bg-gray-100 border border-gray-200','Not Marked (—)']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={`w-3.5 h-3.5 rounded ${c} inline-block`} />{l}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-500 ring-2 ring-orange-400 ring-offset-1 inline-block" />Pending ⏳</span>
      </div>

      {/* Grid table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <RefreshCw size={28} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading attendance data…</p>
        </div>
      ) : !selectedBatch ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">Select a batch to view the report.</div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">No active students in this batch.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gradient-to-r from-indigo-50 to-purple-50 text-left px-4 py-3 font-bold text-gray-700 min-w-[160px] z-10">Student</th>
                  {dates.map(d => (
                    <th key={d} className={`text-center px-1 py-3 font-semibold min-w-[36px] ${new Date(d).toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-gray-500'}`}>
                      <div>{new Date(d).getDate()}</div>
                      <div className="text-gray-400 font-normal">{['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d).getDay()]}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 font-bold text-gray-700 bg-indigo-50 border-l border-indigo-100 min-w-[60px]">P</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700 bg-red-50 border-l border-red-100 min-w-[60px]">A</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700 bg-blue-50 border-l border-blue-100 min-w-[60px]">O</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-700 border-l border-gray-200 min-w-[60px]">%</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((student, idx) => (
                  <tr key={student.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="sticky left-0 bg-white border-r border-gray-100 px-4 py-2.5 z-10">
                      <div className="font-semibold text-gray-800 truncate max-w-[140px]">{student.name}</div>
                    </td>
                    {dates.map(d => {
                      const rec = lookup[student.id]?.[d];
                      return (
                        <td key={d} className="text-center px-1 py-2">
                          <Cell status={rec?.status || null} approvalStatus={rec?.approval_status} />
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2 bg-emerald-50/50 font-bold text-emerald-700">{student.present}</td>
                    <td className="text-center px-3 py-2 bg-red-50/50 font-bold text-red-700">{student.absent}</td>
                    <td className="text-center px-3 py-2 bg-blue-50/50 font-bold text-blue-600">{student.offday}</td>
                    <td className="text-center px-3 py-2 font-black">
                      {student.pct !== null ? (
                        <span className={`${student.pct >= 75 ? 'text-emerald-600' : student.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {student.pct}%
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB B — Student Timeline Report
// ═══════════════════════════════════════════════════════════════════════════════
function StudentTimelineReport({ getToken }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [records, setRecords] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const dateFrom = monthStart(monthOffset);
  const dateTo   = monthEnd(monthOffset);
  const monthLabel = new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/students/students/`, { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data.results || res.data || [];
      setStudents(list);
      if (list.length > 0) setSelectedStudent(String(list[0].id));
    })();
  }, [getToken]);

  const fetchTimeline = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_BASE_URL}/students/attendances/?student=${selectedStudent}&date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedStudent, dateFrom, dateTo, getToken]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const stats = useMemo(() => {
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent  = records.filter(r => r.status === 'ABSENT').length;
    const offday  = records.filter(r => r.status === 'OFFDAY').length;
    const total   = present + absent;
    const pct     = total > 0 ? Math.round((present / total) * 100) : null;
    return { present, absent, offday, pct };
  }, [records]);

  const selectedStudentObj = students.find(s => String(s.id) === selectedStudent);

  const STATUS_CARD = {
    PRESENT: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500 text-white', icon: CheckCircle2, iconColor: 'text-emerald-600' },
    ABSENT:  { bg: 'bg-red-50 border-red-200',         badge: 'bg-red-500 text-white',     icon: XCircle,      iconColor: 'text-red-500' },
    OFFDAY:  { bg: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-400 text-white',    icon: Clock,        iconColor: 'text-blue-500' },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Select value={selectedStudent} onChange={setSelectedStudent} className="w-72">
          <option value="">-- Select Student --</option>
          {students.map(s => (
            <option key={s.id} value={String(s.id)}>{s.name} {s.batch_detail ? `— ${s.batch_detail.name}` : ''}</option>
          ))}
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setMonthOffset(p => p - 1)} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-sm"><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold text-gray-700 min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={() => setMonthOffset(p => p + 1)} disabled={monthOffset >= 0} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 disabled:opacity-40 transition-colors shadow-sm"><ChevronRight size={16} /></button>
          <button onClick={fetchTimeline} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-sm"><RefreshCw size={14} className={loading ? 'animate-spin text-indigo-500' : ''} /></button>
        </div>
      </div>

      {selectedStudentObj && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg flex-shrink-0">
            {selectedStudentObj.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{selectedStudentObj.name}</h3>
            <p className="text-sm text-gray-500">{selectedStudentObj.batch_detail?.name} · {selectedStudentObj.package_detail?.name}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Pill icon={CheckCircle2} label="Present" value={stats.present} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            <Pill icon={XCircle}     label="Absent"  value={stats.absent}  color="bg-red-50 text-red-700 border-red-200" />
            <Pill icon={Clock}       label="Offday"  value={stats.offday}  color="bg-blue-50 text-blue-700 border-blue-200" />
            {stats.pct !== null && (
              <Pill icon={TrendingUp} label="Attendance" value={`${stats.pct}%`} color={`border ${stats.pct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : stats.pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`} />
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:9}).map((_,i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarDays size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No attendance records for this month.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {records.map(rec => {
            const cfg = STATUS_CARD[rec.status] || STATUS_CARD.ABSENT;
            const Icon = cfg.icon;
            return (
              <div key={rec.id} className={`rounded-2xl border p-4 ${cfg.bg} transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{fmt(rec.date)}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{rec.status}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <Icon size={12} className={cfg.iconColor} />
                  <span>{rec.marked_by_name || 'Unmarked'}</span>
                </div>
                {rec.approval_status === 'PENDING' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 font-semibold">
                    <AlertTriangle size={11} /> Pending Regularization
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AttendanceReportsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('batch');

  const canView = hasPermission('attendance:mark') || hasPermission('attendance:approvals') || hasAnyPermission('students');
  const getToken = useCallback(async () => accessToken || await refreshAccessToken(), [accessToken, refreshAccessToken]);

  const TABS = [
    { id: 'batch',   label: 'Batch Grid Report',    icon: GraduationCap },
    { id: 'student', label: 'Student Report',        icon: Users },
  ];

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-red-100">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-gray-500 mt-2 text-sm">You don't have permission to view attendance reports.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <CalendarDays size={13} /> Attendance Reports
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Attendance Reports
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">Batch-wise grid and student-wise attendance history.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'batch'   && <BatchGridReport   getToken={getToken} />}
        {activeTab === 'student' && <StudentTimelineReport getToken={getToken} />}
      </div>
    </div>
  );
}
