import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const fileInputRef = useRef();

  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [viewTab, setViewTab] = useState('ACTIVE');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
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
  const [remarkModal, setRemarkModal] = useState({ open: false, enquiry: null, text: '' });

  // Import Preview Modal
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

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
    if (!res.ok) throw new Error('Failed');
    if (res.status === 204) return null;
    if (res.status === 204) return null;
    return res.json();
  }, [authFetch]);

  const buildParams = useCallback(() => {
    const p = { page, page_size: PAGE_SIZE };
    if (activeCategory !== 'ALL') p.class_interest = activeCategory;
    if (search) p.search = search;
    if (filterStatus) {
      p.status = filterStatus;
    } else {
      p.status__in = viewTab === 'ACTIVE' ? 'NEW,CONTACTED' : 'TRIAL_SCHEDULED,CONVERTED,LOST';
    }
    if (filterSource) p.source = filterSource;
    if (filterLocation) p.location = filterLocation;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo)   p.date_to   = dateTo;
    if (followUpDue) p.follow_up_due = 'true';
    p.ordering = sortDir === 'asc' ? `${sortField},id` : `-${sortField},-id`;
    return p;
  }, [page, activeCategory, search, filterStatus, filterSource, dateFrom, dateTo, followUpDue, sortField, sortDir, viewTab]);

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

  
  const handleQuickRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!remarkModal.enquiry || !remarkModal.text.trim()) return;
    
    try {
      const userStr = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'User');
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const newRemarkLine = `[${dateStr}] ${userStr} (Enquiry): ${remarkModal.text.trim()}`;
      const existingRemarks = remarkModal.enquiry.remarks || '';
      const updatedRemarks = existingRemarks ? `${existingRemarks}\n\n${newRemarkLine}` : newRemarkLine;
      
      await fdsApi.updateEnquiry(authFetchJson, remarkModal.enquiry.id, { remarks: updatedRemarks });
      
      setRemarkModal({ open: false, enquiry: null, text: '' });
      setEnquiries(prev => prev.map(enq => enq.id === remarkModal.enquiry.id ? { ...enq, remarks: updatedRemarks } : enq));
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
    
    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Transform data based on detected format
      const parsedRows = jsonData.map(row => {
        // Detect "Video Leads" format vs standard format
        if (row.full_name || row['full_name.1']) {
          // Video Leads format
          const name = row.full_name || row['full_name.1'] || '';
          let phone = String(row.phone_number || row['phone_number.1'] || '');
          if (phone.startsWith('p:')) phone = phone.substring(2);
          const email = row.email || row['email.1'] || '';
          const sourceRaw = row.source || row['source.1'] || '';
          const source = sourceRaw.toLowerCase().includes('ig') || sourceRaw.toLowerCase().includes('instagram') ? 'INSTAGRAM' : (sourceRaw.toLowerCase().includes('fb') || sourceRaw.toLowerCase().includes('facebook') ? 'FACEBOOK' : 'OTHER');
          
          return {
            name,
            phone,
            whatsapp_no: phone,
            source,
            remarks: email ? `Email: ${email}` : '',
            date: new Date().toISOString().split('T')[0],
            class_interest: 'DANCE',
          };
        } else {
          // Assume standard format
          let dateStr = row.Date || row.date;
          if (typeof dateStr === 'number') {
            dateStr = new Date(Math.round((dateStr - 25569) * 86400 * 1000)).toISOString().split('T')[0];
          } else if (!dateStr) {
            dateStr = new Date().toISOString().split('T')[0];
          } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
          return {
            name: row.Name || row.name || '',
            date: dateStr,
            location: row.Location || row.location || '',
            age: row.Age || row.age || null,
            phone: row.Phone || row.phone || '',
            whatsapp_no: row["What's App no."] || row.whatsapp_no || '',
            preferred_timing: row['Preffered Timing'] || row.preferred_timing || '',
            source: row.Source || row.source || 'WALK_IN',
            remarks: row['Remarks / Concerns'] || row.remarks || '',
            class_interest: row['Class Interest'] || row.class_interest || 'DANCE'
          };
        }
      }).filter(r => r.name);

      setImportRows(parsedRows);
      setShowImportPreview(true);
    } catch (e) {
      alert('Failed to parse Excel file: ' + e.message);
    } finally {
      setImportLoading(false);
      ev.target.value = '';
    }
  };

  const submitImport = async () => {
    setImportLoading(true);
    try {
      const res = await fdsApi.bulkImportEnquiries(authFetchJson, { records: importRows });
      alert(`Import complete: ${res.created} created.`);
      setShowImportPreview(false);
      load();
    } catch (e) {
      alert('Import failed: ' + e.message);
    } finally {
      setImportLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterSource(''); setFilterLocation('');
    setDateFrom(''); setDateTo(''); setFollowUpDue(false);
    setActiveCategory('ALL');
  };
  const hasFilters = search || filterStatus || filterSource || filterLocation || dateFrom || dateTo || followUpDue || activeCategory !== 'ALL';

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
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                className={`fds-btn ${viewTab === 'ACTIVE' ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                onClick={() => setViewTab('ACTIVE')}
              >Active Enquiries</button>
              <button
                className={`fds-btn ${viewTab === 'PAST' ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                onClick={() => setViewTab('PAST')}
              >Past Enquiries</button>
            </div>
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
            {hasPermission('fds:admin') && (
              <input className="fds-input" placeholder="Location..." style={{ maxWidth: 120 }} value={filterLocation} onChange={e => setFilterLocation(e.target.value)} />
            )}
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
                    
                    { key: 'remarks', label: 'Remarks' },
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
                    <td>
                      <select 
                        className={`fds-badge ${getStatusBadgeClass(e.status)}`}
                        style={{ border: 'none', appearance: 'none', cursor: 'pointer', outline: 'none', fontWeight: 600, textAlign: 'center' }}
                        value={e.status || ''}
                        onClick={(ev) => ev.stopPropagation()}
                        onChange={async (ev) => {
                          const newStatus = ev.target.value;
                          try {
                            await fdsApi.updateEnquiry(authFetchJson, e.id, { status: newStatus });
                            setEnquiries(prev => prev.map(enq => enq.id === e.id ? { ...enq, status: newStatus } : enq));
                          } catch (err) { alert('Failed to update status'); }
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s} style={{ color: '#000', background: '#fff' }}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>

                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)', maxWidth: 180 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }} title={e.remarks}>
                        {e.remarks ? e.remarks.split('\n\n').pop() : 'No remarks'}
                      </div>
                      <button 
                        className="fds-btn fds-btn-ghost" 
                        style={{ padding: 0, fontSize: '0.7rem', color: 'var(--fds-primary)' }}
                        onClick={(ev) => { ev.stopPropagation(); setRemarkModal({ open: true, enquiry: e, text: '' }); }}
                      >
                        + Add Remark
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {e.has_student ? (
                          <span className="fds-badge fds-badge-green" style={{ fontSize: '0.65rem' }}>Student</span>
                        ) : e.has_trial ? (
                          <span className="fds-badge fds-badge-gold" style={{ fontSize: '0.65rem' }}>Has Trial</span>
                        ) : canEdit ? (
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(ev) => { ev.stopPropagation(); navigate('/fds/trials', { state: { enquiry: e } }); }}>
                            + Trial
                          </button>
                        ) : null}
                        {!e.has_student && canEdit && (
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#27ae60' }}
                            onClick={(ev) => { ev.stopPropagation(); navigate('/fds/students', { state: { sourceData: e, sourceType: 'enquiry' } }); }}>
                            + Join
                          </button>
                        )}
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


        {/* ── Quick Remark Modal ── */}
        {remarkModal.open && (
          <div className="fds-modal-overlay" onClick={() => setRemarkModal({ open: false, enquiry: null, text: '' })}>
            <div className="fds-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">Add Remark</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setRemarkModal({ open: false, enquiry: null, text: '' })}><X size={18} /></button>
              </div>
              <form onSubmit={handleQuickRemarkSubmit}>
                <div className="fds-modal-body">
                  {remarkModal.enquiry?.remarks && (
                    <div style={{ marginBottom: 12, maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', padding: '8px 12px', background: 'var(--fds-surface)', borderRadius: 6, whiteSpace: 'pre-wrap', border: '1px solid var(--fds-border)' }}>
                      {remarkModal.enquiry.remarks}
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
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setRemarkModal({ open: false, enquiry: null, text: '' })}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary">Save Remark</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showImportPreview && (
          <div className="fds-modal-overlay" onClick={() => !importLoading && setShowImportPreview(false)}>
            <div className="fds-modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">Import Preview</div>
                <button className="fds-btn fds-btn-ghost" disabled={importLoading} onClick={() => setShowImportPreview(false)}><X size={18} /></button>
              </div>
              <div className="fds-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ marginBottom: 16, color: 'var(--fds-text-muted)' }}>Found {importRows.length} valid rows to import.</p>
                <table className="fds-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Class</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.phone}</td>
                        <td>{r.source}</td>
                        <td>{r.class_interest}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.remarks}</td>
                      </tr>
                    ))}
                    {importRows.length > 20 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--fds-text-faint)' }}>... and {importRows.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="fds-modal-footer">
                <button className="fds-btn fds-btn-secondary" disabled={importLoading} onClick={() => setShowImportPreview(false)}>Cancel</button>
                <button className="fds-btn fds-btn-primary" disabled={importLoading} onClick={submitImport}>
                  {importLoading ? 'Importing...' : 'Confirm Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
