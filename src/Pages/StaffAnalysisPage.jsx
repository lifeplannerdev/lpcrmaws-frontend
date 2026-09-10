import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useVoxbayCall } from '../hooks/useVoxbayCall';
import {
  allStatusOptions,
  statusOptions,
  sourceOptions,
  priorityOptions
} from '../Components/utils/leadConstants';
import {
  Users, TrendingUp, Phone, CalendarClock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, RefreshCw, Search, Filter, Download,
  ArrowUpRight, Minus, X, Calendar, BarChart2, UserCheck, PhoneCall,
  PhoneIncoming, PhoneOutgoing, Clock, MessageSquare, SlidersHorizontal,
  ChevronLeft, Sparkles, Trophy, Award, Flame, Target, Star, Volume2,
  ShieldCheck, ArrowRight, ExternalLink, Hash, Check, Info
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DATE_PRESETS = [
  { value: 'all_time',     label: 'All Time',       category: 'all' },
  { value: 'today',        label: 'Today',          category: 'single' },
  { value: 'yesterday',    label: 'Yesterday',      category: 'single' },
  { value: 'single_date',  label: 'Specific Day',   category: 'single' },
  { value: 'this_week',    label: 'This Week',      category: 'range' },
  { value: 'this_month',   label: 'This Month',     category: 'range' },
  { value: 'custom_range', label: 'Custom Range',   category: 'range' },
];

const CALL_TYPES = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' }
];

const STATUS_COLOR_MAP = {
  ENQUIRY:        'bg-blue-100 text-blue-700 border-blue-200',
  JOB_ENQUIRY:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  B2B:            'bg-violet-100 text-violet-700 border-violet-200',
  COLD:           'bg-sky-100 text-sky-700 border-sky-200',
  WARM:           'bg-amber-100 text-amber-700 border-amber-200',
  HOT:            'bg-rose-100 text-rose-700 border-rose-200',
  CLOSED:         'bg-slate-100 text-slate-700 border-slate-200',
  CONVERTED:      'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  CONTACTED:      'bg-amber-50 text-amber-800 border-amber-200',
  QUALIFIED:      'bg-purple-100 text-purple-700 border-purple-200',
  NOT_INTERESTED: 'bg-red-50 text-red-700 border-red-200',
  CNR:            'bg-gray-100 text-gray-600 border-gray-200',
  REGISTERED:     'bg-green-100 text-green-800 border-green-300 font-bold',
};

const LEGACY_STATUS_KEYS = ['CONTACTED', 'QUALIFIED', 'NOT_INTERESTED', 'CNR', 'REGISTERED'];

function formatSeconds(sec) {
  if (!sec) return '0s';
  const s = parseInt(sec, 10);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remSec = s % 60;
  if (h > 0) return `${h}h ${m}m ${remSec}s`;
  if (m > 0) return `${m}m ${remSec}s`;
  return `${remSec}s`;
}

function getRankBadge(rank) {
  if (rank === 1) return { text: '#1 Top Performer', bg: 'bg-amber-500 text-white', icon: Trophy, ring: 'ring-2 ring-amber-400' };
  if (rank === 2) return { text: '#2 Runner Up',    bg: 'bg-slate-400 text-white', icon: Award,  ring: 'ring-2 ring-slate-300' };
  if (rank === 3) return { text: '#3 Third Place',   bg: 'bg-amber-700 text-white', icon: Award,  ring: 'ring-2 ring-amber-600' };
  return { text: `#${rank}`, bg: 'bg-slate-100 text-slate-700 font-bold', icon: Hash, ring: '' };
}

function KPICard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold opacity-80 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-75 font-medium">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-white/25 backdrop-blur-sm">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ScorecardMeter({ score, size = 'md' }) {
  const s = Math.min(100, Math.max(0, score || 0));
  const color = s >= 80 ? 'text-emerald-600 stroke-emerald-500'
              : s >= 60 ? 'text-indigo-600 stroke-indigo-500'
              : s >= 40 ? 'text-amber-500 stroke-amber-500'
              : 'text-rose-500 stroke-rose-500';
              
  const badgeBg = s >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : s >= 60 ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : s >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center gap-1 font-black rounded-lg px-2 py-0.5 border text-xs ${badgeBg}`}>
        <Flame size={12} className={s >= 70 ? 'text-amber-500 fill-amber-500 animate-pulse' : ''} />
        <span>{s.toFixed(1)}</span>
        <span className="text-[9px] opacity-70 font-normal">/100</span>
      </div>
    </div>
  );
}

function FollowUpBadge({ f }) {
  const isDone = f.status === 'completed' || f.status === 'contacted';
  const color = isDone ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : f.is_overdue ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
              : 'bg-amber-100 text-amber-800 border-amber-300';
  return (
    <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${color}`}>
      <Clock size={11} />
      <span>{f.follow_up_date}</span>
      <span>&bull;</span>
      <span className="capitalize">{f.status}</span>
      {f.is_overdue && <span title="Overdue action required!">⚠️</span>}
    </div>
  );
}

function parseFollowUpNotes(notes, explicitRecordingUrl = null) {
  let recordingUrl = explicitRecordingUrl || null;
  if (!notes || !notes.trim()) {
    return { recordingUrl, cleanNotes: recordingUrl ? 'Call recording available' : 'No notes.' };
  }

  // 1. Explicit prefix: Recording: <url> or [Audio Recording: <url>]
  if (!recordingUrl) {
    const explicitMatch = notes.match(/(?:Recording:\s*|\[Audio Recording:\s*|\bAudio:\s*)(https?:\/\/[^\s\]]+)/i);
    if (explicitMatch) {
      recordingUrl = explicitMatch[1];
    } else {
      // 2. Direct Voxbay URL match
      const directMatch = notes.match(/(https?:\/\/[^\s\]]+(?:voiceapi\.voxbay\.com|callcenter|callrecordings|\.wav|\.mp3)[^\s\]]*)/i);
      if (directMatch) {
        recordingUrl = directMatch[1];
      }
    }
  }

  let cleanNotes = notes;
  if (recordingUrl) {
    cleanNotes = cleanNotes
      .replace(/(?:Recording:\s*|\[Audio Recording:\s*|\bAudio:\s*)https?:\/\/[^\s\]]+/gi, '')
      .replace(recordingUrl, '')
      .replace(/Call UUID:\s*[0-9a-zA-Z_-]+/gi, '')
      .trim();
  }

  return {
    recordingUrl,
    cleanNotes: cleanNotes || (recordingUrl ? 'Call completed with recording.' : 'No notes.')
  };
}

