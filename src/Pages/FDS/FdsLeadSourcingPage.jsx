import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, School, GraduationCap, Coffee, Users, Home,
  Plus, Search, Download, Upload, RefreshCw, Edit2, Trash2, X,
  Phone, Mail, Globe, MapPin
} from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, LEAD_SOURCING_CATEGORIES, downloadExcelFromResponse } from './fdsApi';
import './fds-theme.css';

const EMPTY_FORM = {
  category: 'COLLEGES',
  name: '',
  location: '',
  phone: '',
  email_website: '',
  extra_info: '',
  notes: '',
};

export default function FdsLeadSourcingPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const fileInputRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState('COLLEGES');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal
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
    if (!res.ok) throw new Error('Request failed');
    if (res.status === 204) return null;
    return res.json();
  }, [authFetch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fdsApi.leadSourcing(authFetchJson, {
        category: activeCategory,
        search: search || undefined,
      });
      setEntries(data.results || data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetchJson, activeCategory, search]);

  useEffect(() => { load(); }, [load]);

  const handleSyncMaster = async () => {
    if (!confirm('Re-mirror data from master Google Sheets / Excel files?')) return;
    setSyncing(true);
    try {
      const res = await fdsApi.syncMasterSheets(authFetchJson);
      alert(res.message || 'Mirrored successfully!');
      load();
    } catch (e) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fds/lead-sourcing/export_excel/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await downloadExcelFromResponse(res, 'FDS_Lead_Sourcing.xlsx');
    } catch {
      alert('Export failed');
    }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fds/lead-sourcing/import_excel/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      alert(`Imported: ${data.created} created, ${data.updated} updated.`);
      load();
    } catch {
      alert('Import failed');
    }
    ev.target.value = '';
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, category: activeCategory });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      category: item.category,
      name: item.name,
      location: item.location || '',
      phone: item.phone || '',
      email_website: item.email_website || '',
      extra_info: item.extra_info || '',
      notes: item.notes || '',
    });
    setEditId(item.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await fdsApi.updateLeadSourcing(authFetchJson, editId, form);
      } else {
        await fdsApi.createLeadSourcing(authFetchJson, form);
      }
      setShowModal(false);
      load();
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this directory entry?')) return;
    try {
      await fdsApi.deleteLeadSourcing(authFetchJson, id);
      load();
    } catch {
      alert('Delete failed');
    }
  };

  const currentCatMeta = LEAD_SOURCING_CATEGORIES.find(c => c.key === activeCategory) || LEAD_SOURCING_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Lead Sourcing Directory</h1>
              <p className="fds-page-subtitle">
                Sheet 3 Mirror · {currentCatMeta.subtitle}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {canEdit && (
                <button
                  className="fds-btn fds-btn-secondary"
                  onClick={handleSyncMaster}
                  disabled={syncing}
                  title="Re-mirror from Master Sheets"
                >
                  <RefreshCw size={15} className={syncing ? 'fds-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Master'}
                </button>
              )}
              {canEdit && (
                <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}>
                  <Upload size={15} /> Import Excel
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}>
                <Download size={15} /> Export Excel
              </button>
              {canEdit && (
                <button className="fds-btn fds-btn-primary" onClick={openAdd}>
                  <Plus size={15} /> New Entry
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ marginBottom: 16 }}>
            <div className="fds-tabs">
              {LEAD_SOURCING_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  className={`fds-tab ${activeCategory === cat.key ? 'active-all' : ''}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="fds-filter-bar">
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className="fds-search-input"
                placeholder={`Search ${currentCatMeta.label.toLowerCase()} by name, location, contact...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="fds-table-wrap">
            <table className="fds-table">
              <thead>
                <tr>
                  <th>{activeCategory === 'SCHOOLS' ? 'School Name' : activeCategory === 'CLUBS' ? 'Club / Org Name' : activeCategory === 'RESIDENTS' ? 'Association / Hub' : activeCategory === 'VILLAS' ? 'Villa Community' : activeCategory === 'BUILDERS' ? 'Builder / Project' : 'Institution Name'}</th>
                  <th>Location / Area</th>
                  <th>Contact Number</th>
                  <th>{activeCategory === 'SCHOOLS' ? 'Board / Type' : activeCategory === 'RESIDENTS' ? 'Contact / Remarks' : 'Email / Website'}</th>
                  {canEdit && <th style={{ width: 80, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="fds-spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="fds-empty">
                        <div className="fds-empty-title">No directory entries found</div>
                        <div className="fds-empty-sub">Add entries manually or import the LEAD SOURCING sheet</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <MapPin size={13} style={{ opacity: 0.5 }} />
                          {item.location || '—'}
                        </div>
                      </td>
                      <td>
                        {item.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <Phone size={13} style={{ opacity: 0.5 }} />
                            <a href={`tel:${item.phone.split('/')[0].trim()}`} style={{ color: 'var(--fds-primary)' }}>
                              {item.phone}
                            </a>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {activeCategory in { SCHOOLS: 1, RESIDENTS: 1 } ? (
                          <span style={{ fontSize: '0.85rem' }}>{item.extra_info || item.email_website || '—'}</span>
                        ) : item.email_website ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            {item.email_website.includes('@') ? (
                              <>
                                <Mail size={13} style={{ opacity: 0.5 }} />
                                <a href={`mailto:${item.email_website}`} style={{ color: 'var(--fds-primary)' }}>
                                  {item.email_website}
                                </a>
                              </>
                            ) : (
                              <>
                                <Globe size={13} style={{ opacity: 0.5 }} />
                                <a
                                  href={item.email_website.startsWith('http') ? item.email_website : `https://${item.email_website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--fds-primary)' }}
                                >
                                  {item.email_website}
                                </a>
                              </>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      {canEdit && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(item)}>
                              <Edit2 size={13} />
                            </button>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={() => handleDelete(item.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Directory Entry' : 'New Directory Entry'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label className="fds-label">Category</label>
                      <select
                        className="fds-input fds-select"
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        required
                      >
                        {LEAD_SOURCING_CATEGORIES.map(cat => (
                          <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="fds-label">Name *</label>
                      <input
                        className="fds-input"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                        placeholder="Institution / School / Club / Hub / Villa Name"
                      />
                    </div>

                    <div>
                      <label className="fds-label">Location / Area</label>
                      <input
                        className="fds-input"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                        placeholder="e.g., Kottayam Town, Devalokam Road"
                      />
                    </div>

                    <div>
                      <label className="fds-label">Contact / Phone Number</label>
                      <input
                        className="fds-input"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="e.g., 0481 2566002 / 9447017448"
                      />
                    </div>

                    <div>
                      <label className="fds-label">
                        {form.category === 'SCHOOLS' ? 'Board / Type' : form.category === 'RESIDENTS' ? 'Contact / Remarks' : 'Email / Website'}
                      </label>
                      <input
                        className="fds-input"
                        value={form.category in { SCHOOLS: 1, RESIDENTS: 1 } ? form.extra_info : form.email_website}
                        onChange={e => {
                          if (form.category in { SCHOOLS: 1, RESIDENTS: 1 }) {
                            setForm({ ...form, extra_info: e.target.value });
                          } else {
                            setForm({ ...form, email_website: e.target.value });
                          }
                        }}
                        placeholder={form.category === 'SCHOOLS' ? 'State Board / CBSE' : 'Email address or website URL'}
                      />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Entry'}
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
