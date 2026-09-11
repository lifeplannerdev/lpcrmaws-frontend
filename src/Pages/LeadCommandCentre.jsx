import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, UserX, Search, Filter, X, ChevronDown, ChevronUp,
  ArrowRightLeft, CalendarClock, Phone, MessageSquare, Mail, AlertTriangle,
  CheckCircle2, Clock, Shuffle, Ban, Zap, Info, ExternalLink, RefreshCw,
  Layers, Calendar, BarChart2, Shield
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_SIZE = 50;

// ─── Status definitions (ALL statuses, old + new) ────────────────────────────
const ALL_STATUSES = [
  { id: 'all',         label: 'All Statuses',  color: 'bg-gray-100 text-gray-600' },
  { id: 'enquiry',     label: 'Enquiry',        color: 'bg-blue-100 text-blue-700' },
  { id: 'job_enquiry', label: 'Job Enquiry',    color: 'bg-indigo-100 text-indigo-700' },
  { id: 'contacted',   label: 'Contacted',      color: 'bg-yellow-100 text-yellow-700' },
  { id: 'qualified',   label: 'Qualified',      color: 'bg-purple-100 text-purple-700' },
  { id: 'cold',        label: 'Cold',           color: 'bg-slate-100 text-slate-600' },
  { id: 'warm',        label: 'Warm',           color: 'bg-orange-100 text-orange-700' },
  { id: 'hot',         label: 'Hot',            color: 'bg-red-100 text-red-700' },
  { id: 'b2b',         label: 'B2B',            color: 'bg-teal-100 text-teal-700' },
  { id: 'converted',   label: 'Converted',      color: 'bg-green-100 text-green-700' },
  { id: 'registered',  label: 'Registered',     color: 'bg-emerald-100 text-emerald-700' },
  { id: 'closed',      label: 'Closed',         color: 'bg-gray-200 text-gray-500' },
  { id: 'lost',        label: 'Lost',           color: 'bg-rose-100 text-rose-600' },
];

const STATUS_COLOR = {
  enquiry:    'bg-blue-100 text-blue-700',
  job_enquiry:'bg-indigo-100 text-indigo-700',
  contacted:  'bg-yellow-100 text-yellow-700',
  qualified:  'bg-purple-100 text-purple-700',
  cold:       'bg-slate-100 text-slate-600',
  warm:       'bg-orange-100 text-orange-700',
  hot:        'bg-red-100 text-red-700',
  b2b:        'bg-teal-100 text-teal-700',
  converted:  'bg-green-100 text-green-700',
  registered: 'bg-emerald-100 text-emerald-700',
  closed:     'bg-gray-200 text-gray-500',
  lost:       'bg-rose-100 text-rose-600',
};

