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
  Layers, Calendar, BarChart2, Shield, Activity, XCircle, Flame, CheckSquare
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_SIZE = 50;

// ─── Status definitions (Current Pipeline vs Legacy Historical) ──────────────
const CURRENT_STATUSES = [
  { id: 'enquiry',     label: 'Enquiry',        color: 'bg-blue-100 text-blue-700' },
  { id: 'job_enquiry', label: 'Job Enquiry',    color: 'bg-indigo-100 text-indigo-700' },
  { id: 'b2b',         label: 'B2B',            color: 'bg-teal-100 text-teal-700' },
  { id: 'cold',        label: 'Cold',           color: 'bg-slate-100 text-slate-600' },
  { id: 'warm',        label: 'Warm',           color: 'bg-orange-100 text-orange-700' },
  { id: 'hot',         label: 'Hot',            color: 'bg-red-100 text-red-700' },
  { id: 'converted',   label: 'Converted',      color: 'bg-green-100 text-green-700' },
  { id: 'closed',      label: 'Closed',         color: 'bg-gray-200 text-gray-500' },
];

const LEGACY_STATUSES = [
  { id: 'not_interested', label: 'Not Interested (Legacy)',         color: 'bg-stone-200 text-stone-800' },
  { id: 'cnr',            label: 'Could Not Reach / CNR (Legacy)',  color: 'bg-amber-100 text-amber-800' },
  { id: 'contacted',      label: 'Contacted (Legacy)',              color: 'bg-yellow-100 text-yellow-700' },
  { id: 'qualified',      label: 'Qualified (Legacy)',              color: 'bg-purple-100 text-purple-700' },
  { id: 'registered',     label: 'Registered (Legacy)',             color: 'bg-emerald-100 text-emerald-700' },
  { id: 'lost',           label: 'Lost (Legacy)',                   color: 'bg-rose-100 text-rose-600' },
];

const ALL_STATUSES = [
  { id: 'all', label: 'All Statuses', color: 'bg-gray-100 text-gray-600' },
  ...CURRENT_STATUSES,
  ...LEGACY_STATUSES,
];

