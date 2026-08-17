import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Download, Upload, X, ChevronUp, ChevronDown,
  Eye, Edit2, Trash2, Calendar, Phone, MapPin, Filter, Users
} from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES, getCategoryBadgeClass, getStatusBadgeClass, downloadExcelFromResponse } from './fdsApi';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const EMPTY_FORM = {
  name: '', date: new Date().toISOString().split('T')[0],
  location: '', age: '', class_interest: 'DANCE', source: 'WALK_IN',
  phone: '', whatsapp_no: '', preferred_timing: '', status: 'NEW',
  follow_up_1: '', follow_up_2: '', joined: false, remarks: '',
};

const SOURCES = ['WALK_IN','INSTAGRAM','FACEBOOK','REFERRAL','GOOGLE','WHATSAPP','OTHER'];
const STATUSES = ['NEW','CONTACTED','TRIAL_SCHEDULED','CONVERTED','LOST'];

function StatusPill({ status }) {
  const labels = { NEW:'New', CONTACTED:'Contacted', TRIAL_SCHEDULED:'Trial Scheduled', CONVERTED:'Converted', LOST:'Lost' };
  return <span className={`fds-badge ${getStatusBadgeClass(status)}`}>{labels[status] ?? status}</span>;
}

function CategoryPill({ cat }) {
  if (!cat) return null;
  return <span className={`fds-badge fds-badge-${cat.toLowerCase()}`}>{cat}</span>;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}