function LeadRow({ lead, onCall }) {
  const [expanded, setExpanded] = useState(false);
  const statusCls = STATUS_COLOR_MAP[lead.status] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <>
      <tr
        className="group border-b border-gray-100 hover:bg-indigo-50/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-3 w-8">
          <button className="p-1 text-gray-400 group-hover:text-indigo-600 transition-colors">
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </td>
        <td className="px-3 py-3">
          <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <span>{lead.name || '—'}</span>
            {lead.lead_tag === 'FRESH' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Sparkles size={10} className="text-emerald-600" /> Fresh
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-violet-100 text-violet-800 border border-violet-300">
                <CalendarClock size={10} className="text-violet-600" /> Follow-up
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 font-mono font-medium">{lead.phone}</span>
            {lead.latest_followup && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                lead.latest_followup.status === 'pending'
                  ? (lead.latest_followup.is_overdue ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold' : 'bg-amber-50 text-amber-700 border-amber-300')
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                {lead.latest_followup.status === 'pending' ? '⏳ Due: ' : '✓ Done: '}
                {lead.latest_followup.follow_up_date}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusCls}`}>
            {lead.status}
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-gray-600 font-medium">{lead.source || '—'}</td>
        <td className="px-3 py-3 text-xs text-gray-600 max-w-[180px] truncate">{lead.program || '—'}</td>
        <td className="px-3 py-3 text-xs text-gray-500">
          <div className="flex items-center gap-1 font-medium">
            {lead.call_type === 'incoming' ? (
              <span className="text-emerald-600 flex items-center gap-0.5"><PhoneIncoming size={12} /> Inbound</span>
            ) : lead.call_type === 'outgoing' ? (
              <span className="text-indigo-600 flex items-center gap-0.5"><PhoneOutgoing size={12} /> Outbound</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-xs font-bold text-gray-700">{lead.followups?.length ?? 0}</td>
        <td className="px-3 py-3 text-xs text-gray-500">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—'}</td>
        <td className="px-3 py-3">
          <button
            onClick={e => { e.stopPropagation(); onCall(lead.phone, lead); }}
            className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all hover:scale-105 active:scale-95 shadow-sm"
            title="Call with Voxbay"
          >
            <PhoneCall size={14} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-6 pb-4 pt-2 bg-indigo-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h5 className="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-indigo-600" /> Counselor Remarks
                </h5>
                <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {lead.remarks || 'No remarks recorded.'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h5 className="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center gap-1.5">
                  <CalendarClock size={13} className="text-violet-600" /> Follow-ups History ({lead.followups?.length ?? 0})
                </h5>
                {lead.followups && lead.followups.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {lead.followups.map(f => {
                      const { recordingUrl, cleanNotes } = parseFollowUpNotes(f.notes, f.recording_url);
                      return (
                        <div key={f.id} className="border border-gray-100 rounded-lg p-2.5 space-y-1.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <FollowUpBadge f={f} />
                            {recordingUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                <Volume2 size={10} className="text-indigo-600" /> Recording
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{cleanNotes}</p>
                          {recordingUrl && (
                            <div className="pt-1">
                              <audio
                                controls
                                preload="none"
                                src={recordingUrl}
                                className="h-7 w-full rounded-md outline-none bg-white shadow-2xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No follow-ups recorded.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function StaffAnalysisPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { initiateCall } = useVoxbayCall();

  // Date filters
  const [datePreset, setDatePreset] = useState('all_time');
  const [singleDate, setSingleDate] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Secondary filters
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedCallTypes, setSelectedCallTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'fresh', 'followup'
  const [showFilters, setShowFilters] = useState(false);

  // Active workspace tab: 'overview', 'leads', 'followups', 'calls', 'leaderboard'
  const [activeTab, setActiveTab] = useState('overview');

  // Employee selection
  const [focusedEmployee, setFocusedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Data states
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState('');

  // Leads tab state
  const [leadsData, setLeadsData] = useState({ results: [], count: 0 });
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);

  // Followups tab state
  const [followupsData, setFollowupsData] = useState({ results: [], count: 0 });
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [followupsPage, setFollowupsPage] = useState(1);
  const [fuStatusFilter, setFuStatusFilter] = useState('all');

  // Call Logs tab state
  const [callLogsData, setCallLogsData] = useState({ results: [], count: 0 });
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);
  const [callLogsPage, setCallLogsPage] = useState(1);

  // Parameter serialization
  const getQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (datePreset === 'today' || datePreset === 'yesterday' || datePreset === 'all_time' || datePreset === 'this_week' || datePreset === 'this_month') {
      params.set('date_preset', datePreset);
    } else if (datePreset === 'single_date' && singleDate) {
      params.set('date_preset', 'single_date');
      params.set('single_date', singleDate);
    } else if (datePreset === 'custom_range' && customStart && customEnd) {
      params.set('date_preset', 'custom');
      params.set('start_date', customStart);
      params.set('end_date', customEnd);
    } else {
      params.set('date_preset', 'all_time');
    }

    if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
    if (selectedSources.length) params.set('source', selectedSources.join(','));
    if (selectedCallTypes.length) params.set('call_type', selectedCallTypes.join(','));
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    if (focusedEmployee) params.set('employee_id', focusedEmployee);
    return params;
  }, [datePreset, singleDate, customStart, customEnd, selectedStatuses, selectedSources, selectedCallTypes, selectedCategory, focusedEmployee]);

  // Fetch summary and rankings
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const params = getQueryParams();
      const res = await fetch(`${API_BASE_URL}/staff-analysis/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch staff analysis data');
      const json = await res.json();
      setSummaryData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSummary(false);
    }
  }, [accessToken, getQueryParams]);

  // Fetch leads for Leads Tab
  const fetchLeads = useCallback(async () => {
    if (activeTab !== 'leads') return;
    setLoadingLeads(true);
    try {
      const params = getQueryParams();
      params.set('page', leadsPage);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE_URL}/staff-analysis/leads/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const json = await res.json();
      if (json.results) {
        setLeadsData(json);
      } else {
        setLeadsData({ results: json, count: json.length });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  }, [accessToken, getQueryParams, leadsPage, searchQuery, activeTab]);

  // Fetch follow-ups for Followups Tab
  const fetchFollowups = useCallback(async () => {
    if (activeTab !== 'followups') return;
    setLoadingFollowups(true);
    try {
      const params = getQueryParams();
      params.set('page', followupsPage);
      if (fuStatusFilter && fuStatusFilter !== 'all') {
        params.set('status', fuStatusFilter);
      }
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE_URL}/staff-analysis/followups/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch follow-ups');
      const json = await res.json();
      if (json.results) {
        setFollowupsData(json);
      } else {
        setFollowupsData({ results: json, count: json.length });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollowups(false);
    }
  }, [accessToken, getQueryParams, followupsPage, fuStatusFilter, searchQuery, activeTab]);

  // Fetch call logs for Call Logs Tab
  const fetchCallLogs = useCallback(async () => {
    if (activeTab !== 'calls') return;
    setLoadingCallLogs(true);
    try {
      const params = new URLSearchParams();
      if (datePreset === 'today' || datePreset === 'yesterday' || datePreset === 'this_week' || datePreset === 'this_month') {
        params.set('date_preset', datePreset);
      } else if (datePreset === 'single_date' && singleDate) {
        params.set('start_date', singleDate);
        params.set('end_date', singleDate);
      } else if (datePreset === 'custom_range' && customStart && customEnd) {
        params.set('start_date', customStart);
        params.set('end_date', customEnd);
      }
      if (focusedEmployee) params.set('employee_id', focusedEmployee);
      params.set('page', callLogsPage);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE_URL}/voxbay/call-logs/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch call logs');
      const json = await res.json();
      if (json.results) {
        setCallLogsData(json);
      } else {
        setCallLogsData({ results: json, count: json.length });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCallLogs(false);
    }
  }, [accessToken, datePreset, singleDate, customStart, customEnd, focusedEmployee, callLogsPage, searchQuery, activeTab]);

  // Reload summary when date or global filters change
  useEffect(() => {
    setLeadsPage(1);
    setFollowupsPage(1);
    setCallLogsPage(1);
    fetchSummary();
  }, [datePreset, singleDate, customStart, customEnd, selectedStatuses, selectedSources, selectedCallTypes, fetchSummary]);

  // Debounced load for active tab
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'leads') fetchLeads();
      else if (activeTab === 'followups') fetchFollowups();
      else if (activeTab === 'calls') fetchCallLogs();
    }, 350);
    return () => clearTimeout(t);
  }, [activeTab, leadsPage, followupsPage, callLogsPage, searchQuery, focusedEmployee, selectedCategory, fuStatusFilter, fetchLeads, fetchFollowups, fetchCallLogs]);

  const gs = summaryData?.grand_summary || {};
  const allEmployees = summaryData?.employees || [];

  // Filter employees for sidebar search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return allEmployees;
    const q = employeeSearch.toLowerCase();
    return allEmployees.filter(e =>
      e.employee.full_name?.toLowerCase().includes(q) ||
      e.employee.username?.toLowerCase().includes(q) ||
      e.employee.roles?.some(r => r.toLowerCase().includes(q))
    );
  }, [allEmployees, employeeSearch]);

  const focusedData = useMemo(() => {
    return focusedEmployee ? allEmployees.find(e => e.employee.id === focusedEmployee) : null;
  }, [allEmployees, focusedEmployee]);

  // Status toggle handlers
  const toggleStatus = (val) => setSelectedStatuses(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  const toggleSource = (val) => setSelectedSources(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  const toggleCallType = (val) => setSelectedCallTypes(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white text-gray-900">
      <Navbar />

      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-6 space-y-6">

        {/* ── Page Header & Quick Controls ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                <BarChart2 size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                  Staff Performance & Sales Hub
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Live 360°
                  </span>
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Comprehensive employee performance, talk time, sales pipeline, and follow-ups ledger
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {gs.top_performer && (
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
                <Trophy size={18} className="text-amber-500 animate-bounce" />
                <div className="text-xs">
                  <span className="text-amber-800 font-bold">#1 Top Performer: </span>
                  <span className="font-black text-gray-900">{gs.top_performer.full_name || gs.top_performer.username}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                fetchSummary();
                if (activeTab === 'leads') fetchLeads();
                if (activeTab === 'followups') fetchFollowups();
                if (activeTab === 'calls') fetchCallLogs();
              }}
              disabled={loadingSummary}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={14} className={loadingSummary ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* ── Omnipresent Date Selector & Filters Ribbon ── */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-gray-200 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Date Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/60">
              {DATE_PRESETS.map(p => {
                const isActive = datePreset === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setDatePreset(p.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300 scale-102'
                        : 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Date Inputs based on preset */}
            {datePreset === 'single_date' && (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-2xl animate-fadeIn">
                <Calendar size={15} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-800">Select Date:</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="text-xs font-bold p-1.5 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {datePreset === 'custom_range' && (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-2xl animate-fadeIn flex-wrap">
                <Calendar size={15} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-800">From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="text-xs font-bold p-1.5 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-xs font-bold text-indigo-800">To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="text-xs font-bold p-1.5 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {/* Filter Drawer Toggle & Search */}
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all ${
                  showFilters || selectedStatuses.length || selectedSources.length || selectedCallTypes.length
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {(selectedStatuses.length + selectedSources.length + selectedCallTypes.length) > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {selectedStatuses.length + selectedSources.length + selectedCallTypes.length}
                  </span>
                )}
              </button>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search current tab..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setLeadsPage(1);
                    setFollowupsPage(1);
                    setCallLogsPage(1);
                  }}
                  className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 w-44 sm:w-56 font-medium transition-all"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Detailed Filters (Canonical + Legacy Statuses) */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-4 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                
                {/* Active Canonical Statuses */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Target size={12} className="text-indigo-600" /> Active Lead Stages
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium">Standard Pipeline</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map(s => {
                      const isSel = selectedStatuses.includes(s.value);
                      return (
                        <button
                          key={s.value}
                          onClick={() => toggleStatus(s.value)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-all ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'border-gray-200 text-gray-700 bg-white hover:border-indigo-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legacy Statuses */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} className="text-amber-600" /> Historical / Legacy Statuses
                      </p>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                        Legacy Records
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allStatusOptions.filter(s => LEGACY_STATUS_KEYS.includes(s.value)).map(s => {
                        const isSel = selectedStatuses.includes(s.value);
                        return (
                          <button
                            key={s.value}
                            onClick={() => toggleStatus(s.value)}
                            className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition-all ${
                              isSel
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'border-dashed border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100'
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Call Types */}
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={12} className="text-emerald-600" /> Call Direction
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CALL_TYPES.map(s => {
                      const isSel = selectedCallTypes.includes(s.value);
                      return (
                        <button
                          key={s.value}
                          onClick={() => toggleCallType(s.value)}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'border-gray-200 text-gray-700 bg-white hover:border-emerald-300'
                          }`}
                        >
                          {s.value === 'incoming' ? <PhoneIncoming size={12} /> : <PhoneOutgoing size={12} />}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lead Source */}
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={12} className="text-purple-600" /> Channel Source
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {sourceOptions.map(s => {
                      const isSel = selectedSources.includes(s.value);
                      return (
                        <button
                          key={s.value}
                          onClick={() => toggleSource(s.value)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-medium transition-all ${
                            isSel
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'border-gray-200 text-gray-700 bg-white hover:border-purple-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {(selectedStatuses.length || selectedSources.length || selectedCallTypes.length) > 0 && (
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setSelectedStatuses([]);
                      setSelectedSources([]);
                      setSelectedCallTypes([]);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200"
                  >
                    <X size={12} /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-3 text-sm flex items-center gap-3 shadow-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ── Executive KPI Scoreboard (Obeys Date Filter) ── */}
        {summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <KPICard
              label="Total Pipeline"
              value={gs.total_leads ?? 0}
              sub={`${gs.fresh_leads ?? 0} Fresh · ${gs.followup_leads ?? 0} Followup`}
              icon={Users}
              color="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-600"
            />
            <KPICard
              label="Follow-ups Resolved"
              value={`${gs.followups_resolved ?? 0} / ${gs.followups_total ?? 0}`}
              sub={`${gs.completion_rate ?? 0}% Resolution Rate`}
              icon={CheckCircle2}
              color="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-600"
            />
            <KPICard
              label="Pending Actions"
              value={gs.followups_pending ?? 0}
              sub={`${gs.followups_overdue ?? 0} Overdue follow-ups`}
              icon={AlertTriangle}
              color={gs.followups_overdue > 0
                ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600"
                : "bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-500"
              }
            />
            <KPICard
              label="Conversions"
              value={gs.converted_leads ?? 0}
              sub={`${gs.conversion_rate ?? 0}% Win Rate`}
              icon={Award}
              color="bg-gradient-to-br from-violet-600 to-purple-800 text-white border-violet-600"
            />
            <KPICard
              label="Telephony Talk Time"
              value={gs.talktime_display || '0s'}
              sub={`${gs.calls_answered ?? 0} Answered · ${gs.calls_total ?? 0} Total Calls`}
              icon={PhoneCall}
              color="bg-gradient-to-br from-sky-500 to-blue-700 text-white border-sky-600"
            />
            <KPICard
              label="Hot & Warm Pipeline"
              value={(gs.hot_leads ?? 0) + (gs.warm_leads ?? 0)}
              sub={`${gs.hot_leads ?? 0} Hot · ${gs.warm_leads ?? 0} Warm`}
              icon={Flame}
              color="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-500"
            />
          </div>
        )}

        {/* ── Main Workspace: Sidebar + 360° Employee Tab Hub ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── Left Sidebar: Employee Roster & Performance Scorecards ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3 bg-white rounded-3xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-indigo-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                  Counselors ({filteredEmployees.length})
                </h3>
              </div>
              <button
                onClick={() => setFocusedEmployee(null)}
                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                  !focusedEmployee
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Team View
              </button>
            </div>

            {/* Search Counselor */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Find counselor..."
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400"
              />
            </div>

            {/* Employee Cards List */}
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {loadingSummary && (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loadingSummary && filteredEmployees.map(empData => {
                const isSelected = focusedEmployee === empData.employee.id;
                const { employee, summary } = empData;
                const badge = getRankBadge(summary.rank);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={employee.id}
                    onClick={() => setFocusedEmployee(prev => prev === employee.id ? null : employee.id)}
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-200'
                        : 'border-gray-100 bg-white hover:border-indigo-200'
                    }`}
                  >
                    {/* Header with Rank & Score */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${badge.bg}`}>
                          {summary.rank <= 3 ? <BadgeIcon size={14} /> : `#${summary.rank}`}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate leading-tight">
                            {employee.full_name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                            {employee.roles.length > 0 ? employee.roles.join(', ') : 'Counselor'}
                          </p>
                        </div>
                      </div>

                      <ScorecardMeter score={summary.performance_score} />
                    </div>

                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-4 gap-1 text-center bg-white p-1.5 rounded-xl border border-gray-100 shadow-2xs text-[10px]">
                      <div>
                        <p className="font-extrabold text-indigo-700 text-xs">{summary.total_leads}</p>
                        <p className="text-gray-400 font-medium">Leads</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-emerald-700 text-xs">{summary.resolution_rate}%</p>
                        <p className="text-gray-400 font-medium">FU Done</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-purple-700 text-xs">{summary.converted_leads}</p>
                        <p className="text-gray-400 font-medium">Won</p>
                      </div>
                      <div>
                        <p className="font-extrabold text-sky-700 text-xs truncate">{summary.talktime_display || '0s'}</p>
                        <p className="text-gray-400 font-medium">Talktime</p>
                      </div>
                    </div>

                    {/* Overdue alert if any */}
                    {summary.followups_overdue > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <AlertTriangle size={11} /> {summary.followups_overdue} overdue follow-up{summary.followups_overdue > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}

              {!loadingSummary && filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs font-medium">
                  No counselors matching search.
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: 360° Employee Workspace & Multi-Tabs ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">

            {/* Selected Counselor Hero / Identity Banner */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-200">
                    {focusedData ? focusedData.employee.full_name.charAt(0).toUpperCase() : <Users size={26} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                        {focusedData ? focusedData.employee.full_name : 'Team 360° Overview'}
                      </h2>
                      {focusedData && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${getRankBadge(focusedData.summary.rank).bg}`}>
                          Rank #{focusedData.summary.rank}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1 flex-wrap">
                      {focusedData ? (
                        <>
                          <span>{focusedData.employee.email || 'No email registered'}</span>
                          <span>&bull;</span>
                          <span>Roles: {focusedData.employee.roles.join(', ') || 'Staff'}</span>
                          {focusedData.employee.voxbay_extension && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                Ext: {focusedData.employee.voxbay_extension}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span>Aggregate analytics across all {allEmployees.length} active staff members</span>
                      )}
                    </div>
                  </div>
                </div>

                {focusedData && (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 p-3 rounded-2xl">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Performance Score</p>
                      <p className="text-2xl font-black text-indigo-700 leading-tight">
                        {focusedData.summary.performance_score} <span className="text-xs text-gray-400 font-medium">/100</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Flame size={20} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 mt-5 border-t border-gray-100 pt-3 overflow-x-auto">
                {[
                  { id: 'overview',    label: 'Overview & Charts',   icon: BarChart2 },
                  { id: 'leads',       label: 'Leads Portfolio',     icon: Users, count: focusedData ? focusedData.summary.total_leads : gs.total_leads },
                  { id: 'followups',   label: 'Follow-ups Dossier',  icon: CalendarClock, count: focusedData ? focusedData.summary.followups_total : gs.followups_total },
                  { id: 'calls',       label: 'Voxbay Call Logs',    icon: PhoneCall, count: focusedData ? focusedData.summary.calls_total : gs.calls_total },
                  { id: 'leaderboard', label: 'Team Leaderboard',    icon: Trophy },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TAB 1: 360° OVERVIEW & ANALYTICS ── */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Pipeline Distribution Funnel */}
                <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                        <Target size={16} className="text-indigo-600" />
                        Lead Pipeline Breakdown & Stages
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {focusedData ? `${focusedData.employee.full_name}'s distribution` : 'Entire organization lead distribution'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      Total: {focusedData ? focusedData.summary.total_leads : gs.total_leads}
                    </span>
                  </div>

                  {/* Visual Stage Distribution Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {[
                      { key: 'hot',        label: 'Hot',         count: focusedData ? focusedData.summary.hot_leads : gs.hot_leads,         bg: 'bg-rose-50 border-rose-200 text-rose-700',      bar: 'bg-rose-500' },
                      { key: 'warm',       label: 'Warm',        count: focusedData ? focusedData.summary.warm_leads : gs.warm_leads,       bg: 'bg-amber-50 border-amber-200 text-amber-700',    bar: 'bg-amber-500' },
                      { key: 'cold',       label: 'Cold',        count: focusedData ? focusedData.summary.cold_leads : gs.cold_leads,       bg: 'bg-sky-50 border-sky-200 text-sky-700',          bar: 'bg-sky-500' },
                      { key: 'enquiry',    label: 'Enquiry',     count: focusedData ? focusedData.summary.enquiry_leads : 0,                 bg: 'bg-blue-50 border-blue-200 text-blue-700',      bar: 'bg-blue-500' },
                      { key: 'job_enquiry',label: 'Job Enq',     count: focusedData ? focusedData.summary.job_enquiry_leads : 0,             bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', bar: 'bg-indigo-500' },
                      { key: 'b2b',        label: 'B2B',         count: focusedData ? focusedData.summary.b2b_leads : 0,                     bg: 'bg-violet-50 border-violet-200 text-violet-700', bar: 'bg-violet-500' },
                      { key: 'closed',     label: 'Closed',      count: focusedData ? focusedData.summary.closed_leads : 0,                  bg: 'bg-slate-50 border-slate-200 text-slate-700',    bar: 'bg-slate-500' },
                      { key: 'converted',  label: 'Converted',   count: focusedData ? focusedData.summary.converted_leads : gs.converted_leads, bg: 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold', bar: 'bg-emerald-600' },
                    ].map(st => {
                      const total = focusedData ? focusedData.summary.total_leads : gs.total_leads;
                      const pct = total > 0 ? Math.round(((st.count || 0) / total) * 100) : 0;
                      return (
                        <div key={st.key} className={`p-3 rounded-2xl border ${st.bg} flex flex-col justify-between`}>
                          <p className="text-[11px] font-bold uppercase tracking-wider">{st.label}</p>
                          <p className="text-xl font-black mt-1">{st.count || 0}</p>
                          <div className="w-full bg-black/10 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className={`${st.bar} h-full rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] opacity-75 font-medium mt-1">{pct}% of total</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legacy Lead Breakdown if any */}
                  {focusedData && (
                    (focusedData.summary.contacted_leads || focusedData.summary.qualified_leads || focusedData.summary.not_interested_leads || focusedData.summary.cnr_leads || focusedData.summary.registered_leads) ? (
                      <div className="bg-amber-50/50 rounded-2xl border border-dashed border-amber-200 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                          <Clock size={13} />
                          <span>Historical Status Records (Legacy Leads):</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 font-medium text-amber-900">
                            Contacted: <strong className="font-bold">{focusedData.summary.contacted_leads || 0}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 font-medium text-amber-900">
                            Qualified: <strong className="font-bold">{focusedData.summary.qualified_leads || 0}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 font-medium text-amber-900">
                            Not Interested: <strong className="font-bold">{focusedData.summary.not_interested_leads || 0}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 font-medium text-amber-900">
                            CNR: <strong className="font-bold">{focusedData.summary.cnr_leads || 0}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-white border border-green-200 font-medium text-green-900">
                            Registered: <strong className="font-bold">{focusedData.summary.registered_leads || 0}</strong>
                          </span>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Follow-up Health Matrix & Telephony Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Follow-up Performance Card */}
                  <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                        <CalendarClock size={16} className="text-violet-600" />
                        Follow-up Health Matrix
                      </h3>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {focusedData ? `${focusedData.summary.resolution_rate}% Resolution` : `${gs.completion_rate}% Resolution`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100">
                        <p className="text-lg font-black text-violet-700">
                          {focusedData ? focusedData.summary.followups_total : gs.followups_total}
                        </p>
                        <p className="text-[10px] font-bold text-violet-500 uppercase">Total Follow-ups</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-lg font-black text-emerald-700">
                          {focusedData ? focusedData.summary.followups_resolved : gs.followups_resolved}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Resolved</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-lg font-black text-amber-700">
                          {focusedData ? focusedData.summary.followups_pending : gs.followups_pending}
                        </p>
                        <p className="text-[10px] font-bold text-amber-500 uppercase">Pending Due</p>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 col-span-2 sm:col-span-1">
                        <p className="text-lg font-black text-rose-700">
                          {focusedData ? focusedData.summary.followups_overdue : gs.followups_overdue}
                        </p>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Overdue</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-lg font-black text-slate-700">
                          {focusedData ? focusedData.summary.followups_rescheduled : 0}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Rescheduled</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-lg font-black text-red-700">
                          {focusedData ? focusedData.summary.followups_not_interested : 0}
                        </p>
                        <p className="text-[10px] font-bold text-red-500 uppercase">Not Interested</p>
                      </div>
                    </div>
                  </div>

                  {/* Telephony Hub Card */}
                  <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                        <PhoneCall size={16} className="text-sky-600" />
                        Voxbay Telephony Engagement
                      </h3>
                      <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                        {focusedData ? focusedData.summary.talktime_display : gs.talktime_display} Talk Time
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100">
                        <p className="text-lg font-black text-sky-700">
                          {focusedData ? focusedData.summary.calls_total : gs.calls_total}
                        </p>
                        <p className="text-[10px] font-bold text-sky-500 uppercase">Total Calls</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-lg font-black text-emerald-700">
                          {focusedData ? focusedData.summary.calls_answered : gs.calls_answered}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Answered</p>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-lg font-black text-rose-700">
                          {focusedData ? focusedData.summary.calls_missed : gs.calls_missed}
                        </p>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Missed / Busy</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-lg font-black text-indigo-700">
                          {focusedData ? focusedData.summary.calls_outgoing : 0}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase">Outbound</p>
                      </div>
                      <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100">
                        <p className="text-lg font-black text-teal-700">
                          {focusedData ? focusedData.summary.calls_incoming : 0}
                        </p>
                        <p className="text-[10px] font-bold text-teal-500 uppercase">Inbound</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                        <p className="text-lg font-black text-gray-700">
                          {focusedData ? `${focusedData.summary.avg_talktime_sec}s` : '—'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Avg Call Time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: LEADS PORTFOLIO ── */}
            {activeTab === 'leads' && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[780px] animate-fadeIn">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    <h3 className="font-extrabold text-gray-900 text-sm">
                      {focusedData ? `${focusedData.employee.full_name}'s Leads Portfolio` : 'All Organization Leads'}
                    </h3>
                    <span className="text-xs font-bold text-gray-400">({leadsData.count} records)</span>
                  </div>

                  {/* Category Pills: All, Fresh, Follow-up */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl">
                    <button
                      onClick={() => { setSelectedCategory('all'); setLeadsPage(1); }}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All Leads
                    </button>
                    <button
                      onClick={() => { setSelectedCategory('fresh'); setLeadsPage(1); }}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 ${
                        selectedCategory === 'fresh'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <Sparkles size={11} /> Fresh Leads
                    </button>
                    <button
                      onClick={() => { setSelectedCategory('followup'); setLeadsPage(1); }}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 ${
                        selectedCategory === 'followup'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-violet-700 hover:text-violet-900'
                      }`}
                    >
                      <CalendarClock size={11} /> Follow-up Leads
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingLeads && leadsData.results.length === 0 ? (
                    <div className="p-12 flex items-center justify-center h-full">
                      <RefreshCw size={26} className="animate-spin text-indigo-500" />
                    </div>
                  ) : leadsData.results.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 h-full flex flex-col justify-center items-center">
                      <Users size={44} className="mx-auto mb-3 text-gray-200" />
                      <p className="text-sm font-semibold text-gray-600">No leads found for this criteria.</p>
                      <p className="text-xs text-gray-400 mt-1">Try switching date range or removing status filters.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left relative">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10 shadow-2xs">
                        <tr>
                          <th className="px-3 py-2.5 w-8" />
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Contact</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Source</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Program</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Call Type</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">FUPs</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Created</th>
                          <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsData.results.map(lead => (
                          <LeadRow key={lead.id} lead={lead} onCall={(phone, l) => initiateCall(phone, l)} />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Leads Pagination */}
                {leadsData.count > 20 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold">{(leadsPage - 1) * 20 + 1}</span> to <span className="font-bold">{Math.min(leadsPage * 20, leadsData.count)}</span> of <span className="font-bold">{leadsData.count}</span> results
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={leadsPage === 1}
                        onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={leadsPage * 20 >= leadsData.count}
                        onClick={() => setLeadsPage(p => p + 1)}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: FOLLOW-UPS DOSSIER ── */}
            {activeTab === 'followups' && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[780px] animate-fadeIn">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-violet-600" />
                    <h3 className="font-extrabold text-gray-900 text-sm">
                      {focusedData ? `${focusedData.employee.full_name}'s Follow-ups Dossier` : 'All Organization Follow-ups'}
                    </h3>
                    <span className="text-xs font-bold text-gray-400">({followupsData.count} follow-ups)</span>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl flex-wrap">
                    {[
                      { id: 'all',             label: 'All' },
                      { id: 'pending',         label: 'Pending' },
                      { id: 'completed',       label: 'Completed / Done' },
                      { id: 'rescheduled',     label: 'Rescheduled' },
                      { id: 'not_interested',  label: 'Not Interested' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => { setFuStatusFilter(st.id); setFollowupsPage(1); }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                          fuStatusFilter === st.id
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingFollowups && followupsData.results.length === 0 ? (
                    <div className="p-12 flex items-center justify-center h-full">
                      <RefreshCw size={26} className="animate-spin text-violet-500" />
                    </div>
                  ) : followupsData.results.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 h-full flex flex-col justify-center items-center">
                      <CalendarClock size={44} className="mx-auto mb-3 text-gray-200" />
                      <p className="text-sm font-semibold text-gray-600">No follow-ups recorded for this selection.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left relative">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10 shadow-2xs">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Contact / Lead</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Scheduled Date</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Priority / Type</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Counselor Notes</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Call</th>
                        </tr>
                      </thead>
                      <tbody>
                        {followupsData.results.map(f => (
                          <tr key={f.id} className="border-b border-gray-100 hover:bg-violet-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-sm text-gray-900">{f.name || f.lead?.name || '—'}</p>
                              <p className="text-xs font-mono text-gray-500 font-medium">{f.phone || f.lead?.phone}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-400" />
                                {f.follow_up_date} {f.follow_up_time && `at ${f.follow_up_time}`}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <FollowUpBadge f={f} />
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="font-bold capitalize text-gray-700">{f.priority}</span> &bull; <span className="text-gray-500 capitalize">{f.followup_type}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 min-w-[220px] max-w-[320px]">
                              {(() => {
                                const { recordingUrl, cleanNotes } = parseFollowUpNotes(f.notes, f.recording_url);
                                return (
                                  <div className="space-y-1.5">
                                    <p className="line-clamp-2 text-gray-700" title={cleanNotes}>{cleanNotes}</p>
                                    {recordingUrl && (
                                      <audio
                                        controls
                                        preload="none"
                                        src={recordingUrl}
                                        className="h-7 w-48 rounded outline-none shadow-2xs"
                                      />
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => initiateCall(f.phone || f.lead?.phone, f.lead)}
                                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all hover:scale-105"
                                title="Call now"
                              >
                                <PhoneCall size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Followups Pagination */}
                {followupsData.count > 20 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold">{(followupsPage - 1) * 20 + 1}</span> to <span className="font-bold">{Math.min(followupsPage * 20, followupsData.count)}</span> of <span className="font-bold">{followupsData.count}</span> results
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={followupsPage === 1}
                        onClick={() => setFollowupsPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={followupsPage * 20 >= followupsData.count}
                        onClick={() => setFollowupsPage(p => p + 1)}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: VOXBAY CALL LOGS & TALKTIME ── */}
            {activeTab === 'calls' && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[780px] animate-fadeIn">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={16} className="text-sky-600" />
                    <h3 className="font-extrabold text-gray-900 text-sm">
                      {focusedData ? `${focusedData.employee.full_name}'s Voxbay Call Ledger` : 'All Voxbay Call Logs'}
                    </h3>
                    <span className="text-xs font-bold text-gray-400">({callLogsData.count} calls)</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loadingCallLogs && callLogsData.results.length === 0 ? (
                    <div className="p-12 flex items-center justify-center h-full">
                      <RefreshCw size={26} className="animate-spin text-sky-500" />
                    </div>
                  ) : callLogsData.results.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 h-full flex flex-col justify-center items-center">
                      <PhoneCall size={44} className="mx-auto mb-3 text-gray-200" />
                      <p className="text-sm font-semibold text-gray-600">No call recordings or logs found for this period.</p>
                      <p className="text-xs text-gray-400 mt-1">Ensure the counselor has their Voxbay Extension or DID number mapped.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left relative">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10 shadow-2xs">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Direction</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Contact / Lead</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Duration & Talk Time</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Date & Time</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Audio Player</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callLogsData.results.map(log => {
                          const isAnswered = ['ANSWER', 'ANSWERED'].includes(log.call_status);
                          return (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-sky-50/30 transition-colors">
                              <td className="px-4 py-3">
                                {log.call_type === 'incoming' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <PhoneIncoming size={11} /> Inbound
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <PhoneOutgoing size={11} /> Outbound
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {log.lead_name ? (
                                  <div className="mb-0.5">
                                    {log.lead_id ? (
                                      <button
                                        onClick={() => navigate(`/leads/${log.lead_id}`)}
                                        className="font-bold text-xs text-indigo-700 hover:text-indigo-900 hover:underline text-left inline-flex items-center gap-1 group truncate max-w-[220px]"
                                        title={`View lead: ${log.lead_name}`}
                                      >
                                        <span className="truncate">{log.lead_name}</span>
                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                      </button>
                                    ) : (
                                      <p className="font-bold text-xs text-gray-900 truncate max-w-[220px]" title={log.lead_name}>
                                        {log.lead_name}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mb-0.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Unknown Lead</span>
                                  </div>
                                )}
                                <p className="font-mono text-xs font-bold text-gray-800">
                                  {log.call_type === 'outgoing' ? log.destination || log.called_number : log.caller_number}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Ext: {log.extension || log.agent_number || '—'}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                  isAnswered
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {log.call_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <span className="font-black text-gray-900">{formatSeconds(log.conversation_duration || log.duration)}</span>
                                <span className="text-[10px] text-gray-400 ml-1">talk time</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                                {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {log.recording_url ? (
                                  <audio
                                    controls
                                    preload="none"
                                    src={log.recording_url}
                                    className="h-8 w-48 rounded-md outline-none"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No recording</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Call Logs Pagination */}
                {callLogsData.count > 20 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold">{(callLogsPage - 1) * 20 + 1}</span> to <span className="font-bold">{Math.min(callLogsPage * 20, callLogsData.count)}</span> of <span className="font-bold">{callLogsData.count}</span> calls
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={callLogsPage === 1}
                        onClick={() => setCallLogsPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={callLogsPage * 20 >= callLogsData.count}
                        onClick={() => setCallLogsPage(p => p + 1)}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 5: TEAM LEADERBOARD & COMPARATIVE PODIUM ── */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-5 animate-fadeIn">

                {/* Top 3 Performers Podium */}
                {allEmployees.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
                    {/* #2 Runner Up */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm text-center space-y-3 order-2 md:order-1">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-300 text-slate-800 flex items-center justify-center font-black text-lg shadow-sm">
                        🥈
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">#2 Runner Up</p>
                        <h4 className="font-black text-base text-gray-900">{allEmployees[1].employee.full_name}</h4>
                        <p className="text-xs text-gray-400">{allEmployees[1].employee.roles.join(', ') || 'Counselor'}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-around text-xs">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{allEmployees[1].summary.performance_score}</p>
                          <p className="text-[10px] text-gray-400">Score</p>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{allEmployees[1].summary.talktime_display}</p>
                          <p className="text-[10px] text-gray-400">Talktime</p>
                        </div>
                        <div>
                          <p className="font-black text-emerald-700 text-sm">{allEmployees[1].summary.converted_leads}</p>
                          <p className="text-[10px] text-gray-400">Won</p>
                        </div>
                      </div>
                    </div>

                    {/* #1 Champion */}
                    <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl border-2 border-amber-300 p-6 shadow-md text-center space-y-3 order-1 md:order-2 transform md:-translate-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-200 ring-4 ring-amber-200 animate-pulse">
                        👑
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-500 text-white shadow-xs">
                          TOP CHAMPION
                        </span>
                        <h4 className="font-black text-lg text-gray-900 mt-2">{allEmployees[0].employee.full_name}</h4>
                        <p className="text-xs text-amber-700 font-semibold">{allEmployees[0].employee.roles.join(', ') || 'Counselor'}</p>
                      </div>
                      <div className="bg-amber-100/60 p-3 rounded-2xl border border-amber-200 flex items-center justify-around text-xs">
                        <div>
                          <p className="font-black text-amber-900 text-base">{allEmployees[0].summary.performance_score}</p>
                          <p className="text-[10px] text-amber-700 font-bold">Score</p>
                        </div>
                        <div>
                          <p className="font-black text-amber-900 text-base">{allEmployees[0].summary.talktime_display}</p>
                          <p className="text-[10px] text-amber-700 font-bold">Talktime</p>
                        </div>
                        <div>
                          <p className="font-black text-emerald-800 text-base">{allEmployees[0].summary.converted_leads}</p>
                          <p className="text-[10px] text-amber-700 font-bold">Won</p>
                        </div>
                      </div>
                    </div>

                    {/* #3 Third Place */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm text-center space-y-3 order-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        🥉
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">#3 Third Place</p>
                        <h4 className="font-black text-base text-gray-900">{allEmployees[2].employee.full_name}</h4>
                        <p className="text-xs text-gray-400">{allEmployees[2].employee.roles.join(', ') || 'Counselor'}</p>
                      </div>
                      <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-amber-100 flex items-center justify-around text-xs">
                        <div>
                          <p className="font-black text-amber-900 text-sm">{allEmployees[2].summary.performance_score}</p>
                          <p className="text-[10px] text-gray-400">Score</p>
                        </div>
                        <div>
                          <p className="font-black text-amber-900 text-sm">{allEmployees[2].summary.talktime_display}</p>
                          <p className="text-[10px] text-gray-400">Talktime</p>
                        </div>
                        <div>
                          <p className="font-black text-emerald-700 text-sm">{allEmployees[2].summary.converted_leads}</p>
                          <p className="text-[10px] text-gray-400">Won</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Complete Comparative Table */}
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                      <Trophy size={16} className="text-amber-500" />
                      Complete Team Performance Scorecard Ledger
                    </h3>
                    <span className="text-xs font-bold text-gray-400">{allEmployees.length} Counselors Ranked</span>
                  </div>

                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Rank</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Counselor</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Performance Score</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Talk Time</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">FU Resolution</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Won / Converted</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Total Leads</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEmployees.map(empData => {
                        const { employee, summary } = empData;
                        const badge = getRankBadge(summary.rank);
                        const isChampion = summary.rank === 1;

                        return (
                          <tr
                            key={employee.id}
                            className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors ${
                              isChampion ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black ${badge.bg}`}>
                                #{summary.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-black text-sm text-gray-900">{employee.full_name}</p>
                              <p className="text-xs text-gray-400">{employee.roles.join(', ') || 'Counselor'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <ScorecardMeter score={summary.performance_score} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">
                              {summary.talktime_display || '0s'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {summary.resolution_rate}% ({summary.followups_resolved}/{summary.followups_total})
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-xs text-emerald-800">
                              {summary.converted_leads}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-gray-700">
                              {summary.total_leads}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setFocusedEmployee(employee.id);
                                  setActiveTab('overview');
                                }}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors"
                              >
                                View 360°
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
