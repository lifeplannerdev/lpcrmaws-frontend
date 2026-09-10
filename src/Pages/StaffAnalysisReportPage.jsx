import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Download, Users, User, Calendar, ChevronDown,
  TrendingUp, Phone, CheckCircle2, AlertTriangle, Clock,
  Target, Flame, Star, Trophy, Award, PhoneCall,
  PhoneIncoming, PhoneOutgoing, ArrowLeft, RefreshCw,
  BarChart2, PieChart, Zap, Activity, ShieldCheck,
  UserCheck, Hash, X, Search, Sparkles, ArrowRight,
  ChevronRight, Globe, Building2, Mail, MapPin
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

// ── Colour helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

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
  if (!denom || denom === 0) return '0%';
  return `${((num / denom) * 100).toFixed(1)}%`;
}

// ── Inline SVG Donut Chart ─────────────────────────────────────────────────
function DonutChart({ data, size = 160, thickness = 28 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-center text-gray-400 text-xs">No data</div>
      </div>
    );
  }
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const slices = data.map((d) => {
    const fraction = d.value / total;
    const offset = circumference * (1 - cumulative);
    cumulative += fraction;
    return { ...d, fraction, dasharray: `${circumference * fraction} ${circumference * (1 - fraction)}`, offset };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={s.dasharray}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#64748b">Total</text>
    </svg>
  );
}

