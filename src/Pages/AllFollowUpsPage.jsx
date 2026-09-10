import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useVoxbayCall } from '../hooks/useVoxbayCall';
import { useLiveCall } from '../context/LiveCallContext';
import toast from 'react-hot-toast';
import {
  CalendarClock, Phone, MessageSquare, Mail, Users,
  AlertTriangle, ArrowLeft, RefreshCw, Search, SlidersHorizontal,
  CheckCircle, CheckCircle2, Clock, Trash2, X, ChevronDown, ChevronUp,
  Calendar as CalendarIcon, Sunrise, Star, UserCheck, LayoutList,
  History, Archive, Sparkles
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
  completed:      'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-red-100 text-red-700',
  rescheduled:    'bg-indigo-100 text-indigo-700',
};
const STATUS_LABEL = {
  pending:        'Pending',
  contacted:      'Contacted',
  completed:      'Completed',
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
const FollowUpCard = ({ item, onStatusChange, onRescheduleClick, onDelete, onCall, onCardClick }) => {
  const TypeIcon      = TYPE_ICON[item.followup_type]  || Phone;
  const typeColor     = TYPE_COLOR[item.followup_type] || 'bg-gray-100 text-gray-600 border-gray-200';
  const statusColor   = STATUS_COLOR[item.status]      || 'bg-gray-100 text-gray-600';
  const statusLabel   = STATUS_LABEL[item.status]      || item.status;
  const priorityColor = PRIORITY_COLOR[item.priority]  || PRIORITY_COLOR.medium;
  const [typeBg, typeText] = typeColor.split(' ');

  const displayName = item.lead_name || item.name || item.processing_student_name || (typeof item.lead === 'object' ? item.lead?.name : '') || 'Lead';
  const displayPhone = item.lead_phone || item.phone_number || (typeof item.lead === 'object' ? item.lead?.phone : '') || '';

  const assignedName = item.assigned_to
    ? (item.assigned_to.first_name
        ? `${item.assigned_to.first_name} ${item.assigned_to.last_name || ''}`.trim()
        : item.assigned_to.username)
    : null;

  const isCompleted = item.status !== 'pending' || item.lead_status === 'CLOSED' || item.lead_status === 'CONVERTED';

  // Extract clean notes and recording if present
  let notesText = item.notes || '';
  let recordingUrl = item.recording_url || null;
  if (notesText) {
    const recMatch = notesText.match(/(?:\[Audio Recording:\s*|Recording:\s*)(https?:\/\/[^\s\]]+)/i);
    if (recMatch) {
      if (!recordingUrl) recordingUrl = recMatch[1];
      notesText = notesText.replace(recMatch[0], '').replace(/\[\]/, '').trim();
    }
  }

  return (
    <div 
      onClick={() => onCardClick ? onCardClick(item) : null}
      className={`group bg-white rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative ${
        item.is_overdue && !isCompleted
          ? 'border-red-200 bg-red-50/30 hover:border-red-300'
          : isCompleted
            ? 'border-gray-200/80 hover:border-emerald-300 bg-gradient-to-b from-white to-slate-50/40'
            : 'border-gray-100 hover:border-indigo-300'
      }`}
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${typeColor}`}>
            <TypeIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors truncate" title={displayName}>
              {displayName}
            </p>
            {displayPhone && (
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                <Phone size={10} className="text-gray-400 shrink-0" />
                <span className="truncate">{displayPhone}</span>
              </p>
            )}
            {(item.lead_program || item.processing_student_program) && (
              <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded font-medium truncate mt-1 inline-block max-w-full">
                {item.lead_program || item.processing_student_program}
              </p>
            )}
            {assignedName && (
              <p className="text-[11px] text-indigo-600 flex items-center gap-1 mt-1 font-semibold">
                <UserCheck size={11} className="text-indigo-500 shrink-0" />
                <span className="truncate">Counselor: {assignedName}</span>
              </p>
            )}
          </div>
        </div>
        {item.is_overdue && !isCompleted && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200 flex-shrink-0">
            <AlertTriangle size={10} />
            Overdue
          </span>
        )}
      </div>

      {/* Time / Date info */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {item.follow_up_time && (
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-orange-500" />
            <span className="text-xs font-semibold text-gray-600">
              {formatTime(item.follow_up_time)}
            </span>
          </div>
        )}
        {item.follow_up_date && (
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(item.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

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
        {item.lead_status && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            item.lead_status === 'CLOSED'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : item.lead_status === 'CONVERTED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            Lead: {item.lead_status}
          </span>
        )}
      </div>

      {/* Notes */}
      {notesText && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 mb-2.5 line-clamp-2">
          {notesText}
        </p>
      )}

      {/* Recording audio player */}
      {recordingUrl && (
        <div className="mb-2.5" onClick={e => e.stopPropagation()}>
          <audio controls src={recordingUrl} className="h-7 w-full rounded-lg" preload="none" />
        </div>
      )}

      {/* Quick actions for Pending items */}
      {!isCompleted && item.status === 'pending' && (
        <div className="flex gap-1.5 mb-2.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, 'contacted'); }}
            className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Mark as completed/contacted and move to Past Follow-ups"
          >
            <CheckCircle size={12} />
            Contacted
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRescheduleClick ? onRescheduleClick(item) : onStatusChange(item.id, 'rescheduled'); }}
            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Clock size={12} />
            Reschedule
          </button>
        </div>
      )}

      {/* Completion info for Past items */}
      {isCompleted && (
        <div className="flex items-center justify-between gap-1 mb-2.5 px-2.5 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>{item.status === 'contacted' ? 'Contacted / Completed' : item.status === 'not_interested' ? 'Not Interested' : (statusLabel || 'Completed')}</span>
          </span>
          {item.updated_at && (
            <span className="text-[10px] text-emerald-600 font-mono opacity-80">
              {new Date(item.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="pt-2 border-t border-gray-100 flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCall ? onCall(displayPhone, item) : (onCardClick && onCardClick(item));
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer"
        >
          <Phone size={13} />
          Call
        </button>
        {isCompleted && onRescheduleClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRescheduleClick(item);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-all border border-purple-200/60 cursor-pointer"
            title="Schedule a new follow-up for this lead"
          >
            <Clock size={13} />
            Follow up again
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({ title, subtitle, icon: Icon, iconBg, items, loading,
                   onStatusChange, onRescheduleClick, onDelete, onCall, onCardClick, defaultOpen = true }) => {
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
                  onRescheduleClick={onRescheduleClick}
                  onDelete={onDelete}
                  onCall={onCall}
                  onCardClick={onCardClick}
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
  const { hasPermission } = usePermissions();
  const { initiateCall } = useVoxbayCall();
  const { upsertCall, setIsModalOpen, setIsMinimized } = useLiveCall();
  const tokenRef  = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const isAdmin = hasPermission('staff:view_any') || hasPermission('staff:access_flag');

  const today     = toLocalISO(new Date());
  const tomorrow  = toLocalISO(new Date(Date.now() + 86400000));
  const yesterday = toLocalISO(new Date(Date.now() - 86400000));

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'past'
  const [viewMode,  setViewMode]  = useState('list'); // 'list' | 'calendar'

  const [overdueItems,  setOverdueItems]  = useState([]);
  const [todayItems,    setTodayItems]    = useState([]);
  const [tomorrowItems, setTomorrowItems] = useState([]);
  const [otherItems,    setOtherItems]    = useState([]);
  const [pastItems,     setPastItems]     = useState([]);

  const [loadingOverdue,  setLoadingOverdue]  = useState(true);
  const [loadingToday,    setLoadingToday]    = useState(true);
  const [loadingTomorrow, setLoadingTomorrow] = useState(true);
  const [loadingOther,    setLoadingOther]    = useState(true);
  const [loadingPast,     setLoadingPast]     = useState(false);
  const [loadingCustom,   setLoadingCustom]   = useState(false);

  // Reschedule Modal State
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Filters
  const [filterDate,     setFilterDate]     = useState('');
  const [customItems,    setCustomItems]    = useState([]);
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
    authFetch(`${API_BASE_URL}/employees/list/?team=Sales`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.results || data.employees || []);
        setStaffList(
          arr.filter(u => {
            const hasExcludedRole = u.role_names?.some(r => EXCLUDED_STAFF_ROLES.includes(r.toUpperCase()));
            const isSalesTeam = !u.team || u.team.toLowerCase() === 'sales';
            return !hasExcludedRole && isSalesTeam;
          })
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
    const baseParams = { tab: 'active' };
    if (filterStaff && filterStaff !== 'all') {
      baseParams.assigned_to = filterStaff;
    }
    fetchSection({ ...baseParams, overdue: 'true' }, setOverdueItems,  setLoadingOverdue);
    fetchSection({ ...baseParams, date: today },     setTodayItems,    setLoadingToday);
    fetchSection({ ...baseParams, date: tomorrow },  setTomorrowItems, setLoadingTomorrow);
    const farFuture = toLocalISO(new Date(Date.now() + 60 * 86400000));
    fetchSection(
      { ...baseParams, start_date: toLocalISO(new Date(Date.now() + 2 * 86400000)), end_date: farFuture },
      setOtherItems,
      setLoadingOther
    );
  }, [fetchSection, today, tomorrow, filterStaff]);

  const loadPast = useCallback(() => {
    const baseParams = { tab: 'past' };
    if (filterStaff && filterStaff !== 'all') {
      baseParams.assigned_to = filterStaff;
    }
    fetchSection(baseParams, setPastItems, setLoadingPast);
  }, [fetchSection, filterStaff]);

  useEffect(() => {
    if (!authLoading && accessToken) {
      if (filterDate) {
        const baseParams = filterStaff && filterStaff !== 'all' ? { assigned_to: filterStaff } : {};
        if (activeTab === 'active') {
          fetchSection({ ...baseParams, tab: 'active', date: filterDate }, setCustomItems, setLoadingCustom);
        } else {
          fetchSection({ ...baseParams, tab: 'past', date: filterDate }, setPastItems, setLoadingPast);
        }
      } else {
        loadAll();
        loadPast();
      }
    }
  }, [authLoading, accessToken, loadAll, loadPast, filterDate, filterStaff, activeTab, fetchSection]);

  // Real-time synchronization when a call or follow-up is logged/completed elsewhere
  useEffect(() => {
    const handleRemoteRefresh = () => {
      loadAll();
      loadPast();
    };
    window.addEventListener('refreshFollowups', handleRemoteRefresh);
    window.addEventListener('refreshLeads', handleRemoteRefresh);
    return () => {
      window.removeEventListener('refreshFollowups', handleRemoteRefresh);
      window.removeEventListener('refreshLeads', handleRemoteRefresh);
    };
  }, [loadAll, loadPast]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error('Update failed'); return; }
      const saved = await res.json();

      // If marked contacted/completed/not_interested:
      // Remove immediately from active lists and move to past follow-ups tab!
      if (['contacted', 'completed', 'not_interested'].includes(newStatus)) {
        const remover = prev => prev.filter(i => i.id !== id);
        setOverdueItems(remover);
        setTodayItems(remover);
        setTomorrowItems(remover);
        setOtherItems(remover);
        setCustomItems(remover);

        // Prepend to past followups list
        setPastItems(prev => [saved, ...prev.filter(i => i.id !== id)]);
        toast.success(`Follow-up marked as ${STATUS_LABEL[newStatus] || newStatus} and moved to Past Follow-ups.`);
      } else {
        const updater = prev => prev.map(i => i.id === saved.id ? saved : i);
        setOverdueItems(updater);
        setTodayItems(updater);
        setTomorrowItems(updater);
        setOtherItems(updater);
        setCustomItems(updater);
      }
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up?')) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Delete failed'); return; }
      const remover = prev => prev.filter(i => i.id !== id);
      setOverdueItems(remover);
      setTodayItems(remover);
      setTomorrowItems(remover);
      setOtherItems(remover);
      setCustomItems(remover);
      setPastItems(remover);
      toast.success('Follow-up deleted successfully.');
    } catch { toast.error('Delete failed'); }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleItem || !rescheduleDate) return;
    setIsRescheduling(true);
    try {
      // 1. Mark current follow-up as completed / done
      const currentNotes = rescheduleItem.notes || '';
      const rescheduleNotice = `[Rescheduled to ${rescheduleDate}${rescheduleTime ? ' ' + rescheduleTime : ''}]: ${rescheduleNotes || 'Follow-up rescheduled'}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${rescheduleNotice}` : rescheduleNotice;

      const resUpdate = await authFetch(`${API_BASE_URL}/followups/${rescheduleItem.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'completed', // Mark existing attended followup as DONE
          notes: updatedNotes,
        }),
      });

      if (!resUpdate.ok) throw new Error('Failed to update current follow-up');

      // 2. Add new follow-up for the next date mentioned with status 'pending'
      const leadId = rescheduleItem.lead || rescheduleItem.lead_id || (typeof rescheduleItem.lead === 'object' ? rescheduleItem.lead?.id : null);
      await authFetch(`${API_BASE_URL}/followups/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: leadId,
          phone_number: rescheduleItem.phone_number || rescheduleItem.lead_phone || '',
          name: rescheduleItem.name || rescheduleItem.lead_name || 'Lead',
          follow_up_date: rescheduleDate,
          follow_up_time: rescheduleTime || null,
          followup_type: rescheduleItem.followup_type || 'call',
          status: 'pending', // Added to next date mentioned as pending
          priority: rescheduleItem.priority || 'medium',
          notes: rescheduleNotes || `Follow-up rescheduled from ${rescheduleItem.follow_up_date}`,
        }),
      });
      
      setRescheduleItem(null);
      loadAll();
      loadPast();
      toast.success(`Follow-up marked done & rescheduled to ${rescheduleDate}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to reschedule follow-up');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Open Live Call Modal populated with lead dossier & Make Call button
  const handleOpenFollowUpCall = useCallback((item) => {
    if (!item) return;
    const leadId = item.lead || item.lead_id || (typeof item.lead === 'object' ? item.lead?.id : null);
    const phone = item.lead_phone || item.phone_number || (typeof item.lead === 'object' ? item.lead?.phone : '') || '';
    const name = item.lead_name || item.name || item.processing_student_name || (typeof item.lead === 'object' ? item.lead?.name : '') || 'Lead';
    const cleanPhone = String(phone).replace(/\D/g, '');

    const callPayload = {
      id: `followup_${item.id}_${cleanPhone || Date.now()}`,
      call_uuid: `followup_${item.id}_${cleanPhone || Date.now()}`,
      phone: phone,
      caller_number: phone,
      call_type: 'outgoing',
      status: 'ready',
      is_new_lead: !leadId,
      lead_id: leadId,
      lead_name: name,
      lead_status: item.lead_status || 'ENQUIRY',
      lead_priority: (item.priority || 'MEDIUM').toUpperCase(),
      program: item.lead_program || item.processing_student_program || '',
      interested_country: item.lead_country || '',
      interested_course: item.lead_course || '',
      location: item.lead_location || '',
      assigned_handler: item.assigned_to?.first_name 
        ? `${item.assigned_to.first_name} ${item.assigned_to.last_name || ''}`.trim() 
        : (item.assigned_to?.username || ''),
      notes: item.notes || '',
      formData: {
        name: name,
        status: item.lead_status || 'ENQUIRY',
        priority: (item.priority || 'MEDIUM').toUpperCase(),
        program: item.lead_program || item.processing_student_program || '',
        location: item.lead_location || '',
        interested_country: item.lead_country || '',
        interested_course: item.lead_course || '',
        remarks: item.notes ? `[Follow-up Notes]: ${item.notes}` : '',
        follow_up_date: item.follow_up_date || '',
        follow_up_time: item.follow_up_time || '',
      }
    };

    upsertCall(callPayload);
    setIsModalOpen(true);
    setIsMinimized(false);
  }, [upsertCall, setIsModalOpen, setIsMinimized]);

  // Click-to-call action on card: dials via Voxbay and opens live modal
  const handleCallFollowUp = useCallback((phone, item) => {
    if (phone) {
      initiateCall(phone, {
        id: item?.lead || item?.lead_id || (typeof item?.lead === 'object' ? item?.lead?.id : null),
        name: item?.lead_name || item?.name || item?.processing_student_name || '',
        status: item?.lead_status || 'ENQUIRY',
        priority: item?.priority || 'MEDIUM',
        program: item?.lead_program || '',
      });
    } else if (item) {
      handleOpenFollowUpCall(item);
    }
  }, [initiateCall, handleOpenFollowUpCall]);

  const applyFilter = (items) => items.filter(item => {
    const q = searchTerm.toLowerCase();
    const dName = (item.lead_name || item.name || item.processing_student_name || '').toLowerCase();
    const dPhone = (item.lead_phone || item.phone_number || '').toLowerCase();
    const dProg = (item.lead_program || item.processing_student_program || '').toLowerCase();
    const matchSearch = !q ||
      dName.includes(q) ||
      dPhone.includes(q) ||
      dProg.includes(q) ||
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
    setFilterDate('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterPriority('all');
    setFilterStaff('all');
  };

  const filteredOverdue  = applyFilter(overdueItems);
  const filteredToday    = applyFilter(todayItems);
  const filteredTomorrow = applyFilter(tomorrowItems);
  const filteredOther    = applyFilter(otherItems);
  const filteredCustom   = applyFilter(customItems);
  const filteredPast     = applyFilter(pastItems);

  const activeTotalCount = overdueItems.length + todayItems.length + tomorrowItems.length + otherItems.length;
  const pastTotalCount   = pastItems.length;

  const pastTodayItems     = filteredPast.filter(i => i.follow_up_date === today);
  const pastYesterdayItems = filteredPast.filter(i => i.follow_up_date === yesterday);
  const pastEarlierItems   = filteredPast.filter(i => i.follow_up_date !== today && i.follow_up_date !== yesterday);

  const totalVisible = activeTab === 'active'
    ? (filterDate ? filteredCustom.length : (filteredOverdue.length + filteredToday.length + filteredTomorrow.length + filteredOther.length))
    : filteredPast.length;
  const hasFilters   = searchTerm || filterStatus !== 'all' || filterType !== 'all' ||
                       filterPriority !== 'all' || filterStaff !== 'all' || filterDate;

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
        <div className="mb-6">
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
              <p className="text-gray-500 ml-[52px] text-sm">Overdue · Today · Tomorrow · Upcoming · Past Records</p>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutList size={16} /> List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CalendarIcon size={16} /> Calendar
                </button>
              </div>

              <button
                onClick={() => { loadAll(); loadPast(); }}
                disabled={loadingOverdue || loadingToday || loadingTomorrow || loadingOther || loadingPast}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-indigo-400 rounded-xl text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-all cursor-pointer"
              >
                <RefreshCw size={16} className={(loadingOverdue || loadingToday || loadingTomorrow || loadingOther || loadingPast) ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Tab Switcher: Active vs Past */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('active'); setFilterDate(''); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 rounded-t-xl'
            }`}
          >
            <Clock size={16} />
            <span>Active Follow-Ups</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {activeTotalCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('past'); setFilterDate(''); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'past'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/60 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 rounded-t-xl'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Past Follow-Ups</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'past' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {pastTotalCount}
            </span>
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {activeTab === 'active' ? (
            [
              { label: 'Overdue',  value: overdueItems.length,  color: 'bg-rose-50 text-rose-700 border-rose-200' },
              { label: 'Today',    value: todayItems.length,    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'Tomorrow', value: tomorrowItems.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Upcoming', value: otherItems.length,    color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: 'Total Active', value: activeTotalCount, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${color}`}>
                <span className="text-xl font-bold">{value}</span>
                <span className="opacity-75 text-xs uppercase tracking-wide">{label}</span>
              </div>
            ))
          ) : (
            [
              { label: 'Total Past', value: pastItems.length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'Today Completed', value: pastTodayItems.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Closed Leads', value: pastItems.filter(i => i.lead_status === 'CLOSED').length, color: 'bg-rose-50 text-rose-700 border-rose-200' },
              { label: 'Contacted', value: pastItems.filter(i => i.status === 'contacted').length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${color}`}>
                <span className="text-xl font-bold">{value}</span>
                <span className="opacity-75 text-xs uppercase tracking-wide">{label}</span>
              </div>
            ))
          )}
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
                placeholder={activeTab === 'active' ? "Search active follow-ups by name, phone, or notes…" : "Search past follow-ups by name, phone, or notes…"}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

              {/* Date */}
              <div className="relative">
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm"
                  title="Specific Date"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 pr-9 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-semibold text-gray-700 bg-white text-sm">
                  <option value="all">All Status</option>
                  {activeTab === 'active' ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="rescheduled">Rescheduled</option>
                    </>
                  ) : (
                    <>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                      <option value="not_interested">Not Interested</option>
                    </>
                  )}
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
                className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 font-semibold text-gray-600 hover:text-red-600 transition-all text-sm cursor-pointer">
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
            {activeTab === 'active' ? (
              <>
                {filterDate ? (
                  <Section
                    title="Selected Date"
                    subtitle={new Date(filterDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    icon={CalendarClock}
                    iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
                    items={filteredCustom}
                    loading={loadingCustom}
                    onStatusChange={handleStatusChange}
                    onRescheduleClick={item => {
                      setRescheduleItem(item);
                      setRescheduleDate(today);
                      setRescheduleTime(item.follow_up_time || '');
                      setRescheduleNotes('');
                    }}
                    onDelete={handleDelete}
                    onCall={handleCallFollowUp}
                    onCardClick={handleOpenFollowUpCall}
                    defaultOpen={true}
                  />
                ) : (
                  <>
                    {/* ── Overdue / Previous Dates Pending Dues ── */}
                    <Section
                      title="Overdue / Previous Pending Dues"
                      subtitle="Pending follow-ups scheduled for previous dates that require immediate action"
                      icon={AlertTriangle}
                      iconBg="bg-gradient-to-br from-rose-500 to-red-600"
                      items={filteredOverdue}
                      loading={loadingOverdue}
                      onStatusChange={handleStatusChange}
                      onRescheduleClick={item => {
                        setRescheduleItem(item);
                        setRescheduleDate(today);
                        setRescheduleTime(item.follow_up_time || '');
                        setRescheduleNotes('');
                      }}
                      onDelete={handleDelete}
                      onCall={handleCallFollowUp}
                      onCardClick={handleOpenFollowUpCall}
                      defaultOpen={true}
                    />

                    {/* ── Today ── */}
                    <Section
                      title="Today"
                      subtitle={todayLabel}
                      icon={Star}
                      iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                      items={filteredToday}
                      loading={loadingToday}
                      onStatusChange={handleStatusChange}
                      onRescheduleClick={item => {
                        setRescheduleItem(item);
                        setRescheduleDate(today);
                        setRescheduleTime(item.follow_up_time || '');
                        setRescheduleNotes('');
                      }}
                      onDelete={handleDelete}
                      onCall={handleCallFollowUp}
                      onCardClick={handleOpenFollowUpCall}
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
                      onRescheduleClick={item => {
                        setRescheduleItem(item);
                        setRescheduleDate(tomorrow);
                        setRescheduleTime(item.follow_up_time || '');
                        setRescheduleNotes('');
                      }}
                      onDelete={handleDelete}
                      onCall={handleCallFollowUp}
                      onCardClick={handleOpenFollowUpCall}
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
                      onRescheduleClick={item => {
                        setRescheduleItem(item);
                        setRescheduleDate(tomorrow);
                        setRescheduleTime(item.follow_up_time || '');
                        setRescheduleNotes('');
                      }}
                      onDelete={handleDelete}
                      onCall={handleCallFollowUp}
                      onCardClick={handleOpenFollowUpCall}
                      defaultOpen={false}
                    />
                  </>
                )}
              </>
            ) : (
              /* ── PAST FOLLOW-UPS TAB ── */
              <>
                {filterDate ? (
                  <Section
                    title={`Completed on ${new Date(filterDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
                    subtitle="Past follow-up history"
                    icon={CheckCircle2}
                    iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                    items={filteredPast}
                    loading={loadingPast}
                    onStatusChange={handleStatusChange}
                    onRescheduleClick={item => {
                      setRescheduleItem(item);
                      setRescheduleDate(today);
                      setRescheduleTime(item.follow_up_time || '');
                      setRescheduleNotes('');
                    }}
                    onDelete={handleDelete}
                    onCall={handleCallFollowUp}
                    onCardClick={handleOpenFollowUpCall}
                    defaultOpen={true}
                  />
                ) : (
                  <>
                    {/* Today's completed */}
                    {pastTodayItems.length > 0 && (
                      <Section
                        title="Completed Today"
                        subtitle={todayLabel}
                        icon={CheckCircle2}
                        iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                        items={pastTodayItems}
                        loading={loadingPast}
                        onStatusChange={handleStatusChange}
                        onRescheduleClick={item => {
                          setRescheduleItem(item);
                          setRescheduleDate(tomorrow);
                          setRescheduleTime(item.follow_up_time || '');
                          setRescheduleNotes('');
                        }}
                        onDelete={handleDelete}
                        onCall={handleCallFollowUp}
                        onCardClick={handleOpenFollowUpCall}
                        defaultOpen={true}
                      />
                    )}

                    {/* Yesterday's completed */}
                    {pastYesterdayItems.length > 0 && (
                      <Section
                        title="Completed Yesterday"
                        subtitle={new Date(Date.now() - 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        icon={History}
                        iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
                        items={pastYesterdayItems}
                        loading={loadingPast}
                        onStatusChange={handleStatusChange}
                        onRescheduleClick={item => {
                          setRescheduleItem(item);
                          setRescheduleDate(today);
                          setRescheduleTime(item.follow_up_time || '');
                          setRescheduleNotes('');
                        }}
                        onDelete={handleDelete}
                        onCall={handleCallFollowUp}
                        onCardClick={handleOpenFollowUpCall}
                        defaultOpen={pastTodayItems.length === 0}
                      />
                    )}

                    {/* Earlier completed */}
                    <Section
                      title="Earlier Completed & Closed Follow-ups"
                      subtitle="Historical follow-up activity"
                      icon={Archive}
                      iconBg="bg-gradient-to-br from-slate-600 to-slate-800"
                      items={pastEarlierItems}
                      loading={loadingPast}
                      onStatusChange={handleStatusChange}
                      onRescheduleClick={item => {
                        setRescheduleItem(item);
                        setRescheduleDate(today);
                        setRescheduleTime(item.follow_up_time || '');
                        setRescheduleNotes('');
                      }}
                      onDelete={handleDelete}
                      onCall={handleCallFollowUp}
                      onCardClick={handleOpenFollowUpCall}
                      defaultOpen={pastTodayItems.length === 0 && pastYesterdayItems.length === 0}
                    />
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 h-[600px]">
            <Calendar
              localizer={localizer}
              events={(activeTab === 'active'
                ? (filterDate ? filteredCustom : [...filteredOverdue, ...filteredToday, ...filteredTomorrow, ...filteredOther])
                : filteredPast
              ).map(item => {
                const date = new Date(item.follow_up_date);
                if (item.follow_up_time) {
                  const [h, m] = item.follow_up_time.split(':');
                  date.setHours(h, m);
                }
                const calName = item.lead_name || item.name || item.processing_student_name || item.phone_number || 'Lead';
                return {
                  title: `${calName} (${item.followup_type})`,
                  start: date,
                  end: new Date(date.getTime() + 60*60*1000), // + 1 hour
                  resource: item
                };
              })}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={(event) => event.resource && handleOpenFollowUpCall(event.resource)}
              eventPropGetter={(event) => ({
                className: `text-xs font-semibold !bg-indigo-500 text-white border-none rounded p-1 shadow-sm cursor-pointer`
              })}
            />
          </div>
        )}

        {/* Reschedule Modal Dialog */}
        {rescheduleItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={18} className="text-indigo-600" />
                  Reschedule Follow-up
                </h3>
                <button onClick={() => setRescheduleItem(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Lead Contact</p>
                <p className="text-sm font-bold text-slate-800">{rescheduleItem.lead_name || rescheduleItem.name || rescheduleItem.processing_student_name || 'Lead'}</p>
                <p className="text-xs font-mono text-indigo-600 font-semibold">{rescheduleItem.lead_phone || rescheduleItem.phone_number || ''}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Follow-up Date *</label>
                <input
                  type="date"
                  min={today}
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full text-sm p-2.5 border rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Follow-up Time (Optional)</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full text-sm p-2.5 border rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reschedule Notes / Reason (Optional)</label>
                <textarea
                  rows={3}
                  value={rescheduleNotes}
                  onChange={e => setRescheduleNotes(e.target.value)}
                  placeholder="e.g., Lead asked to call back tomorrow afternoon after 3 PM..."
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRescheduleItem(null)}
                  disabled={isRescheduling}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={isRescheduling || !rescheduleDate}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isRescheduling ? 'Rescheduling...' : 'Save New Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

