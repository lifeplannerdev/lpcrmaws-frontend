import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Users, Music, Clock } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES } from './fdsApi';
import './fds-theme.css';

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAY_LABELS = { MON:'Mon', TUE:'Tue', WED:'Wed', THU:'Thu', FRI:'Fri', SAT:'Sat', SUN:'Sun' };
const BATCH_TYPES = ['REGULAR','WEDDING_BASIC','WEDDING_COUPLE','WEDDING_PREMIUM','WEDDING_GROUP'];
const STATUSES = ['ACTIVE','PAUSED','COMPLETED'];
const EMPTY_FORM = {
  name: '', batch_type: 'REGULAR', class_category: 'DANCE',
  schedule_days: '', time_slot_start: '', time_slot_end: '',
  trainer: '', max_capacity: 20, status: 'ACTIVE', notes: '',
};

export default function FdsBatchManagementPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin');

  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedDays, setSelectedDays] = useState([]);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error('Failed');
    if (res.status === 204) return null;
    return res.json();
  }, [accessToken, refreshAccessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory !== 'ALL') params.class_category = activeCategory;
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      const [batchData, trainerData] = await Promise.all([
        fdsApi.batches(authFetchJson, params),
        fdsApi.trainers(authFetchJson),
      ]);
      setBatches(batchData.results ?? batchData);
      setTrainers(trainerData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, activeCategory, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (day) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, class_category: activeCategory !== 'ALL' ? activeCategory : 'DANCE' });
    setSelectedDays([]);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (b) => {
    setForm({
      name: b.name, batch_type: b.batch_type, class_category: b.class_category,
      schedule_days: b.schedule_days || '', time_slot_start: b.time_slot_start || '',
      time_slot_end: b.time_slot_end || '', trainer: b.trainer || '',
      max_capacity: b.max_capacity, status: b.status, notes: b.notes || '',
    });
    setSelectedDays(b.schedule_days ? b.schedule_days.split(',').map(d => d.trim()) : []);
    setEditId(b.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, schedule_days: selectedDays.join(','), trainer: form.trainer || null };
      if (editId) await fdsApi.updateBatch(authFetchJson, editId, payload);
      else await fdsApi.createBatch(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this batch?')) return;
    try { await fdsApi.deleteBatch(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  const catColor = (cat) => ({ DANCE: 'var(--fds-dance)', ZUMBA: 'var(--fds-zumba)', YOGA: 'var(--fds-yoga)' }[cat] || 'var(--fds-primary)');

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Batch Management</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · {batches.length} batches</p>
            </div>
            {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Batch</button>}
          </div>

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
            <input className="fds-search-input" placeholder="Search batch name..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            <select className="fds-input fds-select" style={{ maxWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Batch Grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="fds-spinner" /></div>
          ) : batches.length === 0 ? (
            <div className="fds-empty">
              <div className="fds-empty-icon"><Music size={40} /></div>
              <div className="fds-empty-title">No batches found</div>
              {canEdit && <button className="fds-btn fds-btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={14} /> Create First Batch</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {batches.map(b => (
                <div key={b.id} className="fds-card" style={{
                  borderTop: `3px solid ${catColor(b.class_category)}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--fds-text)', fontSize: '0.95rem' }}>{b.name}</div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`fds-badge fds-badge-${b.class_category?.toLowerCase()}`}>{b.class_category}</span>
                        {b.batch_type !== 'REGULAR' && <span className="fds-badge fds-badge-gold">{b.batch_type?.replace('WEDDING_', '').replace('_', ' ')}</span>}
                        <span className={`fds-badge ${b.status === 'ACTIVE' ? 'fds-badge-green' : b.status === 'PAUSED' ? 'fds-badge-amber' : 'fds-badge-gray'}`}>{b.status}</span>
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEdit(b)}><Edit2 size={13} /></button>
                        <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 6px', color: '#e74c3c' }} onClick={() => handleDelete(b.id)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Time & Days */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Clock size={13} color="var(--fds-text-muted)" />
                    <span style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{b.time_display || 'Time TBD'}</span>
                  </div>

                  {b.schedule_days && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                      {DAYS.map(d => (
                        <span key={d} style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', fontWeight: 700,
                          background: b.schedule_days?.includes(d) ? catColor(b.class_category) : 'var(--fds-surface-2)',
                          color: b.schedule_days?.includes(d) ? '#1C1410' : 'var(--fds-text-faint)',
                          border: `1px solid ${b.schedule_days?.includes(d) ? catColor(b.class_category) : 'var(--fds-border)'}`,
                        }}>
                          {DAY_LABELS[d][0]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Trainer & Capacity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={13} color="var(--fds-text-muted)" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--fds-text-muted)' }}>
                        {b.enrolled_count} / {b.max_capacity}
                      </span>
                      {b.enrolled_count >= b.max_capacity && <span className="fds-badge fds-badge-red" style={{ fontSize: '0.65rem' }}>Full</span>}
                    </div>
                    {b.trainer_name && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--fds-primary)' }}>🎬 {b.trainer_name}</span>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div style={{ marginTop: 10, height: 4, background: 'var(--fds-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round(b.enrolled_count / b.max_capacity * 100))}%`,
                      background: catColor(b.class_category),
                      borderRadius: 2, transition: 'width 0.5s',
                    }} />
                  </div>

                  {b.notes && (
                    <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--fds-text-muted)', borderTop: '1px solid var(--fds-border)', paddingTop: 8 }}>
                      {b.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Batch' : 'New Batch'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Batch Name *</label>
                      <input className="fds-input" required placeholder="e.g., Mon/Wed/Fri 5pm-6pm Dance" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Class Category</label>
                      <select className="fds-input fds-select" value={form.class_category} onChange={e => setForm(f => ({ ...f, class_category: e.target.value }))}>
                        {['DANCE','ZUMBA','YOGA'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Batch Type</label>
                      <select className="fds-input fds-select" value={form.batch_type} onChange={e => setForm(f => ({ ...f, batch_type: e.target.value }))}>
                        {BATCH_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    {/* Schedule Days */}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Schedule Days</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {DAYS.map(d => (
                          <button
                            key={d} type="button"
                            onClick={() => toggleDay(d)}
                            style={{
                              width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.72rem',
                              background: selectedDays.includes(d) ? catColor(form.class_category) : 'var(--fds-surface-2)',
                              color: selectedDays.includes(d) ? '#1C1410' : 'var(--fds-text-muted)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {DAY_LABELS[d][0]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="fds-label">Start Time</label>
                      <input className="fds-input" type="time" value={form.time_slot_start} onChange={e => setForm(f => ({ ...f, time_slot_start: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">End Time</label>
                      <input className="fds-input" type="time" value={form.time_slot_end} onChange={e => setForm(f => ({ ...f, time_slot_end: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Trainer</label>
                      <select className="fds-input fds-select" value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))}>
                        <option value="">Select Trainer</option>
                        {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Max Capacity</label>
                      <input className="fds-input" type="number" min={1} max={100} value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: parseInt(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Notes</label>
                      <textarea className="fds-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create Batch'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