// ── Inline SVG Bar Chart ───────────────────────────────────────────────────
function BarChart({ data, height = 140, barWidth = 36, gap = 10 }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const totalWidth = data.length * (barWidth + gap) + gap;
  return (
    <svg width={totalWidth} height={height + 40} viewBox={`0 0 ${totalWidth} ${height + 40}`}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / maxVal) * height);
        const x = gap + i * (barWidth + gap);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill={d.color} opacity="0.85" />
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e293b">{d.value}</text>
            <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="#64748b"
              transform={`rotate(-20 ${x + barWidth / 2} ${height + 14})`}
            >{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Score Meter ─────────────────────────────────────────────────────────────
function ScoreMeter({ score = 0, size = 120 }) {
  const s = Math.min(100, Math.max(0, score));
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = (s / 100) * circumference;
  const color = s >= 80 ? '#10b981' : s >= 60 ? '#6366f1' : s >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"
      />
      {/* Progress arc */}
      <path
        d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
        fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="900" fill={color}>{s.toFixed(1)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">/100</text>
    </svg>
  );
}

// ── KPI Metric Card ──────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent = '#6366f1', icon: Icon }) {
  return (
    <div className="report-metric-card" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color: accent }}>{value ?? '—'}</div>
          {sub && <div className="metric-sub">{sub}</div>}
        </div>
        {Icon && (
          <div className="metric-icon" style={{ background: `rgba(${hexToRgb(accent)},0.1)`, color: accent }}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffAnalysisReportPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  // Controls state
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('all');
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Date label for display
  const getDateLabel = () => {
    const p = DATE_PRESETS.find(d => d.value === datePreset);
    if (datePreset === 'custom_range' && customStart && customEnd) {
      return `${customStart} → ${customEnd}`;
    }
    return p?.label || 'All Time';
  };

  // Fetch employees list
  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_BASE_URL}/leads/staff-analysis/?date_preset=all_time`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.employees) {
          setEmployees(d.employees.map(e => ({ id: e.employee.id, name: e.employee.full_name || e.employee.username, username: e.employee.username })));
        }
      })
      .catch(() => {});
  }, [accessToken]);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ date_preset: datePreset });
    if (datePreset === 'custom_range' && customStart && customEnd) {
      params.set('start_date', customStart);
      params.set('end_date', customEnd);
    }
    if (selectedEmpId !== 'all') {
      params.set('employee_id', selectedEmpId);
    }
    return params;
  }, [datePreset, customStart, customEnd, selectedEmpId]);

  const generateReport = useCallback(async () => {
    if (datePreset === 'custom_range' && (!customStart || !customEnd)) {
      toast.error('Please select a custom date range.');
      return;
    }
    setIsLoading(true);
    setReportData(null);
    try {
      const params = buildParams();
      const res = await fetch(`${API_BASE_URL}/leads/staff-analysis/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();

      // Filter to selected employee if needed
      if (selectedEmpId !== 'all') {
        const empData = (data.employees || []).find(e => String(e.employee.id) === String(selectedEmpId));
        setReportData({ mode: 'single', employee: empData, grand_summary: data.grand_summary, dateLabel: getDateLabel() });
      } else {
        setReportData({ mode: 'all', employees: data.employees || [], grand_summary: data.grand_summary, dateLabel: getDateLabel() });
      }
      toast.success('Report generated!');
    } catch (err) {
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, buildParams, selectedEmpId, datePreset, customStart, customEnd]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const filteredEmps = employees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.username.toLowerCase().includes(empSearch.toLowerCase())
  );

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const generatedAt = new Date().toLocaleString('en-IN', { hour12: true });

  return (
    <>
      {/* ── PRINT STYLES ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        :root {
          --navy: #0f172a;
          --navy-mid: #1e293b;
          --indigo: #6366f1;
          --emerald: #10b981;
          --amber: #f59e0b;
          --rose: #f43f5e;
          --sky: #0ea5e9;
          --violet: #8b5cf6;
          --slate: #64748b;
        }

        .report-metric-card {
          background: white;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        .metric-value {
          font-size: 26px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .metric-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
        .metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── PRINT ─────────────────────────────────────────────────────────── */
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Inter', sans-serif; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .page-break { page-break-before: always; }
          nav, .navbar-wrapper { display: none !important; }
          .report-container { 
            max-width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          .report-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e293b 100%) !important;
            -webkit-print-color-adjust: exact;
          }
          .section-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .report-metric-card {
            break-inside: avoid;
          }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <div className="no-print">
        <Navbar />
      </div>

      {/* ── CONTROLS PANEL ──────────────────────────────────────────────────── */}
      <div className="no-print" style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

          {/* Back + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => navigate('/staff-analysis')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              <ArrowLeft size={15} /> Back to Analysis
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                📊 Staff Performance Report Generator
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Configure and generate stunning PDF reports for any employee or team</p>
            </div>
          </div>

          {/* Config Card */}
          <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', padding: 28, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

              {/* Employee Selector */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
                  👤 Select Employee
                </label>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, maxHeight: 200, overflowY: 'auto' }}>
                  {/* All Employees option */}
                  <div
                    onClick={() => setSelectedEmpId('all')}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', background: selectedEmpId === 'all' ? '#eef2ff' : 'transparent' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>All Employees</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Team combined report</div>
                    </div>
                    {selectedEmpId === 'all' && <CheckCircle2 size={16} color="#6366f1" style={{ marginLeft: 'auto' }} />}
                  </div>
                  {filteredEmps.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmpId(String(emp.id))}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', background: String(selectedEmpId) === String(emp.id) ? '#eef2ff' : 'transparent' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#475569' }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>@{emp.username}</div>
                      </div>
                      {String(selectedEmpId) === String(emp.id) && <CheckCircle2 size={16} color="#6366f1" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
                  📅 Date Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {DATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setDatePreset(p.value)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: '1.5px solid',
                        borderColor: datePreset === p.value ? '#6366f1' : '#e2e8f0',
                        background: datePreset === p.value ? '#eef2ff' : 'white',
                        color: datePreset === p.value ? '#6366f1' : '#475569',
                        fontWeight: datePreset === p.value ? 700 : 500,
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      <div>{p.icon}</div>
                      <div style={{ marginTop: 3 }}>{p.label}</div>
                    </button>
                  ))}
                </div>
                {datePreset === 'custom_range' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>From</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>To</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <button
                    onClick={generateReport}
                    disabled={isLoading}
                    style={{
                      flex: 1, padding: '14px 20px', borderRadius: 12, border: 'none',
                      background: isLoading ? '#c7d2fe' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: 'white', fontWeight: 800, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
                      boxShadow: isLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)'
                    }}
                  >
                    {isLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                    {isLoading ? 'Generating...' : 'Generate Report'}
                  </button>
                  {reportData && (
                    <button
                      onClick={handlePrint}
                      style={{
                        padding: '14px 20px', borderRadius: 12, border: '1.5px solid #10b981',
                        background: 'white', color: '#10b981', fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      <Download size={16} /> Export PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ height: 90, borderRadius: 12, background: 'white', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── REPORT OUTPUT (visible on screen + print) ─────────────────────── */}
      {reportData && (
        <div ref={reportRef} className="report-container" style={{ fontFamily: "'Inter', sans-serif", background: '#f8fafc' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }} className="no-print" />

          {reportData.mode === 'single' && reportData.employee && (
            <SingleEmployeeReport
              empData={reportData.employee}
              dateLabel={reportData.dateLabel}
              generatedAt={generatedAt}
            />
          )}
          {reportData.mode === 'all' && (
            <AllEmployeesReport
              employees={reportData.employees}
              grandSummary={reportData.grand_summary}
              dateLabel={reportData.dateLabel}
              generatedAt={generatedAt}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-report-in { animation: fadeInUp 0.4s ease both; }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Employee Report
// ─────────────────────────────────────────────────────────────────────────────
function SingleEmployeeReport({ empData, dateLabel, generatedAt }) {
  const { employee, summary, converted_leads_detail = [] } = empData;

  const donutLeadData = [
    { label: 'Hot',       value: summary.hot_leads,       color: '#ef4444' },
    { label: 'Warm',      value: summary.warm_leads,      color: '#f59e0b' },
    { label: 'Cold',      value: summary.cold_leads,      color: '#0ea5e9' },
    { label: 'Converted', value: summary.converted_leads, color: '#10b981' },
    { label: 'Closed',    value: summary.closed_leads,    color: '#94a3b8' },
    { label: 'Enquiry',   value: summary.enquiry_leads,   color: '#6366f1' },
    { label: 'B2B',       value: summary.b2b_leads,       color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const donutFuData = [
    { label: 'Done',      value: summary.followups_resolved,     color: '#10b981' },
    { label: 'Pending',   value: summary.followups_pending,      color: '#f59e0b' },
    { label: 'Overdue',   value: summary.followups_overdue,      color: '#ef4444' },
    { label: 'Rescheduled', value: summary.followups_rescheduled, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const callBarData = [
    { label: 'Total',    value: summary.calls_total,    color: '#6366f1' },
    { label: 'Incoming', value: summary.calls_incoming, color: '#0ea5e9' },
    { label: 'Outgoing', value: summary.calls_outgoing, color: '#8b5cf6' },
    { label: 'Answered', value: summary.calls_answered, color: '#10b981' },
    { label: 'Missed',   value: summary.calls_missed,   color: '#ef4444' },
  ];

  const rankInfo = (() => {
    const r = summary.rank;
    if (r === 1) return { text: '#1 Top Performer', color: '#f59e0b', icon: '🏆' };
    if (r === 2) return { text: '#2 Runner Up', color: '#94a3b8', icon: '🥈' };
    if (r === 3) return { text: '#3 Third Place', color: '#cd7c2c', icon: '🥉' };
    return { text: `#${r} Ranked`, color: '#64748b', icon: '⭐' };
  })();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="animate-report-in">
      {/* ── HEADER ── */}
      <div className="report-header" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
        color: 'white', padding: '36px 48px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={24} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.7, textTransform: 'uppercase' }}>Life Planner Universal CRM</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>Staff Performance Report</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
                <User size={14} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{employee.full_name || employee.username}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
                <Calendar size={14} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{dateLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.3)', borderRadius: 10, padding: '8px 14px' }}>
                <span style={{ fontSize: 16 }}>{rankInfo.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{rankInfo.text}</span>
              </div>
            </div>
          </div>

          {/* Score Meter */}
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 24px' }}>
            <ScoreMeter score={summary.performance_score} size={140} />
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>Performance Score</div>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 24, opacity: 0.6, fontSize: 11 }}>
          <span>📧 {employee.email || 'N/A'}</span>
          {employee.voxbay_extension && <span>📞 Ext: {employee.voxbay_extension}</span>}
          <span>🕐 Generated: {generatedAt}</span>
          <span>🏢 Roles: {(employee.roles || []).join(', ') || 'N/A'}</span>
        </div>
      </div>

      <div style={{ padding: '24px 48px', background: '#f8fafc' }}>

        {/* ── SECTION 1: SALES OVERVIEW ── */}
        <SectionHeader icon="📊" title="Sales Overview" subtitle="Lead handling metrics for the selected period" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="Total Leads Handled" value={summary.total_leads} icon={Users} accent="#6366f1" sub={`${summary.fresh_leads} fresh · ${summary.followup_leads} followup`} />
          <MetricCard label="Fresh Leads" value={summary.fresh_leads} icon={Sparkles} accent="#10b981" sub="New leads in period" />
          <MetricCard label="Followup Leads" value={summary.followup_leads} icon={RefreshCw} accent="#8b5cf6" sub="Existing leads followed" />
          <MetricCard label="Conversion Rate" value={`${summary.conversion_rate}%`} icon={TrendingUp} accent="#f59e0b" sub={`${summary.converted_leads} converted`} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="🔥 Hot Leads" value={summary.hot_leads} accent="#ef4444" />
          <MetricCard label="🟡 Warm Leads" value={summary.warm_leads} accent="#f59e0b" />
          <MetricCard label="🔵 Cold Leads" value={summary.cold_leads} accent="#0ea5e9" />
          <MetricCard label="Enquiries" value={summary.enquiry_leads} accent="#6366f1" />
          <MetricCard label="B2B" value={summary.b2b_leads} accent="#8b5cf6" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="✅ Converted" value={summary.converted_leads} icon={CheckCircle2} accent="#10b981" sub="CONVERTED + REGISTERED" />
          <MetricCard label="🔒 Closed Leads" value={summary.closed_leads} accent="#94a3b8" />
          <MetricCard label="Not Interested" value={summary.not_interested_leads || 0} accent="#ef4444" />
          <MetricCard label="CNR (No Response)" value={summary.cnr_leads || 0} accent="#64748b" />
        </div>

        {/* Lead Status Donut Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }} className="section-card">
          <ChartCard title="Lead Status Distribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart data={donutLeadData} size={160} thickness={30} />
              <ChartLegend data={donutLeadData} />
            </div>
          </ChartCard>
          <ChartCard title="Followup Status Breakdown">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart data={donutFuData} size={160} thickness={30} />
              <ChartLegend data={donutFuData} />
            </div>
          </ChartCard>
        </div>

        {/* ── SECTION 2: FOLLOWUP ANALYSIS ── */}
        <SectionHeader icon="📋" title="Followup Analysis" subtitle="Detailed followup tracking and resolution metrics" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="section-card">
          <MetricCard label="Total Followups" value={summary.followups_total} icon={Clock} accent="#6366f1" />
          <MetricCard label="Done (Contacted)" value={summary.followups_contacted} icon={CheckCircle2} accent="#10b981" />
          <MetricCard label="Completed" value={summary.followups_completed} accent="#10b981" />
          <MetricCard label="Resolution Rate" value={`${summary.resolution_rate}%`} icon={Target} accent="#f59e0b" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="section-card">
          <MetricCard label="Pending Followups" value={summary.followups_pending} icon={AlertTriangle} accent="#f59e0b" />
          <MetricCard label="⚠️ Overdue (in period)" value={summary.followups_overdue} accent="#ef4444" sub="In selected date range" />
          <MetricCard label="🚨 Overall Pending (Overdue)" value={summary.followups_overdue_pending_total} accent="#dc2626" sub="All time — excl. future dates" />
          <MetricCard label="Rescheduled" value={summary.followups_rescheduled} accent="#8b5cf6" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }} className="section-card">
          <MetricCard label="Followups Created" value={summary.followups_created_in_period} icon={Activity} accent="#0ea5e9" sub="Created in period" />
          <MetricCard label="Not Interested FU" value={summary.followups_not_interested} accent="#94a3b8" />
          <MetricCard label="Unresolved" value={summary.unresolved_count} accent="#ef4444" sub="Total - Resolved" />
        </div>

        {/* ── SECTION 3: VOXBAY CALL ANALYTICS ── */}
        <SectionHeader icon="📞" title="Voxbay Call Analytics" subtitle="Call activity and talk-time breakdown" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="section-card">
          <MetricCard label="Total Calls" value={summary.calls_total} icon={PhoneCall} accent="#6366f1" />
          <MetricCard label="📥 Incoming" value={summary.calls_incoming} icon={PhoneIncoming} accent="#0ea5e9" />
          <MetricCard label="📤 Outgoing" value={summary.calls_outgoing} icon={PhoneOutgoing} accent="#8b5cf6" />
          <MetricCard label="Answer Rate" value={pct(summary.calls_answered, summary.calls_total)} icon={CheckCircle2} accent="#10b981" sub={`${summary.calls_answered} answered`} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} className="section-card">
          <MetricCard label="Calls Answered" value={summary.calls_answered} accent="#10b981" />
          <MetricCard label="Calls Missed" value={summary.calls_missed} icon={AlertTriangle} accent="#ef4444" />
          <MetricCard label="Total Talk Time" value={formatSec(summary.total_talktime_sec)} icon={Clock} accent="#f59e0b" sub={`Avg: ${formatSec(summary.avg_talktime_sec)}/call`} />
        </div>

        {/* Call Bar Chart */}
        <div style={{ marginBottom: 28 }} className="section-card">
          <ChartCard title="Call Volume Breakdown">
            <div style={{ overflowX: 'auto' }}>
              <BarChart data={callBarData} height={120} barWidth={52} gap={14} />
            </div>
          </ChartCard>
        </div>

        {/* ── SECTION 4: CONVERTED LEADS TABLE ── */}
        {converted_leads_detail.length > 0 && (
          <>
            <SectionHeader icon="🎉" title="Converted Leads Detail" subtitle={`${converted_leads_detail.length} lead(s) converted in this period`} />
            <div className="section-card" style={{ background: 'white', borderRadius: 14, border: '1.5px solid #d1fae5', overflow: 'hidden', marginBottom: 28, boxShadow: '0 2px 8px rgba(16,185,129,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #059669, #10b981)', color: 'white' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Program</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {converted_leads_detail.map((lead, idx) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f0fdf4', background: idx % 2 === 0 ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{lead.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#475569' }}>{lead.phone || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{lead.program || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{lead.location || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{lead.source || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 11 }}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{lead.created_at || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── FOOTER ── */}
        <ReportFooter dateLabel={dateLabel} generatedAt={generatedAt} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// All Employees Report
// ─────────────────────────────────────────────────────────────────────────────
function AllEmployeesReport({ employees, grandSummary, dateLabel, generatedAt }) {
  const donutLeadData = [
    { label: 'Hot',       value: grandSummary.hot_leads,       color: '#ef4444' },
    { label: 'Warm',      value: grandSummary.warm_leads,      color: '#f59e0b' },
    { label: 'Cold',      value: grandSummary.cold_leads,      color: '#0ea5e9' },
    { label: 'Converted', value: grandSummary.converted_leads, color: '#10b981' },
  ].filter(d => d.value > 0);

  const donutFuData = [
    { label: 'Resolved', value: grandSummary.followups_resolved, color: '#10b981' },
    { label: 'Pending',  value: grandSummary.followups_pending,  color: '#f59e0b' },
    { label: 'Overdue',  value: grandSummary.followups_overdue,  color: '#ef4444' },
  ].filter(d => d.value > 0);

  const topPerformer = grandSummary.top_performer;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="animate-report-in">
      {/* ── HEADER ── */}
      <div className="report-header" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
        color: 'white', padding: '36px 48px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', opacity: 0.7, textTransform: 'uppercase' }}>Life Planner Universal CRM</div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>Team Performance Report</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
              <Users size={14} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>All Employees — {employees.length} staff</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
              <Calendar size={14} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{dateLabel}</span>
            </div>
            {topPerformer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.2)', borderRadius: 10, padding: '8px 14px' }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24' }}>Top Performer: {topPerformer.full_name || topPerformer.username}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', opacity: 0.6, fontSize: 11 }}>
            🕐 Generated: {generatedAt}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 48px', background: '#f8fafc' }}>

        {/* ── GRAND SUMMARY KPIs ── */}
        <SectionHeader icon="📊" title="Team Summary Overview" subtitle="Combined metrics for all employees" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="Total Leads" value={grandSummary.total_leads} icon={Users} accent="#6366f1" />
          <MetricCard label="Fresh Leads" value={grandSummary.fresh_leads} icon={Sparkles} accent="#10b981" />
          <MetricCard label="Converted" value={grandSummary.converted_leads} icon={CheckCircle2} accent="#10b981" sub={`${grandSummary.conversion_rate}% rate`} />
          <MetricCard label="Total Calls" value={grandSummary.calls_total} icon={PhoneCall} accent="#0ea5e9" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="🔥 Hot Leads" value={grandSummary.hot_leads} accent="#ef4444" />
          <MetricCard label="🟡 Warm Leads" value={grandSummary.warm_leads} accent="#f59e0b" />
          <MetricCard label="🔵 Cold Leads" value={grandSummary.cold_leads} accent="#0ea5e9" />
          <MetricCard label="Total Talk Time" value={formatSec(grandSummary.total_talktime_sec)} icon={Clock} accent="#8b5cf6" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }} className="section-card">
          <MetricCard label="Followups Total" value={grandSummary.followups_total} icon={Clock} accent="#6366f1" />
          <MetricCard label="Followups Resolved" value={grandSummary.followups_resolved} icon={CheckCircle2} accent="#10b981" sub={`${grandSummary.completion_rate}% rate`} />
          <MetricCard label="Pending Followups" value={grandSummary.followups_pending} icon={AlertTriangle} accent="#f59e0b" />
          <MetricCard label="⚠️ Overdue" value={grandSummary.followups_overdue} accent="#ef4444" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }} className="section-card">
          <ChartCard title="Lead Status Distribution">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart data={donutLeadData} size={160} thickness={30} />
              <ChartLegend data={donutLeadData} />
            </div>
          </ChartCard>
          <ChartCard title="Followup Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart data={donutFuData} size={160} thickness={30} />
              <ChartLegend data={donutFuData} />
            </div>
          </ChartCard>
        </div>

        {/* ── EMPLOYEE COMPARISON TABLE ── */}
        <SectionHeader icon="👥" title="Employee Performance Comparison" subtitle="Ranked by performance score — highest to lowest" />
        <div className="section-card" style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #0f172a, #1e293b)', color: 'white' }}>
                {['Rank','Employee','Total Leads','Fresh','Converted','Conv%','FU Total','FU Done','FU Pending','Overdue All','Calls','Talk Time','Score'].map(h => (
                  <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const s = emp.summary;
                const isTop = s.rank === 1;
                return (
                  <tr key={emp.employee.id} style={{ borderBottom: '1px solid #f1f5f9', background: isTop ? '#fefce8' : (idx % 2 === 0 ? '#f8fafc' : 'white') }}>
                    <td style={{ padding: '10px 10px', fontWeight: 900, color: isTop ? '#f59e0b' : '#64748b', fontSize: 14 }}>
                      {s.rank === 1 ? '🏆' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{emp.employee.full_name || emp.employee.username}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>@{emp.employee.username}</div>
                    </td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: '#1e293b' }}>{s.total_leads}</td>
                    <td style={{ padding: '10px 10px', color: '#10b981', fontWeight: 600 }}>{s.fresh_leads}</td>
                    <td style={{ padding: '10px 10px', color: '#059669', fontWeight: 700 }}>{s.converted_leads}</td>
                    <td style={{ padding: '10px 10px', color: '#f59e0b', fontWeight: 700 }}>{s.conversion_rate}%</td>
                    <td style={{ padding: '10px 10px', color: '#6366f1' }}>{s.followups_total}</td>
                    <td style={{ padding: '10px 10px', color: '#10b981', fontWeight: 600 }}>{s.followups_resolved}</td>
                    <td style={{ padding: '10px 10px', color: s.followups_pending > 0 ? '#f59e0b' : '#94a3b8', fontWeight: s.followups_pending > 0 ? 700 : 400 }}>{s.followups_pending}</td>
                    <td style={{ padding: '10px 10px', color: s.followups_overdue_pending_total > 0 ? '#ef4444' : '#94a3b8', fontWeight: s.followups_overdue_pending_total > 0 ? 700 : 400 }}>
                      {s.followups_overdue_pending_total ?? s.followups_overdue}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#0ea5e9' }}>{s.calls_total}</td>
                    <td style={{ padding: '10px 10px', color: '#8b5cf6', fontSize: 11 }}>{formatSec(s.total_talktime_sec)}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12,
                        background: s.performance_score >= 80 ? '#d1fae5' : s.performance_score >= 60 ? '#e0e7ff' : s.performance_score >= 40 ? '#fef3c7' : '#fee2e2',
                        color: s.performance_score >= 80 ? '#059669' : s.performance_score >= 60 ? '#4338ca' : s.performance_score >= 40 ? '#d97706' : '#dc2626'
                      }}>
                        {s.performance_score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Converted leads for all employees */}
        {employees.some(e => (e.converted_leads_detail || []).length > 0) && (
          <>
            <SectionHeader icon="🎉" title="All Converted Leads" subtitle="All conversions across the team in this period" />
            <div className="section-card" style={{ background: 'white', borderRadius: 14, border: '1.5px solid #d1fae5', overflow: 'hidden', marginBottom: 28, boxShadow: '0 2px 8px rgba(16,185,129,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #059669, #10b981)', color: 'white' }}>
                    {['#','Name','Phone','Program','Location','Source','Status','Assigned To','Date'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.flatMap(e => (e.converted_leads_detail || []).map(l => ({ ...l, _emp: e.employee.full_name || e.employee.username }))).map((lead, idx) => (
                    <tr key={`${lead.id}-${idx}`} style={{ borderBottom: '1px solid #f0fdf4', background: idx % 2 === 0 ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{lead.name || '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#475569', fontSize: 11 }}>{lead.phone || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{lead.program || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{lead.location || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 11 }}>{lead.source || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 10 }}>{lead.status}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#6366f1', fontWeight: 600 }}>{lead._emp}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 11 }}>{lead.created_at || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <ReportFooter dateLabel={dateLabel} generatedAt={generatedAt} />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #e2e8f0' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function ChartLegend({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{d.label}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginLeft: 'auto' }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function ReportFooter({ dateLabel, generatedAt }) {
  return (
    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: 11 }}>
      <span>📊 Life Planner Universal CRM — Staff Performance Report</span>
      <span>Period: {dateLabel}</span>
      <span>Generated: {generatedAt}</span>
    </div>
  );
}
