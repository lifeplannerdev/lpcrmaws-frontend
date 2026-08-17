import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Music, TrendingUp, IndianRupee, CalendarCheck,
  UserCheck, Star, AlertCircle, ArrowRight, Sparkles, Activity
} from 'lucide-react';
import Layout from '../../Components/Layout';
import { useAuth } from '../../context/AuthContext';
import { fdsApi } from './fdsApi';
import './fds-theme.css';

const StatCard = ({ icon: Icon, value, label, sub, accentClass = '', onClick }) => (
  <div
    className="fds-stat-card"
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div className="fds-stat-value" style={{ color: 'var(--fds-primary-light)' }}>{value ?? '—'}</div>
        <div className="fds-stat-label">{label}</div>
        {sub && <div style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', marginTop: 6 }}>{sub}</div>}
      </div>
      <div style={{
        width: 44, height: 44,
        borderRadius: '50%',
        background: 'var(--fds-primary-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid var(--fds-border)',
      }}>
        <Icon size={20} color="var(--fds-primary)" />
      </div>
    </div>
    {onClick && (
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fds-primary)', fontSize: '0.78rem', fontWeight: 600 }}>
        View all <ArrowRight size={13} />
      </div>
    )}
  </div>
);

const MiniBar = ({ label, value, max, colorClass }) => {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--fds-text)' }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--fds-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: colorClass, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

export default function FdsDashboard() {
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const authFetch = async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    const res = await fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  };

  useEffect(() => {
    fdsApi.dashboard(authFetch)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = stats?.students?.total_active ?? 0;
  const maxCat = Math.max(
    stats?.students?.by_category?.dance ?? 0,
    stats?.students?.by_category?.zumba ?? 0,
    stats?.students?.by_category?.yoga ?? 0,
    1
  );

  return (
    <Layout>
      <div className="fds-theme">
        <div className="fds-page">
          {/* ── Header ── */}
          <div className="fds-page-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Sparkles size={22} color="var(--fds-primary)" />
                <h1 className="fds-page-title" style={{ marginBottom: 0 }}>
                  FILMAATIC Dance Studio
                </h1>
              </div>
              <p className="fds-page-subtitle">KTM 2026 — Studio Operations Dashboard</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="fds-btn fds-btn-secondary" onClick={() => navigate('/fds/enquiries')}>
                <Users size={16} /> Enquiries
              </button>
              <button className="fds-btn fds-btn-primary" onClick={() => navigate('/fds/students')}>
                <UserCheck size={16} /> Students
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <div className="fds-spinner" />
            </div>
          ) : (
            <>
              {/* ── Top Stats Grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard icon={Users} value={stats?.students?.total_active} label="Active Students" sub={`+${stats?.students?.new_this_month ?? 0} this month`} onClick={() => navigate('/fds/students')} />
                <StatCard icon={Activity} value={stats?.batches?.total_active} label="Active Batches" onClick={() => navigate('/fds/batches')} />
                <StatCard icon={TrendingUp} value={stats?.enquiries?.pending} label="Open Enquiries" sub={`${stats?.enquiries?.new_this_week ?? 0} new this week`} onClick={() => navigate('/fds/enquiries')} />
                <StatCard icon={CalendarCheck} value={`${stats?.trials?.conversion_rate ?? 0}%`} label="Trial Conversion" sub={`${stats?.trials?.this_week ?? 0} trials this week`} onClick={() => navigate('/fds/trials')} />
                <StatCard icon={IndianRupee} value={`₹${Number(stats?.fees?.this_month_collected ?? 0).toLocaleString('en-IN')}`} label="Collected This Month" onClick={() => navigate('/fds/fees')} />
                <StatCard icon={AlertCircle} value={`₹${Number(stats?.fees?.total_outstanding ?? 0).toLocaleString('en-IN')}`} label="Outstanding Balance" sub={`${stats?.fees?.pending_count ?? 0} pending payments`} onClick={() => navigate('/fds/fees')} />
              </div>

              {/* ── Middle Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>

                {/* Students by Category */}
                <div className="fds-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Music size={16} color="var(--fds-primary)" />
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 700, color: 'var(--fds-primary)' }}>
                      Students by Class
                    </span>
                  </div>
                  <MiniBar label="Dance" value={stats?.students?.by_category?.dance ?? 0} max={maxCat} colorClass="var(--fds-dance)" />
                  <MiniBar label="Zumba" value={stats?.students?.by_category?.zumba ?? 0} max={maxCat} colorClass="var(--fds-zumba)" />
                  <MiniBar label="Yoga"  value={stats?.students?.by_category?.yoga  ?? 0} max={maxCat} colorClass="var(--fds-yoga)"  />
                </div>

                {/* Batches by Category */}
                <div className="fds-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CalendarCheck size={16} color="var(--fds-primary)" />
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 700, color: 'var(--fds-primary)' }}>
                      Batches by Class
                    </span>
                  </div>
                  {[
                    { label: 'Dance', val: stats?.batches?.by_category?.dance ?? 0, color: 'var(--fds-dance)', bg: 'var(--fds-dance-bg)' },
                    { label: 'Zumba', val: stats?.batches?.by_category?.zumba ?? 0, color: 'var(--fds-zumba)', bg: 'var(--fds-zumba-bg)' },
                    { label: 'Yoga',  val: stats?.batches?.by_category?.yoga  ?? 0, color: 'var(--fds-yoga)',  bg: 'var(--fds-yoga-bg)'  },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: bg, borderRadius: 8, marginBottom: 8,
                    }}>
                      <span style={{ fontSize: '0.875rem', color }}>{label}</span>
                      <span style={{ fontWeight: 700, color, fontSize: '1.1rem' }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Wedding Groups */}
                <div className="fds-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/fds/weddings')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Star size={16} color="var(--fds-primary)" />
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 700, color: 'var(--fds-primary)' }}>
                      Wedding Groups
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '3rem', color: 'var(--fds-primary-light)', fontWeight: 700 }}>
                      {stats?.wedding_groups?.total_active ?? 0}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', marginTop: 4 }}>
                      Active wedding packages
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--fds-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Manage groups <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Quick Navigation ── */}
              <div className="fds-card">
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: 'var(--fds-primary)', fontWeight: 700, marginBottom: 16 }}>
                  Quick Navigation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Enquiries',    path: '/fds/enquiries',    icon: Users },
                    { label: 'Trials',       path: '/fds/trials',       icon: Star },
                    { label: 'Students',     path: '/fds/students',     icon: UserCheck },
                    { label: 'Batches',      path: '/fds/batches',      icon: Music },
                    { label: 'Attendance',   path: '/fds/attendance',   icon: CalendarCheck },
                    { label: 'Fees',         path: '/fds/fees',         icon: IndianRupee },
                    { label: 'Weddings',     path: '/fds/weddings',     icon: Sparkles },
                  ].map(({ label, path, icon: Icon }) => (
                    <button
                      key={path}
                      className="fds-btn fds-btn-secondary"
                      style={{ justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => navigate(path)}
                    >
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
