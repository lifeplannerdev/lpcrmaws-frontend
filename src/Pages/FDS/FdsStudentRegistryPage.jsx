import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Download, Upload, X, Edit2, Trash2, UserCheck, Eye, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES, downloadExcelFromResponse } from './fdsApi';
import FdsMasterSyncModal from './FdsMasterSyncModal';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GENDERS = ['MALE','FEMALE','OTHER'];
const EMPTY_FORM = {
  name: '', joining_date: new Date().toISOString().split('T')[0],
  date_of_birth: '', gender: '', age_gender: '', parent_name: '', contact_no: '',
  emergency_contact_no: '', whatsapp_no: '', batch: '', batch_time_text: '',
  medical_condition: '', media_consent: false, pickup_person_1_no: '',
  can_leave_alone: 'NO', admission_fee_paid_date: '', fee_paid_date: '', fee_structure: '',
  is_active: true, student_type: 'REGULAR', enquiry: '', trial: '',
};

function StudentDetailsModal({ student, onClose, onEdit, canEdit, authFetchJson }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [feeAccount, setFeeAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'ATTENDANCE' && attendance.length === 0) {
      setLoading(true);
      fdsApi.attendance(authFetchJson, { student: student.id, page_size: 50 })
        .then(res => setAttendance(res.results || res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    if (activeTab === 'FEES' && fees.length === 0) {
      setLoading(true);
      Promise.all([
        fdsApi.payments(authFetchJson, { student: student.id, page_size: 50 }),
        authFetchJson(`${API_BASE_URL}/fds/fee-accounts/?student_id=${student.id}`)
      ])
        .then(([paymentsRes, accountRes]) => {
          setFees(paymentsRes.results || paymentsRes);
          if (accountRes && (accountRes.results?.length > 0 || accountRes.length > 0)) {
            setFeeAccount(accountRes.results ? accountRes.results[0] : accountRes[0]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeTab, student.id, authFetchJson, attendance.length, fees.length]);

  return (
    <div className="fds-modal-overlay" onClick={onClose}>
      <div className="fds-modal fds-modal-lg" onClick={e => e.stopPropagation()} style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        <div className="fds-modal-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div>
            <div className="fds-modal-title" style={{ fontSize: '1.5rem' }}>{student.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--fds-text-muted)' }}>
              {student.student_id} • {student.age_gender || `${student.gender || ''} ${student.age ? `Age ${student.age}` : ''}`}
            </div>
          </div>
          <button className="fds-btn fds-btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 24px', marginTop: 16 }}>
          {['OVERVIEW', 'PIPELINE', 'ATTENDANCE', 'FEES'].map(tab => (
            <button key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', color: activeTab === tab ? 'var(--fds-primary)' : 'var(--fds-text-muted)',
                padding: '12px 0', fontSize: '0.85rem', fontWeight: activeTab === tab ? 600 : 400,
                borderBottom: activeTab === tab ? '2px solid var(--fds-primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
              {tab}
            </button>
          ))}
        </div>

        <div className="fds-modal-body" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'OVERVIEW' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Student ID', student.student_id],
                ['Joining Date', student.joining_date],
                ['Age / Gender', student.age_gender || `${student.age ?? '—'} / ${student.gender || '—'}`],
                ['Batch Time', student.batch_time_text || student.batch_detail?.name || '—'],
                ['Contact No', student.contact_no || '—'],
                ['WhatsApp No', student.whatsapp_no || '—'],
                ['Parent Name', student.parent_name || '—'],
                ['Emergency Contact', student.emergency_contact_no || '—'],
                ['Pickup Person Contact', student.pickup_person_1_no || '—'],
                ['Can Leave Alone', student.can_leave_alone ? 'YES' : 'NO'],
                ['Fees Paid Date', student.fee_paid_date || student.admission_fee_paid_date || '—'],
                ['Fee Package', student.fee_structure_detail?.category_display || student.fee_structure_detail?.category_name || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="fds-label" style={{ fontSize: '0.75rem' }}>{label}</div>
                  <div style={{ color: 'var(--fds-text)', fontSize: '0.95rem' }}>{val}</div>
                </div>
              ))}
              {student.medical_condition && (
                <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
                  <div className="fds-label" style={{ color: '#e74c3c' }}>Any Medical Condition</div>
                  <div style={{ color: '#ff7675', fontSize: '0.95rem', background: 'rgba(231,76,60,0.1)', padding: 12, borderRadius: 6 }}>
                    {student.medical_condition}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'PIPELINE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {student.enquiry_detail ? (
                <div className="fds-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: '1.1rem', color: 'var(--fds-primary)', marginBottom: 12, fontFamily: 'Cormorant Garamond, serif' }}>Initial Enquiry</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><span className="fds-label">Enquiry ID</span> <div>{student.enquiry_detail.enquiry_id}</div></div>
                    <div><span className="fds-label">Date</span> <div>{student.enquiry_detail.date}</div></div>
                    <div><span className="fds-label">Source</span> <div>{student.enquiry_detail.source_display || student.enquiry_detail.source}</div></div>
                    <div><span className="fds-label">Location</span> <div>{student.enquiry_detail.location || '—'}</div></div>
                    <div style={{ gridColumn: '1/-1' }}><span className="fds-label">Remarks</span> <div>{student.enquiry_detail.remarks || '—'}</div></div>
                  </div>
                </div>
              ) : (
                <div className="fds-empty" style={{ padding: 20 }}>No Enquiry record linked.</div>
              )}

              {student.trial_detail ? (
                <div className="fds-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: '1.1rem', color: 'var(--fds-gold)', marginBottom: 12, fontFamily: 'Cormorant Garamond, serif' }}>Trial Record</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><span className="fds-label">Trial ID</span> <div>{student.trial_detail.trial_id}</div></div>
                    <div><span className="fds-label">Date & Time</span> <div>{student.trial_detail.date} {student.trial_detail.time || student.trial_detail.time_text || ''}</div></div>
                    <div><span className="fds-label">Trainer Rating</span> <div>{student.trial_detail.trainer_rating ? `${student.trial_detail.trainer_rating}/5` : '—'}</div></div>
                    <div><span className="fds-label">Fee Quoted</span> <div>₹{student.trial_detail.fee_quoted}</div></div>
                    <div style={{ gridColumn: '1/-1' }}><span className="fds-label">Feedback</span> <div>{student.trial_detail.feedback || '—'}</div></div>
                  </div>
                </div>
              ) : (
                <div className="fds-empty" style={{ padding: 20 }}>No Trial record linked.</div>
              )}
            </div>
          )}

          {activeTab === 'ATTENDANCE' && (
            <div>
              {loading ? <div className="fds-spinner" /> : attendance.length === 0 ? (
                <div className="fds-empty">No attendance records logged yet.</div>
              ) : (
                <table className="fds-table">
                  <thead>
                    <tr><th>Date</th><th>Session</th><th>Status</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{a.session_detail?.name || 'Class'}</td>
                        <td><span className={`fds-badge fds-badge-${a.status === 'PRESENT' ? 'green' : 'red'}`}>{a.status}</span></td>
                        <td>{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'FEES' && (
            <div>
              {feeAccount && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div className="fds-card" style={{ padding: 12, textAlign: 'center' }}>
                    <div className="fds-label">Total Due</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{feeAccount.total_due}</div>
                  </div>
                  <div className="fds-card" style={{ padding: 12, textAlign: 'center' }}>
                    <div className="fds-label">Total Paid</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--fds-yoga)' }}>₹{feeAccount.total_paid}</div>
                  </div>
                  <div className="fds-card" style={{ padding: 12, textAlign: 'center' }}>
                    <div className="fds-label">Balance Due</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e74c3c' }}>₹{feeAccount.balance_due}</div>
                  </div>
                </div>
              )}
              {loading ? <div className="fds-spinner" /> : fees.length === 0 ? (
                <div className="fds-empty">No payment records logged yet.</div>
              ) : (
                <table className="fds-table">
                  <thead>
                    <tr><th>Receipt</th><th>Date</th><th>Package / Month</th><th>Amount</th><th>Mode</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {fees.map(f => (
                      <tr key={f.id}>
                        <td>{f.receipt_number || `#${f.id}`}</td>
                        <td>{f.pay_date}</td>
                        <td>{f.fees_type_display || f.fee_month || 'Monthly'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--fds-primary)' }}>₹{f.paid_amount}</td>
                        <td>{f.mode_of_pay}</td>
                        <td><span className={`fds-badge fds-badge-${f.status === 'PAID' ? 'green' : 'gold'}`}>{f.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FdsStudentRegistryPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const fileInputRef = useRef();
  const location = useLocation();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [total, setTotal] = useState(0);

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterActive, setFilterActive] = useState('true');
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [sortField, setSortField] = useState('student_id');
  const [sortDir, setSortDir] = useState('asc');

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    if (location.state?.sourceData) {
      const data = location.state.sourceData;
      const type = location.state.sourceType;
      
      setForm({
        ...EMPTY_FORM,
        name: data.name || '',
        contact_no: data.phone || data.whatsapp_no || '',
        whatsapp_no: data.whatsapp_no || data.phone || '',
        parent_name: data.parent_name || '',
        age_gender: data.age ? `${data.age}` : '',
        batch_time_text: data.preferred_timing || data.time_text || data.time || '',
        enquiry: type === 'enquiry' ? data.id : (data.enquiry || ''),
        trial: type === 'trial' ? data.id : '',
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
    if (filterBatch) p.batch = filterBatch;
    if (filterActive !== '') p.is_active = filterActive;
    if (filterType) p.student_type = filterType;
    if (dateFrom) p.joining_date_from = dateFrom;
    if (dateTo)   p.joining_date_to   = dateTo;
    p.ordering = sortDir === 'asc' ? sortField : `-${sortField}`;
    return p;
  }, [page, activeCategory, search, filterBatch, filterActive, filterType, dateFrom, dateTo, sortField, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stuData, batchData, feeData] = await Promise.all([
        fdsApi.students(authFetchJson, buildParams()),
        fdsApi.batches(authFetchJson, { status: 'ACTIVE', page_size: 200 }),
        fdsApi.feeStructures(authFetchJson, { is_active: true }),
      ]);
      setStudents(stuData.results ?? stuData);
      setTotal(stuData.count ?? (stuData.results ? stuData.results.length : stuData.length));
      setBatches(batchData.results ?? batchData);
      setFeeStructures(feeData.results ?? feeData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authFetchJson, buildParams]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeCategory, search, filterBatch, filterActive, filterType, dateFrom, dateTo]);

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

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({
      name: s.name, joining_date: s.joining_date,
      date_of_birth: s.date_of_birth || '', gender: s.gender || '',
      age_gender: s.age_gender || '', parent_name: s.parent_name || '',
      contact_no: s.contact_no || '', emergency_contact_no: s.emergency_contact_no || '',
      whatsapp_no: s.whatsapp_no || '', batch: s.batch || '',
      batch_time_text: s.batch_time_text || '', medical_condition: s.medical_condition || '',
      media_consent: s.media_consent, pickup_person_1_no: s.pickup_person_1_no || '',
      can_leave_alone: s.can_leave_alone ? 'YES' : 'NO',
      admission_fee_paid_date: s.admission_fee_paid_date || '',
      fee_paid_date: s.fee_paid_date || s.admission_fee_paid_date || '',
      fee_structure: s.fee_structure || '', is_active: s.is_active,
      student_type: s.student_type,
    });
    setEditId(s.id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        batch: form.batch || null,
        fee_structure: form.fee_structure || null,
        enquiry: form.enquiry || null,
        trial: form.trial || null,
        date_of_birth: form.date_of_birth || null,
        fee_paid_date: form.fee_paid_date || form.admission_fee_paid_date || null,
        admission_fee_paid_date: form.fee_paid_date || form.admission_fee_paid_date || null,
        can_leave_alone: form.can_leave_alone === 'YES',
      };
      if (editId) await fdsApi.updateStudent(authFetchJson, editId, payload);
      else await fdsApi.createStudent(authFetchJson, payload);
      setShowModal(false);
      load();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await fdsApi.deleteStudent(authFetchJson, id); load(); }
    catch { alert('Delete failed'); }
  };

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/fds/students/export_excel/`);
      await downloadExcelFromResponse(res, 'FDS_Students.xlsx');
    } catch { alert('Export failed'); }
  };

  const handleImport = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fdsApi.importStudents(authFetch, fd);
      const data = await res.json();
      alert(`Import complete: ${data.created} created, ${data.updated || 0} updated.`);
      load();
    } catch { alert('Import failed'); }
    ev.target.value = '';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          {/* Header */}
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Registration Details (Mirror)</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio · 1:1 Mirror of Google Sheets (REGISTRATION DETAILS) · {total} students</p>
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
              {canEdit && <button className="fds-btn fds-btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Import Excel</button>}
              <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImport} />
              <button className="fds-btn fds-btn-secondary" onClick={handleExport}><Download size={15} /> Export Excel</button>
              {canEdit && <button className="fds-btn fds-btn-primary" onClick={openAdd}><Plus size={15} /> New Student</button>}
            </div>
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

          {/* Filters */}
          <div className="fds-filter-bar">
            <input className="fds-search-input" placeholder="Search student ID, name, parent, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            <select className="fds-input fds-select" style={{ maxWidth: 160 }} value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="fds-input fds-select" style={{ maxWidth: 130 }} value={filterActive} onChange={e => setFilterActive(e.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Joined from" />
            <input className="fds-input" type="date" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="Joined to" />
          </div>

          {/* Table (1:1 Mirror of REGISTRATION DETAILS) */}
          <div className="fds-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="fds-table" style={{ minWidth: 1350 }}>
              <thead>
                <tr>
                  {[
                    { key: 'student_id', label: 'STUDENT ID' },
                    { key: 'joining_date', label: 'JOINING DATE' },
                    { key: 'name', label: 'NAME' },
                    { key: 'age_gender', label: 'AGE/GENDER' },
                    { key: 'parent_name', label: 'PARENT NAME' },
                    { key: 'contact_no', label: 'CONTACT NO' },
                    { key: 'emergency_contact_no', label: 'EMERGENCY CONTACT NO' },
                    { key: 'batch_time_text', label: 'BATCH TIME' },
                    { key: 'medical_condition', label: 'ANY MEDICAL CONDITION' },
                    { key: 'pickup_person_1_no', label: 'PICKUP PERSON-1 NO' },
                    { key: 'can_leave_alone', label: 'CAN LEAVE ALONE' },
                    { key: 'fee_paid_date', label: 'FEES PAID DATE' },
                    { key: 'actions', label: '' },
                  ].map(col => (
                    <th key={col.key} onClick={() => col.key !== 'actions' && handleSort(col.key)} style={{ whiteSpace: 'nowrap' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} style={{ textAlign: 'center', padding: 40 }}><div className="fds-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={13}><div className="fds-empty"><div className="fds-empty-icon"><UserCheck size={40} /></div><div className="fds-empty-title">No students found</div></div></td></tr>
                ) : students.map(s => (
                  <tr key={s.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--fds-primary)' }}>{s.student_id}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>{s.joining_date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text)' }}>
                      {s.age_gender || `${s.age ? `${s.age} / ` : ''}${s.gender || '—'}`}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{s.parent_name || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {s.contact_no ? <a href={`tel:${s.contact_no}`} style={{ color: 'inherit', textDecoration: 'none' }}>{s.contact_no}</a> : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>
                      {s.emergency_contact_no ? <a href={`tel:${s.emergency_contact_no}`} style={{ color: 'inherit', textDecoration: 'none' }}>{s.emergency_contact_no}</a> : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>
                      {s.batch_time_text || s.batch_detail?.name || '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: s.medical_condition ? '#e74c3c' : 'var(--fds-text-muted)', maxWidth: 160 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.medical_condition}>
                        {s.medical_condition || 'NONE'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)' }}>{s.pickup_person_1_no || '—'}</td>
                    <td>
                      <span className={`fds-badge ${s.can_leave_alone ? 'fds-badge-green' : 'fds-badge-gray'}`}>
                        {s.can_leave_alone ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--fds-text-muted)', whiteSpace: 'nowrap' }}>
                      {s.fee_paid_date || s.admission_fee_paid_date || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowDetail(s)}><Eye size={13} /></button>
                        {canEdit && (
                          <>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEdit(s)}><Edit2 size={13} /></button>
                            <button className="fds-btn fds-btn-ghost" style={{ padding: '4px 8px', color: '#e74c3c' }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
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

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fds-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="fds-modal fds-modal-lg" onClick={e => e.stopPropagation()}>
              <div className="fds-modal-header">
                <div className="fds-modal-title">{editId ? 'Edit Student (Mirror)' : 'Register Student'}</div>
                <button className="fds-btn fds-btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="fds-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Full Name *</label>
                      <input className="fds-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Joining Date *</label>
                      <input className="fds-input" type="date" required value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Age / Gender (e.g. 5/M, 27/F)</label>
                      <input className="fds-input" placeholder="e.g. 5/M" value={form.age_gender} onChange={e => setForm(f => ({ ...f, age_gender: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Parent Name</label>
                      <input className="fds-input" value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Contact No. *</label>
                      <input className="fds-input" type="tel" value={form.contact_no} onChange={e => setForm(f => ({ ...f, contact_no: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Emergency Contact No.</label>
                      <input className="fds-input" type="tel" value={form.emergency_contact_no} onChange={e => setForm(f => ({ ...f, emergency_contact_no: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Batch Time</label>
                      <input className="fds-input" placeholder="e.g. 5:30PM - 6:30PM" value={form.batch_time_text} onChange={e => setForm(f => ({ ...f, batch_time_text: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Pickup Person Contact No.</label>
                      <input className="fds-input" type="tel" value={form.pickup_person_1_no} onChange={e => setForm(f => ({ ...f, pickup_person_1_no: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Can Leave Alone (YES/NO)</label>
                      <select className="fds-input fds-select" value={form.can_leave_alone} onChange={e => setForm(f => ({ ...f, can_leave_alone: e.target.value }))}>
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                    <div>
                      <label className="fds-label">Fees Paid Date</label>
                      <input className="fds-input" type="date" value={form.fee_paid_date || form.admission_fee_paid_date} onChange={e => setForm(f => ({ ...f, fee_paid_date: e.target.value, admission_fee_paid_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="fds-label">Fee Structure / Package</label>
                      <select className="fds-input fds-select" value={form.fee_structure} onChange={e => setForm(f => ({ ...f, fee_structure: e.target.value }))}>
                        <option value="">Select Fee Type</option>
                        {feeStructures.map(fs => <option key={fs.id} value={fs.id}>{fs.category_display || fs.category_name} — ₹{fs.amount}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="fds-label">Any Medical Condition</label>
                      <textarea className="fds-input" rows={2} placeholder="Any medical conditions, allergies, or NONE" value={form.medical_condition} onChange={e => setForm(f => ({ ...f, medical_condition: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="fds-modal-footer">
                  <button type="button" className="fds-btn fds-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="fds-btn fds-btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Register Student'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && (
          <StudentDetailsModal
            student={showDetail}
            onClose={() => setShowDetail(null)}
            onEdit={() => { setShowDetail(null); openEdit(showDetail); }}
            canEdit={canEdit}
            authFetchJson={authFetchJson}
          />
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
