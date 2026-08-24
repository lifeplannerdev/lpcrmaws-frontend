import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Sparkles, Users, CheckCircle } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, getStatusBadgeClass } from './fdsApi';
import './fds-theme.css';

const PACKAGES = [
  { key: 'BASIC',        label: 'Basic',        desc: '2hr × 5 classes, max 8 people' },
  { key: 'COUPLE',       label: 'Couple',       desc: '1hr × 6 classes' },
  { key: 'PREMIUM',      label: 'Premium',      desc: '2hr × 10 classes, up to 20 people' },
  { key: 'FAMILY_GROUP', label: 'Family/Group', desc: '2hr × 12 classes, up to 30 people' },
];
const STATUSES = ['ENQUIRY','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'];
const EMPTY_FORM = {
  event_name: '', event_date: '', package_type: 'BASIC',
  batch: '', lead_contact_name: '', lead_contact_phone: '',
  total_members: 1, total_classes_booked: 5, classes_completed: 0,
  fee_amount: '', amount_paid: '', status: 'ENQUIRY',
  trainer: '', notes: '',
};

const PKG_COLORS = { BASIC: 'var(--fds-dance)', COUPLE: 'var(--fds-zumba)', PREMIUM: 'var(--fds-primary)', FAMILY_GROUP: 'var(--fds-yoga)' };

