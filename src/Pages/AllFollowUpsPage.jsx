import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  CalendarClock, Phone, MessageSquare, Mail, Users,
  AlertTriangle, ArrowLeft, RefreshCw, Search, SlidersHorizontal,
  CheckCircle, Clock, Trash2, X, ChevronDown, ChevronUp,
  Calendar as CalendarIcon, Sunrise, Star, UserCheck, LayoutList
} from 'lucide-react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TYPE_ICON = {
  call: Phone, whatsapp: MessageSquare, email: Mail, meeting: Users,
};
const TYPE_COLOR = {
  call:     'bg-green-100 text-green-700 border-green-200',
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  email:    'bg-blue-100 text-blue-700 border-blue-200',
  meeting:  'bg-purple-100 text-purple-700 border-purple-200',
};
const STATUS_COLOR = {
  pending:        'bg-yellow-100 text-yellow-700',
  contacted:      'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
  rescheduled:    'bg-indigo-100 text-indigo-700',
};
const STATUS_LABEL = {
  pending:        'Pending',
  contacted:      'Contacted',
  not_interested: 'Not Interested',
  rescheduled:    'Rescheduled',
};
const PRIORITY_COLOR = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};

const EXCLUDED_STAFF_ROLES = ['TRAINER', 'ACCOUNTS', 'HR', 'MEDIA', 'ADMIN', 'CEO', 'PROCESSING', 'DOCUMENTATION'];

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function toLocalISO(date) {
  return date.toLocaleDateString('en-CA');
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-200 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-5 bg-gray-100 rounded-full w-20" />
      <div className="h-5 bg-gray-100 rounded-full w-16" />
    </div>
    <div className="h-8 bg-gray-100 rounded-xl" />
  </div>
);

