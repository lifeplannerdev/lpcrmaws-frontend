import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useVoxbayCall } from '../hooks/useVoxbayCall';
import { allStatusOptions, sourceOptions } from '../Components/utils/leadConstants';
import {
  Users, TrendingUp, Phone, CalendarClock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, RefreshCw, Search, Filter, Download,
  ArrowUpRight, Minus, X, Calendar, BarChart2, UserCheck, PhoneCall,
  PhoneIncoming, PhoneOutgoing, Clock, MessageSquare, SlidersHorizontal
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DATE_PRESETS = [
  { value: 'all_time',   label: 'All Time' },
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'custom',     label: 'Custom Date' },
  { value: 'range',      label: 'Custom Range' },
];

const STATUS_COLOR_MAP = {
  ENQUIRY:      'bg-blue-100 text-blue-700',
  JOB_ENQUIRY:  'bg-indigo-100 text-indigo-700',
  B2B:          'bg-violet-100 text-violet-700',
  COLD_WARM:    'bg-cyan-100 text-cyan-700',
  HOT:          'bg-orange-100 text-orange-700',
  CLOSED:       'bg-rose-100 text-rose-700',
  CONVERTED:    'bg-emerald-100 text-emerald-700',
  CONTACTED:    'bg-amber-100 text-amber-700',
  QUALIFIED:    'bg-purple-100 text-purple-700',
  NOT_INTERESTED:'bg-red-100 text-red-700',
  CNR:          'bg-gray-100 text-gray-600',
  REGISTERED:   'bg-green-100 text-green-700',
};

const CALL_TYPE_ICON = {
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  unknown: Phone,
};

