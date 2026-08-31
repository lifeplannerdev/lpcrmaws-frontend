import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../Components/layouts/Navbar';
import {
  RefreshCw, Download, Phone, PhoneIncoming, PhoneMissed,
  PhoneOutgoing, Search, ChevronLeft, ChevronRight, Wifi, WifiOff,
  Clock, TrendingUp, BarChart3, Filter, UserPlus, ExternalLink, PhoneCall, Settings, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Can } from '../context/PermissionsContext';
import { getRoleLabel } from '../Components/utils/callPermissions';
import { useNavigate } from 'react-router-dom';
import UniqueMissedCallsTable from '../Components/voxbay/UniqueMissedCallsTable';
import CallLogsTable from '../Components/voxbay/CallLogsTable';
import VoxbaySettingsTab from '../Components/voxbay/VoxbaySettingsTab';
import VoxbayReportsTab from '../Components/voxbay/VoxbayReportsTab';
import { useLiveCall } from '../context/LiveCallContext';
import { Sparkles } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateParams(dateRange) {
  if (dateRange && dateRange.startsWith('custom|')) {
    const parts = dateRange.split('|');
    if (parts.length === 3 && parts[1] && parts[2]) {
      const from = new Date(parts[1]);
      from.setHours(0, 0, 0, 0);
      const to = new Date(parts[2]);
      to.setHours(23, 59, 59, 999);
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }

  const now = new Date(), from = new Date();
  if (dateRange === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (dateRange === 'yesterday') {
    from.setDate(now.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - 1);
    now.setHours(23, 59, 59, 999);
  } else if (dateRange === '7days') {
    from.setDate(now.getDate() - 7);
  } else if (dateRange === '30days') {
    from.setDate(now.getDate() - 30);
  } else if (dateRange === '90days') {
    from.setDate(now.getDate() - 90);
  }
  return { from: from.toISOString(), to: now.toISOString() };
}

function fmtSec(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useCallStats(dateRange, callType, accessToken) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try {
      const { from, to } = buildDateParams(dateRange);
      const p = new URLSearchParams({ from, to });
      if (callType && callType !== 'all') p.set('call_type', callType);
      const res = await fetch(`${API_BASE}/voxbay/stats/?${p}`, { 
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'omit' 
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStats(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [dateRange, callType, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { stats, loading, error, refetch: fetch_ };
}

function useAgentStats(dateRange, callType, accessToken) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { from, to } = buildDateParams(dateRange);
      const p = new URLSearchParams({ from, to });
      if (callType && callType !== 'all') p.set('call_type', callType);
      const res = await fetch(`${API_BASE}/voxbay/agent-stats/?${p}`, { 
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'omit' 
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateRange, callType, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

function useCallLogs({ dateRange, callType, callStatus, search, ordering, page, pageSize, accessToken }) {
  const [data, setData]       = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try {
      const { from, to } = buildDateParams(dateRange);
      const p = new URLSearchParams({ from, to, page, page_size: pageSize });
      if (callType   && callType   !== 'all') p.set('call_type',   callType);
      if (callStatus && callStatus !== 'all') p.set('call_status', callStatus);
      if (search)   p.set('search',   search);
      if (ordering) p.set('ordering', ordering);
      const res = await fetch(`${API_BASE}/voxbay/call-logs/?${p}`, { 
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'omit' 
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData({ results: json.results || [], count: json.count || 0 });
      setLastSync(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [dateRange, callType, callStatus, search, ordering, page, pageSize, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_, lastSync };
}

// ─── Derived chart data ───────────────────────────────────────────────────────

function buildCharts(logs) {
  const hourMap = {};
  const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  logs.forEach(l => {
    if (!l.created_at) return;
    const h = new Date(l.created_at).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const callsByHour = Array.from({ length: 24 }, (_, i) => ({
    label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`,
    calls: hourMap[i] || 0, h: i,
  })).filter(x => x.calls > 0 || (x.h >= 8 && x.h <= 18));

  const agentMap = {};
  logs.forEach(l => {
    const k = l.agent_number || ''; if (!k) return;
    if (!agentMap[k]) agentMap[k] = { calls: 0, answered: 0 };
    agentMap[k].calls++;
    if (l.call_status === 'ANSWERED') agentMap[k].answered++;
  });
  const topAgents = Object.entries(agentMap)
    .map(([name, s]) => ({ name, ...s, rate: s.calls ? +((s.answered/s.calls)*100).toFixed(1) : 0 }))
    .sort((a,b) => b.calls - a.calls).slice(0, 5);

  return { callsByHour, topAgents };
}

// ─── Agent name lookup hook ───────────────────────────────────────────────────

function useAgentMap(accessToken) {
  const [agentMap, setAgentMap] = useState({});

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_BASE}/voxbay/agents/?output=map`, { 
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'omit' 
    })
      .then(r => r.ok ? r.json() : {})
      .then(data => setAgentMap(data || {}))
      .catch(() => {});
  }, [accessToken]);

  return agentMap;
}

// Returns "Name (number)" if found, otherwise just the raw number
function agentLabel(agentMap, number) {
  if (!number) return null;
  const name = agentMap[number] || agentMap[number?.replace(/^91/, '')] || agentMap[`91${number}`];
  if (!name) return number;
  return { name, number };
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, bg, loading }) {
  return (
    <div className={`${bg} rounded-2xl p-5 text-white shadow-lg flex items-start justify-between`}>
      <div>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black">{loading ? '…' : (value ?? 0)}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
      <div className="bg-white/20 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
        <Icon size={20} className="text-white" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ANSWERED:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
    BUSY:        'bg-amber-100   text-amber-700   border border-amber-200',
    NOANSWER:    'bg-red-100     text-red-600     border border-red-200',
    CANCEL:      'bg-red-100     text-red-600     border border-red-200',
    MISSED:      'bg-red-100     text-red-600     border border-red-200',
    CONGESTION:  'bg-purple-100  text-purple-700  border border-purple-200',
    CHANUNAVAIL: 'bg-gray-100    text-gray-500    border border-gray-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${map[status] || 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}

// Agent cell — shows name + number when available
function AgentCell({ agentMap, number, name }) {
  if (!number && !name) return <span className="text-gray-300">—</span>;
  
  if (name) {
    return (
      <div>
        <p className="font-semibold text-gray-800 text-xs">{name}</p>
        {number && <p className="font-mono text-gray-400 text-[10px]">{number}</p>}
      </div>
    );
  }

  const result = agentLabel(agentMap, number);
  if (!result || typeof result === 'string') {
    return <span className="font-mono text-gray-600">{number}</span>;
  }
  return (
    <div>
      <p className="font-semibold text-gray-800 text-xs">{result.name}</p>
      <p className="font-mono text-gray-400 text-[10px]">{result.number}</p>
    </div>
  );
}


function DonutChart({ answered, total, loading }) {
  const r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r;
  const pct = total ? answered / total : 0;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f4ff" strokeWidth="16" />
        {!loading && total > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="16"
            strokeDasharray={`${pct * circ} ${(1-pct) * circ}`}
            strokeDashoffset={circ / 4} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        )}
      </svg>
      <div className="absolute text-center">
        <p className="text-[9px] text-gray-400 font-bold uppercase">Total</p>
        <p className="text-2xl font-black text-gray-800 leading-none">{loading ? '…' : (total ?? 0)}</p>
      </div>
    </div>
  );
}

// Simple horizontal bar
function HBar({ label, value, max, color = '#6366f1' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-semibold text-gray-600">{label}</span>
        <span className="text-gray-400 font-mono">{value}</span>
      </div>
      <div className="w-full h-5 bg-gray-100 rounded-lg overflow-hidden">
        <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Skeleton({ rows = 4, h = 'h-7' }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(rows)].map((_, i) => <div key={i} className={`${h} bg-gray-100 rounded-xl`} />)}
    </div>
  );
}

function Empty({ msg = 'No data' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
      <Phone size={30} className="mb-2" />
      <p className="text-xs text-gray-400">{msg}</p>
    </div>
  );
}

// ─── Agent Scorecard Carousel ──────────────────────────────────────────────────

function AgentScorecardCarousel({ agentStatsData, agentMap, loading }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loading) return <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4"><Skeleton rows={5} h="h-10" /></div>;
  if (!agentStatsData || !agentStatsData.agents) return null;

  const { overall_system, agents } = agentStatsData;
  const allCards = overall_system ? [overall_system, ...agents] : agents;

  if (allCards.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 p-10 flex flex-col items-center justify-center">
        <TrendingUp size={30} className="text-gray-300 mb-2" />
        <p className="text-xs text-gray-400">No agent activity found for this period.</p>
      </div>
    );
  }

  // Ensure index is valid if data changes
  const safeIndex = Math.min(currentIndex, allCards.length - 1);
  const currentCard = allCards[safeIndex];
  const isOverall = safeIndex === 0 && overall_system;

  const displayName = !isOverall ? (currentCard.agent_name || currentCard.identifier) : "OVERALL SYSTEM";
  const displayNum  = null; // We are hiding numbers as requested

  const handlePrev = () => setCurrentIndex(prev => (prev === 0 ? allCards.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex(prev => (prev === allCards.length - 1 ? 0 : prev + 1));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden relative group">
      {/* Header & Controls */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" /> Agent Performance Scorecard
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            {safeIndex + 1} of {allCards.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNext} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className={`p-6 transition-all duration-300 ${isOverall ? 'bg-indigo-50/20' : ''}`}>
        
        {/* Agent Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isOverall ? 'bg-indigo-100' : 'bg-gray-100'}`}>
            {isOverall ? <BarChart3 size={24} className="text-indigo-600" /> : <UserPlus size={24} className="text-gray-500" />}
          </div>
          <div>
            <h2 className={`text-xl font-black ${isOverall ? 'text-indigo-900' : 'text-gray-900'}`}>{displayName}</h2>
            {displayNum && <p className="text-sm font-mono text-gray-500">{displayNum}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* INCOMING */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <PhoneIncoming size={14} className="text-emerald-600" />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Incoming Calls</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Answered</p>
                  <p className="text-3xl font-black text-emerald-600 leading-none">{currentCard.incoming_calls_answered}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Received</p>
                  <p className="text-xl font-bold text-gray-700 leading-none">{currentCard.incoming_calls_received}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Conv.</span>
                <span className="text-sm font-mono font-semibold text-gray-700">{fmtSec(currentCard.incoming_avg_duration)}</span>
              </div>
            </div>
          </div>

          {/* OUTGOING */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <PhoneOutgoing size={14} className="text-blue-600" />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Outgoing Calls</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Answered</p>
                  <p className="text-3xl font-black text-blue-600 leading-none">{currentCard.outgoing_calls_answered}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Made</p>
                  <p className="text-xl font-bold text-gray-700 leading-none">{currentCard.outgoing_calls_made}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Conv.</span>
                <span className="text-sm font-mono font-semibold text-gray-700">{fmtSec(currentCard.outgoing_avg_duration)}</span>
              </div>
            </div>
          </div>

          {/* MISSED / CANCELLED */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <PhoneMissed size={14} className="text-red-500" />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Missed / Cancelled</h4>
            </div>
            <div className="flex flex-col justify-center h-[calc(100%-2rem)]">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Total Missed or Cancelled Calls</p>
              <p className="text-4xl font-black text-red-500">{currentCard.total_cancelled_missed}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallAnalyticsPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const userRole = user?.role_names?.length ? user.role_names.join(', ') : (user?.user_role || '');

  const { simulateCall } = useLiveCall();
  const agentMap = useAgentMap(accessToken);
  const [dateRange,   setDateRange]   = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [callType,    setCallType]    = useState('all');

  const [activeTab, setActiveTab] = useState('Missed Call Report');
  const [chartLogs, setChartLogs] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  const { stats, loading: sLoading, error: sError, refetch: refetchStats } =
    useCallStats(dateRange, callType, accessToken);
    
  const { data: agentStatsData, loading: agentStatsLoading, refetch: refetchAgentStats } = 
    useAgentStats(dateRange, callType, accessToken);

  const s          = stats || {};
  const totalLogs  = s.total || 0;
  const anyLoading = sLoading || chartLoading || agentStatsLoading;
  const anyError   = sError;

  const refetchAll = () => { refetchStats(); refetchAgentStats(); };

  const handleLogsFetched = useCallback((logs, loading) => {
    setChartLogs(logs);
    setChartLoading(loading);
  }, []);

  const { callsByHour, topAgents } = buildCharts(chartLogs);
  const maxHour = Math.max(...callsByHour.map(h => h.calls), 1);

  const handleExport = () => {
    const headers = ['UUID','Type','Caller','Called','Agent','Ext','Destination','Status','Duration(s)','Conv(s)','Start','Recording'];
    const rows = chartLogs.map(l => [
      l.call_uuid,l.call_type,l.caller_number,l.called_number,
      l.agent_number,l.extension,l.destination,l.call_status,
      l.duration,l.conversation_duration,l.call_start,l.recording_url
    ]);
    const csv = [headers,...rows].map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })),
      download: `call-logs-${dateRange.replace(/\|/g, '-')}.csv`,
    }).click();
  };

  const handleCall = async (destination) => {
    if (!destination) return alert('No number to call');
    try {
      const res = await fetch(`${API_BASE}/voxbay/click-to-call/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          destination: destination
        }),
        credentials: 'omit'
      });
      if (!res.ok) alert('Failed to initiate call. Ensure Voxbay API is configured.');
      else alert('Call initiated successfully! Your device should ring.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb]" style={{ fontFamily: "'Nunito', 'DM Sans', sans-serif" }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Call Analytics
              <span className={`w-2 h-2 rounded-full ${anyError ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Role: <span className="font-bold text-indigo-600">{getRoleLabel(userRole)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Call Dossier Test Simulators */}
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => simulateCall({ phone: '9876543210', isNewLead: true, callType: 'incoming' })}
                className="px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg flex items-center gap-1 transition-all"
                title="Test Fresh Lead Call Popup"
              >
                <Sparkles size={12} className="text-purple-500" /> Test New Lead Call
              </button>
              <span className="text-purple-300 dark:text-purple-700">|</span>
              <button
                onClick={() => simulateCall({ phone: '918089040107', isNewLead: false, leadId: 1, leadName: 'Test Student Rahul', callType: 'incoming' })}
                className="px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg flex items-center gap-1 transition-all"
                title="Test Existing Lead Call Dossier"
              >
                <Sparkles size={12} className="text-purple-500" /> Test Existing Lead
              </button>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${anyError ? 'bg-red-50 border-red-200 text-red-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
              {anyError ? <WifiOff size={11}/> : <Wifi size={11}/>}
              {anyError ? 'Offline' : `${totalLogs.toLocaleString()} records`}
            </div>

            <button onClick={refetchAll} disabled={anyLoading}
              className="p-2 border-2 border-gray-200 rounded-xl hover:border-indigo-400 transition-all disabled:opacity-40">
              <RefreshCw size={14} className={`text-gray-500 ${anyLoading ? 'animate-spin' : ''}`} />
            </button>

            <select value={callType} onChange={e => setCallType(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
              <option value="all">All Types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>

            <div className="flex items-center gap-2">
              <select 
                value={dateRange.startsWith('custom') ? 'custom' : dateRange} 
                onChange={e => {
                  const val = e.target.value;
                  if (val !== 'custom') {
                    setDateRange(val);
                  } else {
                    if (customStart && customEnd) {
                      setDateRange(`custom|${customStart}|${customEnd}`);
                    } else {
                      setDateRange('custom||');
                    }
                  }
                }}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateRange.startsWith('custom') && (
                <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-2 py-1">
                  <input 
                    type="date" 
                    value={customStart}
                    onChange={e => {
                      setCustomStart(e.target.value);
                      if (e.target.value && customEnd) setDateRange(`custom|${e.target.value}|${customEnd}`);
                    }}
                    className="text-xs font-semibold text-gray-600 outline-none bg-transparent cursor-pointer w-28"
                  />
                  <span className="text-gray-400 text-xs font-bold">to</span>
                  <input 
                    type="date" 
                    value={customEnd}
                    onChange={e => {
                      setCustomEnd(e.target.value);
                      if (customStart && e.target.value) setDateRange(`custom|${customStart}|${e.target.value}`);
                    }}
                    className="text-xs font-semibold text-gray-600 outline-none bg-transparent cursor-pointer w-28"
                  />
                </div>
              )}
            </div>

            <button onClick={handleExport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md">
              <Download size={13}/> Export CSV
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {anyError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <WifiOff className="text-red-400 shrink-0" size={15}/>
            <span className="text-red-600 font-semibold text-xs">{anyError}</span>
            <button onClick={refetchAll} className="ml-auto text-xs text-red-500 underline">Retry</button>
          </div>
        )}

        {/* ── 4 top colored stat cards — like Voxbay's Live/Connected/Failed/Total ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            label="Total Calls"
            value={s.total}
            sub={`IN: ${s.incoming ?? 0}   OUT: ${s.outgoing ?? 0}`}
            Icon={Phone}
            bg="bg-gradient-to-br from-blue-500 to-blue-700"
            loading={sLoading}
          />
          <StatCard
            label="Connected Calls"
            value={s.answered}
            sub={`${s.success_rate ?? 0}% success rate`}
            Icon={PhoneIncoming}
            bg="bg-gradient-to-br from-emerald-500 to-green-700"
            loading={sLoading}
          />
          <StatCard
            label="Failed Calls"
            value={(s.missed ?? 0) + (s.busy ?? 0) + (s.congestion ?? 0)}
            sub={`Missed: ${s.missed ?? 0}  Busy: ${s.busy ?? 0}`}
            Icon={PhoneMissed}
            bg="bg-gradient-to-br from-red-500 to-rose-700"
            loading={sLoading}
          />
          <StatCard
            label="Avg Duration"
            value={fmtSec(Math.round(s.avg_duration))}
            sub={`OUT: ${s.outgoing ?? 0} calls`}
            Icon={Clock}
            bg="bg-gradient-to-br from-violet-500 to-purple-700"
            loading={sLoading}
          />
        </div>

        {/* ── Incoming Status (donut) + Outgoing Status + Hourly + Score Card ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

          {/* Incoming Call Status */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide">Incoming Status</h3>
              <button onClick={refetchAll} className="text-gray-300 hover:text-indigo-500">
                <RefreshCw size={13} className={anyLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <DonutChart answered={s.answered} total={s.incoming} loading={sLoading} />
              <div className="space-y-2">
                <div>
                  <p className="text-xl font-black text-emerald-600">{sLoading ? '…' : s.answered ?? 0}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">Answered</p>
                </div>
                <div>
                  <p className="text-xl font-black text-red-500">{sLoading ? '…' : s.missed ?? 0}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">Not Answered</p>
                </div>
              </div>
            </div>
          </div>

          {/* Outgoing Call Status */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide">Outgoing Status</h3>
              <button onClick={refetchAll} className="text-gray-300 hover:text-indigo-500">
                <RefreshCw size={13} className={anyLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { label: 'Answered',    val: s.answered,    color: 'text-emerald-600' },
                { label: 'Not Answered',val: s.missed,      color: 'text-red-500'     },
                { label: 'Busy',        val: s.busy,        color: 'text-amber-500'   },
                { label: 'Congestion',  val: s.congestion,  color: 'text-purple-600'  },
                { label: 'Unavailable', val: s.chanunavail, color: 'text-gray-500'    },
                { label: 'Cancel',      val: null,          color: 'text-gray-400'    },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <p className={`text-lg font-black ${color}`}>{sLoading ? '…' : val ?? 0}</p>
                  <p className="text-[9px] text-gray-400 font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Calls by Hour - expanded to take remaining space */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm md:col-span-2">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BarChart3 size={13} className="text-indigo-500" /> Calls by Hour
            </h3>
            {chartLoading ? <Skeleton rows={6} h="h-5" /> : callsByHour.every(h => h.calls === 0)
              ? <Empty msg="No hourly data" />
              : (
                <>
                  <div className="space-y-1.5">
                    {callsByHour.map(({ label, calls, h }) => (
                      <HBar key={h} label={label} value={calls} max={maxHour}
                        color={calls === maxHour ? '#6366f1' : '#c7d2fe'} />
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold mt-2">
                    📊 Peak: {callsByHour.find(h => h.calls === maxHour)?.label}
                  </p>
                </>
              )}
          </div>
        </div>

        {/* ── Agent Scorecard (Admins only) ── */}
        <Can perform="voxbay:admin">
          <AgentScorecardCarousel agentStatsData={agentStatsData} agentMap={agentMap} loading={agentStatsLoading} />
        </Can>

        {/* ── Success rate bar ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Overall Success Rate</p>
              <p className="text-3xl font-black text-emerald-600">{sLoading ? '…' : `${s.success_rate ?? 0}%`}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Avg Call Duration</p>
              <p className="text-3xl font-black text-blue-600">{sLoading ? '…' : fmtSec(Math.round(s.avg_duration))}</p>
            </div>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${s.success_rate ?? 0}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{s.answered ?? 0} of {s.total ?? 0} calls answered</p>
        </div>

        {/* ── Call Logs Table Section ── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
            {[
              { id: 'Missed Call Report', icon: PhoneMissed, label: 'Missed Call Report' },
              { id: 'Unique Missed Calls', icon: PhoneMissed, label: 'Unique Missed Calls', adminOnly: true },
              { id: 'Incoming Call Report', icon: PhoneIncoming, label: 'Incoming Call Report' },
              { id: 'Outgoing Call Report', icon: PhoneOutgoing, label: 'Outgoing Call Report' },
              { id: 'Reports', icon: FileText, label: 'Reports', adminOnly: true },
              { id: 'Voxbay Settings', icon: Settings, label: 'Voxbay Settings', adminOnly: true },
            ].map(tab => {
              const TabButton = () => (
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? 'text-white/80' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );

              if (tab.adminOnly) {
                return (
                  <Can key={tab.id} perform="voxbay:admin">
                    <TabButton />
                  </Can>
                );
              }
              return <TabButton key={tab.id} />;
            })}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            {activeTab === 'Missed Call Report' && (
              <CallLogsTable dateRange={dateRange} globalCallType={callType} agentMap={agentMap} defaultCallType="incoming" defaultCallStatus="MISSED" title="Missed Call Report" onLogsFetched={handleLogsFetched} hideTypeFilter hideStatusFilter />
            )}
            {activeTab === 'Unique Missed Calls' && (
              <Can perform="voxbay:admin">
                <UniqueMissedCallsTable dateRange={dateRange} />
              </Can>
            )}
            {activeTab === 'Incoming Call Report' && (
              <CallLogsTable dateRange={dateRange} globalCallType={callType} agentMap={agentMap} defaultCallType="incoming" title="Incoming Call Report" onLogsFetched={handleLogsFetched} hideTypeFilter />
            )}
            {activeTab === 'Outgoing Call Report' && (
              <CallLogsTable dateRange={dateRange} globalCallType={callType} agentMap={agentMap} defaultCallType="outgoing" title="Outgoing Call Report" onLogsFetched={handleLogsFetched} hideTypeFilter />
            )}
            {activeTab === 'Reports' && (
              <Can perform="voxbay:admin">
                <VoxbayReportsTab accessToken={accessToken} />
              </Can>
            )}
            {activeTab === 'Voxbay Settings' && (
              <Can perform="voxbay:admin">
                <VoxbaySettingsTab />
              </Can>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
