import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Download, Edit2, Trash2, IndianRupee, ChevronDown } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES, getStatusBadgeClass, downloadExcelFromResponse } from './fdsApi';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MODES = ['CASH','UPI','BANK_TRANSFER','CARD','OTHER'];
const PAY_STATUSES = ['PAID','PARTIAL','PENDING','OVERDUE'];

const EMPTY_FORM = {
  student: '', wedding_group: '', pay_date: new Date().toISOString().split('T')[0],
  fees_type: '', fee_month: '', fee_year: new Date().getFullYear(),
  paid_amount: '', total_fees: '', mode_of_pay: 'CASH',
  pdf_link: '', status: 'PAID', remarks: '',
};

export default function FdsFeesPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin');
  const canView = hasPermission('fds:admin') || hasPermission('fds:view') || hasPermission('fds_fees:view');

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [feeStructures, setFeeStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [weddingGroups, setWeddingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [sortField, setSortField] = useState('pay_date');
  const [sortDir, setSortDir] = useState('desc');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState('student'); // 'student' | 'wedding'

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
    if (search) p.search = search;
    if (filterStatus) p.status = filterStatus;
    if (filterMode) p.mode_of_pay = filterMode;
    if (filterMonth) p.fee_month = filterMonth;
    if (filterYear) p.fee_year = filterYear;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (activeCategory !== 'ALL') p.class_category = activeCategory;
    p.ordering = sortDir === 'asc' ? sortField : `-${sortField}`;
    return p;
  }, [page, search, filterStatus, filterMode, filterMonth, filterYear, dateFrom, dateTo, activeCategory, sortField, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payData, sumData, fsData, stuData, wedData] = await Promise.all([
        fdsApi.payments(authFetchJson, buildParams()),
        fdsApi.paymentSummary(authFetchJson, buildParams()),
        fdsApi.feeStructures(authFetchJson, { is_active: true }),
        fdsApi.students(authFetchJson, { is_active: true, page_size: 500 }),
        fdsApi.weddingGroups(authFetchJson, { status: 'CONFIRMED', page_size: 200 }),
      ]);
      setPayments(payData.results ?? payData);
      setTotal(payData.count ?? (payData.results ? payData.results.length : payData.length));
      setSummary(sumData);
      setFeeStructures(fsData.results ?? fsData);
      setStudents(stuData.results ?? stuData);
      setWeddingGroups(wedData.results ?? wedData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { if (canView) load(); }, [load, canView]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterMode, filterMonth, filterYear, dateFrom, dateTo, activeCategory]);

  if (!canView) return (
    <div className="min-h-screen bg-slate-50"><Navbar /><div className="fds-theme"><div className="fds-page"><div className="fds-empty"><div className="fds-empty-title">Access Denied</div></div></div></div></div>
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setPaymentTarget('student');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({
      student: p.student || '', wedding_group: p.wedding_group || '',
      pay_date: p.pay_date, fees_type: p.fees_type || '',
      fee_month: p.fee_month || '', fee_year: p.fee_year || new Date().getFullYear(),
      paid_amount: p.paid_amount, total_fees: p.total_fees,
      mode_of_pay: p.mode_of_pay, pdf_link: p.pdf_link || '',
      status: p.status, remarks: p.remarks || '',
    });
    setPaymentTarget(p.student ? 'student' : 'wedding');
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        student: paymentTarget === 'student' ? (form.student || null) : null,
        wedding_group: paymentTarget === 'wedding' ? (form.wedding_group || null) : null,
        paid_amount: parseFloat(form.paid_amount),
        total_fees: parseFloat(form.total_fees),
        fee_month: form.fee_month ? parseInt(form.fee_month) : null,
        fee_year: form.fee_year ? parseInt(form.fee_year) : null,
        fees_type: form.fees_type || null,
      };
      if (editId) await fdsApi.updatePayment(authFetchJson, editId, payload);
      else await fdsApi.createPayment(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try { await fdsApi.deletePayment(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/payments/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Fees_Collection.xlsx');
    } catch { alert('Export failed'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Fees & Payments</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · {total} records</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}><Download size={15} /> Export Excel</button>
              {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Payment</button>}
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="fds-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', color: 'var(--fds-yoga)', fontWeight: 700 }}>
                  ₹{Number(summary.total_collected || 0).toLocaleString('en-IN')}
                </div>
                <div className="fds-stat-label">Total Collected</div>
              </div>
              <div className="fds-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', color: 'var(--fds-primary)', fontWeight: 700 }}>
                  ₹{Number(summary.total_billed || 0).toLocaleString('en-IN')}
                </div>
                <div className="fds-stat-label">Total Billed</div>
              </div>
              <div className="fds-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.7rem', color: '#e74c3c', fontWeight: 700 }}>
                  ₹{Number(summary.total_balance || 0).toLocaleString('en-IN')}
                </div>
                <div className="fds-stat-label">Outstanding Balance</div>
              </div>
              {/* By mode */}
              {summary.by_mode && Object.entries(summary.by_mode).filter(([,v]) => v > 0).map(([mode, amt]) => (
                <div key={mode} className="fds-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', color: 'var(--fds-text)', fontWeight: 700 }}>
                    ₹{Number(amt).toLocaleString('en-IN')}
                  </div>
                  <div className="fds-stat-label">{mode.replace('_',' ')}</div>
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

          {/* Filters */}
          <div className="fds-filter-bar">
            <input className="fds-search-input" placeholder="Search student, ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            <select className="fds-input fds-select" style={{ maxWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {PAY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 140 }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
              <option value="">All Modes</option>
              {MODES.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 130 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {/* Table */}
          <div className="fds-table-wrap">
            <table className="fds-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Pay Date</th>
                  <th>Student / Group</th>
                  <th>Class</th>
                  <th>Fees Type</th>
                  <th>Month</th>
                  <th>Paid</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={12}><div className="fds-empty"><div className="fds-empty-title">No payment records found</div></div></td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--fds-primary)' }}>{p.payment_id}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>{p.pay_date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.student_name || p.wedding_group_name || '—'}</div>
                      {p.student_id_code && <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)' }}>{p.student_id_code}</div>}
                    </td>
                    <td>
                      {p.student_name && students.find(s => s.name === p.student_name)?.class_category
                        ? <span className={`fds-badge fds-badge-${students.find(s => s.name === p.student_name)?.class_category?.toLowerCase()}`}>{students.find(s => s.name === p.student_name)?.class_category}</span>
                        : p.wedding_group_name ? <span className="fds-badge fds-badge-gold">Wedding</span> : '—'
                      }
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{p.fees_type_detail?.category_display || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)' }}>{p.fee_month_display || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--fds-yoga)' }}>₹{Number(p.paid_amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>₹{Number(p.total_fees || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600, color: Number(p.balance) > 0 ? '#e74c3c' : 'var(--fds-yoga)' }}>
                      {Number(p.balance) > 0 ? `₹${Number(p.balance).toLocaleString('en-IN')}` : '✓'}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{p.mode_of_pay_display || p.mode_of_pay}</td>
                    <td><span className={`fds-badge ${getStatusBadgeClass(p.status)}`}>{p.status}</span></td>
                    <td>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                          <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <button className="fds-btn fds-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ alignSelf: 'center', color: 'var(--fds-text-muted)', fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
              <button className="fds-btn fds-btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Payment' : 'New Payment'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Payment Target */}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Payment For</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {['student','wedding'].map(t => (
                          <button key={t} type="button"
                            className={`fds-btn ${paymentTarget === t ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                            onClick={() => setPaymentTarget(t)}>
                            {t === 'student' ? '👤 Student' : '💍 Wedding Group'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {paymentTarget === 'student' ? (
                      <div style={{ gridColumn: '1/-1' }}>
                        <label className="fds-label">Student *</label>
                        <select className="fds-input fds-select" required={paymentTarget === 'student'} value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}>
                          <option value="">Select Student</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
                        </select>
                      </div>
                    ) : (
                      <div style={{ gridColumn: '1/-1' }}>
                        <label className="fds-label">Wedding Group *</label>
                        <select className="fds-input fds-select" required={paymentTarget === 'wedding'} value={form.wedding_group} onChange={e => setForm(f => ({ ...f, wedding_group: e.target.value }))}>
                          <option value="">Select Wedding Group</option>
                          {weddingGroups.map(g => <option key={g.id} value={g.id}>{g.event_name} ({g.group_id})</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="fds-label">Pay Date *</label>
                      <input className="fds-input" type="date" required value={form.pay_date} onChange={e => setForm(f => ({ ...f, pay_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Fees Type *</label>
                      <select className="fds-input fds-select" required value={form.fees_type} onChange={e => setForm(f => ({ ...f, fees_type: e.target.value }))}>
                        <option value="">Select Fee Type</option>
                        {feeStructures.map(fs => <option key={fs.id} value={fs.id}>{fs.category_display} — ₹{fs.amount}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Fee Month</label>
                      <select className="fds-input fds-select" value={form.fee_month} onChange={e => setForm(f => ({ ...f, fee_month: e.target.value }))}>
                        <option value="">N/A</option>
                        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Fee Year</label>
                      <input className="fds-input" type="number" min={2020} max={2100} value={form.fee_year} onChange={e => setForm(f => ({ ...f, fee_year: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Paid Amount (₹) *</label>
                      <input className="fds-input" type="number" step="0.01" required value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Total Fees (₹) *</label>
                      <input className="fds-input" type="number" step="0.01" required value={form.total_fees} onChange={e => setForm(f => ({ ...f, total_fees: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Mode of Payment</label>
                      <select className="fds-input fds-select" value={form.mode_of_pay} onChange={e => setForm(f => ({ ...f, mode_of_pay: e.target.value }))}>
                        {MODES.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Status</label>
                      <select className="fds-input fds-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {PAY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">PDF Link / Receipt URL</label>
                      <input className="fds-input" type="url" placeholder="https://..." value={form.pdf_link} onChange={e => setForm(f => ({ ...f, pdf_link: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Remarks</label>
                      <textarea className="fds-input" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
                    {form.paid_amount && form.total_fees && (
                      <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: parseFloat(form.total_fees) > parseFloat(form.paid_amount) ? 'rgba(192,57,43,0.1)' : 'rgba(39,174,96,0.1)', borderRadius: 8, border: `1px solid ${parseFloat(form.total_fees) > parseFloat(form.paid_amount) ? 'rgba(192,57,43,0.3)' : 'rgba(39,174,96,0.3)'}` }}>
                        <span style={{ fontWeight: 700, color: parseFloat(form.total_fees) > parseFloat(form.paid_amount) ? '#e74c3c' : 'var(--fds-yoga)' }}>
                          Balance: ₹{(parseFloat(form.total_fees || 0) - parseFloat(form.paid_amount || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Record Payment'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