const STATUS_COLOR = {
  enquiry:        'bg-blue-100 text-blue-700',
  job_enquiry:    'bg-indigo-100 text-indigo-700',
  contacted:      'bg-yellow-100 text-yellow-700',
  qualified:      'bg-purple-100 text-purple-700',
  cold:           'bg-slate-100 text-slate-600',
  warm:           'bg-orange-100 text-orange-700',
  hot:            'bg-red-100 text-red-700',
  b2b:            'bg-teal-100 text-teal-700',
  converted:      'bg-green-100 text-green-700',
  registered:     'bg-emerald-100 text-emerald-700',
  closed:         'bg-gray-200 text-gray-500',
  lost:           'bg-rose-100 text-rose-600',
  not_interested: 'bg-stone-200 text-stone-800 border border-stone-300 font-semibold',
  'not interested':'bg-stone-200 text-stone-800 border border-stone-300 font-semibold',
  cnr:            'bg-amber-100 text-amber-800 border border-amber-200 font-semibold',
  'could not reach':'bg-amber-100 text-amber-800 border border-amber-200 font-semibold',
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

const CLOSE_REASONS = [
  'Inactive Employee Cleanup',
  'Cold / Unresponsive',
  'Lost to Competitor / Not Interested',
  'Invalid / Wrong / Duplicate Contact',
  'Fee / Budget Constraint',
  'Other Reason',
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
    sublabel: 'Sets follow-up to yesterday — appears at top of counsellor\'s overdue list',
    Icon: AlertTriangle,
    color: 'border-gray-300 bg-gray-50',
    activeColor: 'border-amber-500 bg-amber-50',
    iconColor: 'text-gray-500',
    activeIconColor: 'text-amber-600',
  },
  {
    id: 'specific_date',
    label: 'Set One Specific Date for All',
    sublabel: 'All selected leads will get a new follow-up scheduled on this date',
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
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

// ─── Follow-up Strategy Panel ─────────────────────────────────────────────────
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
//  MAIN COMPONENT
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

  // Global KPI Stats across whole database
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    activeStaffLeads: 0,
    activePipelineLeads: 0,
    inactiveStaffLeads: 0,
    unassignedLeads: 0,
    closedLeads: 0,
    convertedLeads: 0,
    loading: true,
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');          // specific employee ID
  const [filterEmpStatus, setFilterEmpStatus] = useState('all');  // all / active / inactive / unassigned
  const [filterActivePipeline, setFilterActivePipeline] = useState(false); // active staff pipeline (excl closed/converted)
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterHasPending, setFilterHasPending] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Transfer drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);
  const [targetStaffId, setTargetStaffId] = useState('');
  const [strategy, setStrategy] = useState('keep');
  const [specificDate, setSpecificDate] = useState(getLocalDateString());
  const [staggerDays, setStaggerDays] = useState(10);
  const [fuType, setFuType] = useState('call');
  const [fuPriority, setFuPriority] = useState('medium');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Bulk Close modal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeMode, setCloseMode] = useState('selected'); // 'selected' | 'filter'
  const [closeReason, setCloseReason] = useState(CLOSE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [closeRemarks, setCloseRemarks] = useState('');
  const [resolveFollowups, setResolveFollowups] = useState(true);
  const [closing, setClosing] = useState(false);

  // Debounce search
  const debounceTimer = useRef(null);
  const handleSearchChange = useCallback(v => {
    setSearch(v);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setPage(1); setDebouncedSearch(v); }, 400);
  }, []);

  // Status change handler (ensures legacy/terminal statuses don't conflict with "Active Pipeline Only")
  const handleStatusChange = useCallback((newStatus) => {
    setFilterStatus(newStatus);
    if (['not_interested', 'cnr', 'closed', 'converted', 'lost', 'registered'].includes(newStatus)) {
      setFilterActivePipeline(false);
    }
    setPage(1);
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

  // ── Fetch staff ───────────────────────────────────────────────────────────
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    if (authLoading || !accessToken) return;
    const load = async () => {
      try {
        let employees = [];
        let available = [];

        // 1. Fetch available-users (specifically for lead assignment)
        try {
          const availRes = await authFetch(`${API_BASE_URL}/leads/available-users/?team=all`);
          if (availRes.ok) {
            const availData = await availRes.json();
            available = Array.isArray(availData) ? availData : (availData.results || availData.users || []);
          }
        } catch (e) {
          console.warn('Could not fetch available-users:', e);
        }

        // 2. Fetch full employee list (active + inactive)
        try {
          const empRes = await authFetch(`${API_BASE_URL}/employees/list/?include_inactive=true`);
          if (empRes.ok) {
            const empData = await empRes.json();
            employees = Array.isArray(empData) ? empData : (empData.results || empData.employees || []);
          }
        } catch (e) {
          console.warn('Could not fetch employees list:', e);
        }

        // 3. Fallback: try alternative employee endpoints if still empty
        if (employees.length === 0) {
          try {
            const empRes2 = await authFetch(`${API_BASE_URL}/employees/`);
            if (empRes2.ok) {
              const empData2 = await empRes2.json();
              employees = Array.isArray(empData2) ? empData2 : (empData2.results || empData2.employees || []);
            }
          } catch { /* ignore */ }
        }

        // Merge all staff for the filters
        const combinedAll = [...employees];
        available.forEach(u => {
          if (!combinedAll.some(e => String(e.id) === String(u.id))) {
            combinedAll.push(u);
          }
        });

        // Determine active staff for transfer assignment
        let activeOnly = [];
        if (available.length > 0) {
          activeOnly = available;
        } else {
          activeOnly = combinedAll.filter(s => s.is_active !== false);
        }

        setAllStaff(combinedAll.length > 0 ? combinedAll : activeOnly);
        setActiveStaff(activeOnly);
      } catch (err) {
        console.error('Critical staff load error:', err);
      }
    };
    load();
  }, [authLoading, accessToken, authFetch]);

  // ── Fetch global KPI stats across whole database ───────────────────────────
  const fetchKpiStats = useCallback(async () => {
    if (!accessToken) return;
    try {
      // Try dedicated command-centre stats endpoint
      const res = await authFetch(`${API_BASE_URL}/leads/command-centre-stats/`);
      if (res.ok) {
        const data = await res.json();
        setKpiStats({
          total: data.total ?? 0,
          activeStaffLeads: data.active_staff_leads ?? 0,
          activePipelineLeads: data.active_pipeline_leads ?? 0,
          inactiveStaffLeads: data.inactive_staff_leads ?? 0,
          unassignedLeads: data.unassigned_leads ?? 0,
          closedLeads: data.closed_leads ?? 0,
          convertedLeads: data.converted_leads ?? 0,
          loading: false,
        });
        return;
      }
    } catch { /* ignore and fallback */ }

    // Fallback: parallel fast count queries
    try {
      const [totalRes, activeRes, inactiveRes, unassignedRes, pipelineRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/leads/?page_size=1&include_all=true`),
        authFetch(`${API_BASE_URL}/leads/?page_size=1&include_all=true&employee_status=active`),
        authFetch(`${API_BASE_URL}/leads/?page_size=1&include_all=true&employee_status=inactive`),
        authFetch(`${API_BASE_URL}/leads/?page_size=1&include_all=true&employee_status=unassigned`),
        authFetch(`${API_BASE_URL}/leads/?page_size=1&include_all=true&employee_status=active&active_pipeline_only=true`),
      ]);

      const [totalData, activeData, inactiveData, unassignedData, pipelineData] = await Promise.all([
        totalRes.ok ? totalRes.json() : { count: 0 },
        activeRes.ok ? activeRes.json() : { count: 0 },
        inactiveRes.ok ? inactiveRes.json() : { count: 0 },
        unassignedRes.ok ? unassignedRes.json() : { count: 0 },
        pipelineRes.ok ? pipelineRes.json() : { count: 0 },
      ]);

      setKpiStats({
        total: totalData.count || 0,
        activeStaffLeads: activeData.count || 0,
        activePipelineLeads: pipelineData.count || 0,
        inactiveStaffLeads: inactiveData.count || 0,
        unassignedLeads: unassignedData.count || 0,
        loading: false,
      });
    } catch {
      setKpiStats(prev => ({ ...prev, loading: false }));
    }
  }, [authFetch, accessToken]);

  useEffect(() => {
    if (!authLoading && accessToken) {
      fetchKpiStats();
    }
  }, [authLoading, accessToken, fetchKpiStats]);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (signal = null) => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE, include_all: 'true' };

      if (debouncedSearch)         params.search = debouncedSearch;
      if (filterStatus !== 'all')  params.status = filterStatus.toUpperCase();
      if (filterPriority !== 'all') params.priority = filterPriority.toUpperCase();
      if (filterSource !== 'all')  params.source = filterSource;
      if (filterDateFrom)          params.created_at__gte = filterDateFrom;
      if (filterDateTo)            params.created_at__lte = filterDateTo;
      if (filterCompany)           params.company = filterCompany;
      if (filterOverdue)           params.overdue = 'true';
      if (filterHasPending)        params.has_pending_followup = 'true';

      // Staff status
      if (filterStaff !== 'all') {
        params.assigned_to = filterStaff;
      } else if (filterEmpStatus !== 'all') {
        params.employee_status = filterEmpStatus;
      }

      // Active Pipeline Only (active staff minus closed/converted/lost)
      if (filterActivePipeline) {
        params.active_pipeline_only = 'true';
      }

      const res = await authFetch(`${API_BASE_URL}/leads/?${new URLSearchParams(params)}`, {}, signal);
      if (signal?.aborted) return;
      if (!res.ok) throw new Error('Failed to fetch leads');

      const data = await res.json();
      const rawLeads = data.results?.leads || data.results || [];

      setLeads(rawLeads);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
      setInitialLoad(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      toast.error('Failed to load leads');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [
    authFetch, page, debouncedSearch,
    filterStatus, filterPriority, filterSource, filterStaff,
    filterEmpStatus, filterActivePipeline,
    filterOverdue, filterHasPending, filterDateFrom, filterDateTo, filterCompany,
  ]);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    const controller = new AbortController();
    fetchLeads(controller.signal);
    return () => controller.abort();
  }, [authLoading, accessToken, fetchLeads]);

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

  // ── Active filter object helper (used for bulk assign & bulk close) ─────────
  const currentFiltersObj = useMemo(() => ({
    employee_status: filterEmpStatus,
    active_pipeline_only: filterActivePipeline,
    assigned_to: filterStaff,
    status: filterStatus,
    priority: filterPriority,
    source: filterSource,
    company: filterCompany,
    created_at__gte: filterDateFrom,
    created_at__lte: filterDateTo,
  }), [filterEmpStatus, filterActivePipeline, filterStaff, filterStatus, filterPriority, filterSource, filterCompany, filterDateFrom, filterDateTo]);

  // ── Transfer logic ─────────────────────────────────────────────────────────
  const targetStaff = useMemo(() => activeStaff.find(s => String(s.id) === String(targetStaffId)), [activeStaff, targetStaffId]);

  const handleTransfer = async () => {
    if (!targetStaffId) { toast.error('Please select a target counsellor'); return; }
    if (!selectAllMatching && selectedIds.size === 0) { toast.error('No leads selected'); return; }

    setTransferring(true);
    try {
      const payload = {
        lead_ids: selectAllMatching ? 'all_matching' : Array.from(selectedIds),
        assigned_to_id: targetStaffId,
        assignment_type: 'PRIMARY',
        notes: transferNote || 'Bulk transfer via Lead Command Centre',
        followup_strategy: strategy,
        followup_date: strategy === 'specific_date' ? specificDate : undefined,
        stagger_days: strategy === 'stagger' ? staggerDays : undefined,
        followup_type: fuType,
        followup_priority: fuPriority,
        filters: currentFiltersObj,
      };

      const res = await authFetch(`${API_BASE_URL}/leads/bulk-assign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Transfer failed');
      }

      toast.success(`✅ ${selectedCount} leads transferred to ${staffDisplayName(targetStaff)}`);
      setDrawerOpen(false);
      setDrawerStep(1);
      clearSelection();
      setTransferNote('');
      setTargetStaffId('');
      setStrategy('keep');

      // Refresh both stats and leads list
      fetchKpiStats();
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Transfer failed. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  // ── Bulk Close logic ───────────────────────────────────────────────────────
  const countToClose = closeMode === 'filter' ? totalCount : selectedCount;

  const handleBulkClose = async () => {
    if (countToClose === 0) {
      toast.error('No leads to close');
      return;
    }

    setClosing(true);
    try {
      const finalReason = closeReason === 'Other Reason' ? (customReason || 'Closed via Command Centre') : closeReason;
      const payload = {
        lead_ids: closeMode === 'filter' ? 'all_matching' : (selectAllMatching ? 'all_matching' : Array.from(selectedIds)),
        reason: finalReason,
        remarks: closeRemarks,
        resolve_followups: resolveFollowups,
        filters: currentFiltersObj,
      };

      const res = await authFetch(`${API_BASE_URL}/leads/bulk-close/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Bulk close failed');
      }

      const data = await res.json().catch(() => ({}));
      toast.success(`✅ ${data.message || `Closed ${countToClose} leads successfully`}`);

      setCloseModalOpen(false);
      clearSelection();
      setCloseRemarks('');
      setCustomReason('');

      // Refresh both stats and leads list
      fetchKpiStats();
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Bulk close failed. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN' ||
    user?.db_roles?.some(r => ['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(r.name)) ||
    hasPermission('staff_analysis:admin') ||
    hasPermission('leads:read_any') ||
    hasPermission('leads:read_tenant');

  // Staff options grouped for dropdown
  const groupedStaff = useMemo(() => {
    const active = allStaff.filter(s => s.is_active !== false);
    const inactive = allStaff.filter(s => s.is_active === false);
    return { active, inactive };
  }, [allStaff]);

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
                <p className="text-sm text-gray-500">Global lead inventory, inactive staff reassignment &amp; mass closure</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchKpiStats(); setPage(1); fetchLeads(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:text-indigo-700 transition-all shadow-sm"
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

        {/* ── KPI Cards Row (5 Accurate Global Counts + 1-Click Filter) ─────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {/* 1. Total Leads */}
          <button
            onClick={() => { setFilterEmpStatus('all'); setFilterActivePipeline(false); setPage(1); }}
            className={`text-left p-4 rounded-2xl shadow-md transition-all duration-200 bg-gradient-to-br from-slate-800 to-indigo-900 text-white hover:shadow-lg ${
              filterEmpStatus === 'all' && !filterActivePipeline ? 'ring-4 ring-indigo-400 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Total Leads</span>
              <Users size={18} className="text-indigo-300" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">{kpiStats.total.toLocaleString()}</div>
            <div className="text-[11px] text-indigo-200 mt-1">All database leads</div>
          </button>

          {/* 2. Active Staff Leads */}
          <button
            onClick={() => { setFilterEmpStatus('active'); setFilterActivePipeline(false); setPage(1); }}
            className={`text-left p-4 rounded-2xl shadow-md transition-all duration-200 bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-lg ${
              filterEmpStatus === 'active' && !filterActivePipeline ? 'ring-4 ring-blue-300 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Active Staff</span>
              <UserCheck size={18} className="text-blue-200" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">{kpiStats.activeStaffLeads.toLocaleString()}</div>
            <div className="text-[11px] text-blue-100 mt-1">Assigned to active team</div>
          </button>

          {/* 3. Active Pipeline (Active Staff - Excl Closed/Converted) */}
          <button
            onClick={() => { setFilterEmpStatus('active'); setFilterActivePipeline(true); setPage(1); }}
            className={`text-left p-4 rounded-2xl shadow-md transition-all duration-200 bg-gradient-to-br from-emerald-600 to-teal-700 text-white hover:shadow-lg ${
              filterEmpStatus === 'active' && filterActivePipeline ? 'ring-4 ring-emerald-300 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Active Pipeline</span>
              <Activity size={18} className="text-emerald-200" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">{kpiStats.activePipelineLeads.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-100 mt-1">Active staff • Non-closed</div>
          </button>

          {/* 4. Inactive-Staff Leads */}
          <button
            onClick={() => { setFilterEmpStatus('inactive'); setFilterActivePipeline(false); setPage(1); }}
            className={`text-left p-4 rounded-2xl shadow-md transition-all duration-200 bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:shadow-lg ${
              filterEmpStatus === 'inactive' ? 'ring-4 ring-amber-300 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Inactive Staff</span>
              <UserX size={18} className="text-amber-200" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">{kpiStats.inactiveStaffLeads.toLocaleString()}</div>
            <div className="text-[11px] text-amber-100 mt-1">Needs action / transfer</div>
          </button>

          {/* 5. Unassigned Leads */}
          <button
            onClick={() => { setFilterEmpStatus('unassigned'); setFilterActivePipeline(false); setPage(1); }}
            className={`text-left p-4 rounded-2xl shadow-md transition-all duration-200 bg-gradient-to-br from-rose-500 to-red-600 text-white hover:shadow-lg ${
              filterEmpStatus === 'unassigned' ? 'ring-4 ring-rose-300 scale-[1.02]' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-100">Unassigned</span>
              <Zap size={18} className="text-rose-200" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">{kpiStats.unassignedLeads.toLocaleString()}</div>
            <div className="text-[11px] text-rose-100 mt-1">No owner assigned</div>
          </button>
        </div>

        {/* ── Filters Panel ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Filter size={18} className="text-indigo-600" />
              Filter &amp; Query Controls
              {filterActivePipeline && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Active Pipeline Filter Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setCloseMode('filter'); setCloseModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                title="Close all open leads matching currently applied filters"
              >
                <Ban size={13} />
                Bulk Close Filtered Leads
              </button>
              <button
                onClick={() => setShowFilters(f => !f)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, campaign..."
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-gray-900 font-medium text-sm"
                />
              </div>

              {/* Employee Status Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Employee Status:</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'all', label: 'All Leads', icon: Users, isPipeline: false },
                    { id: 'active', label: 'Active Staff', icon: UserCheck, isPipeline: false },
                    { id: 'active', label: 'Active Pipeline (Excl. Closed/Converted)', icon: Activity, isPipeline: true },
                    { id: 'inactive', label: 'Inactive Staff', icon: UserX, isPipeline: false },
                    { id: 'unassigned', label: 'Unassigned', icon: Zap, isPipeline: false },
                  ].map(({ id, label, icon: Icon, isPipeline }) => {
                    const isSelected = filterEmpStatus === id && filterActivePipeline === isPipeline;
                    return (
                      <button
                        key={`${id}-${isPipeline}`}
                        onClick={() => {
                          setFilterEmpStatus(id);
                          setFilterActivePipeline(isPipeline);
                          setFilterStaff('all');
                          setPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          isSelected
                            ? isPipeline
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-500 shadow-sm'
                              : id === 'inactive'
                              ? 'bg-amber-100 text-amber-800 border-amber-500 shadow-sm'
                              : id === 'unassigned'
                              ? 'bg-rose-100 text-rose-800 border-rose-500 shadow-sm'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legacy / Cleanup Status Quick Filter Strip */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Layers size={13} className="text-stone-500" />
                  Legacy Historical Statuses:
                </span>
                <button
                  type="button"
                  onClick={() => handleStatusChange(filterStatus === 'not_interested' ? 'all' : 'not_interested')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    filterStatus === 'not_interested'
                      ? 'bg-stone-800 text-white border-stone-900 shadow-sm ring-2 ring-stone-400'
                      : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                  }`}
                  title="Filter leads marked as Not Interested in legacy CRM"
                >
                  <Ban size={12} className={filterStatus === 'not_interested' ? 'text-stone-300' : 'text-stone-500'} />
                  Not Interested (Legacy)
                  {filterStatus === 'not_interested' && (
                    <span className="ml-1 text-[10px] bg-stone-600 px-1.5 py-0.2 rounded font-black">ACTIVE</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(filterStatus === 'cnr' ? 'all' : 'cnr')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    filterStatus === 'cnr'
                      ? 'bg-amber-800 text-white border-amber-900 shadow-sm ring-2 ring-amber-400'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Filter leads marked as Could Not Reach (CNR) in legacy CRM"
                >
                  <Phone size={12} className={filterStatus === 'cnr' ? 'text-amber-300' : 'text-amber-600'} />
                  Could Not Reach / CNR (Legacy)
                  {filterStatus === 'cnr' && (
                    <span className="ml-1 text-[10px] bg-amber-600 px-1.5 py-0.2 rounded font-black">ACTIVE</span>
                  )}
                </button>

                {filterStatus !== 'all' && (filterStatus === 'not_interested' || filterStatus === 'cnr') && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('all')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline font-semibold ml-2"
                  >
                    Reset Status Filter
                  </button>
                )}
              </div>

              {/* Grid filters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Specific Employee */}
                <select
                  value={filterStaff}
                  onChange={e => { setFilterStaff(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="all">All Employees</option>
                  {groupedStaff.active.length > 0 && (
                    <optgroup label={`Active Employees (${groupedStaff.active.length})`}>
                      {groupedStaff.active.map(s => (
                        <option key={s.id} value={s.id}>🟢 {staffDisplayName(s)}</option>
                      ))}
                    </optgroup>
                  )}
                  {groupedStaff.inactive.length > 0 && (
                    <optgroup label={`Inactive Employees (${groupedStaff.inactive.length})`}>
                      {groupedStaff.inactive.map(s => (
                        <option key={s.id} value={s.id}>🔴 {staffDisplayName(s)} (Inactive)</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Status */}
                <select
                  value={filterStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <optgroup label="Active / Standard Pipeline">
                    {CURRENT_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Legacy / Historical Statuses">
                    {LEGACY_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </optgroup>
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
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created:</span>
                  <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500" />
                </div>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                  <input
                    type="checkbox"
                    checked={filterActivePipeline}
                    onChange={e => { setFilterActivePipeline(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                  />
                  <span className="text-xs font-bold text-gray-700">Hide Closed &amp; Converted</span>
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-red-50 hover:border-red-300 transition-all">
                  <input type="checkbox" checked={filterOverdue} onChange={e => { setFilterOverdue(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-red-600 accent-red-600" />
                  <span className="text-xs font-bold text-gray-700">Overdue Only</span>
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-all">
                  <input type="checkbox" checked={filterHasPending} onChange={e => { setFilterHasPending(e.target.checked); setPage(1); }}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-600" />
                  <span className="text-xs font-bold text-gray-700">Has Pending Follow-up</span>
                </label>

                <button
                  onClick={() => {
                    setSearch(''); setDebouncedSearch('');
                    setFilterStatus('all'); setFilterPriority('all'); setFilterSource('all');
                    setFilterStaff('all'); setFilterEmpStatus('all'); setFilterActivePipeline(false);
                    setFilterOverdue(false); setFilterHasPending(false);
                    setFilterDateFrom(''); setFilterDateTo('');
                    setFilterCompany('');
                    setPage(1);
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-100 transition-all ml-auto"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Selection Action Bar ────────────────────────────────────────── */}
        {selectedCount > 0 && (
          <div className="bg-gradient-to-r from-violet-700 via-indigo-700 to-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-indigo-200/50 animate-fadeIn">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={22} className="text-white" />
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white/90 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
              >
                <X size={16} /> Clear
              </button>
              <button
                onClick={() => { setCloseMode('selected'); setCloseModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-100 bg-rose-600/80 hover:bg-rose-600 border border-rose-400/30 rounded-xl transition-all shadow-sm"
              >
                <Ban size={16} />
                Close Selected Leads
              </button>
              <button
                onClick={() => { setDrawerOpen(true); setDrawerStep(1); }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-indigo-900 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-md"
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
            <div className="text-center py-2.5 text-xs text-indigo-700 font-bold animate-pulse border-b border-indigo-100 bg-indigo-50/80 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Fetching leads from database…
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
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
                      <Users size={44} className="mx-auto mb-3 opacity-30" />
                      <p className="font-bold text-base text-gray-600">No leads match your filters</p>
                      <p className="text-xs text-gray-400 mt-1">Try switching to All Employees or resetting the status filter</p>
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

                    let rowBorder = '';
                    if (isAssigneeInactive) rowBorder = 'border-l-4 border-l-amber-400';
                    if (lead.has_overdue_followup || lead.is_overdue) rowBorder = 'border-l-4 border-l-red-400';

                    return (
                      <tr
                        key={lead.id}
                        className={`group transition-colors hover:bg-indigo-50/50 ${isSelected ? 'bg-indigo-50/80' : 'bg-white'} ${rowBorder}`}
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
                        <td className="px-4 py-4 min-w-[170px]">
                          {isUnassigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Zap size={12} className="text-rose-500" />
                              Unassigned
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                              <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${isAssigneeInactive ? 'bg-amber-500' : 'bg-green-500'}`} />
                              <div>
                                <span className={isAssigneeInactive ? 'text-amber-800' : 'text-gray-800'}>
                                  {staffDisplayName(assignee)}
                                </span>
                                {isAssigneeInactive && (
                                  <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                    Inactive Employee
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Last follow-up */}
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(lead.last_follow_up_date || lead.last_followup?.follow_up_date)}
                        </td>

                        {/* Next follow-up */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {lead.next_follow_up_date ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                              new Date(lead.next_follow_up_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              <Calendar size={11} />
                              {formatDate(lead.next_follow_up_date)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None scheduled</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(lead.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedIds(new Set([lead.id]));
                              setSelectAllMatching(false);
                              setDrawerOpen(true);
                              setDrawerStep(1);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Transfer →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ─────────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Showing <strong className="text-gray-800">{leads.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</strong>–<strong className="text-gray-800">{Math.min(page * PAGE_SIZE, totalCount)}</strong> of <strong className="text-gray-800">{totalCount.toLocaleString()}</strong> leads
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="font-bold text-gray-700 px-2">Page {page} of {Math.max(1, totalPages)}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Bulk Close Modal ─────────────────────────────────────────────────── */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Ban size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Bulk Close Leads</h3>
                  <p className="text-xs text-rose-100">Permanently close leads as per applied filter</p>
                </div>
              </div>
              <button onClick={() => setCloseModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Alert / Summary */}
              <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-rose-900">
                      You are about to close <span className="underline font-black">{countToClose.toLocaleString()}</span> lead{countToClose !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-rose-700 mt-1">
                      {closeMode === 'filter'
                        ? 'Targeting ALL leads matching current filter criteria.'
                        : 'Targeting currently selected leads.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Closure Reason Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Closure Reason
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLOSE_REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setCloseReason(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        closeReason === r
                          ? 'bg-rose-100 text-rose-800 border-rose-400'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {closeReason === 'Other Reason' && (
                  <input
                    type="text"
                    placeholder="Specify custom reason..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 border-2 border-rose-200 rounded-xl text-sm focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Audit Remarks (Optional)
                </label>
                <textarea
                  value={closeRemarks}
                  onChange={e => setCloseRemarks(e.target.value)}
                  placeholder="e.g., Cleaned up inactive counsellor pipeline on management order."
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 resize-none font-medium"
                />
              </div>

              {/* Checkbox: Resolve Follow-ups */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={resolveFollowups}
                  onChange={e => setResolveFollowups(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                />
                <span className="text-xs font-bold text-gray-700">
                  Cancel all pending follow-ups for these leads
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setCloseModalOpen(false)}
                disabled={closing}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkClose}
                disabled={closing || countToClose === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 rounded-xl shadow-md disabled:opacity-50 transition-all"
              >
                {closing ? (
                  <><RefreshCw size={16} className="animate-spin" /> Closing Leads…</>
                ) : (
                  <><Ban size={16} /> Confirm &amp; Close {countToClose.toLocaleString()} Leads</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Drawer ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white z-50 shadow-2xl flex flex-col animate-slideLeft">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ArrowRightLeft size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Smart Lead Transfer</h2>
                  <p className="text-xs text-indigo-200">Reassign {selectedCount.toLocaleString()} leads to an active counsellor</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between flex-shrink-0">
              {[
                { n: 1, label: 'Assignee' },
                { n: 2, label: 'Strategy' },
                { n: 3, label: 'Details' },
                { n: 4, label: 'Confirm' },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    drawerStep === n
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : drawerStep > n
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {drawerStep > n ? '✓' : n}
                  </div>
                  <span className={`text-xs font-semibold ${drawerStep === n ? 'text-indigo-900' : 'text-gray-400'}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Step 1: Target Counsellor */}
              {drawerStep === 1 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Select Target Counsellor</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Choose the active admission counsellor or manager to receive these {selectedCount.toLocaleString()} leads.
                  </p>

                  {/* Quick counsellor search */}
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search counsellor by name, role, email..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {activeStaff.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-sm">
                        <Users size={32} className="mx-auto mb-2 opacity-40 text-gray-400" />
                        <p className="font-bold">No active counsellors found</p>
                        <p className="text-xs text-gray-400 mt-1">Please verify team permissions or refresh the page.</p>
                      </div>
                    ) : (
                      activeStaff
                        .filter(s => {
                          if (!staffSearch.trim()) return true;
                          const q = staffSearch.toLowerCase();
                          return (
                            (s.first_name || '').toLowerCase().includes(q) ||
                            (s.last_name || '').toLowerCase().includes(q) ||
                            (s.username || '').toLowerCase().includes(q) ||
                            (s.email || '').toLowerCase().includes(q) ||
                            (s.role || '').toLowerCase().includes(q)
                          );
                        })
                        .map(s => {
                          const isSelected = String(s.id) === String(targetStaffId);
                          return (
                            <button
                              key={s.id}
                              onClick={() => setTargetStaffId(String(s.id))}
                              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all duration-150 ${
                                isSelected ? 'border-indigo-600 bg-indigo-50/80 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {(s.first_name?.[0] || s.username?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{staffDisplayName(s)}</div>
                                  <div className="text-xs text-gray-400">
                                    {s.role ? `${s.role} • ` : ''}{s.email || s.username}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                  Active
                                </span>
                                {isSelected && <CheckCircle2 size={18} className="text-indigo-600" />}
                              </div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Follow-up Strategy */}
              {drawerStep === 2 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Follow-up Scheduling Strategy</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Control how follow-up tasks are scheduled for <strong>{staffDisplayName(targetStaff)}</strong>.
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

              {/* Step 3: Follow-up Details */}
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
                      Transfer Note (added to lead timeline)
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

              {/* Step 4: Confirm Preview */}
              {drawerStep === 4 && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-4">Review &amp; Confirm Transfer</h3>

                  <div className="space-y-3">
                    {[
                      { label: 'Leads to transfer', value: `${selectedCount.toLocaleString()} leads` },
                      { label: 'Transfer to (New Primary)', value: staffDisplayName(targetStaff) },
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
                      <p className="text-sm font-bold text-amber-800">Primary Assignment Guaranteed</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        These leads will be set to {staffDisplayName(targetStaff)} as PRIMARY owner and will no longer be counted as inactive members' leads.
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