function KPICard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold opacity-70 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-black">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-white/20">
          <Icon size={22} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`absolute bottom-3 right-3 text-xs font-bold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <ArrowUpRight size={13} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function FollowUpBadge({ f }) {
  const color = f.status === 'contacted' ? 'bg-emerald-100 text-emerald-700'
              : f.is_overdue           ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700';
  return (
    <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <Clock size={10} />
      {f.follow_up_date} &bull; {f.status}
      {f.is_overdue && ' ⚠'}
    </div>
  );
}

function LeadRow({ lead, onCall }) {
  const [expanded, setExpanded] = useState(false);
  const statusCls = STATUS_COLOR_MAP[lead.status] || 'bg-gray-100 text-gray-600';
  const CallTypeIcon = CALL_TYPE_ICON[lead.call_type] || Phone;

  return (
    <>
      <tr
        className="group border-b border-gray-100 hover:bg-indigo-50/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-3">
          <button className="p-1 text-gray-400 group-hover:text-indigo-500 transition-colors">
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </td>
        <td className="px-3 py-3">
          <div className="font-semibold text-sm text-gray-900">{lead.name || '—'}</div>
          <div className="text-xs text-gray-400 font-mono">{lead.phone}</div>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusCls}`}>
            {lead.status}
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-gray-500">{lead.source || '—'}</td>
        <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">{lead.program || '—'}</td>
        <td className="px-3 py-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <CallTypeIcon size={12} className={lead.call_type === 'incoming' ? 'text-green-500' : 'text-blue-500'} />
            {lead.call_type}
          </div>
        </td>
        <td className="px-3 py-3 text-xs text-gray-500">{lead.followups?.length ?? 0}</td>
        <td className="px-3 py-3 text-xs text-gray-400">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—'}</td>
        <td className="px-3 py-3">
          <button
            onClick={e => { e.stopPropagation(); onCall(lead.phone, lead); }}
            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
            title="Call this lead"
          >
            <Phone size={13} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-6 pb-4 pt-2 bg-indigo-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Remarks */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Remarks
                </h5>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono text-xs">
                  {lead.remarks || 'No remarks recorded.'}
                </p>
              </div>
              {/* Follow-ups */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                  <CalendarClock size={12} /> Follow-ups ({lead.followups?.length ?? 0})
                </h5>
                {lead.followups && lead.followups.length > 0 ? (
                  <div className="space-y-2">
                    {lead.followups.map(f => (
                      <div key={f.id} className="border border-gray-100 rounded-lg p-2.5 space-y-1">
                        <FollowUpBadge f={f} />
                        <p className="text-xs text-gray-600 mt-1">{f.notes || 'No notes.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No follow-ups recorded.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EmployeeCard({ data, isSelected, onClick }) {
  const { summary, employee } = data;
  const deficitColor = summary.followup_deficit >= 0 ? 'text-emerald-600' : 'text-rose-600';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${
        isSelected ? 'border-indigo-400 bg-indigo-50/60 shadow-md' : 'border-gray-100 bg-white hover:border-indigo-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-sm text-gray-900">{employee.full_name}</p>
          <p className="text-xs text-gray-400">{employee.roles.join(', ')}</p>
        </div>
        <div className={`text-lg font-black ${deficitColor}`}>
          {summary.followup_deficit >= 0 ? '+' : ''}{summary.followup_deficit}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-indigo-50 rounded-lg p-1.5">
          <p className="text-xs font-black text-indigo-700">{summary.total_leads}</p>
          <p className="text-[10px] text-indigo-500">Leads</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-1.5">
          <p className="text-xs font-black text-emerald-700">{summary.followups_contacted}</p>
          <p className="text-[10px] text-emerald-500">Contacted</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-1.5">
          <p className="text-xs font-black text-amber-700">{summary.followups_pending}</p>
          <p className="text-[10px] text-amber-500">Pending</p>
        </div>
      </div>
    </button>
  );
}

export default function StaffAnalysisPage() {
  const { accessToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const navigate = useNavigate();
  const { initiateCall } = useVoxbayCall();

  const [datePreset, setDatePreset] = useState('all_time');
  const [customDate, setCustomDate] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedEmployee, setFocusedEmployee] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();

      if (datePreset === 'custom' && customDate) {
        params.set('date_preset', 'custom');
        params.set('start_date', customDate);
        params.set('end_date', customDate);
      } else if (datePreset === 'range' && customStart && customEnd) {
        params.set('date_preset', 'custom');
        params.set('start_date', customStart);
        params.set('end_date', customEnd);
      } else if (['today','yesterday','all_time'].includes(datePreset)) {
        params.set('date_preset', datePreset);
      } else {
        params.set('date_preset', 'all_time');
      }

      if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
      if (selectedSources.length) params.set('source', selectedSources.join(','));

      const res = await fetch(`${API_BASE_URL}/staff-analysis/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch staff analysis data');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, datePreset, customDate, customStart, customEnd, selectedStatuses, selectedSources]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleEmployees = data?.employees?.filter(e => e.summary.total_leads > 0 || e.summary.followups_total > 0) || [];
  const focusedData = focusedEmployee
    ? data?.employees?.find(e => e.employee.id === focusedEmployee)
    : null;

  const allLeads = focusedData
    ? focusedData.leads
    : (data?.employees?.flatMap(e => e.leads) || []);

  const filteredLeads = allLeads.filter(l =>
    !searchQuery ||
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.includes(searchQuery) ||
    l.remarks?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gs = data?.grand_summary || {};

  const toggleStatus = (val) => setSelectedStatuses(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  const toggleSource = (val) => setSelectedSources(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart2 className="text-indigo-600" size={26} />
              Staff Analysis
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete employee leads & followup performance analytics</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Filters Bar ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Preset Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    datePreset === p.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {datePreset === 'custom' && (
              <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded-xl outline-none" />
            )}
            {datePreset === 'range' && (
              <>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="text-xs p-2 border border-gray-200 rounded-xl outline-none" placeholder="Start" />
                <span className="text-gray-400 text-xs">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="text-xs p-2 border border-gray-200 rounded-xl outline-none" placeholder="End" />
              </>
            )}

            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showFilters || selectedStatuses.length || selectedSources.length
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={13} />
              Filters
              {(selectedStatuses.length + selectedSources.length) > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {selectedStatuses.length + selectedSources.length}
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-indigo-400 w-48"
              />
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Lead Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {allStatusOptions.map(s => (
                    <button
                      key={s.value}
                      onClick={() => toggleStatus(s.value)}
                      className={`text-[11px] px-2 py-1 rounded-full border font-semibold transition-all ${
                        selectedStatuses.includes(s.value)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Source</p>
                <div className="flex flex-wrap gap-1.5">
                  {sourceOptions.map(s => (
                    <button
                      key={s.value}
                      onClick={() => toggleSource(s.value)}
                      className={`text-[11px] px-2 py-1 rounded-full border font-semibold transition-all ${
                        selectedSources.includes(s.value)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {(selectedStatuses.length || selectedSources.length) > 0 && (
                <div className="md:col-span-2 flex">
                  <button onClick={() => { setSelectedStatuses([]); setSelectedSources([]); }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1">
                    <X size={12} /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="Total Leads"
              value={gs.total_leads ?? 0}
              icon={Users}
              color="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-600"
            />
            <KPICard
              label="Total Follow-ups"
              value={gs.followups_total ?? 0}
              icon={CalendarClock}
              color="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-violet-600"
            />
            <KPICard
              label="Contacted"
              value={gs.followups_contacted ?? 0}
              icon={CheckCircle2}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-600"
            />
            <KPICard
              label="Pending"
              value={gs.followups_pending ?? 0}
              icon={Clock}
              color="bg-gradient-to-br from-amber-400 to-amber-500 text-white border-amber-500"
            />
            <KPICard
              label="Overdue"
              value={gs.followups_overdue ?? 0}
              icon={AlertTriangle}
              color="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-600"
            />
            <KPICard
              label="Completion Rate"
              value={`${gs.completion_rate ?? 0}%`}
              icon={TrendingUp}
              color="bg-gradient-to-br from-sky-500 to-sky-600 text-white border-sky-600"
            />
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Employee Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck size={13} /> Employees
            </h3>
            <button
              onClick={() => setFocusedEmployee(null)}
              className={`w-full text-left p-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                !focusedEmployee ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-indigo-200'
              }`}
            >
              All Employees ({visibleEmployees.length})
            </button>
            {loading && (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            )}
            {!loading && visibleEmployees.map(empData => (
              <EmployeeCard
                key={empData.employee.id}
                data={empData}
                isSelected={focusedEmployee === empData.employee.id}
                onClick={() => setFocusedEmployee(prev => prev === empData.employee.id ? null : empData.employee.id)}
              />
            ))}
          </div>

          {/* Leads Table */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <PhoneCall size={16} className="text-indigo-500" />
                {focusedData ? `${focusedData.employee.full_name} — Leads` : 'All Leads'}
                <span className="text-xs font-normal text-gray-400">({filteredLeads.length} records)</span>
              </h3>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-indigo-400" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium">No leads found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2.5 w-8" />
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Name / Phone</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Source</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Program</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Call Type</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">FUPs</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Created</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        onCall={(phone, leadData) => initiateCall(phone, leadData)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
