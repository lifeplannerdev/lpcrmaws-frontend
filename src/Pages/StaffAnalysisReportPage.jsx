import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Download, Users, User, Calendar,
  TrendingUp, Phone, CheckCircle2, AlertTriangle, Clock,
  Target, Flame, Trophy, PhoneCall,
  PhoneIncoming, PhoneOutgoing, ArrowLeft, RefreshCw,
  BarChart2, Activity, Search, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DATE_PRESETS = [
  { value: 'today',          label: 'Today',          icon: '📅' },
  { value: 'yesterday',      label: 'Yesterday',      icon: '⏪' },
  { value: 'this_week',      label: 'This Week',      icon: '📆' },
  { value: 'this_month',     label: 'This Month',     icon: '🗓️' },
  { value: 'previous_month', label: 'Previous Month', icon: '◀️' },
  { value: 'custom_range',   label: 'Custom Range',   icon: '🔧' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSec(sec) {
  if (!sec) return '0s';
  const s = parseInt(sec, 10);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rs = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rs}s`;
  return `${rs}s`;
}
function pct(num, denom) {
  if (!denom) return '0%';
  return `${((num / denom) * 100).toFixed(1)}%`;
}

// ── Inline SVG Donut ──────────────────────────────────────────────────────────
function DonutChart({ data, size = 160, thickness = 30 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={(size-thickness)/2} fill="none" stroke="#e2e8f0" strokeWidth={thickness}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fontSize="11" fill="#94a3b8">No data</text>
    </svg>
  );
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  const slices = data.map(d => {
    const frac = d.value / total;
    const off = circ * (1 - cum);
    cum += frac;
    return { ...d, dasharray: `${circ * frac} ${circ * (1 - frac)}`, offset: off };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
          strokeWidth={thickness} strokeDasharray={s.dasharray} strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`} />
      ))}
      <text x={cx} y={cy-6} textAnchor="middle" fontSize="20" fontWeight="900" fill="#1e293b">{total}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#64748b">Total</text>
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, height = 130, barWidth = 42, gap = 12 }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const totalW = data.length * (barWidth + gap) + gap;
  return (
    <svg width={totalW} height={height + 36} viewBox={`0 0 ${totalW} ${height + 36}`}>
      {data.map((d, i) => {
        const bh = Math.max(4, (d.value / maxVal) * height);
        const x = gap + i * (barWidth + gap);
        const y = height - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={bh} rx="5" fill={d.color} opacity="0.88"/>
            <text x={x+barWidth/2} y={y-4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b">{d.value}</text>
            <text x={x+barWidth/2} y={height+16} textAnchor="middle" fontSize="9" fill="#64748b">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Arc Score Meter ───────────────────────────────────────────────────────────
function ScoreMeter({ score = 0, size = 130 }) {
  const s = Math.min(100, Math.max(0, score));
  const r = (size - 18) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = Math.PI * r;
  const progress = (s / 100) * circ;
  const color = s >= 80 ? '#10b981' : s >= 60 ? '#6366f1' : s >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth="13" strokeLinecap="round"/>
      <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
        fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={`${progress} ${circ}`}/>
      <text x={cx} y={cy-2} textAnchor="middle" fontSize="21" fontWeight="900" fill={color}>{s.toFixed(1)}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="9" fill="#94a3b8">/100</text>
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent = '#6366f1', icon: Icon }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '13px 15px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={17} />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13, paddingBottom: 9, borderBottom: '2px solid #e2e8f0' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 13, border: '1px solid #e2e8f0', padding: '15px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function ChartLegend({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{d.label}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginLeft: 'auto' }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function ReportHeader({ title, subtitle, dateLabel, generatedAt, employee, score, rankInfo }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
      color: 'white', padding: '30px 44px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', right: -50, top: -50, width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,102,241,0.13)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', right: 70, bottom: -70, width: 160, height: 160, borderRadius: '50%', background: 'rgba(16,185,129,0.09)', pointerEvents: 'none' }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={22} color="white"/>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.65, textTransform: 'uppercase' }}>Life Planner Universal CRM</div>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em' }}>{title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {employee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.1)', borderRadius: 9, padding: '7px 12px' }}>
                <User size={13}/><span style={{ fontSize: 12, fontWeight: 700 }}>{employee}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.1)', borderRadius: 9, padding: '7px 12px' }}>
              <Calendar size={13}/><span style={{ fontSize: 12, fontWeight: 600 }}>{dateLabel}</span>
            </div>
            {rankInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(251,191,36,0.2)', borderRadius: 9, padding: '7px 12px' }}>
                <span style={{ fontSize: 15 }}>{rankInfo.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{rankInfo.text}</span>
              </div>
            )}
          </div>
          {subtitle && <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55 }}>{subtitle} · Generated: {generatedAt}</div>}
        </div>
        {score !== undefined && (
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 22px', flexShrink: 0 }}>
            <ScoreMeter score={score} size={130}/>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, marginTop: 3 }}>Performance Score</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportFooter({ dateLabel, generatedAt }) {
  return (
    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: 11 }}>
      <span>📊 Life Planner Universal CRM — Staff Performance Report</span>
      <span>Period: {dateLabel}</span>
      <span>Generated: {generatedAt}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function StaffAnalysisReportPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // Controls
  const [allEmployees, setAllEmployees] = useState([]);     // full list from API
  const [selectedEmpId, setSelectedEmpId] = useState('all');
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEmps, setIsFetchingEmps] = useState(true);
  const [reportData, setReportData] = useState(null);

  const generatedAt = reportData ? new Date().toLocaleString('en-IN', { hour12: true }) : '';

  const getDateLabel = useCallback(() => {
    if (datePreset === 'custom_range' && customStart && customEnd) return `${customStart} → ${customEnd}`;
    return DATE_PRESETS.find(d => d.value === datePreset)?.label || 'Today';
  }, [datePreset, customStart, customEnd]);

  // ── Fetch employee list on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    setIsFetchingEmps(true);
    fetch(`${API_BASE_URL}/staff-analysis/?date_preset=today&team=Sales`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        const emps = (data.employees || []).map(e => ({
          id: e.employee.id,
          name: e.employee.full_name || e.employee.username,
          username: e.employee.username,
          roles: e.employee.roles || [],
          team: e.employee.team || '',
        }));
        setAllEmployees(emps);
      })
      .catch(() => toast.error('Could not load employee list'))
      .finally(() => setIsFetchingEmps(false));
  }, [accessToken]);

  // ── Build query params ─────────────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ date_preset: datePreset, team: 'Sales' });
    if (datePreset === 'custom_range' && customStart && customEnd) {
      p.set('start_date', customStart);
      p.set('end_date', customEnd);
    }
    return p;
  }, [datePreset, customStart, customEnd]);

  // ── Generate report ────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    if (datePreset === 'custom_range' && (!customStart || !customEnd)) {
      toast.error('Please select a date range first.');
      return;
    }
    setIsLoading(true);
    setReportData(null);
    try {
      const params = buildParams();
      const res = await fetch(`${API_BASE_URL}/staff-analysis/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();

      const allEmps = data.employees || [];
      // update employee list in case it changed
      setAllEmployees(allEmps.map(e => ({
        id: e.employee.id,
        name: e.employee.full_name || e.employee.username,
        username: e.employee.username,
        roles: e.employee.roles || [],
      })));

      if (selectedEmpId === 'all') {
        setReportData({ mode: 'all', employees: allEmps, grand: data.grand_summary, dateLabel: getDateLabel() });
      } else {
        const emp = allEmps.find(e => String(e.employee.id) === String(selectedEmpId));
        if (!emp) { toast.error("Employee not found in this period's data"); setIsLoading(false); return; }
        setReportData({ mode: 'single', empData: emp, grand: data.grand_summary, dateLabel: getDateLabel() });
      }
      toast.success('Report generated!');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, buildParams, selectedEmpId, getDateLabel]);

  const handlePrint = () => { window.print(); };

  const filteredEmps = allEmployees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.username.toLowerCase().includes(empSearch.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          nav, .navbar-wrapper { display: none !important; }
          .report-body { padding: 0 !important; background: white !important; }
          .section-card { break-inside: avoid; page-break-inside: avoid; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
      `}</style>

      {/* NAVBAR */}
      <div className="no-print"><Navbar /></div>

      {/* CONTROLS */}
      <div className="no-print" style={{ background: '#f1f5f9', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>

          {/* Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => navigate('/staff-analysis')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <ArrowLeft size={14}/> Back
            </button>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>📊 Report Generator</h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Stunning PDF performance reports · select employee + period → generate</p>
            </div>
            {reportData && (
              <button onClick={handlePrint}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: '1.5px solid #10b981', background: 'white', color: '#10b981', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                <Download size={15}/> Export PDF
              </button>
            )}
          </div>

          {/* Config panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, marginBottom: 24 }}>

            {/* Employee selector */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>👤 Select Employee</div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input type="text" placeholder="Search by name or username..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}/>
              </div>

              {/* Employee list */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, maxHeight: 340, overflowY: 'auto' }}>
                {/* All option */}
                <div onClick={() => setSelectedEmpId('all')}
                  style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid #f8fafc', background: selectedEmpId === 'all' ? '#eef2ff' : 'white', borderRadius: '10px 10px 0 0' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={14} color="white"/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>All Employees</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Combined team report</div>
                  </div>
                  {selectedEmpId === 'all' && <CheckCircle2 size={14} color="#6366f1"/>}
                </div>

                {isFetchingEmps ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline' }}/> Loading employees...
                  </div>
                ) : filteredEmps.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No employees found</div>
                ) : (
                  filteredEmps.map(emp => {
                    const isSelected = String(selectedEmpId) === String(emp.id);
                    const initials = emp.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <div key={emp.id} onClick={() => setSelectedEmpId(String(emp.id))}
                        style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid #f8fafc', background: isSelected ? '#eef2ff' : 'white' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: isSelected ? '#6366f1' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isSelected ? 'white' : '#475569', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>@{emp.username}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={13} color="#6366f1" style={{ flexShrink: 0 }}/>}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                {allEmployees.length} employees total
              </div>
            </div>

            {/* Date + Generate */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>📅 Date Range</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {DATE_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setDatePreset(p.value)}
                    style={{
                      padding: '11px 8px', borderRadius: 10, border: '1.5px solid',
                      borderColor: datePreset === p.value ? '#6366f1' : '#e2e8f0',
                      background: datePreset === p.value ? '#eef2ff' : 'white',
                      color: datePreset === p.value ? '#6366f1' : '#475569',
                      fontWeight: datePreset === p.value ? 700 : 500, fontSize: 12,
                      cursor: 'pointer', textAlign: 'center',
                    }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>{p.icon}</div>
                    {p.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom_range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>From</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>To</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
                  </div>
                </div>
              )}

              {/* Selected employee preview */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Report will be generated for:</div>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 14 }}>
                  {selectedEmpId === 'all'
                    ? `🏢 All Employees (${allEmployees.length} staff)`
                    : `👤 ${allEmployees.find(e => String(e.id) === String(selectedEmpId))?.name || '—'}`}
                </div>
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>
                  📅 {DATE_PRESETS.find(d => d.value === datePreset)?.label}
                  {datePreset === 'custom_range' && customStart && customEnd ? `: ${customStart} → ${customEnd}` : ''}
                </div>
              </div>

              <button onClick={generateReport} disabled={isLoading}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: isLoading ? '#c7d2fe' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: 'white', fontWeight: 800, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  boxShadow: isLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)'
                }}>
                {isLoading
                  ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }}/> Generating...</>
                  : <><Sparkles size={16}/> Generate Report</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── REPORT OUTPUT ──────────────────────────────────────────────────── */}
      {reportData && (
        <div className="report-body fade-up" style={{ background: '#f8fafc', fontFamily: "'Inter',sans-serif" }}>
          {reportData.mode === 'single'
            ? <SingleReport empData={reportData.empData} dateLabel={reportData.dateLabel} generatedAt={generatedAt} />
            : <AllReport employees={reportData.employees} grand={reportData.grand} dateLabel={reportData.dateLabel} generatedAt={generatedAt} />
          }
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE EMPLOYEE REPORT
// ══════════════════════════════════════════════════════════════════════════════
function SingleReport({ empData, dateLabel, generatedAt }) {
  const { employee: emp, summary: s, converted_leads_detail: convLeads = [] } = empData;

  const rankInfo = (() => {
    const r = s.rank;
    if (r === 1) return { text: '#1 Top Performer', icon: '🏆' };
    if (r === 2) return { text: '#2 Runner Up', icon: '🥈' };
    if (r === 3) return { text: '#3 Third Place', icon: '🥉' };
    return { text: `#${r} Ranked`, icon: '⭐' };
  })();

  const donutLeads = [
    { label: 'Hot',       value: s.hot_leads,       color: '#ef4444' },
    { label: 'Warm',      value: s.warm_leads,      color: '#f59e0b' },
    { label: 'Cold',      value: s.cold_leads,      color: '#0ea5e9' },
    { label: 'Converted', value: s.converted_leads, color: '#10b981' },
    { label: 'Closed',    value: s.closed_leads,    color: '#94a3b8' },
    { label: 'Enquiry',   value: s.enquiry_leads,   color: '#6366f1' },
    { label: 'B2B',       value: s.b2b_leads,       color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const donutFu = [
    { label: 'Done',        value: s.followups_resolved,     color: '#10b981' },
    { label: 'Pending',     value: s.followups_pending,      color: '#f59e0b' },
    { label: 'Overdue',     value: s.followups_overdue,      color: '#ef4444' },
    { label: 'Rescheduled', value: s.followups_rescheduled,  color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const callBars = [
    { label: 'Total',    value: s.calls_total,    color: '#6366f1' },
    { label: 'Incoming', value: s.calls_incoming, color: '#0ea5e9' },
    { label: 'Outgoing', value: s.calls_outgoing, color: '#8b5cf6' },
    { label: 'Answered', value: s.calls_answered, color: '#10b981' },
    { label: 'Missed',   value: s.calls_missed,   color: '#ef4444' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }}>
      {/* Header */}
      <ReportHeader
        title="Staff Performance Report"
        subtitle={`${emp.email || ''} ${emp.voxbay_extension ? '· Ext: ' + emp.voxbay_extension : ''} · Roles: ${(emp.roles||[]).join(', ') || 'N/A'}`}
        dateLabel={dateLabel} generatedAt={generatedAt}
        employee={emp.full_name || emp.username}
        score={s.performance_score} rankInfo={rankInfo}
      />

      <div style={{ padding: '22px 0' }}>
        {/* Sales Overview */}
        <SectionHeader icon="📊" title="Sales Overview" subtitle="Lead handling metrics for the selected period"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 16 }} className="section-card">
          <MetricCard label="Total Leads Handled" value={s.total_leads} icon={Users} accent="#6366f1" sub={`${s.fresh_leads} fresh · ${s.followup_leads} followup`}/>
          <MetricCard label="Fresh Leads" value={s.fresh_leads} icon={Sparkles} accent="#10b981" sub="New in period"/>
          <MetricCard label="Followup Leads" value={s.followup_leads} icon={RefreshCw} accent="#8b5cf6"/>
          <MetricCard label="Conversion Rate" value={`${s.conversion_rate}%`} icon={TrendingUp} accent="#f59e0b" sub={`${s.converted_leads} converted`}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 11, marginBottom: 16 }} className="section-card">
          <MetricCard label="🔥 Hot" value={s.hot_leads} accent="#ef4444"/>
          <MetricCard label="🟡 Warm" value={s.warm_leads} accent="#f59e0b"/>
          <MetricCard label="🔵 Cold" value={s.cold_leads} accent="#0ea5e9"/>
          <MetricCard label="Enquiry" value={s.enquiry_leads} accent="#6366f1"/>
          <MetricCard label="B2B" value={s.b2b_leads} accent="#8b5cf6"/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 20 }} className="section-card">
          <MetricCard label="✅ Converted" value={s.converted_leads} icon={CheckCircle2} accent="#10b981" sub="CONVERTED + REGISTERED"/>
          <MetricCard label="🔒 Closed" value={s.closed_leads} accent="#94a3b8"/>
          <MetricCard label="Not Interested" value={s.not_interested_leads||0} accent="#ef4444"/>
          <MetricCard label="CNR" value={s.cnr_leads||0} accent="#64748b"/>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }} className="section-card">
          <ChartCard title="Lead Status Distribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart data={donutLeads} size={155} thickness={28}/>
              <ChartLegend data={donutLeads}/>
            </div>
          </ChartCard>
          <ChartCard title="Followup Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart data={donutFu} size={155} thickness={28}/>
              <ChartLegend data={donutFu}/>
            </div>
          </ChartCard>
        </div>

        {/* Followup Analysis */}
        <SectionHeader icon="📋" title="Followup Analysis" subtitle="Detailed tracking and resolution metrics"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }} className="section-card">
          <MetricCard label="Total Followups" value={s.followups_total} icon={Clock} accent="#6366f1"/>
          <MetricCard label="Done (Contacted)" value={s.followups_contacted} icon={CheckCircle2} accent="#10b981"/>
          <MetricCard label="Completed" value={s.followups_completed} accent="#10b981"/>
          <MetricCard label="Resolution Rate" value={`${s.resolution_rate}%`} icon={Target} accent="#f59e0b"/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }} className="section-card">
          <MetricCard label="Pending (period)" value={s.followups_pending} icon={AlertTriangle} accent="#f59e0b"/>
          <MetricCard label="⚠️ Overdue (period)" value={s.followups_overdue} accent="#ef4444"/>
          <MetricCard label="🚨 Overall Overdue" value={s.followups_overdue_pending_total} accent="#dc2626" sub="All-time, excl. future"/>
          <MetricCard label="Rescheduled" value={s.followups_rescheduled} accent="#8b5cf6"/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11, marginBottom: 22 }} className="section-card">
          <MetricCard label="Followups Created" value={s.followups_created_in_period} icon={Activity} accent="#0ea5e9" sub="Created in this period"/>
          <MetricCard label="Not Interested FU" value={s.followups_not_interested} accent="#94a3b8"/>
          <MetricCard label="Unresolved" value={s.unresolved_count} accent="#ef4444"/>
        </div>

        {/* Voxbay */}
        <SectionHeader icon="📞" title="Voxbay Call Analytics" subtitle="Call activity and talk-time breakdown"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }} className="section-card">
          <MetricCard label="Total Calls" value={s.calls_total} icon={PhoneCall} accent="#6366f1"/>
          <MetricCard label="📥 Incoming" value={s.calls_incoming} icon={PhoneIncoming} accent="#0ea5e9"/>
          <MetricCard label="📤 Outgoing" value={s.calls_outgoing} icon={PhoneOutgoing} accent="#8b5cf6"/>
          <MetricCard label="Answer Rate" value={pct(s.calls_answered, s.calls_total)} icon={CheckCircle2} accent="#10b981" sub={`${s.calls_answered} answered`}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }} className="section-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <MetricCard label="Answered" value={s.calls_answered} accent="#10b981"/>
            <MetricCard label="Missed" value={s.calls_missed} icon={AlertTriangle} accent="#ef4444"/>
            <MetricCard label="Total Talk Time" value={formatSec(s.total_talktime_sec)} icon={Clock} accent="#f59e0b" sub={`Avg ${formatSec(s.avg_talktime_sec)}/call`}/>
            <MetricCard label="Performance Score" value={s.performance_score} icon={Flame} accent="#6366f1" sub={`Rank #${s.rank}`}/>
          </div>
          <ChartCard title="Call Volume Breakdown">
            <div style={{ overflowX: 'auto' }}>
              <BarChart data={callBars} height={110} barWidth={46} gap={12}/>
            </div>
          </ChartCard>
        </div>

        {/* Converted leads */}
        {convLeads.length > 0 && (
          <>
            <SectionHeader icon="🎉" title="Converted Leads" subtitle={`${convLeads.length} lead(s) converted this period`}/>
            <div className="section-card" style={{ background: 'white', borderRadius: 13, border: '1.5px solid #d1fae5', overflow: 'hidden', marginBottom: 22, boxShadow: '0 2px 8px rgba(16,185,129,0.09)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg,#059669,#10b981)', color: 'white' }}>
                    {['#','Name','Phone','Program','Location','Source','Status','Date'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {convLeads.map((lead, idx) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f0fdf4', background: idx%2===0 ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#059669' }}>{idx+1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1e293b' }}>{lead.name||'—'}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#475569' }}>{lead.phone||'—'}</td>
                      <td style={{ padding: '9px 12px', color: '#475569' }}>{lead.program||'—'}</td>
                      <td style={{ padding: '9px 12px', color: '#475569' }}>{lead.location||'—'}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b', fontSize: 11 }}>{lead.source||'—'}</td>
                      <td style={{ padding: '9px 12px' }}><span style={{ padding:'2px 7px', borderRadius: 5, background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 10 }}>{lead.status}</span></td>
                      <td style={{ padding: '9px 12px', color: '#64748b', fontSize: 11 }}>{lead.created_at||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <ReportFooter dateLabel={dateLabel} generatedAt={generatedAt}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ALL EMPLOYEES REPORT
// ══════════════════════════════════════════════════════════════════════════════
function AllReport({ employees, grand: gs, dateLabel, generatedAt }) {
  const topPerf = gs?.top_performer;

  const donutLeads = [
    { label: 'Hot',       value: gs?.hot_leads||0,       color: '#ef4444' },
    { label: 'Warm',      value: gs?.warm_leads||0,      color: '#f59e0b' },
    { label: 'Cold',      value: gs?.cold_leads||0,      color: '#0ea5e9' },
    { label: 'Converted', value: gs?.converted_leads||0, color: '#10b981' },
  ].filter(d => d.value > 0);

  const donutFu = [
    { label: 'Resolved', value: gs?.followups_resolved||0, color: '#10b981' },
    { label: 'Pending',  value: gs?.followups_pending||0,  color: '#f59e0b' },
    { label: 'Overdue',  value: gs?.followups_overdue||0,  color: '#ef4444' },
  ].filter(d => d.value > 0);

  const allConvertedLeads = employees.flatMap(e =>
    (e.converted_leads_detail || []).map(l => ({ ...l, _emp: e.employee.full_name || e.employee.username }))
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }}>
      <ReportHeader
        title="Team Performance Report"
        subtitle={`${employees.length} employees · combined metrics`}
        dateLabel={dateLabel} generatedAt={generatedAt}
        employee={null}
      />

      <div style={{ padding: '22px 0' }}>
        {topPerf && (
          <div style={{ marginBottom: 18, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius: 13, padding: '14px 20px', border: '1.5px solid #fbbf24', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <div>
              <div style={{ fontWeight: 900, color: '#92400e', fontSize: 14 }}>Top Performer: {topPerf.full_name || topPerf.username}</div>
              <div style={{ fontSize: 11, color: '#b45309' }}>Highest performance score this period</div>
            </div>
          </div>
        )}

        {/* Grand summary KPIs */}
        <SectionHeader icon="📊" title="Team Summary" subtitle="Combined metrics for all employees"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }} className="section-card">
          <MetricCard label="Total Leads" value={gs?.total_leads} icon={Users} accent="#6366f1"/>
          <MetricCard label="Converted" value={gs?.converted_leads} icon={CheckCircle2} accent="#10b981" sub={`${gs?.conversion_rate}% rate`}/>
          <MetricCard label="Total Calls" value={gs?.calls_total} icon={PhoneCall} accent="#0ea5e9"/>
          <MetricCard label="Talk Time" value={formatSec(gs?.total_talktime_sec)} icon={Clock} accent="#8b5cf6"/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 14 }} className="section-card">
          <MetricCard label="🔥 Hot" value={gs?.hot_leads} accent="#ef4444"/>
          <MetricCard label="🟡 Warm" value={gs?.warm_leads} accent="#f59e0b"/>
          <MetricCard label="🔵 Cold" value={gs?.cold_leads} accent="#0ea5e9"/>
          <MetricCard label="Calls Answered" value={gs?.calls_answered} accent="#10b981" sub={pct(gs?.calls_answered, gs?.calls_total)}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 18 }} className="section-card">
          <MetricCard label="Followups Total" value={gs?.followups_total} icon={Clock} accent="#6366f1"/>
          <MetricCard label="FU Resolved" value={gs?.followups_resolved} icon={CheckCircle2} accent="#10b981" sub={`${gs?.completion_rate}%`}/>
          <MetricCard label="FU Pending" value={gs?.followups_pending} icon={AlertTriangle} accent="#f59e0b"/>
          <MetricCard label="⚠️ FU Overdue" value={gs?.followups_overdue} accent="#ef4444"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }} className="section-card">
          <ChartCard title="Lead Status Distribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart data={donutLeads} size={155} thickness={28}/>
              <ChartLegend data={donutLeads}/>
            </div>
          </ChartCard>
          <ChartCard title="Followup Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart data={donutFu} size={155} thickness={28}/>
              <ChartLegend data={donutFu}/>
            </div>
          </ChartCard>
        </div>

        {/* Employee Comparison Table */}
        <SectionHeader icon="👥" title="Employee Performance Comparison" subtitle="Ranked by performance score — all employees"/>
        <div className="section-card" style={{ background: 'white', borderRadius: 13, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg,#0f172a,#1e293b)', color: 'white' }}>
                {['Rank','Employee','Total','Fresh','F/U','Converted','Conv%','FU Done','FU Pending','Overdue All','Calls','Talk Time','Score'].map(h => (
                  <th key={h} style={{ padding: '9px 9px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const s = emp.summary;
                const isTop = s.rank === 1;
                return (
                  <tr key={emp.employee.id} style={{ borderBottom: '1px solid #f1f5f9', background: isTop ? '#fefce8' : (idx%2===0 ? '#f8fafc' : 'white') }}>
                    <td style={{ padding: '9px 9px', fontWeight: 900, color: isTop ? '#f59e0b' : '#64748b', fontSize: 13 }}>
                      {s.rank===1?'🏆':s.rank===2?'🥈':s.rank===3?'🥉':`#${s.rank}`}
                    </td>
                    <td style={{ padding: '9px 9px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12 }}>{emp.employee.full_name||emp.employee.username}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>@{emp.employee.username}</div>
                    </td>
                    <td style={{ padding: '9px 9px', fontWeight: 700, color: '#1e293b' }}>{s.total_leads}</td>
                    <td style={{ padding: '9px 9px', color: '#10b981', fontWeight: 600 }}>{s.fresh_leads}</td>
                    <td style={{ padding: '9px 9px', color: '#8b5cf6' }}>{s.followup_leads}</td>
                    <td style={{ padding: '9px 9px', color: '#059669', fontWeight: 700 }}>{s.converted_leads}</td>
                    <td style={{ padding: '9px 9px', color: '#f59e0b', fontWeight: 700 }}>{s.conversion_rate}%</td>
                    <td style={{ padding: '9px 9px', color: '#10b981', fontWeight: 600 }}>{s.followups_resolved}</td>
                    <td style={{ padding: '9px 9px', color: s.followups_pending>0?'#f59e0b':'#94a3b8', fontWeight: s.followups_pending>0?700:400 }}>{s.followups_pending}</td>
                    <td style={{ padding: '9px 9px', color: (s.followups_overdue_pending_total||s.followups_overdue)>0?'#ef4444':'#94a3b8', fontWeight: (s.followups_overdue_pending_total||s.followups_overdue)>0?700:400 }}>
                      {s.followups_overdue_pending_total ?? s.followups_overdue}
                    </td>
                    <td style={{ padding: '9px 9px', color: '#0ea5e9' }}>{s.calls_total}</td>
                    <td style={{ padding: '9px 9px', color: '#8b5cf6', fontSize: 11 }}>{formatSec(s.total_talktime_sec)}</td>
                    <td style={{ padding: '9px 9px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 7, fontWeight: 800, fontSize: 12,
                        background: s.performance_score>=80?'#d1fae5':s.performance_score>=60?'#e0e7ff':s.performance_score>=40?'#fef3c7':'#fee2e2',
                        color: s.performance_score>=80?'#059669':s.performance_score>=60?'#4338ca':s.performance_score>=40?'#d97706':'#dc2626'
                      }}>{s.performance_score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* All Converted Leads */}
        {allConvertedLeads.length > 0 && (
          <>
            <SectionHeader icon="🎉" title="All Converted Leads" subtitle={`${allConvertedLeads.length} conversions across the team`}/>
            <div className="section-card" style={{ background: 'white', borderRadius: 13, border: '1.5px solid #d1fae5', overflow: 'hidden', marginBottom: 22 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg,#059669,#10b981)', color: 'white' }}>
                    {['#','Name','Phone','Program','Location','Source','Status','Assigned To','Date'].map(h => (
                      <th key={h} style={{ padding: '9px 11px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allConvertedLeads.map((lead, idx) => (
                    <tr key={`${lead.id}-${idx}`} style={{ borderBottom: '1px solid #f0fdf4', background: idx%2===0?'#f0fdf4':'white' }}>
                      <td style={{ padding: '8px 11px', fontWeight: 700, color: '#059669' }}>{idx+1}</td>
                      <td style={{ padding: '8px 11px', fontWeight: 700, color: '#1e293b' }}>{lead.name||'—'}</td>
                      <td style={{ padding: '8px 11px', fontFamily: 'monospace', color: '#475569', fontSize: 11 }}>{lead.phone||'—'}</td>
                      <td style={{ padding: '8px 11px', color: '#475569' }}>{lead.program||'—'}</td>
                      <td style={{ padding: '8px 11px', color: '#475569' }}>{lead.location||'—'}</td>
                      <td style={{ padding: '8px 11px', color: '#64748b', fontSize: 11 }}>{lead.source||'—'}</td>
                      <td style={{ padding: '8px 11px' }}><span style={{ padding:'2px 7px', borderRadius: 5, background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 10 }}>{lead.status}</span></td>
                      <td style={{ padding: '8px 11px', color: '#6366f1', fontWeight: 600 }}>{lead._emp}</td>
                      <td style={{ padding: '8px 11px', color: '#64748b', fontSize: 11 }}>{lead.created_at||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <ReportFooter dateLabel={dateLabel} generatedAt={generatedAt}/>
      </div>
    </div>
  );
}
