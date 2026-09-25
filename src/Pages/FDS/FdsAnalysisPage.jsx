/**
 * FdsAnalysisPage.jsx
 * Management read-only analytics dashboard for FDS — Kochi & Kottayam.
 * Requires permission: fds:management  (or fds:admin)
 */

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi } from './fdsApi';
import './fds-theme.css';
import {
  Users, Music, TrendingUp, IndianRupee, CalendarCheck,
  Star, AlertCircle, Sparkles, Activity,
  Building2, Filter, RefreshCw, BarChart2,
  Target, Heart, ShieldCheck, ChevronsRight,
  Info
} from 'lucide-react';

// ─────────────────────────────────────────────
// Tiny inline bar
// ─────────────────────────────────────────────
function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--fds-text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--fds-text)' }}>{value}</span>
      </div>
      <div style={{ height: 7, background: 'var(--fds-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 1s cubic-bezier(.22,.61,.36,1)' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI stat card
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, sub, accentColor = 'var(--fds-primary)' }) {
  return (
    <div className="fds-stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--fds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.1rem', fontWeight: 700, color: accentColor, lineHeight: 1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: '0.75rem', color: 'var(--fds-text-muted)', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--fds-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--fds-border)' }}>
          <Icon size={20} color={accentColor} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section heading
// ─────────────────────────────────────────────
function SH({ icon: Icon, title, accent = 'var(--fds-primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <Icon size={16} color={accent} />
      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 700, color: accent }}>{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Branch pill selector
// ─────────────────────────────────────────────
function BranchSelector({ value, onChange }) {
  const opts = [{ k: 'ALL', l: '🌐 Both' }, { k: 'KOCHI', l: '🏙️ Kochi' }, { k: 'KOTTAYAM', l: '🌿 Kottayam' }];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: value === o.k ? '1.5px solid var(--fds-primary)' : '1.5px solid var(--fds-border)', background: value === o.k ? 'var(--fds-primary-muted)' : 'var(--fds-surface-2)', color: value === o.k ? 'var(--fds-primary)' : 'var(--fds-text-muted)' }}>{o.l}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Branch comparison bar
// ─────────────────────────────────────────────
function BranchBar({ label, kochi, kottayam }) {
  const total = (kochi || 0) + (kottayam || 0);
  const kPct = total ? Math.round((kochi / total) * 100) : 50;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem', color: 'var(--fds-text-muted)' }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: 'var(--fds-text)' }}>{total}</span>
      </div>
      <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', gap: 1 }}>
        <div style={{ width: `${kPct}%`, background: '#6C8EBF', transition: 'width 0.8s' }} title={`Kochi: ${kochi}`} />
        <div style={{ width: `${100 - kPct}%`, background: 'var(--fds-yoga)', transition: 'width 0.8s' }} title={`Kottayam: ${kottayam}`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.68rem' }}>
        <span style={{ color: '#6C8EBF' }}>🏙️ {kochi}</span>
        <span style={{ color: 'var(--fds-yoga)' }}>🌿 {kottayam}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Funnel step
// ─────────────────────────────────────────────
function FunnelStep({ label, count, rate, color, isLast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ width: '100%', minHeight: 70, background: color, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 8px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', fontWeight: 700, color: '#fff' }}>{count}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 }}>{label}</div>
      </div>
      {!isLast && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
          <ChevronsRight size={14} color="var(--fds-text-muted)" style={{ transform: 'rotate(90deg)' }} />
          {rate !== undefined && <span style={{ fontSize: '0.68rem', color: 'var(--fds-primary)', fontWeight: 700 }}>{rate}%</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sparkline bars
// ─────────────────────────────────────────────
function SparkBars({ data, kochiKey = 'kochi', ktmKey = 'kottayam' }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => (d[kochiKey] || 0) + (d[ktmKey] || 0)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
      {data.map((d, i) => {
        const kH = Math.round(((d[kochiKey] || 0) / maxVal) * 56);
        const tH = Math.round((((d[kochiKey] || 0) + (d[ktmKey] || 0)) / maxVal) * 56);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, justifyContent: 'flex-end' }} title={`${d.month}: Kochi ${d[kochiKey]}, KTM ${d[ktmKey]}`}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: tH }}>
              <div style={{ width: '100%', height: kH, background: '#6C8EBF', borderRadius: '3px 3px 0 0' }} />
              <div style={{ width: '100%', height: tH - kH, background: 'var(--fds-yoga)', borderRadius: 0 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Donut SVG
// ─────────────────────────────────────────────
function Donut({ segments, size = 88 }) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  if (!total) return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--fds-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--fds-text-faint)' }}>—</div>;
  const r = 38; const circ = 2 * Math.PI * r; let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--fds-surface-3)" strokeWidth="18" />
      {segments.map((s, i) => { const dash = (s.value / total) * circ; const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />; offset += dash; return el; })}
      <text x="50" y="55" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--fds-primary)" fontFamily="Cormorant Garamond, serif">{total}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function Sk({ h = 80 }) {
  return <div style={{ height: h, borderRadius: 12, background: 'linear-gradient(90deg,var(--fds-surface-2) 25%,var(--fds-surface-3) 50%,var(--fds-surface-2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

// ═════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════
export default function FdsAnalysisPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [branch, setBranch]     = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const isReadOnly = hasPermission('fds:management') && !hasPermission('fds:admin');

  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }, [accessToken, refreshAccessToken]);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = { branch };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to   = dateTo;
    fdsApi.analysis(authFetch, params)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authFetch, branch, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const fmt   = n => Number(n || 0).toLocaleString('en-IN');
  const fmtRs = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ minHeight: '100vh', background: '#0F0A06' }}>
      <Navbar />
      <div className="fds-theme">
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div className="fds-page">

          {/* ── Header ── */}
          <div className="fds-page-header" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <BarChart2 size={22} color="var(--fds-primary)" />
                <h1 className="fds-page-title" style={{ marginBottom: 0 }}>FDS Analysis</h1>
                {isReadOnly && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', background: 'rgba(126,200,164,0.12)', color: 'var(--fds-yoga)', border: '1px solid rgba(126,200,164,0.3)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase' }}>Read-Only</span>
                )}
              </div>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio — Cross-Branch Intelligence{data?.generated_at && <span style={{ marginLeft: 6, opacity: 0.55 }}>· {data.generated_at}</span>}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <BranchSelector value={branch} onChange={setBranch} />
              <button onClick={() => setShowFilters(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${showFilters ? 'var(--fds-primary)' : 'var(--fds-border)'}`, background: showFilters ? 'var(--fds-primary-muted)' : 'var(--fds-surface-2)', color: showFilters ? 'var(--fds-primary)' : 'var(--fds-text-muted)' }}>
                <Filter size={13} /> Filter
              </button>
              <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', border: '1.5px solid var(--fds-border)', background: 'var(--fds-surface-2)', color: 'var(--fds-text-muted)' }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* ── Date filters ── */}
          {showFilters && (
            <div className="fds-card" style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {[['From', dateFrom, setDateFrom], ['To', dateTo, setDateTo]].map(([lbl, val, set]) => (
                <div key={lbl}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)', display: 'block', marginBottom: 3 }}>{lbl}</label>
                  <input type="date" value={val} onChange={e => set(e.target.value)} style={{ background: 'var(--fds-surface-2)', border: '1px solid var(--fds-border)', color: 'var(--fds-text)', borderRadius: 7, padding: '6px 10px', fontSize: '0.83rem', cursor: 'pointer' }} />
                </div>
              ))}
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 12px', borderRadius: 7, fontSize: '0.8rem', background: 'var(--fds-surface-3)', border: '1px solid var(--fds-border)', color: 'var(--fds-text-muted)', cursor: 'pointer' }}>Clear</button>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', color: '#E74C3C', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.85rem' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>{[...Array(6)].map((_, i) => <Sk key={i} h={96} />)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{[...Array(4)].map((_, i) => <Sk key={i} h={200} />)}</div>
            </div>
          ) : data ? (
            <>
              {/* ══ KPI Strip ══ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
                <StatCard icon={Users}        label="Active Students"     value={fmt(data.students.total_active)}          sub={`+${data.students.new_this_month} this month`}               accentColor="var(--fds-primary)" />
                <StatCard icon={Activity}     label="Active Batches"      value={fmt(data.batches.total_active)}            sub="Dance · Zumba · Yoga"                                        accentColor="var(--fds-dance)" />
                <StatCard icon={TrendingUp}   label="Total Enquiries"     value={fmt(data.enquiries.total)}                sub={`${data.enquiries.follow_up_due} follow-ups due`}             accentColor="#6C8EBF" />
                <StatCard icon={CalendarCheck} label="Trial Conversion"   value={`${data.trials.conversion_rate}%`}         sub={`${fmt(data.trials.converted)} of ${fmt(data.trials.total)}`} accentColor="var(--fds-zumba)" />
                <StatCard icon={IndianRupee}  label="This Month Revenue"  value={fmtRs(data.fees.this_month_collected)}     sub={`Total: ${fmtRs(data.fees.total_collected)}`}                accentColor="var(--fds-yoga)" />
                <StatCard icon={AlertCircle}  label="Outstanding"         value={fmtRs(data.fees.total_outstanding)}        sub={`${data.fees.by_status.pending + data.fees.by_status.overdue} pending/overdue`} accentColor="#E67E22" />
              </div>

              {/* ══ Row 1: Branch Comparison + Funnel ══ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="fds-card">
                  <SH icon={Building2} title="Branch Comparison" />
                  <BranchBar label="Active Students"  kochi={data.students.by_branch.kochi}   kottayam={data.students.by_branch.kottayam} />
                  <BranchBar label="Active Batches"   kochi={data.batches.by_branch.kochi}    kottayam={data.batches.by_branch.kottayam} />
                  <BranchBar label="Total Enquiries"  kochi={data.enquiries.by_branch.kochi}  kottayam={data.enquiries.by_branch.kottayam} />
                  <BranchBar label="Trials"           kochi={data.trials.by_branch.kochi}     kottayam={data.trials.by_branch.kottayam} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fds-border)' }}>
                    {[['🏙️ Kochi', '#6C8EBF', data.fees.by_branch.kochi], ['🌿 Kottayam', 'var(--fds-yoga)', data.fees.by_branch.kottayam]].map(([lbl, clr, val]) => (
                      <div key={lbl} style={{ flex: 1, background: `${clr}18`, border: `1px solid ${clr}30`, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: clr, marginBottom: 2 }}>{lbl} Revenue</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, color: clr }}>{fmtRs(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fds-card">
                  <SH icon={Target} title="Enquiry → Trial → Student Funnel" />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 14 }}>
                    <FunnelStep label="Enquiries"   count={fmt(data.funnel.enquiries)}      color="rgba(108,142,191,0.85)" rate={data.funnel.enq_to_trial_rate} />
                    <FunnelStep label="Trials"      count={fmt(data.funnel.trials)}         color="rgba(232,93,117,0.85)"  rate={data.funnel.trial_conversion} />
                    <FunnelStep label="Students"    count={fmt(data.funnel.active_students)} color="rgba(126,200,164,0.85)" isLast />
                  </div>
                  <div style={{ background: 'var(--fds-surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)', marginBottom: 8 }}>Conversion Metrics</div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {[['Enq→Trial', 'var(--fds-zumba)', `${data.funnel.enq_to_trial_rate}%`], ['Trial→Student', 'var(--fds-yoga)', `${data.funnel.trial_conversion}%`], ['Trainer Rating', 'var(--fds-primary)', `${data.trials.avg_trainer_rating}/5 ★`]].map(([lbl, clr, val]) => (
                        <div key={lbl} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: clr, fontFamily: 'Cormorant Garamond, serif' }}>{val}</div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--fds-text-muted)' }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══ Row 2: Students + Revenue ══ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="fds-card">
                  <SH icon={Users} title="Student Breakdown" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {/* By Class donut */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--fds-text-muted)', fontWeight: 600 }}>BY CLASS</div>
                      <Donut segments={[{ value: data.students.by_category.dance, color: 'var(--fds-dance)' }, { value: data.students.by_category.zumba, color: 'var(--fds-zumba)' }, { value: data.students.by_category.yoga, color: 'var(--fds-yoga)' }]} />
                      <div style={{ fontSize: '0.66rem', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'stretch' }}>
                        {[['Dance', 'var(--fds-dance)', data.students.by_category.dance], ['Zumba', 'var(--fds-zumba)', data.students.by_category.zumba], ['Yoga', 'var(--fds-yoga)', data.students.by_category.yoga]].map(([l, c, v]) => (
                          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: c }}>● {l}</span><span style={{ color: 'var(--fds-text)' }}>{v}</span></div>
                        ))}
                      </div>
                    </div>
                    {/* By Gender donut */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--fds-text-muted)', fontWeight: 600 }}>BY GENDER</div>
                      <Donut segments={[{ value: data.students.by_gender.female, color: 'var(--fds-zumba)' }, { value: data.students.by_gender.male, color: '#6C8EBF' }, { value: data.students.by_gender.other, color: 'var(--fds-text-faint)' }]} />
                      <div style={{ fontSize: '0.66rem', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'stretch' }}>
                        {[['Female', 'var(--fds-zumba)', data.students.by_gender.female], ['Male', '#6C8EBF', data.students.by_gender.male], ['Other', 'var(--fds-text-faint)', data.students.by_gender.other]].map(([l, c, v]) => (
                          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: c }}>● {l}</span><span style={{ color: 'var(--fds-text)' }}>{v}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fds-text-muted)', fontWeight: 600, marginBottom: 6 }}>MONTHLY JOINS — 6 MONTHS</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.62rem', color: '#6C8EBF' }}>■ Kochi</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--fds-yoga)' }}>■ Kottayam</span>
                    </div>
                    <SparkBars data={data.students.join_trend} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      {data.students.join_trend.map((d, i) => (
                        <span key={i} style={{ fontSize: '0.6rem', color: 'var(--fds-text-faint)' }}>{d.month.split(' ')[0]}<br />{d.total}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="fds-card">
                  <SH icon={IndianRupee} title="Revenue Trend (6 months)" accentColor="var(--fds-yoga)" />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.62rem', color: '#6C8EBF' }}>■ Kochi</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--fds-yoga)' }}>■ Kottayam</span>
                  </div>
                  <SparkBars data={data.fees.revenue_trend} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {data.fees.revenue_trend.slice(-3).map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--fds-surface-2)', borderRadius: 7 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', minWidth: 60 }}>{m.month}</span>
                        <span style={{ fontWeight: 700, color: 'var(--fds-primary)', fontSize: '0.82rem' }}>{fmtRs(m.total)}</span>
                        <div style={{ fontSize: '0.68rem', display: 'flex', gap: 6 }}>
                          <span style={{ color: '#6C8EBF' }}>{fmtRs(m.kochi)}</span>
                          <span style={{ color: 'var(--fds-yoga)' }}>{fmtRs(m.kottayam)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 12, marginTop: 12 }}>
                    <SH icon={ShieldCheck} title="Fee Status" accentColor="#E67E22" />
                    {[['Paid', 'var(--fds-yoga)', data.fees.by_status.paid], ['Partial', 'var(--fds-primary)', data.fees.by_status.partial], ['Pending', '#E67E22', data.fees.by_status.pending], ['Overdue', 'var(--fds-danger)', data.fees.by_status.overdue]].map(([l, c, v]) => (
                      <MiniBar key={l} label={l} value={v} max={Math.max(...Object.values(data.fees.by_status), 1)} color={c} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ══ Row 3: Enquiries + Trials + Batches/Weddings ══ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

                {/* Enquiries */}
                <div className="fds-card">
                  <SH icon={TrendingUp} title="Enquiries" accentColor="#6C8EBF" />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <Donut segments={[{ value: data.enquiries.by_status.new, color: '#6C8EBF' }, { value: data.enquiries.by_status.contacted, color: 'var(--fds-primary)' }, { value: data.enquiries.by_status.trial_scheduled, color: 'var(--fds-zumba)' }, { value: data.enquiries.by_status.converted, color: 'var(--fds-yoga)' }, { value: data.enquiries.by_status.lost, color: 'var(--fds-danger)' }]} size={80} />
                    <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[['New', '#6C8EBF', data.enquiries.by_status.new], ['Contacted', 'var(--fds-primary)', data.enquiries.by_status.contacted], ['Trial Sched.', 'var(--fds-zumba)', data.enquiries.by_status.trial_scheduled], ['Converted', 'var(--fds-yoga)', data.enquiries.by_status.converted], ['Lost', 'var(--fds-danger)', data.enquiries.by_status.lost]].map(([l, c, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: c }}>● {l}</span><span style={{ fontWeight: 700, color: 'var(--fds-text)' }}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 10 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--fds-text-muted)', fontWeight: 600, marginBottom: 6 }}>BY SOURCE</div>
                    {Object.entries(data.enquiries.by_source).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([src, cnt]) => (
                      <MiniBar key={src} label={src.replace('_', ' ')} value={cnt} max={Math.max(...Object.values(data.enquiries.by_source), 1)} color="var(--fds-primary)" />
                    ))}
                  </div>
                  {data.enquiries.follow_up_due > 0 && (
                    <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 7, fontSize: '0.75rem', color: '#E67E22' }}>
                      ⚠️ {data.enquiries.follow_up_due} follow-ups overdue
                    </div>
                  )}
                </div>

                {/* Trials */}
                <div className="fds-card">
                  <SH icon={Star} title="Trials" accentColor="var(--fds-zumba)" />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <Donut segments={[{ value: data.trials.by_status.scheduled, color: 'var(--fds-primary)' }, { value: data.trials.by_status.completed, color: 'var(--fds-yoga)' }, { value: data.trials.by_status.no_show, color: '#E67E22' }, { value: data.trials.by_status.cancelled, color: 'var(--fds-danger)' }]} size={80} />
                    <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[['Scheduled', 'var(--fds-primary)', data.trials.by_status.scheduled], ['Completed', 'var(--fds-yoga)', data.trials.by_status.completed], ['No Show', '#E67E22', data.trials.by_status.no_show], ['Cancelled', 'var(--fds-danger)', data.trials.by_status.cancelled]].map(([l, c, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: c }}>● {l}</span><span style={{ fontWeight: 700, color: 'var(--fds-text)' }}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 10 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--fds-text-muted)', fontWeight: 600, marginBottom: 6 }}>BY CLASS</div>
                    {[['Dance', 'var(--fds-dance)', data.trials.by_category.dance], ['Zumba', 'var(--fds-zumba)', data.trials.by_category.zumba], ['Yoga', 'var(--fds-yoga)', data.trials.by_category.yoga]].map(([l, c, v]) => (
                      <MiniBar key={l} label={l} value={v} max={Math.max(data.trials.by_category.dance, data.trials.by_category.zumba, data.trials.by_category.yoga, 1)} color={c} />
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fds-text-muted)' }}>Avg Trainer Rating</span>
                    <div style={{ display: 'flex', gap: 1 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '0.9rem', color: s <= Math.round(data.trials.avg_trainer_rating) ? '#F39C12' : 'var(--fds-surface-3)' }}>★</span>)}
                      <span style={{ fontSize: '0.78rem', color: 'var(--fds-primary)', marginLeft: 4, fontWeight: 700 }}>{data.trials.avg_trainer_rating}</span>
                    </div>
                  </div>
                </div>

                {/* Batches + Weddings */}
                <div className="fds-card">
                  <SH icon={Music} title="Batches" accentColor="var(--fds-dance)" />
                  {[['Dance', 'var(--fds-dance)', data.batches.by_category.dance], ['Zumba', 'var(--fds-zumba)', data.batches.by_category.zumba], ['Yoga', 'var(--fds-yoga)', data.batches.by_category.yoga]].map(([l, c, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'var(--fds-surface-2)', borderRadius: 7, marginBottom: 7 }}>
                      <span style={{ fontSize: '0.82rem', color: c }}>● {l}</span>
                      <span style={{ fontWeight: 700, color: c, fontSize: '1.05rem', fontFamily: 'Cormorant Garamond, serif' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--fds-border)', paddingTop: 12, marginTop: 6 }}>
                    <SH icon={Heart} title="Wedding Groups" accentColor="var(--fds-zumba)" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[['Active', 'var(--fds-zumba)', data.weddings.active], ['Total', 'var(--fds-primary)', data.weddings.total]].map(([l, c, v]) => (
                        <div key={l} style={{ textAlign: 'center', padding: '10px', background: `${c}15`, borderRadius: 8, border: `1px solid ${c}20` }}>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', fontWeight: 700, color: c }}>{v}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--fds-text-muted)' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {Object.entries(data.weddings.by_status).filter(([, v]) => v > 0).map(([s, v]) => (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid var(--fds-border)' }}>
                        <span style={{ color: 'var(--fds-text-muted)', textTransform: 'capitalize' }}>{s.replace('_', ' ')}</span>
                        <span style={{ fontWeight: 700, color: 'var(--fds-text)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ══ Row 4: Payment Mode grid ══ */}
              <div className="fds-card" style={{ marginBottom: 14 }}>
                <SH icon={IndianRupee} title="Revenue by Payment Mode" accentColor="var(--fds-yoga)" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                  {Object.entries(data.fees.by_mode).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([mode, amt]) => {
                    const colors = { cash: 'var(--fds-primary)', upi: 'var(--fds-yoga)', online: '#6C8EBF', bank_transfer: 'var(--fds-zumba)', card: '#E67E22', other: 'var(--fds-text-muted)' };
                    const clr = colors[mode] || 'var(--fds-primary)';
                    return (
                      <div key={mode} style={{ padding: '12px', background: 'var(--fds-surface-2)', border: `1px solid ${clr}25`, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: clr, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{mode.replace('_', ' ')}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: clr }}>{fmtRs(amt)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Read-only notice ── */}
              {isReadOnly && (
                <div style={{ padding: '10px 14px', background: 'rgba(201,169,110,0.06)', border: '1px solid var(--fds-border)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--fds-text-muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Info size={13} color="var(--fds-primary)" />
                  You have <strong style={{ color: 'var(--fds-primary)', margin: '0 3px' }}>read-only management access</strong>. All figures are live. No edits can be made from this view.
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
