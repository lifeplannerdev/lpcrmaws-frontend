import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Download, Upload, X, ChevronUp, ChevronDown, Edit2, Trash2, Star, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES, getStatusBadgeClass, downloadExcelFromResponse } from './fdsApi';
import FdsMasterSyncModal from './FdsMasterSyncModal';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const STATUSES = ['SCHEDULED','COMPLETED','NO_SHOW','CANCELLED'];
const EMPTY_FORM = {
  name: '', date: new Date().toISOString().split('T')[0], time: '', time_text: '',
  age: '', phone: '', location: '', class_category: 'DANCE',
  fee_quoted: '', feedback: '', trainer_rating: '', status: 'SCHEDULED',
  converted: false, converted_text: 'NO', join_date: '', fee_status: 'NOT PAID',
  follow_up_date: '', remarks: '', enquiry: '', conducted_by: '',
};

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const ratingNum = parseInt(value) || 0;
  return (
    <div className="fds-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`fds-star ${n <= (hovered || ratingNum) ? 'filled' : ''}`}
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
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const fileInputRef = useRef();

  const [trials, setTrials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [total, setTotal] = useState(0);

  const [viewTab, setViewTab] = useState('ACTIVE');
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
  const [remarkModal, setRemarkModal] = useState({ open: false, trial: null, text: '' });
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [enquiries, setEnquiries] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.enquiry) {
      const e = location.state.enquiry;
      setForm({
        ...EMPTY_FORM,
        name: e.name || '',
        phone: e.phone || '',
        location: e.location || '',
        class_category: e.class_interest || 'DANCE',
        age: e.age || '',
        enquiry: e.id || '',
        remarks: e.remarks || '',
      });
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  }, [accessToken, refreshAccessToken]);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) throw new Error('Failed');
    if (res.status === 204) return null;
    return res.json();
  }, [authFetch]);

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE };
    if (activeCategory !== 'ALL') p.class_category = activeCategory;
    if (search) p.search = search;
    if (filterStatus) {
      p.status = filterStatus;
    } else {
      if (viewTab === 'ACTIVE') {
        p.converted = 'false';
        p.status__in = 'SCHEDULED';
      } else {
        p.status__in = 'COMPLETED,NO_SHOW,CANCELLED';
      }
    }
    if (filterConverted !== '') p.converted = filterConverted;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (followUpDue) p.follow_up_due = 'true';
    p.ordering = sortDir === 'asc' ? `${sortField},id` : `-${sortField},-id`;
    return p;
  }, [page, activeCategory, search, filterStatus, filterConverted, dateFrom, dateTo, followUpDue, sortField, sortDir, viewTab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData, enqData] = await Promise.all([
        fdsApi.trials(authFetchJson, buildParams()),
        fdsApi.trialStats(authFetchJson),
        fdsApi.enquiries(authFetchJson, { joined: false, page_size: 150 }),
      ]);
      setTrials(data.results ?? data);
      setTotal(data.count ?? (data.results ? data.results.length : data.length));
      setStats(statsData);
      setEnquiries(enqData.results ?? enqData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeCategory, search, filterStatus, filterConverted, dateFrom, dateTo, followUpDue]);

  const handleSyncMaster = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fdsApi.syncMasterSheets(authFetchJson);
      alert(`Master Sync Complete!\nMessage: ${res.message || 'Synced'}\nImported: ${JSON.stringify(res.stats || {})}`);
      load();
    } catch (err) {
      alert('Master Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (t) => {
    setForm({
      name: t.name, date: t.date, time: t.time || '', time_text: t.time_text || '',
      age: t.age || '', phone: t.phone || '', location: t.location || '',
      class_category: t.class_category || 'DANCE',
      fee_quoted: t.fee_quoted || '', feedback: t.feedback || '',
      trainer_rating: t.trainer_rating || '', status: t.status,
      converted: t.converted_text === 'YES' || t.converted,
      converted_text: t.converted_text || (t.converted ? 'YES' : 'NO'),
      join_date: t.join_date || '', fee_status: t.fee_status || 'NOT PAID',
      follow_up_date: t.follow_up_date || '', remarks: t.remarks || '',
      enquiry: t.enquiry || '', conducted_by: t.conducted_by || '',
    });
    setEditId(t.id);
    setShowModal(true);
  };

  const handleQuickRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!remarkModal.trial || !remarkModal.text.trim()) return;
    try {
      const userStr = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'User');
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const newRemarkLine = `[${dateStr}] ${userStr} (Trial): ${remarkModal.text.trim()}`;
      const existingRemarks = remarkModal.trial.remarks || '';
      const updatedRemarks = existingRemarks ? `${existingRemarks}\n\n${newRemarkLine}` : newRemarkLine;
      await fdsApi.updateTrial(authFetchJson, remarkModal.trial.id, { remarks: updatedRemarks });
      setRemarkModal({ open: false, trial: null, text: '' });
      setTrials(prev => prev.map(tr => tr.id === remarkModal.trial.id ? { ...tr, remarks: updatedRemarks } : tr));
    } catch (err) {
      alert('Failed to add remark: ' + err.message);
    }
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        converted: form.converted_text === 'YES' || form.converted,
        enquiry: form.enquiry || null,
        conducted_by: form.conducted_by || null,
        join_date: form.join_date || null,
        follow_up_date: form.follow_up_date || null,
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
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fdsApi.importTrials(authFetch, fd);
      const data = await res.json();
      alert(`Import complete: ${data.created} created, ${data.updated || 0} updated.`);
      load();
    } catch (e) {
      alert('Import failed: ' + e.message);
    } finally {
      ev.target.value = '';
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Trial Master Mirror</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · 1:1 Mirror of Google Sheets (TRIAL) · {total} rows</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button 
                className="fds-btn fds-btn-secondary" 
                onClick={() => setShowSyncModal(true)} 
                style={{ borderColor: 'var(--fds-primary)', color: 'var(--fds-primary)' }}
                title="Sync Google Sheets master workbooks to CRM"
              >
                <RefreshCw size={15} /> 
                Sync Master
              </button>
              {canEdit && (
                <>
                  <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Import Excel</button>
                  <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
                </>
              )}
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}><Download size={15} /> Export Excel</button>
              {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Trial</button>}
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Trials', val: stats.total, color: 'var(--fds-primary)' },
                { label: 'Scheduled', val: stats.scheduled, color: 'var(--fds-primary-light)' },
                { label: 'Completed', val: stats.completed, color: '#27ae60' },
                { label: 'Converted', val: stats.converted, color: 'var(--fds-yoga)' },
                { label: 'Conversion Rate', val: `${stats.conversion_rate}%`, color: 'var(--fds-primary)' },
                { label: 'Follow-up Due', val: stats.follow_up_due, color: '#e67e22' },
              ].map(({ label, val, color }) => (
                <div key={label} className="fds-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, color }}>{val}</div>
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
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                className={`fds-btn ${viewTab === 'ACTIVE' ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                onClick={() => setViewTab('ACTIVE')}
              >Upcoming Trials</button>
              <button
                className={`fds-btn ${viewTab === 'PAST' ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                onClick={() => setViewTab('PAST')}
              >Past Trials</button>
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fds-text-faint)' }} />
              <input className="fds-search-input" placeholder="Search name, phone, location..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="fds-input fds-select" style={{ maxWidth: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 140 }} value={filterConverted} onChange={e => setFilterConverted(e.target.value)}>
              <option value="">All Converted</option>
              <option value="true">Converted ✓</option>
              <option value="false">Not Converted</option>
            </select>
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: followUpDue ? 'var(--fds-primary)' : 'var(--fds-text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={followUpDue} onChange={e => setFollowUpDue(e.target.checked)} /> Follow-up Due
            </label>
          </div>

          {/* Table (1:1 Mirror of TRIAL sheet) */}
          <div className="fds-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="fds-table" style={{ minWidth: 1300 }}>
              <thead>
                <tr>
                  {[
                    { key: 'trial_id', label: 'ID' },
                    { key: 'date', label: 'Date' },
                    { key: 'name', label: 'Candidate Name' },
                    { key: 'time_text', label: 'Time' },
                    { key: 'age', label: 'Age' },
                    { key: 'phone', label: 'Contact No' },
                    { key: 'location', label: 'Location' },
                    { key: 'fee_quoted', label: 'Fee Quoted' },
                    { key: 'feedback', label: 'Feedback' },
                    { key: 'trainer_rating', label: 'Trainer Rating' },
                    { key: 'converted_text', label: 'Converted' },
                    { key: 'join_date', label: 'Join Date' },
                    { key: 'fee_status', label: 'Fee Status' },
                    { key: 'follow_up_date', label: 'Follow Up' },
                    { key: 'remarks', label: 'Remarks' },
                    { key: 'actions', label: '' },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => key !== 'actions' && handleSort(key)} style={{ whiteSpace: 'nowrap' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={16} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : trials.length === 0 ? (
                  <tr><td colSpan={16}><div className="fds-empty"><div className="fds-empty-title">No trials found</div></div></td></tr>
                ) : trials.map(t => (
                  <tr key={t.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--fds-primary)' }}>{t.trial_id}</span></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{t.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      {t.class_category && <span className={`fds-badge fds-badge-${t.class_category?.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{t.class_category}</span>}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{t.time_text || t.time || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{t.age || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {t.phone ? <a href={`tel:${t.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{t.phone}</a> : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{t.location || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--fds-primary)', whiteSpace: 'nowrap' }}>
                      {t.fee_quoted ? `₹${Number(t.fee_quoted).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text)', maxWidth: 150 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.feedback}>
                        {t.feedback || '—'}
                      </div>
                    </td>
                    <td>
                      {t.trainer_rating ? <StarRating value={t.trainer_rating} readOnly /> : <span style={{ color: 'var(--fds-text-faint)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`fds-badge ${t.converted_text === 'YES' || t.converted ? 'fds-badge-green' : 'fds-badge-gray'}`}>
                        {t.converted_text || (t.converted ? 'YES' : 'NO')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>{t.join_date || '—'}</td>
                    <td>
                      <span className={`fds-badge ${t.fee_status === 'PAID' ? 'fds-badge-green' : 'fds-badge-gold'}`}>
                        {t.fee_status || 'NOT PAID'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>{t.follow_up_date || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', maxWidth: 160 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }} title={t.remarks}>
                        {t.remarks ? t.remarks.split('\n\n').pop() : 'No remarks'}
                      </div>
                      <button 
                        className="fds-btn fds-btn-ghost" 
                        style={{ padding: 0, fontSize: '0.7rem', color: 'var(--fds-primary)' }}
                        onClick={(ev) => { ev.stopPropagation(); setRemarkModal({ open: true, trial: t, text: '' }); }}
                      >
                        + Add Remark
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {t.has_student ? (
                          <span className="fds-badge fds-badge-green" style={{ fontSize: '0.65rem' }}>Student</span>
                        ) : null}
                        {!t.has_student && canEdit && (
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#27ae60' }}
                            onClick={(ev) => { ev.stopPropagation(); navigate('/fds/students', { state: { sourceData: t, sourceType: 'trial' } }); }}>
                            + Join
                          </button>
                        )}
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
                <div className="fds-modal-title">{editId ? 'Edit Trial (Mirror)' : 'New Trial'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {!editId && (
                      <div style={{ gridColumn: '1/-1' }}>
                        <label className="fds-label">Select Enquiry (Optional)</label>
                        <select className="fds-input fds-select" value={form.enquiry} onChange={e => {
                          const eq = enquiries.find(x => x.id.toString() === e.target.value);
                          if (eq) {
                            setForm(f => ({
                              ...f,
                              enquiry: eq.id, name: eq.name, phone: eq.phone || '',
                              location: eq.location || '', class_category: eq.class_interest || 'DANCE',
                              age: eq.age || ''
                            }));
                          } else {
                            setForm(f => ({ ...f, enquiry: '' }));
                          }
                        }}>
                          <option value="">-- No Enquiry (Direct Trial) --</option>
                          {enquiries.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.enquiry_id} - {eq.name} ({eq.phone})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Name *</label>
                      <input className="fds-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Date *</label>
                      <input className="fds-input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Time / Slot</label>
                      <input className="fds-input" placeholder="e.g. 5:30PM - 6:30PM or 17:30" value={form.time_text || form.time} onChange={e => setForm(f => ({ ...f, time_text: e.target.value, time: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Age</label>
                      <input className="fds-input" placeholder="e.g. 5yrs, 24" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
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
                      <input className="fds-input" placeholder="e.g. 2500" value={form.fee_quoted} onChange={e => setForm(f => ({ ...f, fee_quoted: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Trainer Rating</label>
                      <StarRating value={form.trainer_rating} onChange={v => setForm(f => ({ ...f, trainer_rating: String(v) }))} />
                    </div>
                    <div>
                      <label className="fds-label">Converted (YES/NO)</label>
                      <select className="fds-input fds-select" value={form.converted_text} onChange={e => setForm(f => ({ ...f, converted_text: e.target.value, converted: e.target.value === 'YES' }))}>
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Fee Status (PAID/NOT PAID)</label>
                      <select className="fds-input fds-select" value={form.fee_status} onChange={e => setForm(f => ({ ...f, fee_status: e.target.value }))}>
                        <option value="NOT PAID">NOT PAID</option>
                        <option value="PAID">PAID</option>
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Join Date</label>
                      <input className="fds-input" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
                    </div>
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

        {/* Quick Remark Modal */}
        {remarkModal.open && (
          <div className="fds-modal-overlay" onClick={() => setRemarkModal({ open: false, trial: null, text: '' })}>
            <div className="fds-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">Add Remark</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setRemarkModal({ open: false, trial: null, text: '' })}><X size={18} /></button>
              </div>
              <form onSubmit={handleQuickRemarkSubmit}>
                <div className="fds-modal-body">
                  {remarkModal.trial?.remarks && (
                    <div style={{ marginBottom: 12, maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', padding: '8px 12px', background: 'var(--fds-surface)', borderRadius: 6, whiteSpace: 'pre-wrap', border: '1px solid var(--fds-border)' }}>
                      {remarkModal.trial.remarks}
                    </div>
                  )}
                  <textarea 
                    autoFocus
                    className="fds-input" 
                    rows={4} 
                    placeholder="Type your remark here..."
                    value={remarkModal.text}
                    onChange={e => setRemarkModal(prev => ({ ...prev, text: e.target.value }))}
                    required
                  />
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setRemarkModal({ open: false, trial: null, text: '' })}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary">Save Remark</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Master Sync Modal */}
        <FdsMasterSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          onSyncComplete={() => load()}
          authFetchJson={authFetchJson}
          authFetch={authFetch}
        />
      </div>
    </div>
  );
}
