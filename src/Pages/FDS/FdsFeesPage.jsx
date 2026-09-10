import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Download, Upload, Edit2, Trash2, IndianRupee, ChevronDown, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
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
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const canView = hasPermission('fds:admin') || hasPermission('fds:view') || hasPermission('fds_fees:view');

  const fileInputRef = useRef();
  const [mainTab, setMainTab] = useState('MONTHLY_LEDGER'); // 'MONTHLY_LEDGER' | 'ACCOUNTS' | 'TRANSACTIONS'
  const [monthlyLedger, setMonthlyLedger] = useState([]);
  const [feeAccounts, setFeeAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [feeStructures, setFeeStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [weddingGroups, setWeddingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
  const [paymentTarget, setPaymentTarget] = useState('student');

  // Month Cell Edit Modal
  const [editCellModal, setEditCellModal] = useState({
    open: false,
    cellId: null,
    studentName: '',
    monthName: '',
    paidAmount: '',
    modeOfPay: 'UPI',
    transactionId: '',
    statusRemarks: '',
  });

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
      const [payData, sumData, fsData, stuData, wedData, accData, ledgerData] = await Promise.all([
        fdsApi.payments(authFetchJson, buildParams()),
        fdsApi.paymentSummary(authFetchJson, buildParams()),
        fdsApi.feeStructures(authFetchJson, { is_active: true }),
        fdsApi.students(authFetchJson, { is_active: true, page_size: 500 }),
        fdsApi.weddingGroups(authFetchJson, { status: 'CONFIRMED', page_size: 200 }),
        fdsApi.feeAccounts ? fdsApi.feeAccounts(authFetchJson, buildParams()) : Promise.resolve({results: []}),
        fdsApi.monthlyLedger(authFetchJson),
      ]);
      setFeeAccounts(accData.results ?? accData);
      setPayments(payData.results ?? payData);
      setTotal(payData.count ?? (payData.results ? payData.results.length : payData.length));
      setSummary(sumData);
      setFeeStructures(fsData.results ?? fsData);
      setStudents(stuData.results ?? stuData);
      setWeddingGroups(wedData.results ?? wedData);
      setMonthlyLedger(ledgerData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { if (canView) load(); }, [load, canView]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterMode, filterMonth, filterYear, dateFrom, dateTo, activeCategory]);

  if (!canView) return (
    <div className="min-h-screen bg-slate-50"><Navbar /><div className="fds-theme"><div className="fds-page"><div className="fds-empty"><div className="fds-empty-title">Access Denied</div></div></div></div></div>
  );

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
        paid_amount: parseFloat(form.paid_amount) || 0,
        total_fees: parseFloat(form.total_fees) || 0,
        fee_month: form.fee_month ? parseInt(form.fee_month) : null,
        fee_year: form.fee_year ? parseInt(form.fee_year) : null,
      };
      if (editId) await fdsApi.updatePayment(authFetchJson, editId, payload);
      else await fdsApi.createPayment(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment?')) return;
    try { await fdsApi.deletePayment(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/fees/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Fees_Collections.xlsx');
    } catch { alert('Export failed'); }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fdsApi.importPayments(authFetch, fd);
      const data = await res.json();
      alert(`Import complete: ${data.created || 0} created, ${data.updated || 0} updated.`);
      load();
    } catch (e) {
      alert('Import failed: ' + e.message);
    } finally {
      ev.target.value = '';
    }
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    if (!editCellModal.cellId) return;
    try {
      await fdsApi.updateMonthCell(authFetchJson, editCellModal.cellId, {
        paid_amount: editCellModal.paidAmount,
        mode_of_pay: editCellModal.modeOfPay,
        transaction_id: editCellModal.transactionId,
        status_remarks: editCellModal.statusRemarks,
      });
      setEditCellModal(prev => ({ ...prev, open: false }));
      load();
    } catch (err) {
      alert('Failed to update cell: ' + err.message);
    }
  };

  // Filter monthly ledger
  const filteredLedger = monthlyLedger.filter(stu => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      stu.student_name?.toLowerCase().includes(q) ||
      stu.student_id?.toLowerCase().includes(q) ||
      stu.batch_time?.toLowerCase().includes(q) ||
      stu.fees_type?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Fees Collection 2026 (Mirror)</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · 1:1 Mirror of Google Sheets (FEES COLLECTION 2026)</p>
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
                  <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Import Excel</button>
                  <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
                </>
              )}
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}><Download size={15} /> Export Excel</button>
              {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> Record Payment</button>}
            </div>
          </div>

          {/* Stats Row */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
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

          {/* Main Navigation Tabs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button 
              className={`fds-btn ${mainTab === 'MONTHLY_LEDGER' ? 'fds-btn-primary' : 'fds-btn-secondary'}`} 
              onClick={() => setMainTab('MONTHLY_LEDGER')}
            >
              📅 Monthly Ledger 2026 (Sheet Mirror)
            </button>
            <button 
              className={`fds-btn ${mainTab === 'ACCOUNTS' ? 'fds-btn-primary' : 'fds-btn-secondary'}`} 
              onClick={() => setMainTab('ACCOUNTS')}
            >
              Fee Accounts
            </button>
            <button 
              className={`fds-btn ${mainTab === 'TRANSACTIONS' ? 'fds-btn-primary' : 'fds-btn-secondary'}`} 
              onClick={() => setMainTab('TRANSACTIONS')}
            >
              Transactions History
            </button>
          </div>

          {/* Filters */}
          <div className="fds-filter-bar">
            <input className="fds-search-input" placeholder="Search student name, ID, batch..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            {mainTab !== 'MONTHLY_LEDGER' && (
              <>
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
              </>
            )}
          </div>

          {/* ── TAB 1: MONTHLY LEDGER 2026 (SHEET 6 MIRROR) ── */}
          {mainTab === 'MONTHLY_LEDGER' && (
            <div className="fds-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="fds-table" style={{ minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>SL NO</th>
                    <th>STUDENT ID</th>
                    <th>STUDENT NAME</th>
                    <th>BATCH TIME</th>
                    <th>FEES TYPE</th>
                    <th>MONTH</th>
                    <th>PAID AMOUNT</th>
                    <th>MODE OF PAY</th>
                    <th>STATUS / REMARKS</th>
                    {canEdit && <th style={{ width: 80 }}>ACTION</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr><td colSpan={10}><div className="fds-empty"><div className="fds-empty-title">No monthly fee records found</div></div></td></tr>
                  ) : (
                    filteredLedger.map((stu, stuIdx) => {
                      const rowCount = stu.months && stu.months.length > 0 ? stu.months.length : 1;
                      return (stu.months && stu.months.length > 0 ? stu.months : [{ id: null, month_name: '—', paid_amount: 0, mode_of_pay: '—', status_remarks: '—' }]).map((m, mIdx) => (
                        <tr key={`${stu.student_id || stuIdx}-${m.id || mIdx}`} style={{ borderBottom: mIdx === rowCount - 1 ? '2px solid var(--fds-border)' : '1px solid rgba(255,255,255,0.05)' }}>
                          {mIdx === 0 && (
                            <>
                              <td rowSpan={rowCount} style={{ verticalAlign: 'top', paddingTop: 14, fontWeight: 600 }}>{stuIdx + 1}</td>
                              <td rowSpan={rowCount} style={{ verticalAlign: 'top', paddingTop: 14, fontFamily: 'monospace', color: 'var(--fds-primary)', fontWeight: 600 }}>
                                {stu.student_id}
                              </td>
                              <td rowSpan={rowCount} style={{ verticalAlign: 'top', paddingTop: 14, fontWeight: 700 }}>
                                {stu.student_name}
                              </td>
                              <td rowSpan={rowCount} style={{ verticalAlign: 'top', paddingTop: 14, color: 'var(--fds-text-muted)', fontSize: '0.82rem' }}>
                                {stu.batch_time || '—'}
                              </td>
                              <td rowSpan={rowCount} style={{ verticalAlign: 'top', paddingTop: 14, fontSize: '0.82rem' }}>
                                <span className="fds-badge fds-badge-dance">{stu.fees_type || 'REGULAR'}</span>
                              </td>
                            </>
                          )}
                          <td style={{ fontWeight: 600, color: 'var(--fds-primary-light)', fontSize: '0.82rem' }}>
                            {m.month_name}
                          </td>
                          <td style={{ fontWeight: 700, color: Number(m.paid_amount) > 0 ? 'var(--fds-yoga)' : 'var(--fds-text-muted)' }}>
                            {Number(m.paid_amount) > 0 ? `₹${Number(m.paid_amount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--fds-text)' }}>
                            {m.mode_of_pay || '—'}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>
                            {m.status_remarks || '—'}
                          </td>
                          {canEdit && (
                            <td>
                              {m.id && (
                                <button 
                                  className="fds-btn fds-btn-ghost" 
                                  style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--fds-primary)' }}
                                  onClick={() => setEditCellModal({
                                    open: true,
                                    cellId: m.id,
                                    studentName: stu.student_name,
                                    monthName: m.month_name,
                                    paidAmount: m.paid_amount || '',
                                    modeOfPay: m.mode_of_pay || 'UPI',
                                    transactionId: m.transaction_id || '',
                                    statusRemarks: m.status_remarks || '',
                                  })}
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 2: ACCOUNTS WORKSPACE ── */}
          {mainTab === 'ACCOUNTS' && (
            <div className="fds-table-wrap">
              <table className="fds-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Package</th>
                    <th>Total Billed</th>
                    <th>Total Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : feeAccounts.length === 0 ? (
                    <tr><td colSpan={7}><div className="fds-empty"><div className="fds-empty-title">No fee accounts found</div></div></td></tr>
                  ) : feeAccounts.map(acc => (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{acc.student_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)' }}>{acc.student_id_code}</div>
                      </td>
                      <td>{acc.active_package_detail?.category_display || '—'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(acc.total_due || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--fds-yoga)' }}>₹{Number(acc.total_paid || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600, color: Number(acc.balance_due) > 0 ? '#e74c3c' : 'var(--fds-text)' }}>₹{Number(acc.balance_due || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`fds-badge fds-badge-${acc.status === 'ACTIVE' ? 'green' : acc.status === 'PARTIAL' ? 'gold' : acc.status === 'OVERDUE' ? 'red' : 'gray'}`}>{acc.status_display || acc.status}</span></td>
                      <td>
                        <button className="fds-btn fds-btn-ghost" style={{ fontSize: '0.8rem', padding: '4px 10px', color: 'var(--fds-primary)' }} onClick={() => {
                          setForm({ 
                            ...EMPTY_FORM, 
                            student: acc.student,
                            fees_type: acc.active_package || '',
                            total_fees: acc.balance_due,
                            paid_amount: acc.balance_due
                          });
                          setPaymentTarget('student');
                          setShowModal(true);
                        }}>
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 3: TRANSACTIONS WORKSPACE ── */}
          {mainTab === 'TRANSACTIONS' && (
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
                      <td style={{ fontSize: '0.78rem', color: 'var(--fds-text-muted)' }}>{p.fee_month_display || p.fee_month || '—'}</td>
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
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <button className="fds-btn fds-btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ alignSelf: 'center', color: 'var(--fds-text-muted)', fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
                  <button className="fds-btn fds-btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal: New / Edit Payment */}
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
                        <select className="fds-input fds-select" required={paymentTarget === 'student'} value={form.student} onChange={e => {
                            const studentId = e.target.value;
                            const st = students.find(s => String(s.id) === String(studentId));
                            const updates = { student: studentId };
                            if (st && st.fee_structure) {
                              const fsId = typeof st.fee_structure === 'object' ? st.fee_structure.id : st.fee_structure;
                              const fsObj = feeStructures.find(fs => String(fs.id) === String(fsId));
                              if (fsObj) {
                                updates.fees_type = fsObj.id;
                                updates.total_fees = fsObj.amount;
                                updates.paid_amount = fsObj.amount;
                              }
                            }
                            setForm(f => ({ ...f, ...updates }));
                          }}>
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
                        {feeStructures.map(fs => <option key={fs.id} value={fs.id}>{fs.category_display || fs.category_name} — ₹{fs.amount}</option>)}
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
                      <label className="fds-label">Remarks</label>
                      <textarea className="fds-input" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                    </div>
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

        {/* Modal: Edit Ledger Month Cell */}
        {editCellModal.open && (
          <div className="fds-modal-overlay" onClick={() => setEditCellModal(prev => ({ ...prev, open: false }))}>
            <div className="fds-modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div>
                  <div className="fds-modal-title">Update Month Payment</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--fds-text-muted)' }}>
                    {editCellModal.studentName} — {editCellModal.monthName}
                  </div>
                </div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setEditCellModal(prev => ({ ...prev, open: false }))}><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveCell}>
                <div className="fds-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label className="fds-label">Paid Amount (₹)</label>
                      <input 
                        className="fds-input" 
                        type="number" 
                        step="0.01" 
                        value={editCellModal.paidAmount} 
                        onChange={e => setEditCellModal(prev => ({ ...prev, paidAmount: e.target.value }))} 
                      />
                    </div>
                    <div>
                      <label className="fds-label">Mode of Payment</label>
                      <select 
                        className="fds-input fds-select" 
                        value={editCellModal.modeOfPay} 
                        onChange={e => setEditCellModal(prev => ({ ...prev, modeOfPay: e.target.value }))}
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">CASH</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="CARD">CARD</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Transaction ID / Reference</label>
                      <input 
                        className="fds-input" 
                        placeholder="UPI reference, Cheque no, etc." 
                        value={editCellModal.transactionId} 
                        onChange={e => setEditCellModal(prev => ({ ...prev, transactionId: e.target.value }))} 
                      />
                    </div>
                    <div>
                      <label className="fds-label">Status / Remarks</label>
                      <input 
                        className="fds-input" 
                        placeholder="e.g. Paid on 05/09, Pending, etc." 
                        value={editCellModal.statusRemarks} 
                        onChange={e => setEditCellModal(prev => ({ ...prev, statusRemarks: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setEditCellModal(prev => ({ ...prev, open: false }))}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary">Save Cell</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