export default function FdsWeddingGroupsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');

  const [groups, setGroups] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPkg, setFilterPkg] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      if (filterStatus) params.status = filterStatus;
      if (filterPkg) params.package_type = filterPkg;
      if (search) params.search = search;
      const [gData, bData, tData] = await Promise.all([
        fdsApi.weddingGroups(authFetchJson, params),
        fdsApi.batches(authFetchJson, { status: 'ACTIVE', page_size: 200 }),
        fdsApi.trainers(authFetchJson),
      ]);
      setGroups(gData.results ?? gData);
      setBatches(bData.results ?? bData);
      setTrainers(tData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, filterStatus, filterPkg, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (g) => {
    setForm({
      event_name: g.event_name, event_date: g.event_date || '',
      package_type: g.package_type, batch: g.batch || '',
      lead_contact_name: g.lead_contact_name, lead_contact_phone: g.lead_contact_phone,
      total_members: g.total_members, total_classes_booked: g.total_classes_booked,
      classes_completed: g.classes_completed, fee_amount: g.fee_amount,
      amount_paid: g.amount_paid, status: g.status,
      trainer: g.trainer || '', notes: g.notes || '',
    });
    setEditId(g.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_members: parseInt(form.total_members),
        total_classes_booked: parseInt(form.total_classes_booked),
        classes_completed: parseInt(form.classes_completed),
        fee_amount: parseFloat(form.fee_amount),
        amount_paid: parseFloat(form.amount_paid),
        batch: form.batch || null,
        trainer: form.trainer || null,
      };
      if (editId) await fdsApi.updateWeddingGroup(authFetchJson, editId, payload);
      else await fdsApi.createWeddingGroup(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this wedding group?')) return;
    try { await fdsApi.deleteWeddingGroup(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Wedding Groups</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · {groups.length} groups</p>
            </div>
            {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Wedding Group</button>}
          </div>

          {/* Package Legend */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {PACKAGES.map(({ key, label, desc }) => (
              <div key={key} style={{
                padding: '8px 14px', borderRadius: 8,
                background: filterPkg === key ? `${PKG_COLORS[key]}22` : 'var(--fds-surface)',
                border: `1px solid ${filterPkg === key ? PKG_COLORS[key] : 'var(--fds-border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }} onClick={() => setFilterPkg(filterPkg === key ? '' : key)}>
                <div style={{ fontWeight: 700, color: PKG_COLORS[key], fontSize: '0.85rem' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fds-text-muted)' }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="fds-filter-bar" style={{ marginBottom: 20 }}>
            <input className="fds-search-input" placeholder="Search event name, contact..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            <select className="fds-input fds-select" style={{ maxWidth: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="fds-spinner" /></div>
          ) : groups.length === 0 ? (
            <div className="fds-empty">
              <div className="fds-empty-icon"><Sparkles size={40} /></div>
              <div className="fds-empty-title">No wedding groups yet</div>
              {canEdit && <button className="fds-btn fds-btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>+ Add First Group</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {groups.map(g => {
                const balance = parseFloat(g.balance || 0);
                const pct = g.total_classes_booked > 0
                  ? Math.round(g.classes_completed / g.total_classes_booked * 100) : 0;
                const pkgColor = PKG_COLORS[g.package_type] || 'var(--fds-primary)';
                return (
                  <div key={g.id} className="fds-card" style={{ borderTop: `3px solid ${pkgColor}` }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--fds-text)', fontSize: '1rem' }}>{g.event_name}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--fds-primary)' }}>{g.group_id}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: `${pkgColor}22`, color: pkgColor }}>
                            {g.package_type_display || g.package_type.replace('_',' ')}
                          </span>
                          <span className={`fds-badge ${getStatusBadgeClass(g.status)}`}>{g.status_display || g.status}</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEdit(g)}><Edit2 size={13} /></button>
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 6px', color: '#e74c3c' }} onClick={() => handleDelete(g.id)}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>

                    {/* Event Date */}
                    {g.event_date && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', marginBottom: 10 }}>
                        📅 Event: {g.event_date}
                      </div>
                    )}

                    {/* Contact */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', marginBottom: 12 }}>
                      👤 {g.lead_contact_name} · 📞 {g.lead_contact_phone}
                    </div>

                    <hr className="fds-divider" />

                    {/* Classes Progress */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)' }}>Classes Progress</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--fds-text)' }}>
                          {g.classes_completed}/{g.total_classes_booked}
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--fds-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pkgColor, borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                    </div>

                    {/* Members */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Users size={13} color="var(--fds-text-muted)" />
                      <span style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{g.total_members} members</span>
                      {g.trainer_name && <span style={{ fontSize: '0.82rem', color: 'var(--fds-primary)', marginLeft: 8 }}>🎬 {g.trainer_name}</span>}
                    </div>

                    {/* Fees */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Total', val: `₹${Number(g.fee_amount || 0).toLocaleString('en-IN')}`, color: 'var(--fds-primary)' },
                        { label: 'Paid', val: `₹${Number(g.amount_paid || 0).toLocaleString('en-IN')}`, color: 'var(--fds-yoga)' },
                        { label: 'Balance', val: `₹${Math.abs(balance).toLocaleString('en-IN')}`, color: balance > 0 ? '#e74c3c' : 'var(--fds-yoga)' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign: 'center', padding: '8px', background: 'var(--fds-surface-2)', borderRadius: 8 }}>
                          <div style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>{val}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--fds-text-muted)', textTransform: 'uppercase' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {g.notes && (
                      <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--fds-text-muted)', borderTop: '1px solid var(--fds-border)', paddingTop: 8 }}>
                        {g.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal fds-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Wedding Group' : 'New Wedding Group'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  {/* Package Selector */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="fds-label">Package Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {PACKAGES.map(({ key, label, desc }) => (
                        <button key={key} type="button"
                          onClick={() => setForm(f => ({ ...f, package_type: key }))}
                          style={{
                            padding: '12px', borderRadius: 8, border: `2px solid ${form.package_type === key ? PKG_COLORS[key] : 'var(--fds-border)'}`,
                            background: form.package_type === key ? `${PKG_COLORS[key]}22` : 'var(--fds-surface-2)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                          }}>
                          <div style={{ fontWeight: 700, color: PKG_COLORS[key], fontSize: '0.875rem' }}>{label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)', marginTop: 2 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Event Name *</label>
                      <input className="fds-input" required placeholder="e.g., Riya & Arun Wedding" value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Event Date</label>
                      <input className="fds-input" type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Lead Contact Name *</label>
                      <input className="fds-input" required value={form.lead_contact_name} onChange={e => setForm(f => ({ ...f, lead_contact_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Lead Contact Phone *</label>
                      <input className="fds-input" type="tel" required value={form.lead_contact_phone} onChange={e => setForm(f => ({ ...f, lead_contact_phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Total Members</label>
                      <input className="fds-input" type="number" min={1} value={form.total_members} onChange={e => setForm(f => ({ ...f, total_members: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Classes Booked</label>
                      <input className="fds-input" type="number" min={0} value={form.total_classes_booked} onChange={e => setForm(f => ({ ...f, total_classes_booked: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Classes Completed</label>
                      <input className="fds-input" type="number" min={0} value={form.classes_completed} onChange={e => setForm(f => ({ ...f, classes_completed: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Batch</label>
                      <select className="fds-input fds-select" value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}>
                        <option value="">No Batch</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Trainer</label>
                      <select className="fds-input fds-select" value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))}>
                        <option value="">Select Trainer</option>
                        {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Package Fee (₹)</label>
                      <input className="fds-input" type="number" step="0.01" value={form.fee_amount} onChange={e => setForm(f => ({ ...f, fee_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Amount Paid (₹)</label>
                      <input className="fds-input" type="number" step="0.01" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} />
                    </div>
                    {form.fee_amount && form.amount_paid && (
                      <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'var(--fds-surface-2)', borderRadius: 8, border: '1px solid var(--fds-border)' }}>
                        Balance: <strong style={{ color: parseFloat(form.fee_amount) > parseFloat(form.amount_paid) ? '#e74c3c' : 'var(--fds-yoga)' }}>
                          ₹{(parseFloat(form.fee_amount || 0) - parseFloat(form.amount_paid || 0)).toFixed(2)}
                        </strong>
                      </div>
                    )}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Notes</label>
                      <textarea className="fds-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create Group'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