// ── Follow-Up Card ────────────────────────────────────────────────────────────
const FollowUpCard = ({ item, onStatusChange, onDelete }) => {
  const TypeIcon      = TYPE_ICON[item.followup_type]  || Phone;
  const typeColor     = TYPE_COLOR[item.followup_type] || 'bg-gray-100 text-gray-600 border-gray-200';
  const statusColor   = STATUS_COLOR[item.status]      || 'bg-gray-100 text-gray-600';
  const statusLabel   = STATUS_LABEL[item.status]      || item.status;
  const priorityColor = PRIORITY_COLOR[item.priority]  || PRIORITY_COLOR.medium;
  const [typeBg, typeText] = typeColor.split(' ');

  const assignedName = item.assigned_to
    ? (item.assigned_to.first_name
        ? `${item.assigned_to.first_name} ${item.assigned_to.last_name || ''}`.trim()
        : item.assigned_to.username)
    : null;

  return (
    <div className={`group bg-white rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
      item.is_overdue
        ? 'border-red-200 bg-red-50/30'
        : 'border-gray-100 hover:border-indigo-200'
    }`}>
      {/* Top */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${typeColor}`}>
            <TypeIcon size={16} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {item.name || item.phone_number}
            </p>
            {item.name && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone size={10} />
                {item.phone_number}
              </p>
            )}
            {assignedName && (
              <p className="text-xs text-indigo-500 flex items-center gap-1 mt-0.5 font-semibold">
                <UserCheck size={10} />
                {assignedName}
              </p>
            )}
          </div>
        </div>
        {item.is_overdue && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200 flex-shrink-0">
            <AlertTriangle size={10} />
            Overdue
          </span>
        )}
      </div>

      {/* Time */}
      {item.follow_up_time && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <Clock size={12} className="text-orange-500" />
          <span className="text-xs font-semibold text-gray-600">
            {formatTime(item.follow_up_time)}
          </span>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
          {statusLabel}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${priorityColor}`}>
          {item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1)}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${typeBg} ${typeText}`}>
          {item.followup_type?.charAt(0).toUpperCase() + item.followup_type?.slice(1)}
        </span>
      </div>

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 mb-3 line-clamp-2">
          {item.notes}
        </p>
      )}

      {/* Quick actions */}
      {item.status === 'pending' && (
        <div className="flex gap-1.5 mb-2.5">
          <button
            onClick={() => onStatusChange(item.id, 'contacted')}
            className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200 transition-all flex items-center justify-center gap-1"
          >
            <CheckCircle size={12} />
            Contacted
          </button>
          <button
            onClick={() => onStatusChange(item.id, 'rescheduled')}
            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-all flex items-center justify-center gap-1"
          >
            <Clock size={12} />
            Reschedule
          </button>
        </div>
      )}

      {/* Delete */}
      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={() => onDelete(item.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
};

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({ title, subtitle, icon: Icon, iconBg, items, loading,
                   onStatusChange, onDelete, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="text-white" size={18} />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
            {loading ? '…' : items.length}
          </span>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {open && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarClock className="text-gray-400" size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-500">No follow-ups here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(item => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AllFollowUpsPage() {
  const navigate  = useNavigate();
  const { accessToken, refreshAccessToken, loading: authLoading, user } = useAuth();
  const tokenRef  = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const isAdmin = user?.permissions?.includes('view_staff');

  const today    = toLocalISO(new Date());
  const tomorrow = toLocalISO(new Date(Date.now() + 86400000));

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  const [todayItems,    setTodayItems]    = useState([]);
  const [tomorrowItems, setTomorrowItems] = useState([]);
  const [otherItems,    setOtherItems]    = useState([]);

  const [loadingToday,    setLoadingToday]    = useState(true);
  const [loadingTomorrow, setLoadingTomorrow] = useState(true);
  const [loadingOther,    setLoadingOther]    = useState(true);

  // Filters
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterType,     setFilterType]     = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStaff,    setFilterStaff]    = useState('all');
  const [staffList,      setStaffList]      = useState([]);

  const authFetch = useCallback(async (url, options = {}, retry = true) => {
    let token = tokenRef.current;
    if (!token) throw new Error('No access token');
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401 && retry) {
      const tok = await refreshAccessToken();
      if (!tok) throw new Error('Session expired');
      tokenRef.current = tok;
      return authFetch(url, options, false);
    }
    return res;
  }, [refreshAccessToken]);

  // Fetch staff list (admin only)
  useEffect(() => {
    if (!accessToken || !isAdmin) return;
    authFetch(`${API_BASE_URL}/employees/list/`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.results || data.employees || []);
        setStaffList(
          arr.filter(u => !EXCLUDED_STAFF_ROLES.includes((u.role || '').toUpperCase()))
        );
      })
      .catch(console.error);
  }, [accessToken, isAdmin, authFetch]);

  const fetchSection = useCallback(async (params, setter, setLoadingFn) => {
    setLoadingFn(true);
    try {
      const url = `${API_BASE_URL}/followups/?${new URLSearchParams(params)}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setter(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
      setter([]);
    } finally {
      setLoadingFn(false);
    }
  }, [authFetch]);

  const loadAll = useCallback(() => {
    fetchSection({ date: today },   setTodayItems,    setLoadingToday);
    fetchSection({ date: tomorrow }, setTomorrowItems, setLoadingTomorrow);
    const farFuture = toLocalISO(new Date(Date.now() + 365 * 86400000));
    fetchSection(
      { start_date: toLocalISO(new Date(Date.now() + 2 * 86400000)), end_date: farFuture },
      setOtherItems,
      setLoadingOther
    );
  }, [fetchSection, today, tomorrow]);

  useEffect(() => {
    if (!authLoading && accessToken) loadAll();
  }, [authLoading, accessToken, loadAll]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { alert('Update failed'); return; }
      const saved = await res.json();
      const updater = prev => prev.map(i => i.id === saved.id ? saved : i);
      setTodayItems(updater);
      setTomorrowItems(updater);
      setOtherItems(updater);
    } catch { alert('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up?')) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, { method: 'DELETE' });
      if (!res.ok) { alert('Delete failed'); return; }
      const remover = prev => prev.filter(i => i.id !== id);
      setTodayItems(remover);
      setTomorrowItems(remover);
      setOtherItems(remover);
    } catch { alert('Delete failed'); }
  };

  const applyFilter = (items) => items.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (item.name || '').toLowerCase().includes(q) ||
      (item.phone_number || '').includes(q) ||
      (item.notes || '').toLowerCase().includes(q);
    const matchStaff = filterStaff === 'all' ||
      String(item.assigned_to?.id) === String(filterStaff);
    return (
      matchSearch &&
      matchStaff &&
      (filterStatus   === 'all' || item.status       === filterStatus) &&
      (filterType     === 'all' || item.followup_type === filterType) &&
      (filterPriority === 'all' || item.priority      === filterPriority)
    );
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterPriority('all');
    setFilterStaff('all');
  };

  const filteredToday    = applyFilter(todayItems);
  const filteredTomorrow = applyFilter(tomorrowItems);
  const filteredOther    = applyFilter(otherItems);
  const totalVisible     = filteredToday.length + filteredTomorrow.length + filteredOther.length;
  const hasFilters       = searchTerm || filterStatus !== 'all' || filterType !== 'all' ||
                           filterPriority !== 'all' || filterStaff !== 'all';

  const todayLabel    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const tomorrowLabel = new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-10 text-center text-gray-500">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarClock className="text-white" size={22} />
                </div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  All Follow-Ups
                </h1>
              </div>
              <p className="text-gray-500 ml-[52px] text-sm">Today · Tomorrow · Upcoming</p>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutList size={16} /> List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CalendarIcon size={16} /> Calendar
                </button>
              </div>

              <button
                onClick={loadAll}
                disabled={loadingToday && loadingTomorrow && loadingOther}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-indigo-400 rounded-xl text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-all"
              >
                <RefreshCw size={16} className={(loadingToday || loadingTomorrow || loadingOther) ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Today',    value: todayItems.length,    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Tomorrow', value: tomorrowItems.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Upcoming', value: otherItems.length,    color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { label: 'Total',    value: todayItems.length + tomorrowItems.length + otherItems.length, color: 'bg-gray-100 text-gray-700 border-gray-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${color}`}>
              <span className="text-xl font-bold">{value}</span>
              <span className="opacity-75 text-xs uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 mb-8 shadow-lg border border-gray-100">
          <div className="space-y-4">

            {/* Search */}
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, phone, or notes…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

              {/* Status */}
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 pr-9 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>

              {/* Type */}
              <div className="relative">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 pr-9 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm">
                  <option value="all">All Types</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>

              {/* Priority */}
              <div className="relative">
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 pr-9 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm">
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>

              {/* Staff filter — admin only */}
              {isAdmin && (
                <div className="relative">
                  <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                    className="appearance-none w-full px-4 py-2.5 pr-9 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm">
                    <option value="all">All Staff</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.username || `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Staff #${s.id}`}
                      </option>
                    ))}
                  </select>
                  <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>
              )}

              {/* Clear */}
              <button onClick={clearFilters}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 font-semibold text-gray-600 hover:text-red-600 transition-all text-sm">
                <X size={15} />
                Clear Filters
              </button>
            </div>
          </div>

          {hasFilters && (
            <p className="text-xs text-indigo-600 font-semibold mt-3">
              Showing {totalVisible} filtered result{totalVisible !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {viewMode === 'list' ? (
          <>
            {/* ── Today ── */}
            <Section
              title="Today"
              subtitle={todayLabel}
              icon={Star}
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
              items={filteredToday}
              loading={loadingToday}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              defaultOpen={true}
            />

            {/* ── Tomorrow ── */}
            <Section
              title="Tomorrow"
              subtitle={tomorrowLabel}
              icon={Sunrise}
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
              items={filteredTomorrow}
              loading={loadingTomorrow}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              defaultOpen={true}
            />

            {/* ── Upcoming ── */}
            <Section
              title="Upcoming"
              subtitle="After tomorrow"
              icon={CalendarIcon}
              iconBg="bg-gradient-to-br from-purple-500 to-pink-600"
              items={filteredOther}
              loading={loadingOther}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              defaultOpen={false}
            />
          </>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 h-[600px]">
            <Calendar
              localizer={localizer}
              events={[...filteredToday, ...filteredTomorrow, ...filteredOther].map(item => {
                const date = new Date(item.follow_up_date);
                if (item.follow_up_time) {
                  const [h, m] = item.follow_up_time.split(':');
                  date.setHours(h, m);
                }
                return {
                  title: `${item.name || item.phone_number} (${item.followup_type})`,
                  start: date,
                  end: new Date(date.getTime() + 60*60*1000), // + 1 hour
                  resource: item
                };
              })}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={(event) => ({
                className: `text-xs font-semibold !bg-indigo-500 text-white border-none rounded p-1 shadow-sm`
              })}
            />
          </div>
        )}

      </div>
    </div>
  );
}
