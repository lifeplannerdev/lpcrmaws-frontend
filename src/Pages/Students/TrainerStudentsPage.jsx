import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import Navbar from '../../Components/layouts/Navbar';
import {
  Search, Users, GraduationCap, CheckCircle2, XCircle, RefreshCw,
  ChevronDown, Phone, Mail, CalendarDays, BookOpen, IndianRupee,
  AlertTriangle, Filter, X
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-violet-500 to-purple-600','from-indigo-500 to-blue-600','from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600',
];
const Avatar = ({ name }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const gradient = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
      {initials}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ isActive, hasFee }) => {
  if (!isActive) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Inactive
    </span>
  );
  if (hasFee) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-200">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Fee Due
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
    </span>
  );
};

// ─── Student Card ─────────────────────────────────────────────────────────────
const StudentCard = ({ student }) => {
  const hasFee = student.has_fee_due;
  const batch  = student.batch_detail;
  const accentClass = !student.is_active
    ? 'bg-gradient-to-r from-slate-300 to-slate-400'
    : hasFee
    ? 'bg-gradient-to-r from-orange-400 to-amber-400'
    : 'bg-gradient-to-r from-indigo-500 to-purple-600';

  return (
    <div className={`group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${!student.is_active ? 'opacity-70' : ''}`}>
      <div className={`h-1 w-full ${accentClass}`} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={student.name} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate text-base">{student.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge isActive={student.is_active} hasFee={hasFee} />
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {batch && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={14} className="text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate text-sm">{batch.name}</p>
                {batch.current_grade_detail && (
                  <p className="text-xs text-gray-400">{batch.current_grade_detail.name}</p>
                )}
              </div>
            </div>
          )}

          {student.package_detail && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={14} className="text-purple-600" />
              </div>
              <span className="truncate text-gray-700 text-sm">{student.package_detail.name}</span>
            </div>
          )}

          {student.mobile_number && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Phone size={13} className="text-green-600" />
              </div>
              <span className="text-gray-700 text-sm">{student.mobile_number}</span>
            </div>
          )}

          {student.email && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                <Mail size={13} className="text-sky-600" />
              </div>
              <span className="truncate text-gray-600 text-xs">{student.email}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={13} className="text-slate-500" />
            </div>
            <span className="text-xs text-gray-500">
              Enrolled {new Date(student.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.fee_attendance_policy === 'STRICT' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {student.fee_attendance_policy === 'STRICT' ? '🔒 Strict' : '✅ Lenient'}
          </span>
          {hasFee && (
            <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
              <IndianRupee size={11} /> Overdue
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, gradient, onClick, active }) => (
  <button
    onClick={onClick}
    className={`group text-left bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${active ? 'ring-2 ring-indigo-500 shadow-lg -translate-y-0.5 border-indigo-200' : 'shadow-sm border-gray-100'}`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
    <p className="text-3xl font-black text-gray-900">{value}</p>
  </button>
);

// ─── Dropdown Filter ──────────────────────────────────────────────────────────
const DropdownFilter = ({ label, value, options, onChange, icon: Icon }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
      >
        {Icon && <Icon size={14} className="text-gray-400" />}
        <span>{selected?.label || label}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 min-w-[190px] py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TrainerStudentsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const [students, setStudents] = useState([]);
  const [batches,  setBatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [batchFilter,  setBatchFilter]  = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feeFilter,    setFeeFilter]    = useState('all');
  const [statFilter,   setStatFilter]   = useState(null);

  const canView = hasAnyPermission('students') ||
    hasPermission('students:view') ||
    hasPermission('students:list') ||
    hasPermission('students:registry_manage') ||
    hasPermission('attendance:mark');

  const getToken = useCallback(async () => accessToken || await refreshAccessToken(), [accessToken, refreshAccessToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const [sRes, bRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/students/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStudents(sRes.data.results || sRes.data || []);
      setBatches(bRes.data.results || bRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => ({
    total:    students.length,
    active:   students.filter(s => s.is_active).length,
    inactive: students.filter(s => !s.is_active).length,
    feeDue:   students.filter(s => s.has_fee_due).length,
  }), [students]);

  const filtered = useMemo(() => {
    let list = [...students];
    if (statFilter === 'active')   list = list.filter(s => s.is_active);
    if (statFilter === 'inactive') list = list.filter(s => !s.is_active);
    if (statFilter === 'feeDue')   list = list.filter(s => s.has_fee_due);
    if (statusFilter === 'active')   list = list.filter(s => s.is_active);
    if (statusFilter === 'inactive') list = list.filter(s => !s.is_active);
    if (batchFilter !== 'all') list = list.filter(s => String(s.batch) === batchFilter);
    if (feeFilter === 'due')    list = list.filter(s => s.has_fee_due);
    if (feeFilter === 'no_due') list = list.filter(s => !s.has_fee_due);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.mobile_number?.includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.batch_detail?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, statFilter, statusFilter, batchFilter, feeFilter, search]);

  const hasActiveFilters = !!(statFilter || batchFilter !== 'all' || statusFilter !== 'all' || feeFilter !== 'all' || search);
  const clearFilters = () => { setStatFilter(null); setBatchFilter('all'); setStatusFilter('all'); setFeeFilter('all'); setSearch(''); };

  const batchOptions = [
    { value: 'all', label: 'All Batches' },
    ...batches.map(b => ({ value: String(b.id), label: `${b.name} (${b.current_grade_detail?.name || ''})` }))
  ];
  const statusOptions = [
    { value: 'all',      label: 'All Status'        },
    { value: 'active',   label: '✅ Active'          },
    { value: 'inactive', label: '❌ Inactive/Dropped'},
  ];
  const feeOptions = [
    { value: 'all',    label: 'All Fee Status' },
    { value: 'due',    label: '⚠️ Fee Due'     },
    { value: 'no_due', label: '✅ Fee Clear'   },
  ];

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-red-100">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-gray-500 mt-2 text-sm">You don't have permission to view students.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/40">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              <GraduationCap size={13} /> Student Directory
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Students
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">View and track all students across your batches.</p>
          </div>
          <button
            onClick={fetchData}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-500' : ''} /> Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={stats.total}    icon={Users}         gradient="from-indigo-500 to-purple-600" onClick={() => setStatFilter(null)}                                         active={!statFilter} />
          <StatCard label="Active"         value={stats.active}   icon={CheckCircle2}  gradient="from-emerald-500 to-teal-600"  onClick={() => setStatFilter(p => p === 'active'   ? null : 'active')}   active={statFilter === 'active'} />
          <StatCard label="Inactive"       value={stats.inactive} icon={XCircle}       gradient="from-slate-400 to-slate-600"   onClick={() => setStatFilter(p => p === 'inactive' ? null : 'inactive')} active={statFilter === 'inactive'} />
          <StatCard label="Fee Due"        value={stats.feeDue}   icon={AlertTriangle} gradient="from-orange-500 to-red-500"   onClick={() => setStatFilter(p => p === 'feeDue'   ? null : 'feeDue')}   active={statFilter === 'feeDue'} />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, email, batch…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-gray-50"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <DropdownFilter label="All Batches"    value={batchFilter}  options={batchOptions}  onChange={setBatchFilter}  icon={GraduationCap} />
              <DropdownFilter label="All Status"     value={statusFilter} options={statusOptions} onChange={setStatusFilter} icon={Filter} />
              <DropdownFilter label="Fee Status"     value={feeFilter}    options={feeOptions}    onChange={setFeeFilter}    icon={IndianRupee} />
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Showing <span className="font-bold text-gray-700">{filtered.length}</span> of <span className="font-semibold text-gray-600">{students.length}</span> students
            </span>
            {statFilter && (
              <button onClick={() => setStatFilter(null)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200">
                {statFilter === 'active' ? 'Active' : statFilter === 'inactive' ? 'Inactive' : 'Fee Due'}
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-1 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                    <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded-lg" /><div className="h-3 bg-gray-100 rounded-lg w-2/3" /></div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-lg" />
                  <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No students found</h3>
            <p className="text-gray-400 mt-1 text-sm">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
