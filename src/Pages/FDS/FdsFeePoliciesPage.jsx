import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Download, Upload, X, Edit2, Trash2, RefreshCw } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, downloadExcelFromResponse } from './fdsApi';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const FEE_CATEGORIES = [
  { value: 'MONTHLY', label: 'Monthly Fee' },
  { value: 'PACKAGE_3M', label: 'Package 3 Months' },
  { value: 'PACKAGE_6M', label: 'Package 6 Months' },
  { value: 'ADMISSION', label: 'Admission / Registration Fee' },
  { value: 'TRIAL', label: 'Trial Fee' },
  { value: 'WEDDING_BASIC', label: 'Wedding - Basic' },
  { value: 'WEDDING_COUPLE', label: 'Wedding - Couple' },
  { value: 'WEDDING_PREMIUM', label: 'Wedding - Premium' },
  { value: 'WEDDING_GROUP', label: 'Wedding - Family/Group' },
  { value: 'CUSTOM', label: 'Custom' },
];

const EMPTY_FORM = {
  category: 'MONTHLY',
  category_name: '',
  details: '',
  amount: '',
  amount_text: '',
  notes: '',
  is_active: true,
};

export default function FdsFeePoliciesPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const fileInputRef = useRef(null);

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  }, [accessToken, refreshAccessToken]);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Request failed');
    }
    if (res.status === 204) return null;
    return res.json();
  }, [authFetch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fdsApi.feeStructures(authFetchJson);
      setPolicies(data.results || data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetchJson]);

  useEffect(() => { load(); }, [load]);

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

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({
      category: p.category,
      category_name: p.category_name || '',
      details: p.details || '',
      amount: p.amount || '',
      amount_text: p.amount_text || '',
      notes: p.notes || '',
      is_active: p.is_active ?? true,
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
      };
      if (editId) {
        await fdsApi.updateFeeStructure(authFetchJson, editId, payload);
      } else {
        await fdsApi.createFeeStructure(authFetchJson, payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee policy?')) return;
    try {
      await fdsApi.deleteFeeStructure(authFetchJson, id);
      load();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/fee-structures/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Fee_Structure.xlsx');
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fdsApi.importFeeStructures(authFetch, formData);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Import failed');
      }
      const data = await res.json();
      alert(`Import complete: \nCreated: ${data.created}\nUpdated: ${data.updated}\nSkipped: ${data.skipped}`);
      load();
    } catch (e) {
      alert('Import failed: ' + e.message);
    } finally {
      setImporting(false);
      ev.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Fee Structure (Mirror)</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · 1:1 Mirror of Google Sheets (FEES STRUCTURE) · {policies.length} packages</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button 
                className="fds-btn fds-btn-secondary" 
                onClick={handleSyncMaster} 
                disabled={syncing}
                style={{ borderColor: 'var(--fds-primary)', color: 'var(--fds-primary)' }}
                title="Pull live changes from Google Sheets master"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} /> 
                {syncing ? 'Syncing...' : 'Sync Master'}
              </button>
              {canEdit && (
                <>
                  <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()} disabled={importing}>
                    <Upload size={15} /> {importing ? 'Importing...' : 'Import Excel'}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
                  
                  <button className="fds-btn fds-btn-secondary" onClick={handleExport}>
                    <Download size={15} /> Export Excel
                  </button>
                  
                  <button className="fds-btn fds-btn-primary" onClick={openAdd}>
                    <Plus size={15} /> New Policy
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="fds-table-container">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--fds-text-muted)' }}>Loading policies...</div>
            ) : policies.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--fds-text-muted)' }}>
                <p>No fee policies found.</p>
                {canEdit && <p style={{ marginTop: 10, fontSize: '0.9rem' }}>Sync from Google Sheets or import the Excel sheet.</p>}
              </div>
            ) : (
              <table className="fds-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>SL NO</th>
                    <th>FEES STRUCTURE</th>
                    <th>DETAILS</th>
                    <th>FEES (AMOUNT)</th>
                    <th>OFFERS / NOTES</th>
                    <th>STATUS</th>
                    {canEdit && <th style={{ width: 80, textAlign: 'right' }}>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.category_name || p.category_display || p.category}</td>
                      <td style={{ fontSize: '0.85rem' }}>{p.details || '-'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--fds-primary)', whiteSpace: 'pre-line' }}>
                        {p.amount_text ? p.amount_text : `₹${parseFloat(p.amount || 0).toLocaleString()}`}
                      </td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{p.notes || '-'}</td>
                      <td>
                        <span className={`fds-badge ${p.is_active ? 'fds-badge-yoga' : 'fds-badge-contacted'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}>
                              <Edit2 size={13} />
                            </button>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={() => handleDelete(p.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Fee Policy (Mirror)' : 'New Fee Policy'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="fds-label">Category Code *</label>
                      <select className="fds-input fds-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                        {FEE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="fds-label">Package Name (Sheet Title)</label>
                      <input className="fds-input" placeholder="e.g. REGULAR BATCH, WEDDING DANCE" value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))} />
                    </div>

                    <div>
                      <label className="fds-label">Details</label>
                      <input className="fds-input" placeholder="e.g. DANCE / FITNESS / YOGA" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
                    </div>

                    <div>
                      <label className="fds-label">Amount (₹ Numeric) *</label>
                      <input className="fds-input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                    </div>

                    <div>
                      <label className="fds-label">Amount Display Text (Optional)</label>
                      <input className="fds-input" placeholder="e.g. 12,000 / 8,000 or 2,500/-" value={form.amount_text} onChange={e => setForm(f => ({ ...f, amount_text: e.target.value }))} />
                    </div>

                    <div>
                      <label className="fds-label">Offers / Notes</label>
                      <textarea className="fds-input" rows={3} placeholder="Special conditions, free t-shirt notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                        <span style={{ fontSize: '0.85rem' }}>Active Package</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editId ? 'Update Policy' : 'Create Policy'}
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