export default function FdsEnquiryPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canEdit = hasPermission('fds:admin');
  const fileInputRef = useRef();

  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [followUpDue, setFollowUpDue] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Sort
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    return fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
  }, [accessToken, refreshAccessToken]);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }, [authFetch]);

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE };
    if (activeCategory !== 'ALL') p.class_interest = activeCategory;
    if (search) p.search = search;
    if (filterStatus) p.status = filterStatus;
    if (filterSource) p.source = filterSource;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo)   p.date_to   = dateTo;
    if (followUpDue) p.follow_up_due = 'true';
    p.ordering = sortDir === 'asc' ? sortField : `-${sortField}`;
    return p;
  }, [page, activeCategory, search, filterStatus, filterSource, dateFrom, dateTo, followUpDue, sortField, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enqData, statsData] = await Promise.all([
        fdsApi.enquiries(authFetchJson, buildParams()),
        fdsApi.enquiryStats(authFetchJson),
      ]);
      setEnquiries(enqData.results ?? enqData);
      setTotal(enqData.count ?? (enqData.results ? enqData.results.length : enqData.length));
      setStats(statsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeCategory, search, filterStatus, filterSource, dateFrom, dateTo, followUpDue]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (e) => {
    setForm({
      name: e.name, date: e.date, location: e.location || '',
      age: e.age || '', class_interest: e.class_interest,
      source: e.source, phone: e.phone || '', whatsapp_no: e.whatsapp_no || '',
      preferred_timing: e.preferred_timing || '', status: e.status,
      follow_up_1: e.follow_up_1 || '', follow_up_2: e.follow_up_2 || '',
      joined: e.joined, remarks: e.remarks || '',
    });
    setEditId(e.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        follow_up_1: form.follow_up_1 || null,
        follow_up_2: form.follow_up_2 || null,
      };
      if (editId) {
        await fdsApi.updateEnquiry(authFetchJson, editId, payload);
      } else {
        await fdsApi.createEnquiry(authFetchJson, payload);
      }
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try { await fdsApi.deleteEnquiry(authFetchJson, id); load(); }
    catch (e) { alert('Delete failed'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/enquiries/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Enquiries.xlsx');
    } catch (e) { alert('Export failed'); }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/fds/enquiries/import_excel/`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      alert(`Import complete: ${data.created} created, ${data.skipped} skipped.`);
      load();
    } catch (e) { alert('Import failed'); }
    ev.target.value = '';
  };

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterSource('');
    setDateFrom(''); setDateTo(''); setFollowUpDue(false);
    setActiveCategory('ALL');
  };
  const hasFilters = search || filterStatus || filterSource || dateFrom || dateTo || followUpDue || activeCategory !== 'ALL';

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* ── Header ── */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Enquiries</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · {total} total</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {canEdit && (
                <>
                  <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}>
                    <Upload size={15} /> Import Excel
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
                </>
              )}
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}>
                <Download size={15} /> Export Excel
              </button>
              {canEdit && (
                <button className="fds-btn fds-btn-primary" onClick={openAdd}>
                  <Plus size={15} /> New Enquiry
                </button>
              )}
            </div>
          </div>

          {/* ── Stats Row ── */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total', val: stats.total, color: 'var(--fds-primary)' },
                { label: 'New', val: stats.new, color: 'var(--fds-primary-light)' },
                { label: 'Trial Scheduled', val: stats.trial_scheduled, color: '#E8C87A' },
                { label: 'Converted', val: stats.converted, color: 'var(--fds-yoga)' },
                { label: 'Lost', val: stats.lost, color: '#e74c3c' },
                { label: 'Follow-up Due', val: stats.follow_up_due, color: '#e67e22' },
              ].map(({ label, val, color }) => (
                <div key={label} className="fds-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Category Tabs ── */}
          <div style={{ marginBottom: 16 }}>
            <div className="fds-tabs">
              {FDS_CATEGORIES.map(({ key, label, tabClass, dotClass }) => (
                <button
                  key={key}
                  className={`fds-tab ${activeCategory === key ? tabClass : ''}`}
                  onClick={() => setActiveCategory(key)}
                >
                  {dotClass && <span className={dotClass}>●</span>}
                  {label}
                  {stats?.by_class && key !== 'ALL' && (
                    <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                      {stats.by_class[key.toLowerCase()] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="fds-filter-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fds-text-faint)' }} />
              <input
                className="fds-search-input"
                placeholder="Search name, phone, location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="fds-input fds-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 160 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
              <option value="">All Sources</option>
              {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: followUpDue ? 'var(--fds-primary)' : 'var(--fds-text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={followUpDue} onChange={e => setFollowUpDue(e.target.checked)} />
              Follow-up Due
            </label>
            {hasFilters && (
              <button className="fds-btn fds-btn-ghost" onClick={clearFilters} title="Clear all filters">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="fds-table-wrap">
            <table className="fds-table">
              <thead>
                <tr>
                  {[
                    { key: 'enquiry_id', label: 'ID' },
                    { key: 'date', label: 'Date' },
                    { key: 'name', label: 'Name' },
                    { key: 'class_interest', label: 'Class' },
                    { key: 'phone', label: 'Contact' },
                    { key: 'location', label: 'Location' },
                    { key: 'source', label: 'Source' },
                    { key: 'status', label: 'Status' },
                    { key: 'follow_up_1', label: 'Follow Up' },
                    { key: 'actions', label: '' },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => key !== 'actions' && handleSort(key)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        {key !== 'actions' && key !== 'phone' && key !== 'location' && key !== 'source' && (
                          <SortIcon field={key} sortField={sortField} sortDir={sortDir} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>
                    <div className="fds-spinner" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : enquiries.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="fds-empty">
                      <div className="fds-empty-icon"><Users size={40} /></div>
                      <div className="fds-empty-title">No enquiries found</div>
                      <div className="fds-empty-sub">Try adjusting your filters or add a new enquiry</div>
                    </div>
                  </td></tr>
                ) : enquiries.map(e => (
                  <tr key={e.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--fds-primary)' }}>{e.enquiry_id}</span></td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--fds-text-muted)', fontSize: '0.82rem' }}>{e.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      {e.age && <div style={{ fontSize: '0.75rem', color: 'var(--fds-text-muted)' }}>Age {e.age}</div>}
                    </td>
                    <td><CategoryPill cat={e.class_interest} /></td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{e.phone || '—'}</div>
                      {e.whatsapp_no && e.whatsapp_no !== e.phone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)' }}>WA: {e.whatsapp_no}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{e.location || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{e.source_display || e.source}</td>
                    <td><StatusPill status={e.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)' }}>
                      {e.follow_up_1 && <div style={{ color: e.follow_up_1 < new Date().toISOString().split('T')[0] ? '#e74c3c' : 'inherit' }}>{e.follow_up_1}</div>}
                      {e.follow_up_2 && <div style={{ opacity: 0.7 }}>{e.follow_up_2}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {e.has_trial ? (
                          <span className="fds-badge fds-badge-gold" style={{ fontSize: '0.65rem' }}>Has Trial</span>
                        ) : canEdit ? (
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(ev) => { ev.stopPropagation(); navigate('/fds/trials', { state: { enquiry: e } }); }}>
                            + Trial
                          </button>
                        ) : null}
                        {canEdit && (
                          <>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>
                              <Edit2 size={13} />
                            </button>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button className="fds-btn fds-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px' }}>
                ← Prev
              </button>
              <span style={{ color: 'var(--fds-text-muted)', fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
              <button className="fds-btn fds-btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px' }}>
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── Modal ── */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Enquiry' : 'New Enquiry'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Name */}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Name *</label>
                      <input className="fds-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    {/* Date */}
                    <div>
                      <label className="fds-label">Date *</label>
                      <input className="fds-input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    {/* Age */}
                    <div>
                      <label className="fds-label">Age</label>
                      <input className="fds-input" type="number" min={0} max={100} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                    </div>
                    {/* Class Interest */}
                    <div>
                      <label className="fds-label">Class Interest</label>
                      <select className="fds-input fds-select" value={form.class_interest} onChange={e => setForm(f => ({ ...f, class_interest: e.target.value }))}>
                        {['DANCE', 'ZUMBA', 'YOGA', 'MULTIPLE'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {/* Source */}
                    <div>
                      <label className="fds-label">Source</label>
                      <select className="fds-input fds-select" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                        {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    {/* Phone */}
                    <div>
                      <label className="fds-label">Phone</label>
                      <input className="fds-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    {/* WhatsApp */}
                    <div>
                      <label className="fds-label">WhatsApp No.</label>
                      <input className="fds-input" type="tel" value={form.whatsapp_no} onChange={e => setForm(f => ({ ...f, whatsapp_no: e.target.value }))} />
                    </div>
                    {/* Location */}
                    <div>
                      <label className="fds-label">Location</label>
                      <input className="fds-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                    </div>
                    {/* Preferred Timing */}
                    <div>
                      <label className="fds-label">Preferred Timing</label>
                      <input className="fds-input" placeholder="e.g. Evening, 5pm-6pm" value={form.preferred_timing} onChange={e => setForm(f => ({ ...f, preferred_timing: e.target.value }))} />
                    </div>
                    {/* Status */}
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    {/* Follow Up 1 */}
                    <div>
                      <label className="fds-label">Follow Up 1</label>
                      <input className="fds-input" type="date" value={form.follow_up_1} onChange={e => setForm(f => ({ ...f, follow_up_1: e.target.value }))} />
                    </div>
                    {/* Follow Up 2 */}
                    <div>
                      <label className="fds-label">Follow Up 2</label>
                      <input className="fds-input" type="date" value={form.follow_up_2} onChange={e => setForm(f => ({ ...f, follow_up_2: e.target.value }))} />
                    </div>
                    {/* Joined */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label className="fds-label" style={{ marginBottom: 0 }}>Joined?</label>
                      <input type="checkbox" checked={form.joined} onChange={e => setForm(f => ({ ...f, joined: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--fds-primary)' }} />
                    </div>
                    {/* Remarks */}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Remarks / Concerns</label>
                      <textarea className="fds-input" rows={3} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editId ? 'Update' : 'Create Enquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