const SOURCE_OPTIONS = [
  { id: 'all', label: 'All Sources' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Website' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'ads', label: 'Ads' },
  { id: 'automation', label: 'Automation' },
  { id: 'voxbay call', label: 'Voxbay' },
  { id: 'bulk data', label: 'Bulk Data' },
  { id: 'referral', label: 'Referral' },
  { id: 'other', label: 'Other' },
];

const PRIORITY_COLORS = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-500' };
const FU_TYPE_OPTIONS = [
  { id: 'call',     label: 'Call',     Icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageSquare },
  { id: 'email',    label: 'Email',    Icon: Mail },
  { id: 'meeting',  label: 'Meeting',  Icon: Users },
];

// ─── Follow-up Strategy Definitions ──────────────────────────────────────────
const STRATEGIES = [
  {
    id: 'keep',
    label: 'Keep Existing Follow-ups',
    sublabel: 'Transfer ownership only — don\'t touch scheduled dates',
    Icon: CheckCircle2,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-indigo-500 bg-indigo-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-indigo-600',
  },
  {
    id: 'overdue',
    label: 'Mark All as Overdue (Priority Queue)',
    sublabel: 'Sets follow-up to yesterday — these appear at the top of the counsellor\'s queue',
    Icon: AlertTriangle,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-amber-500 bg-amber-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-amber-600',
  },
  {
    id: 'specific_date',
    label: 'Set One Specific Date for All',
    sublabel: 'All selected leads will get a new follow-up on this date',
    Icon: Calendar,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-blue-500 bg-blue-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-blue-600',
  },
  {
    id: 'stagger',
    label: 'Stagger Over N Days',
    sublabel: 'Spread leads evenly over a period — prevents overwhelming a single day',
    Icon: Shuffle,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-violet-500 bg-violet-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-violet-600',
  },
  {
    id: 'none',
    label: 'No Follow-up / Close All Pending',
    sublabel: 'Resolves all open follow-ups. Use when leads are being transferred for closure',
    Icon: Ban,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-rose-500 bg-rose-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-rose-600',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const staffDisplayName = (s) => {
  if (!s) return 'Unassigned';
  if (s.first_name || s.last_name) return `${s.first_name || ''} ${s.last_name || ''}`.trim();
  return s.username || `Staff #${s.id}`;
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

// ─── Follow-up Strategy Panel (inside transfer drawer) ───────────────────────
const StrategyPicker = ({ strategy, setStrategy, specificDate, setSpecificDate, staggerDays, setStaggerDays, selectedCount }) => (
  <div className="space-y-3">
    {STRATEGIES.map(({ id, label, sublabel, Icon, color, activeColor, iconColor, activeIconColor }) => {
      const isActive = strategy === id;
      return (
        <div key={id}>
          <button
            onClick={() => setStrategy(id)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${isActive ? activeColor : `${color} hover:border-gray-400`}`}
          >
            <Icon size={20} className={`mt-0.5 flex-shrink-0 ${isActive ? activeIconColor : iconColor}`} />
            <div>
              <div className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>
            </div>
          </button>

          {/* Conditional extras */}
          {isActive && id === 'specific_date' && (
            <div className="mt-2 ml-10">
              <input
                type="date"
                value={specificDate}
                min={getLocalDateString()}
                onChange={e => setSpecificDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
          {isActive && id === 'stagger' && (
            <div className="mt-2 ml-10 flex items-center gap-3">
              <input
                type="number"
                min={1} max={60}
                value={staggerDays}
                onChange={e => setStaggerDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border-2 border-violet-300 rounded-lg text-sm font-bold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
              <span className="text-sm text-gray-600">days — approx. <strong className="text-violet-700">{Math.ceil(selectedCount / staggerDays)}/day</strong></span>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LeadCommandCentre() {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, loading: authLoading, user } = useAuth();
  const { hasPermission } = usePermissions();

  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [allStaff, setAllStaff] = useState([]);   // active + inactive
  const [activeStaff, setActiveStaff] = useState([]); // for transfer target
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');        // specific employee ID
  const [filterEmpStatus, setFilterEmpStatus] = useState('all'); // all / active / inactive
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterHasPending, setFilterHasPending] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Transfer drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1); // 1=target, 2=strategy, 3=details, 4=preview
  const [targetStaffId, setTargetStaffId] = useState('');
  const [strategy, setStrategy] = useState('keep');
  const [specificDate, setSpecificDate] = useState(getLocalDateString());
  const [staggerDays, setStaggerDays] = useState(10);
  const [fuType, setFuType] = useState('call');
  const [fuPriority, setFuPriority] = useState('medium');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Debounce search
  const debounceTimer = useRef(null);
  const handleSearchChange = useCallback(v => {
    setSearch(v);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setPage(1); setDebouncedSearch(v); }, 400);
  }, []);

  // ── Auth fetch ─────────────────────────────────────────────────────────────
  const authFetch = useCallback(async (url, options = {}, signal = null, retry = true) => {
    const token = tokenRef.current;
    if (!token) throw new Error('No access token');
    const res = await fetch(url, {
      ...options,
      signal,
      credentials: 'include',
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 && retry) {
      const tok = await refreshAccessToken();
      if (!tok) throw new Error('Session expired');
      tokenRef.current = tok;
      return authFetch(url, options, signal, false);
    }
    return res;
  }, [refreshAccessToken]);

  // ── Fetch staff (once) ────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !accessToken) return;
    const load = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/employees/list/?include_inactive=true`);
        if (!res.ok) return;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.results || data.employees || []);
        setAllStaff(arr);
        setActiveStaff(arr.filter(s => s.is_active !== false));
      } catch { /* ignore */ }
    };
    load();
  }, [authLoading, accessToken]); // eslint-disable-line

  // ── Fetch leads ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !accessToken) return;
    const controller = new AbortController();
    const { signal } = controller;

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const params = { page, page_size: PAGE_SIZE };

        if (debouncedSearch)        params.search = debouncedSearch;
        if (filterStatus !== 'all') params.status = filterStatus.toUpperCase();
        if (filterPriority !== 'all') params.priority = filterPriority.toUpperCase();
        if (filterSource !== 'all') params.source = filterSource;
        if (filterDateFrom)         params.created_at__gte = filterDateFrom;
        if (filterDateTo)           params.created_at__lte = filterDateTo;
        if (filterCompany)          params.company = filterCompany;
        if (filterOverdue)          params.overdue = 'true';
        if (filterHasPending)       params.has_pending_followup = 'true';

        // Staff filters
        if (filterStaff !== 'all') {
          params.assigned_to = filterStaff;
        } else if (filterEmpStatus === 'inactive') {
          // The backend returns all leads; we'll filter client-side by is_active
          params.include_inactive_staff = 'true';
        }

        // Always fetch all-company leads for this view
        params.include_all = 'true';

        const res = await authFetch(`${API_BASE_URL}/leads/?${new URLSearchParams(params)}`, {}, signal);
        if (signal.aborted) return;
        if (!res.ok) throw new Error('Failed to fetch leads');

        const data = await res.json();
        const rawLeads = data.results?.leads || data.results || [];

        // Client-side filter by employee activity status
        let filtered = rawLeads;
        if (filterEmpStatus === 'active') {
          filtered = rawLeads.filter(l => {
            const assignee = l.assigned_to;
            if (!assignee) return false;
            return assignee.is_active !== false;
          });
        } else if (filterEmpStatus === 'inactive') {
          filtered = rawLeads.filter(l => {
            const assignee = l.assigned_to;
            if (!assignee) return true; // unassigned also shown in inactive filter
            return assignee.is_active === false;
          });
        }

        setLeads(filtered);
        setTotalCount(data.count || 0);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setInitialLoad(false);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        toast.error('Failed to load leads');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchLeads();
    return () => controller.abort();
  }, [
    authLoading, authFetch,
    page, debouncedSearch,
    filterStatus, filterPriority, filterSource, filterStaff, filterEmpStatus,
    filterOverdue, filterHasPending, filterDateFrom, filterDateTo, filterCompany,
  ]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const selectedCount = selectAllMatching ? totalCount : selectedIds.size;

  const toggleLead = useCallback(id => {
    setSelectAllMatching(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const togglePageAll = useCallback(() => {
    setSelectAllMatching(false);
    const pageIds = leads.map(l => l.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  }, [leads, selectedIds]);

  const clearSelection = () => { setSelectedIds(new Set()); setSelectAllMatching(false); };

  // ── Stats (computed) ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = leads.filter(l => l.assigned_to?.is_active !== false && l.assigned_to).length;
    const inactive = leads.filter(l => l.assigned_to?.is_active === false).length;
    const unassigned = leads.filter(l => !l.assigned_to).length;
    return { active, inactive, unassigned };
  }, [leads]);

  // ── Transfer logic ─────────────────────────────────────────────────────────
  const targetStaff = useMemo(() => activeStaff.find(s => String(s.id) === String(targetStaffId)), [activeStaff, targetStaffId]);

  const buildTransferPayload = () => {
    const lead_ids = selectAllMatching ? 'all_matching' : Array.from(selectedIds);

    const base = {
      lead_ids,
      assigned_to_id: targetStaffId,
      notes: transferNote || 'Bulk transfer via Lead Command Centre',
    };

    if (strategy === 'keep') {
      return { ...base, followup_strategy: 'keep' };
    } else if (strategy === 'overdue') {
      return {
        ...base,
        followup_strategy: 'overdue',
        followup_date: getYesterdayString(),
        followup_type: fuType,
        followup_priority: fuPriority,
      };
    } else if (strategy === 'specific_date') {
      return {
        ...base,
        followup_strategy: 'specific_date',
        followup_date: specificDate,
        followup_type: fuType,
        followup_priority: fuPriority,
      };
    } else if (strategy === 'stagger') {
      return {
        ...base,
        followup_strategy: 'stagger',
        stagger_days: staggerDays,
        followup_type: fuType,
        followup_priority: fuPriority,
      };
    } else if (strategy === 'none') {
      return { ...base, followup_strategy: 'none' };
    }
    return base;
  };

  const handleTransfer = async () => {
    if (!targetStaffId) { toast.error('Please select a target counsellor'); return; }
    if (!selectAllMatching && selectedIds.size === 0) { toast.error('No leads selected'); return; }

    setTransferring(true);
    try {
      const payload = buildTransferPayload();

      // Step 1: Bulk assign
      const res = await authFetch(`${API_BASE_URL}/leads/bulk-assign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Transfer failed');
      }

      // Step 2: If strategy requires new follow-ups and backend doesn't handle it,
      // the payload fields are included in the request above. Most implementations
      // handle this server-side. If follow-ups need a separate call, it can be
      // added here.

      toast.success(`✅ ${selectedCount} leads transferred to ${staffDisplayName(targetStaff)}`);
      setDrawerOpen(false);
      setDrawerStep(1);
      clearSelection();
      setTransferNote('');
      setTargetStaffId('');
      setStrategy('keep');

      // Refresh leads
      setPage(1);
      setInitialLoad(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Transfer failed. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN' ||
    user?.db_roles?.some(r => ['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(r.name)) ||
    hasPermission('leads:read_any') ||
    hasPermission('leads:read_tenant');

  // Filter staff list for the employee filter dropdown
  const staffFilterOptions = useMemo(() => [
    { id: 'all', label: 'All Employees', isActive: null },
    ...allStaff.map(s => ({
      id: s.id,
      label: staffDisplayName(s),
      isActive: s.is_active !== false,
    })),
  ], [allStaff]);

  // Apply filterEmpStatus to the staffFilterOptions for display
  const visibleStaffOptions = useMemo(() => {
    if (filterEmpStatus === 'active') return staffFilterOptions.filter(s => s.id === 'all' || s.isActive === true);
    if (filterEmpStatus === 'inactive') return staffFilterOptions.filter(s => s.id === 'all' || s.isActive === false);
    return staffFilterOptions;
  }, [staffFilterOptions, filterEmpStatus]);

  const pageAllSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));
  const pagePartialSelected = leads.some(l => selectedIds.has(l.id)) && !pageAllSelected;

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-12 text-center text-gray-500 text-sm">Checking session…</div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto mt-24 text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100">
        <Shield size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 text-sm">The Lead Command Centre is only accessible to Admins and Managers.</p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <Navbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Layers size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Lead Command Centre</h1>
                <p className="text-sm text-gray-500">Manage &amp; transfer leads across all employees — past and present</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setInitialLoad(true); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:text-indigo-700 transition-all"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/leads')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all"
            >
              <ExternalLink size={16} />
              Back to My Leads
            </button>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Leads', value: totalCount, icon: Users, color: 'from-violet-500 to-indigo-600', textColor: 'text-white' },
            { label: 'Selected', value: selectedCount, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', textColor: 'text-white' },
            { label: 'Inactive-Staff Leads', value: stats.inactive, icon: UserX, color: 'from-amber-500 to-orange-600', textColor: 'text-white' },
            { label: 'Unassigned', value: stats.unassigned, icon: Zap, color: 'from-rose-500 to-red-600', textColor: 'text-white' },
          ].map(({ label, value, icon: Icon, color, textColor }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 shadow-md`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${textColor} opacity-80 uppercase tracking-wide`}>{label}</span>
                <Icon size={18} className={`${textColor} opacity-70`} />
              </div>
              <div className={`text-3xl font-black ${textColor}`}>{value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* ── Filters Panel ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md mb-6 overflow-hidden">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Filter size={16} />
              Filters &amp; Search
            </div>
            {showFilters ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {showFilters && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, email..."
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-gray-900 font-medium text-sm"
                />
              </div>

              {/* Employee Status — the key filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Employee Status:</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'all', label: 'All Employees', icon: Users },
                    { id: 'active', label: 'Active Only', icon: UserCheck },
                    { id: 'inactive', label: 'Inactive Only', icon: UserX },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { setFilterEmpStatus(id); setFilterStaff('all'); setPage(1); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        filterEmpStatus === id
                          ? id === 'inactive'
                            ? 'bg-amber-100 text-amber-700 border-amber-400'
                            : id === 'active'
                            ? 'bg-green-100 text-green-700 border-green-400'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-400'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid filters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Employee */}
                <select
                  value={filterStaff}
                  onChange={e => { setFilterStaff(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {visibleStaffOptions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id === 'all' ? 'All Employees' : `${s.label}${s.isActive === false ? ' 🔴' : ' 🟢'}`}
                    </option>
                  ))}
                </select>

                {/* Status */}
                <select
                  value={filterStatus}
                  onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                {/* Priority */}
                <select
                  value={filterPriority}
                  onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Source */}
                <select
                  value={filterSource}
                  onChange={e => { setFilterSource(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                {/* Company */}
                <select
                  value={filterCompany}
                  onChange={e => { setFilterCompany(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="">All Companies</option>
                  <option value="LP">LifePlanner (LP)</option>
                  <option value="FLAG">FLAG</option>
                  <option value="FDS">FDS</option>
                </select>
              </div>

              {/* Date range + toggles */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created:</span>
                  <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500" />
                </div>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-red-50 hover:border-red-300 transition-all">
                  <input type="checkbox" checked={filterOverdue} onChange={e => { setFilterOverdue(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-red-600" />
                  <span className="text-sm font-semibold text-gray-700">Overdue Only</span>
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-all">
                  <input type="checkbox" checked={filterHasPending} onChange={e => { setFilterHasPending(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-amber-600" />
                  <span className="text-sm font-semibold text-gray-700">Has Pending Follow-up</span>
                </label>

                <button
                  onClick={() => {
                    setSearch(''); setDebouncedSearch('');
                    setFilterStatus('all'); setFilterPriority('all'); setFilterSource('all');
                    setFilterStaff('all'); setFilterEmpStatus('all');
                    setFilterOverdue(false); setFilterHasPending(false);
                    setFilterDateFrom(''); setFilterDateTo('');
                    setFilterCompany('');
                    setPage(1);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-100 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Selection action bar ────────────────────────────────────────── */}
        {selectedCount > 0 && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-200/50">
            <div className="flex items-center gap-3 text-white">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={20} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-base">{selectedCount.toLocaleString()} lead{selectedCount !== 1 ? 's' : ''} selected</div>
                {!selectAllMatching && totalCount > leads.length && (
                  <button
                    onClick={() => setSelectAllMatching(true)}
                    className="text-xs text-indigo-200 hover:text-white underline"
                  >
                    Select all {totalCount.toLocaleString()} leads matching current filters
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-white/20 rounded-xl hover:bg-white/30 transition-all"
              >
                <X size={16} /> Clear
              </button>
              <button
                onClick={() => { setDrawerOpen(true); setDrawerStep(1); }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-indigo-700 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-sm"
              >
                <ArrowRightLeft size={16} />
                Transfer Leads
              </button>
            </div>
          </div>
        )}

        {/* ── Lead Table ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
          {loading && (
            <div className="text-center py-2 text-xs text-indigo-600 font-semibold animate-pulse border-b border-indigo-100 bg-indigo-50">
              Fetching leads…
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      ref={el => { if (el) el.indeterminate = pagePartialSelected; }}
                      onChange={togglePageAll}
                      className="w-4 h-4 rounded border-gray-400 accent-indigo-500 cursor-pointer"
                    />
                  </th>
                  {['Lead', 'Status', 'Priority', 'Assigned To', 'Last Follow-up', 'Next Follow-up', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-widest text-indigo-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLoad && loading ? (
                  Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
                      <Users size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm">No leads match your filters</p>
                      <p className="text-xs mt-1">Try adjusting the employee status or status filter</p>
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => {
                    const isSelected = selectAllMatching || selectedIds.has(lead.id);
                    const assignee = lead.assigned_to;
                    const isAssigneeInactive = assignee && assignee.is_active === false;
                    const isUnassigned = !assignee;
                    const statusKey = (lead.status || '').toLowerCase();
                    const statusColor = STATUS_COLOR[statusKey] || 'bg-gray-100 text-gray-500';

                    // Border logic
                    let rowBorder = '';
                    if (isAssigneeInactive) rowBorder = 'border-l-4 border-l-amber-400';
                    if (lead.has_overdue_followup || lead.is_overdue) rowBorder = 'border-l-4 border-l-red-400';

                    return (
                      <tr
                        key={lead.id}
                        className={`group transition-colors hover:bg-indigo-50/50 ${isSelected ? 'bg-indigo-50' : 'bg-white'} ${rowBorder}`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLead(lead.id)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                        </td>

                        {/* Lead info */}
                        <td className="px-4 py-4 min-w-[180px]">
                          <div className="font-bold text-gray-900 text-sm leading-tight">{lead.name || 'Unnamed'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{lead.phone || '—'}</div>
                          {lead.email && lead.email !== 'No email provided' && (
                            <div className="text-xs text-gray-400 truncate max-w-[160px]">{lead.email}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                            {lead.status || '—'}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[(lead.priority || '').toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
                            {lead.priority || '—'}
                          </span>
                        </td>

                        {/* Assigned to */}
                        <td className="px-4 py-4 min-w-[160px]">
                          {isUnassigned ? (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                              Unassigned
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isAssigneeInactive ? 'text-amber-700' : 'text-gray-700'}`}>
                              <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${isAssigneeInactive ? 'bg-amber-400' : 'bg-green-400'}`} />
                              <span className="leading-tight">
                                {staffDisplayName(assignee)}
                                {isAssigneeInactive && <span className="block text-xs text-amber-500 font-normal">Inactive</span>}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Last follow-up */}
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {lead.last_followup_date ? (
                            <div>
                              <div className="font-medium text-gray-700">{formatDate(lead.last_followup_date)}</div>
                              {lead.last_followup_status && (
                                <span className={`text-xs ${lead.last_followup_status === 'pending' ? 'text-amber-600' : 'text-gray-400'}`}>
                                  {lead.last_followup_status}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Next follow-up */}
                        <td className="px-4 py-4 text-xs whitespace-nowrap">
                          {lead.next_followup_date ? (
                            <div className={`font-semibold ${lead.is_overdue || lead.has_overdue_followup ? 'text-red-600' : 'text-gray-700'}`}>
                              {formatDate(lead.next_followup_date)}
                              {(lead.is_overdue || lead.has_overdue_followup) && (
                                <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                  <AlertTriangle size={10} /> Overdue
                                </div>
                              )}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {lead.created_at ? formatDate(lead.created_at) : '—'}
                        </td>

                        {/* View */}
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            View <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-gray-500 font-medium">
                Page <strong className="text-gray-800">{page}</strong> of <strong className="text-gray-800">{totalPages}</strong>
                &nbsp;·&nbsp; {totalCount.toLocaleString()} total
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TRANSFER DRAWER
         ════════════════════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !transferring && setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-700 to-indigo-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 text-white">
                <ArrowRightLeft size={22} />
                <div>
                  <h2 className="text-lg font-bold">Transfer Leads</h2>
                  <p className="text-xs text-indigo-200">{selectedCount.toLocaleString()} leads selected</p>
                </div>
              </div>
              <button
                onClick={() => !transferring && setDrawerOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center px-6 py-3 bg-indigo-50 border-b border-indigo-100 gap-2 flex-shrink-0">
              {['Target', 'Strategy', 'Details', 'Confirm'].map((label, i) => {
                const step = i + 1;
                const isCurrent = drawerStep === step;
                const isDone = drawerStep > step;
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        isCurrent ? 'bg-indigo-600 border-indigo-600 text-white'
                        : isDone ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {isDone ? '✓' : step}
                      </div>
                      <span className={`text-xs font-semibold hidden sm:block ${isCurrent ? 'text-indigo-700' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
                    </div>
                    {i < 3 && <div className={`flex-1 h-0.5 rounded ${drawerStep > step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">

              {/* ── Step 1: Target counsellor ────────────────────────────── */}
              {drawerStep === 1 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Choose Target Counsellor</h3>
                  <p className="text-sm text-gray-500 mb-4">Select the active staff member to receive these leads.</p>

                  <div className="space-y-2">
                    {activeStaff.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No active staff found.</p>
                    ) : (
                      activeStaff.map(s => {
                        const name = staffDisplayName(s);
                        const isSelected = String(s.id) === String(targetStaffId);
                        return (
                          <button
                            key={s.id}
                            onClick={() => setTargetStaffId(String(s.id))}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <div className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{name}</div>
                                <div className="text-xs text-gray-400">{s.role || s.department || 'Staff'}</div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={20} className="text-indigo-600" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {targetStaffId && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-start gap-2">
                      <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-indigo-700 font-medium">
                        <strong>{selectedCount}</strong> leads will be transferred to <strong>{staffDisplayName(targetStaff)}</strong>. 
                        Any existing assignment will be overwritten. No duplicate assignments will be created.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Strategy ─────────────────────────────────────── */}
              {drawerStep === 2 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Follow-up Scheduling Strategy</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Choose how follow-ups should be handled for the transferred leads. 
                    This determines how they appear in <strong>{staffDisplayName(targetStaff)}</strong>'s queue.
                  </p>
                  <StrategyPicker
                    strategy={strategy}
                    setStrategy={setStrategy}
                    specificDate={specificDate}
                    setSpecificDate={setSpecificDate}
                    staggerDays={staggerDays}
                    setStaggerDays={setStaggerDays}
                    selectedCount={selectedCount}
                  />
                </div>
              )}

              {/* ── Step 3: Follow-up details ─────────────────────────────── */}
              {drawerStep === 3 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Follow-up Details</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {strategy === 'keep' || strategy === 'none'
                      ? 'Add an optional note to attach to each transferred lead\'s timeline.'
                      : 'Set the follow-up type and priority for all transferred leads.'}
                  </p>

                  {strategy !== 'keep' && strategy !== 'none' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Follow-up Type</label>
                        <div className="flex gap-2 flex-wrap">
                          {FU_TYPE_OPTIONS.map(({ id, label, Icon }) => (
                            <button
                              key={id}
                              onClick={() => setFuType(id)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                fuType === id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <Icon size={16} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'high', label: 'High', color: 'border-red-400 bg-red-50 text-red-700' },
                            { id: 'medium', label: 'Medium', color: 'border-amber-400 bg-amber-50 text-amber-700' },
                            { id: 'low', label: 'Low', color: 'border-gray-300 bg-gray-50 text-gray-600' },
                          ].map(({ id, label, color }) => (
                            <button
                              key={id}
                              onClick={() => setFuPriority(id)}
                              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                fuPriority === id ? color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Note (added to each lead's timeline)
                    </label>
                    <textarea
                      value={transferNote}
                      onChange={e => setTransferNote(e.target.value)}
                      placeholder="e.g., Transferred from inactive counsellor — please follow up and close or convert."
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 4: Confirm preview ───────────────────────────────── */}
              {drawerStep === 4 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-4">Review &amp; Confirm Transfer</h3>

                  <div className="space-y-3">
                    {[
                      { label: 'Leads to transfer', value: `${selectedCount.toLocaleString()} leads` },
                      { label: 'Transfer to', value: staffDisplayName(targetStaff) },
                      {
                        label: 'Follow-up strategy',
                        value: STRATEGIES.find(s => s.id === strategy)?.label || strategy,
                      },
                      ...(strategy === 'specific_date' ? [{ label: 'Follow-up date', value: specificDate }] : []),
                      ...(strategy === 'stagger' ? [{ label: 'Spread over', value: `${staggerDays} days (~${Math.ceil(selectedCount / staggerDays)}/day)` }] : []),
                      ...((strategy !== 'keep' && strategy !== 'none') ? [
                        { label: 'Follow-up type', value: FU_TYPE_OPTIONS.find(f => f.id === fuType)?.label || fuType },
                        { label: 'Priority', value: fuPriority.charAt(0).toUpperCase() + fuPriority.slice(1) },
                      ] : []),
                      ...(transferNote ? [{ label: 'Note', value: transferNote }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500 font-medium">{label}</span>
                        <span className="text-sm font-bold text-gray-900 text-right max-w-[60%]">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">This action cannot be undone</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        All selected leads will be re-assigned and follow-up dates will be updated according to the chosen strategy.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <button
                disabled={transferring}
                onClick={() => drawerStep > 1 ? setDrawerStep(s => s - 1) : setDrawerOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                {drawerStep === 1 ? 'Cancel' : '← Back'}
              </button>

              {drawerStep < 4 ? (
                <button
                  disabled={drawerStep === 1 && !targetStaffId}
                  onClick={() => setDrawerStep(s => s + 1)}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl hover:from-violet-700 hover:to-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all"
                >
                  Next →
                </button>
              ) : (
                <button
                  disabled={transferring}
                  onClick={handleTransfer}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 shadow-md transition-all flex items-center gap-2"
                >
                  {transferring ? (
                    <><RefreshCw size={16} className="animate-spin" /> Transferring…</>
                  ) : (
                    <><CheckCircle2 size={16} /> Confirm Transfer</>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
