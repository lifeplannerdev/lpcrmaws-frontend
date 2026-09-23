import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../Components/layouts/Navbar';
import { Plus, Edit, Trash, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Filter, DollarSign } from 'lucide-react';
import LoadingState from '../Components/common/LoadingState';
import EmptyState from '../Components/common/EmptyState';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import FormField from '../Components/common/FormField';
import Alert from '../Components/common/Alert';
import Button from '../Components/common/Button';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  active:  { label: 'Active',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  paid:    { label: 'Paid',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  overdue: { label: 'Overdue', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  expired: { label: 'Expired', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

const FILTER_OPTIONS = [
  { label: 'All',     value: '' },
  { label: 'Active',  value: 'active' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Expired', value: 'expired' },
  { label: 'Paid',    value: 'paid' },
];

const BLANK_FORM = {
  title: '', document_type: '', description: '', notes: '',
  issue_date: '', expiry_date: '', renewal_interval_days: '', company: 'LP',
};

// ── Sub-components ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CountdownBadge({ daysRemaining, daysRemainingNext, status }) {
  if (status === 'paid' && daysRemainingNext !== null && daysRemainingNext !== undefined) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-blue-600">Paid ✓</span>
        <span className="text-xs text-gray-400">Renewal in {daysRemainingNext}d</span>
      </div>
    );
  }
  if (daysRemaining === null || daysRemaining === undefined) return <span className="text-gray-400 text-sm">—</span>;
  if (daysRemaining < 0) {
    return (
      <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        {Math.abs(daysRemaining)}d overdue
      </span>
    );
  }
  if (daysRemaining === 0) return <span className="text-xs font-bold text-red-600">Expires today!</span>;
  if (daysRemaining <= 30) {
    return (
      <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {daysRemaining}d left
      </span>
    );
  }
  return <span className="text-sm text-gray-600">{daysRemaining}d left</span>;
}

function StatCard({ label, value, color }) {
  const colors = {
    gray:    'bg-gray-50   border-gray-200   text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50  border-amber-200  text-amber-700',
    red:     'bg-red-50    border-red-200    text-red-700',
    blue:    'bg-blue-50   border-blue-200   text-blue-700',
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center justify-center gap-1 ${colors[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function DocumentDetailsPage() {
  const { accessToken, refreshAccessToken } = useAuth();

  const [documents, setDocuments]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal]   = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData]     = useState(BLANK_FORM);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null); // id of row being marked paid

  // ── Auth fetch helper ──
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    let token = accessToken;
    const doFetch = (t) => fetch(url, {
      ...options,
      headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json', ...options.headers },
    });
    let res = await doFetch(token);
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Unable to refresh token');
      res = await doFetch(token);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  }, [accessToken, refreshAccessToken]);

  // ── Fetch documents ──
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      if (statusFilter)  params.set('status',  statusFilter);
      const data = await fetchWithAuth(`${API_BASE_URL}/documents/?${params}`);
      setDocuments(data.results || data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, companyFilter, statusFilter]);

  useEffect(() => {
    if (accessToken) fetchDocuments();
  }, [accessToken, fetchDocuments]);

  // ── Computed stats ──
  const stats = {
    total:   documents.length,
    active:  documents.filter(d => d.status === 'active').length,
    overdue: documents.filter(d => d.status === 'overdue').length,
    expired: documents.filter(d => d.status === 'expired').length,
    paid:    documents.filter(d => d.status === 'paid').length,
  };

  // ── Modal handlers ──
  const handleOpenModal = (doc = null) => {
    setFormError('');
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        title: doc.title || '',
        document_type: doc.document_type || '',
        description: doc.description || '',
        notes: doc.notes || '',
        issue_date: doc.issue_date || '',
        expiry_date: doc.expiry_date || '',
        renewal_interval_days: doc.renewal_interval_days || '',
        company: doc.company || 'LP',
      });
    } else {
      setEditingDoc(null);
      setFormData({ ...BLANK_FORM, company: companyFilter || 'LP' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.renewal_interval_days) delete payload.renewal_interval_days;
      const method = editingDoc ? 'PUT' : 'POST';
      const url    = editingDoc ? `${API_BASE_URL}/documents/${editingDoc.id}/` : `${API_BASE_URL}/documents/`;
      await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
      setShowModal(false);
      fetchDocuments();
    } catch (err) {
      setFormError('Failed to save document. Please check all required fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document record?')) return;
    try {
      await fetchWithAuth(`${API_BASE_URL}/documents/${id}/`, { method: 'DELETE' });
      fetchDocuments();
    } catch {
      alert('Failed to delete document.');
    }
  };

  const handleMarkPaid = async (id) => {
    setMarkingPaid(id);
    try {
      await fetchWithAuth(`${API_BASE_URL}/documents/${id}/mark_paid/`, { method: 'POST' });
      fetchDocuments();
    } catch {
      alert('Failed to mark as paid.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const updateForm = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  // ── Render ──
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Registry</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track company licenses, contracts & their renewal lifecycle.</p>
          </div>
          <div className="flex items-center gap-3">
            <CompanySwitcher currentCompany={companyFilter} onChange={setCompanyFilter} />
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Document
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total"   value={stats.total}   color="gray"    />
          <StatCard label="Active"  value={stats.active}  color="emerald" />
          <StatCard label="Overdue" value={stats.overdue} color="amber"   />
          <StatCard label="Expired" value={stats.expired} color="red"     />
          <StatCard label="Paid"    value={stats.paid}    color="blue"    />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents Found"
            description={statusFilter ? `No ${statusFilter} documents found.` : 'Start by adding your first company document.'}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Document', 'Type', 'Company', 'Status', 'Expiry Date', 'Countdown', 'Next Renewal', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900 text-sm">{doc.title}</div>
                        {doc.description && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{doc.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{doc.document_type}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {doc.company}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">{doc.expiry_date || '—'}</td>
                      <td className="px-5 py-4">
                        <CountdownBadge
                          daysRemaining={doc.days_remaining}
                          daysRemainingNext={doc.days_remaining_next}
                          status={doc.status}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {doc.next_renewal_date
                          ? <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{doc.next_renewal_date}</span>
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* Mark Paid — only for overdue/expired */}
                          {(doc.status === 'overdue' || doc.status === 'expired') && (
                            <button
                              onClick={() => handleMarkPaid(doc.id)}
                              disabled={markingPaid === doc.id}
                              title="Mark as Paid"
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              {markingPaid === doc.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <DollarSign className="w-3 h-3" />}
                              Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(doc)}
                            title="Edit"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingDoc ? 'Edit Document' : 'Add Document'}
                  </h3>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {formError && <Alert type="error" message={formError} />}

                <FormField label="Document Title" type="text" required value={formData.title} onChange={updateForm('title')} placeholder="e.g. Trade License 2024" />
                <FormField label="Document Type" type="text" required value={formData.document_type} onChange={updateForm('document_type')} placeholder="e.g. License, Contract, Permit" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={formData.company}
                    onChange={updateForm('company')}
                  >
                    <option value="LP">LP</option>
                    <option value="FLAG">FLAG</option>
                    <option value="FDS">FDS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Issue Date" type="date" value={formData.issue_date} onChange={updateForm('issue_date')} />
                  <FormField label="Expiry Date" type="date" required value={formData.expiry_date} onChange={updateForm('expiry_date')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Interval (Days) <span className="text-gray-400 font-normal">— optional</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 365 for annual, 180 for 6-month"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={formData.renewal_interval_days}
                    onChange={updateForm('renewal_interval_days')}
                  />
                  {formData.renewal_interval_days && formData.expiry_date && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Next renewal: {new Date(new Date(formData.expiry_date).getTime() + parseInt(formData.renewal_interval_days) * 86400000).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">— optional</span></label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={formData.description} onChange={updateForm('description')} placeholder="Public-facing description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes <span className="text-gray-400 font-normal">— optional</span></label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={formData.notes} onChange={updateForm('notes')} placeholder="Private notes for admins only" />
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : editingDoc ? 'Update Document' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
