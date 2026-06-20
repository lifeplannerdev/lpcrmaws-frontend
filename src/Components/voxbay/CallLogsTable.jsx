import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Filter, UserPlus, ExternalLink, PhoneCall, PhoneIncoming, PhoneOutgoing, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

function agentLabel(agentMap, number) {
  if (!number) return null;
  const name = agentMap[number] || agentMap[number?.replace(/^91/, '')] || agentMap[`91${number}`];
  if (!name) return number;
  return { name, number };
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

function useCallLogs({ dateRange, callType, callStatus, search, ordering, page, pageSize, accessToken }) {
  const [data, setData]       = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

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
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [dateRange, callType, callStatus, search, ordering, page, pageSize, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export default function CallLogsTable({ dateRange, agentMap, defaultCallType = 'all', defaultCallStatus = 'all', title = "Call Logs", hideStatusFilter = false, hideTypeFilter = false, onLogsFetched }) {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  const [callType,    setCallType]    = useState(defaultCallType);
  const [callStatus,  setCallStatus]  = useState(defaultCallStatus);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [ordering,    setOrdering]    = useState('-created_at');
  const [page,        setPage]        = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setCallType(defaultCallType);
    setCallStatus(defaultCallStatus);
    setPage(1);
    setSearch('');
    setSearchInput('');
  }, [defaultCallType, defaultCallStatus]);

  const { data: logsData, loading: lLoading, error: lError } = useCallLogs({
    dateRange, callType, callStatus, search, ordering, page, pageSize: PAGE_SIZE, accessToken
  });

  const logs       = logsData.results || [];
  const totalLogs  = logsData.count || 0;
  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

  useEffect(() => {
    if (onLogsFetched) {
      onLogsFetched(logs, lLoading);
    }
  }, [logs, lLoading]); // Don't include onLogsFetched to prevent loops if it's not memoized

  useEffect(() => setPage(1), [dateRange, callType, callStatus, search, ordering]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); };

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {title}
            <span className="text-xs text-gray-400 font-normal">({totalLogs.toLocaleString()} total)</span>
          </h3>
          {lError && <span className="text-red-500 text-xs font-bold">{lError}</span>}
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

          {!hideTypeFilter && (
            <select value={callType} onChange={e => setCallType(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white focus:outline-none focus:border-indigo-400">
              <option value="all">All Types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          )}

          {!hideStatusFilter && (
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
          )}

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
                          <button onClick={() => navigate(`/addnewlead?phone=${log.caller_number}`)}
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
  );
}
