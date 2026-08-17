import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Download, Upload, X, ChevronUp, ChevronDown,
  Edit2, Trash2, Star, Users, CheckCircle
} from 'lucide-react';
import Layout from '../../Components/Layout';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES, getStatusBadgeClass, downloadExcelFromResponse } from './fdsApi';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const STATUSES = ['SCHEDULED','COMPLETED','NO_SHOW','CANCELLED'];
const EMPTY_FORM = {
  name: '', date: new Date().toISOString().split('T')[0], time: '',
  age: '', phone: '', location: '', class_category: 'DANCE',
  fee_quoted: '', feedback: '', trainer_rating: '', status: 'SCHEDULED',
  converted: false, join_date: '', follow_up_date: '', remarks: '',
  enquiry: '', conducted_by: '',
};

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="fds-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`fds-star ${n <= (hovered || value) ? 'filled' : ''}`}
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
          onClick={() => !readOnly && onChange && onChange(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
        >★</span>
      ))}
    </div>
  );
}

export default function FdsTrialPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin');
  const fileInputRef = useRef();

  const [trials, setTrials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConverted, setFilterConverted] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [followUpDue, setFollowUpDue] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  }, [accessToken, refreshAccessToken]);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) throw new Error('Failed');
    return res.json();
  }, [authFetch]);

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE };
    if (activeCategory !== 'ALL') p.class_category = activeCategory;
    if (search) p.search = search;
    if (filterStatus) p.status = filterStatus;
    if (filterConverted !== '') p.converted = filterConverted;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (followUpDue) p.follow_up_due = 'true';
    p.ordering = sortDir === 'asc' ? sortField : `-${sortField}`;
    return p;
  }, [page, activeCategory, search, filterStatus, filterConverted, dateFrom, dateTo, followUpDue, sortField, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        fdsApi.trials(authFetchJson, buildParams()),
        fdsApi.trialStats(authFetchJson),
      ]);
      setTrials(data.results ?? data);
      setTotal(data.count ?? (data.results ? data.results.length : data.length));
      setStats(statsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeCategory, search, filterStatus, filterConverted, dateFrom, dateTo, followUpDue]);

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (t) => {
    setForm({
      name: t.name, date: t.date, time: t.time || '',
      age: t.age || '', phone: t.phone || '', location: t.location || '',
      class_category: t.class_category, fee_quoted: t.fee_quoted || '',
      feedback: t.feedback || '', trainer_rating: t.trainer_rating || '',
      status: t.status, converted: t.converted,
      join_date: t.join_date || '', follow_up_date: t.follow_up_date || '',
      remarks: t.remarks || '', enquiry: t.enquiry || '', conducted_by: t.conducted_by || '',
    });
    setEditId(t.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        fee_quoted: form.fee_quoted ? parseFloat(form.fee_quoted) : 0,
        trainer_rating: form.trainer_rating ? parseInt(form.trainer_rating) : null,
        enquiry: form.enquiry || null,
        conducted_by: form.conducted_by || null,
      };
      if (editId) await fdsApi.updateTrial(authFetchJson, editId, payload);
      else await fdsApi.createTrial(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trial?')) return;
    try { await fdsApi.deleteTrial(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/trials/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Trials.xlsx');
    } catch { alert('Export failed'); }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    alert('Trial import coming soon. Please use Excel export as template.');
    ev.target.value = '';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Trials</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · {total} total</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {canEdit && <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Import</button>}
              <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}><Download size={15} /> Export</button>
              {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Trial</button>}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total', val: stats.total, color: 'var(--fds-primary)' },
                { label: 'Scheduled', val: stats.scheduled, color: 'var(--fds-primary-light)' },
                { label: 'Completed', val: stats.completed, color: 'var(--fds-yoga)' },
                { label: 'No Show', val: stats.no_show, color: '#e74c3c' },
                { label: 'Converted', val: stats.converted, color: 'var(--fds-yoga)' },
                { label: 'Conv. Rate', val: `${stats.conversion_rate ?? 0}%`, color: 'var(--fds-dance)' },
                { label: 'Avg Rating', val: stats.avg_rating ? `${Number(stats.avg_rating).toFixed(1)}★` : '—', color: 'var(--fds-primary)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="fds-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div style={{ marginBottom: 16 }}>
            <div className="fds-tabs">
              {FDS_CATEGORIES.map(({ key, label, tabClass, dotClass }) => (
                <button key={key} className={`fds-tab ${activeCategory === key ? tabClass : ''}`} onClick={() => setActiveCategory(key)}>
                  {dotClass && <span className={dotClass}>●</span>} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="fds-filter-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fds-text-faint)' }} />
              <input className="fds-search-input" placeholder="Search name, phone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="fds-input fds-select" style={{ maxWidth: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 140 }} value={filterConverted} onChange={e => setFilterConverted(e.target.value)}>
              <option value="">All</option>
              <option value="true">Converted ✓</option>
              <option value="false">Not Converted</option>
            </select>
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: followUpDue ? 'var(--fds-primary)' : 'var(--fds-text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={followUpDue} onChange={e => setFollowUpDue(e.target.checked)} /> Follow-up Due
            </label>
          </div>

          {/* Table */}
          <div className="fds-table-wrap">
            <table className="fds-table">
              <thead>
                <tr>
                  {[
                    { key: 'trial_id', label: 'ID' },
                    { key: 'date', label: 'Date & Time' },
                    { key: 'name', label: 'Name' },
                    { key: 'class_category', label: 'Class' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'fee_quoted', label: 'Fee Quoted' },
                    { key: 'trainer_rating', label: 'Rating' },
                    { key: 'status', label: 'Status' },
                    { key: 'converted', label: 'Converted' },
                    { key: 'follow_up_date', label: 'Follow Up' },
                    { key: 'actions', label: '' },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => !['actions','phone'].includes(key) && handleSort(key)}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : trials.length === 0 ? (
                  <tr><td colSpan={11}><div className="fds-empty"><div className="fds-empty-title">No trials found</div></div></td></tr>
                ) : trials.map(t => (
                  <tr key={t.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--fds-primary)' }}>{t.trial_id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.date}</div>
                      {t.time && <div style={{ fontSize: '0.75rem', color: 'var(--fds-text-muted)' }}>{t.time}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      {t.age && <div style={{ fontSize: '0.75rem', color: 'var(--fds-text-muted)' }}>Age {t.age}</div>}
                    </td>
                    <td><span className={`fds-badge fds-badge-${t.class_category?.toLowerCase()}`}>{t.class_category}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{t.phone || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--fds-primary)' }}>₹{Number(t.fee_quoted || 0).toLocaleString('en-IN')}</td>
                    <td>
                      {t.trainer_rating ? <StarRating value={parseInt(t.trainer_rating)} readOnly /> : <span style={{ color: 'var(--fds-text-faint)' }}>—</span>}
                    </td>
                    <td><span className={`fds-badge ${getStatusBadgeClass(t.status)}`}>{t.status?.replace('_', ' ')}</span></td>
                    <td>
                      {t.converted
                        ? <span className="fds-badge fds-badge-green"><CheckCircle size={10} /> Yes</span>
                        : <span className="fds-badge fds-badge-gray">No</span>
                      }
                    </td>
                    <td style={{ fontSize: '0.78rem', color: t.follow_up_date && t.follow_up_date < today ? '#e74c3c' : 'var(--fds-text-muted)' }}>
                      {t.follow_up_date || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && (
                          <>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(t)}><Edit2 size={13} /></button>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={() => handleDelete(t.id)}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <button className="fds-btn fds-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ color: 'var(--fds-text-muted)', fontSize: '0.875rem', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
              <button className="fds-btn fds-btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal fds-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Trial' : 'New Trial'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Name *</label>
                      <input className="fds-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Date *</label>
                      <input className="fds-input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Time</label>
                      <input className="fds-input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Age</label>
                      <input className="fds-input" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Phone</label>
                      <input className="fds-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Location</label>
                      <input className="fds-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Class Category</label>
                      <select className="fds-input fds-select" value={form.class_category} onChange={e => setForm(f => ({ ...f, class_category: e.target.value }))}>
                        {['DANCE','ZUMBA','YOGA'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Fee Quoted (₹)</label>
                      <input className="fds-input" type="number" step="0.01" value={form.fee_quoted} onChange={e => setForm(f => ({ ...f, fee_quoted: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Trainer Rating</label>
                      <StarRating value={form.trainer_rating} onChange={v => setForm(f => ({ ...f, trainer_rating: v }))} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label className="fds-label" style={{ marginBottom: 0 }}>Converted?</label>
                      <input type="checkbox" checked={form.converted} onChange={e => setForm(f => ({ ...f, converted: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--fds-primary)' }} />
                    </div>
                    {form.converted && (
                      <div>
                        <label className="fds-label">Join Date</label>
                        <input className="fds-input" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
                      </div>
                    )}
                    <div>
                      <label className="fds-label">Follow Up Date</label>
                      <input className="fds-input" type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Feedback</label>
                      <textarea className="fds-input" rows={2} value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Remarks</label>
                      <textarea className="fds-input" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create Trial'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
