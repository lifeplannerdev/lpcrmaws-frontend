import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../Components/layouts/Navbar';
import {
  RefreshCw, Download, Phone, PhoneIncoming, PhoneMissed,
  PhoneOutgoing, Search, ChevronLeft, ChevronRight, Wifi, WifiOff,
  Clock, TrendingUp, BarChart3, Filter, UserPlus, ExternalLink, PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../Components/utils/callPermissions';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateParams(dateRange) {
  const now = new Date(), from = new Date();
  if (dateRange === 'today')  from.setHours(0, 0, 0, 0);
  if (dateRange === '7days')  from.setDate(now.getDate() - 7);
  if (dateRange === '30days') from.setDate(now.getDate() - 30);
  if (dateRange === '90days') from.setDate(now.getDate() - 90);
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallAnalyticsPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const userRole = user?.role_names?.length ? user.role_names.join(', ') : (user?.user_role || '');

  const agentMap = useAgentMap(accessToken);
  const [dateRange,   setDateRange]   = useState('today');
  const [callType,    setCallType]    = useState('all');
  const [callStatus,  setCallStatus]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [ordering,    setOrdering]    = useState('-created_at');
  const [page,        setPage]        = useState(1);
  const PAGE_SIZE = 20;

  const { stats, loading: sLoading, error: sError, refetch: refetchStats } =
    useCallStats(dateRange, callType, accessToken);

  const { data: logsData, loading: lLoading, error: lError, refetch: refetchLogs, lastSync } =
    useCallLogs({ dateRange, callType, callStatus, search, ordering, page, pageSize: PAGE_SIZE, accessToken });

  const logs       = logsData.results;
  const totalLogs  = logsData.count;
  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);
  const s          = stats || {};
  const anyLoading = sLoading || lLoading;
  const anyError   = sError || lError;

  useEffect(() => setPage(1), [dateRange, callType, callStatus, search, ordering]);

  const refetchAll = () => { refetchStats(); refetchLogs(); };

  const { callsByHour, topAgents } = buildCharts(logs);
  const maxHour = Math.max(...callsByHour.map(h => h.calls), 1);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); };

  const handleExport = () => {
    const headers = ['UUID','Type','Caller','Called','Agent','Ext','Destination','Status','Duration(s)','Conv(s)','Start','Recording'];
    const rows = logs.map(l => [
      l.call_uuid,l.call_type,l.caller_number,l.called_number,
      l.agent_number,l.extension,l.destination,l.call_status,
      l.duration,l.conversation_duration,l.call_start,l.recording_url
    ]);
    const csv = [headers,...rows].map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })),
      download: `call-logs-${dateRange}.csv`,
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
          uid: 'demo_uid',
          upin: 'demo_upin',
          user_no: user?.phone || '0000',
          destination: destination,
          callerid: '0000'
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
              {lastSync && <span className="ml-2 text-gray-300">· Synced {lastSync.toLocaleTimeString()}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>

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

          {/* Calls by Hour */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BarChart3 size={13} className="text-indigo-500" /> Calls by Hour
            </h3>
            {lLoading ? <Skeleton rows={6} h="h-5" /> : callsByHour.every(h => h.calls === 0)
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

          {/* Score Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-500" /> Score Card
            </h3>
            {lLoading ? <Skeleton rows={3} h="h-14" /> : topAgents.length === 0
              ? <Empty msg="No agent data" />
              : (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Top Answered</p>
                  {topAgents.slice(0, 3).map(({ name, calls, answered, rate }, i) => {
                    const label = agentLabel(agentMap, name);
                    const displayName = (label && typeof label === 'object') ? label.name : name;
                    const displayNum  = (label && typeof label === 'object') ? label.number : null;
                    return (
                    <div key={name} className={`p-2.5 rounded-xl ${i === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-gray-800 truncate">{displayName}</p>
                          {displayNum && <p className="font-mono text-[9px] text-gray-400">{displayNum}</p>}
                        </div>
                        <p className="text-xs font-black text-emerald-600 ml-2">{rate}%</p>
                      </div>
                      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">{answered} answered · {calls} total</p>
                    </div>
                  )})}
                </div>
              )}
          </div>
        </div>

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

        {/* ── Call Logs Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                Call Logs
                <span className="text-xs text-gray-400 font-normal">({totalLogs.toLocaleString()} total)</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <form onSubmit={handleSearch} className="flex gap-1.5 flex-1 min-w-[180px] max-w-xs">
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search number, agent, UUID…"
                  className="flex-1 px-3 py-2 text-xs border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 font-medium bg-gray-50" />
                <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                  <Search size={13}/>
                </button>
              </form>

              <select value={callStatus} onChange={e => setCallStatus(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
                <option value="all">All Statuses</option>
                <option value="ANSWERED">Answered</option>
                <option value="NOANSWER">No Answer</option>
                <option value="BUSY">Busy</option>
                <option value="CANCEL">Cancelled</option>
                <option value="CONGESTION">Congestion</option>
                <option value="CHANUNAVAIL">Unavailable</option>
              </select>

              <select value={ordering} onChange={e => setOrdering(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-duration">Longest Duration</option>
                <option value="duration">Shortest Duration</option>
                <option value="call_status">Status A–Z</option>
              </select>
            </div>
          </div>

          {/* Table body */}
          {lLoading ? (
            <div className="p-6"><Skeleton rows={6} h="h-10" /></div>
          ) : logs.length === 0 ? (
            <Empty msg="No call logs for this filter" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                  <tr>
                    {['Type','Caller','Called / Dest','Agent / Ext','Status','Duration','Conv. Duration','Start','Recording','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log, i) => (
                    <tr key={log.call_uuid || i} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3">
                        {log.call_type === 'incoming'
                          ? <span className="flex items-center gap-1 text-indigo-600 font-bold"><PhoneIncoming size={11}/> IN</span>
                          : <span className="flex items-center gap-1 text-violet-600 font-bold"><PhoneOutgoing size={11}/> OUT</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{log.caller_number || '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{log.called_number || log.destination || '—'}</td>
                      <td className="px-4 py-3">
                        <AgentCell agentMap={agentMap} number={log.agent_number || log.extension} name={log.agent_name} />
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={log.call_status} /></td>
                      <td className="px-4 py-3 font-mono text-gray-500">{log.duration_display || fmtSec(log.duration)}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{log.conversation_duration_display || fmtSec(log.conversation_duration)}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{log.call_start ? new Date(log.call_start).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">
                        {log.recording_url
                          ? <a href={log.recording_url} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1">▶ Play</a>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCall(log.caller_number || log.destination)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Click to Call">
                            <PhoneCall size={13} />
                          </button>
                          {log.call_type === 'incoming' && (
                            log.is_lead ? (
                              <button onClick={() => navigate(`/leads/${log.lead_id}`)}
                                className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-1 text-[10px] font-bold border border-gray-200 transition-colors">
                                <ExternalLink size={11} /> View
                              </button>
                            ) : (
                              <button onClick={() => navigate(`/leads/new?phone=${log.caller_number}`)}
                                className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 text-[10px] font-bold border border-indigo-200 transition-colors">
                                <UserPlus size={11} /> Convert
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[11px] text-gray-400">Page {page} of {totalPages} · {totalLogs.toLocaleString()} records</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-all font-bold">«</button>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  <ChevronLeft size={13}/>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(totalPages-4, page-2)) + i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`w-7 h-7 text-xs rounded-lg border font-bold transition-all ${pg === page ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'}`}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  <ChevronRight size={13}/>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:border-indigo-400 hover:text-indigo-600 transition-all font-bold">»</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
