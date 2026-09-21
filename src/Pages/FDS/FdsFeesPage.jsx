import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, Plus, Receipt, AlertTriangle, Repeat,
  IndianRupee, Download, CheckCircle, Edit2, Trash2, ShieldCheck,
  ChevronDown, X, Calendar, Search, Filter, Layers, CreditCard,
  Clock, UserCheck, Check, Phone, MessageSquare, AlertCircle
} from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  fdsApi, FDS_CATEGORIES, getStatusBadgeClass, getCategoryBadgeClass,
  downloadExcelFromResponse
} from './fdsApi';
import './fds-theme.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const currency = (value) => {
  const num = Number(value || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const emptyPayment = {
  amount: '',
  installment: '',
  payment_method: 'CASH',
  payment_date: new Date().toISOString().slice(0, 16),
  reference: '',
  notes: '',
  fee_month: new Date().getMonth() + 1,
  fee_year: new Date().getFullYear(),
};

const emptyRestructure = {
  template_id: '',
  plan_type: 'INSTALLMENT',
  total_due: '',
  registration_amount: '',
  due_day: 10,
  next_due_date: '',
  notes: '',
};

const emptyCreateAccount = {
  student: '',
  active_package: '',
  plan_code: '',
  plan_name: '',
  plan_type: 'PACKAGE',
  total_due: '',
  registration_amount: '',
  due_day: 10,
  start_date: new Date().toISOString().split('T')[0],
  first_installment_date: '',
  installment_count: '',
  installment_amount: '',
  notes: '',
};

export default function FdsFeesPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const canManageFees = hasPermission('fds:admin') || hasPermission('fds:admin_own');
  const canViewFees = hasPermission('fds:admin') || hasPermission('fds:view') || hasPermission('fds_fees:view');

  // Main navigation & workspace
  const [mainTab, setMainTab] = useState('accounts'); // 'accounts' | 'spreadsheet' | 'pending_students' | 'all_fees' | 'catalog' | 'policies'
  const [activeSubTab, setActiveSubTab] = useState('recordPayment'); // 'recordPayment' | 'restructure' | 'installments' | 'payments' | 'adjustments'

  // Data states
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [summary, setSummary] = useState({ totalDue: 0, totalPaid: 0, balanceDue: 0, overdueAmount: 0, pending_count: 0 });
  const [pendingStudents, setPendingStudents] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [feePolicies, setFeePolicies] = useState({ block_without_fee_account: false, pending_if_overdue: false });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');

  // UI & Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Modals & Forms
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateAccount);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [restructureForm, setRestructureForm] = useState(emptyRestructure);
  const [editingEntity, setEditingEntity] = useState(null); // { type: 'ACCOUNT' | 'INSTALLMENT' | 'PAYMENT', data: {...} }

  // Catalog modal
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [structureForm, setStructureForm] = useState({
    name: '',
    category: 'DANCE',
    batch_type: 'WEEKEND',
    admission_fee: '0.00',
    amount: '0.00',
    duration_months: 1,
    sessions_per_week: 2,
    is_active: true,
  });

  // New Installment modal
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [newInstallmentForm, setNewInstallmentForm] = useState({
    sequence_number: 1,
    label: '',
    due_date: new Date().toISOString().split('T')[0],
    scheduled_amount: '',
    notes: '',
  });

  // New Adjustment modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [newAdjustmentForm, setNewAdjustmentForm] = useState({
    adjustment_type: 'DISCOUNT',
    amount_delta: '',
    reason: '',
  });

  // Auth fetch wrapper
  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  }, [accessToken, refreshAccessToken]);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      let msg = errBody.detail || errBody.error;
      if (!msg && typeof errBody === 'object' && Object.keys(errBody).length > 0) {
        msg = Object.entries(errBody)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
          .join('; ');
      }
      throw new Error(msg || `Request failed with status ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }, [authFetch]);

  // Selected account memo
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  // Auto-set selected account on first load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Main data fetcher
  const fetchData = useCallback(async () => {
    if (!canViewFees) return;
    setLoading(true);
    try {
      const accountParams = {};
      if (search) accountParams.search = search;
      if (categoryFilter !== 'ALL') accountParams.class_category = categoryFilter;
      if (statusFilter) accountParams.status = statusFilter;

      const [
        accountsData,
        summaryData,
        pendingData,
        structuresData,
        studentsData,
        paymentsData,
        policiesData
      ] = await Promise.all([
        fdsApi.feeAccounts(authFetchJson, accountParams),
        fdsApi.feeSummary(authFetchJson, { class_category: categoryFilter !== 'ALL' ? categoryFilter : '' }),
        fdsApi.pendingFeeStudents(authFetchJson, { class_category: categoryFilter !== 'ALL' ? categoryFilter : '' }),
        fdsApi.feeStructures(authFetchJson, { is_active: true }),
        fdsApi.students(authFetchJson, { is_active: true, page_size: 500 }),
        fdsApi.payments(authFetchJson, { page_size: 100 }),
        fdsApi.feePolicies(authFetchJson).catch(() => ({ block_without_fee_account: false, pending_if_overdue: false })),
      ]);

      const accList = accountsData.results ?? accountsData;
      setAccounts(accList);
      setSummary(summaryData || { totalDue: 0, totalPaid: 0, balanceDue: 0, overdueAmount: 0 });
      setPendingStudents(pendingData || []);
      setFeeStructures(structuresData.results ?? structuresData);
      setStudents(studentsData.results ?? studentsData);
      setAllPayments(paymentsData.results ?? paymentsData);
      setFeePolicies(policiesData || { block_without_fee_account: false, pending_if_overdue: false });

      if (selectedAccountId && !accList.some(a => a.id === selectedAccountId) && accList.length > 0) {
        setSelectedAccountId(accList[0].id);
      }
    } catch (err) {
      console.error('Failed to load FDS fee data', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  }, [authFetchJson, canViewFees, search, categoryFilter, statusFilter, selectedAccountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler: Record payment against selected account
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await fdsApi.recordFeeAccountPayment(authFetchJson, selectedAccount.id, {
        amount: paymentForm.amount,
        installment: paymentForm.installment ? Number(paymentForm.installment) : null,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
        fee_month: paymentForm.fee_month,
        fee_year: paymentForm.fee_year,
      });

      setPaymentForm(emptyPayment);
      setMessage({ type: 'success', text: `Payment of ${currency(paymentForm.amount)} recorded successfully.` });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record payment.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Restructure account
  const handleRestructureSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    setMessage(null);
    try {
      await fdsApi.restructureFeeAccount(authFetchJson, selectedAccount.id, {
        template_id: restructureForm.template_id || null,
        plan_type: restructureForm.plan_type,
        total_due: restructureForm.total_due || undefined,
        registration_amount: restructureForm.registration_amount || undefined,
        due_day: restructureForm.due_day ? Number(restructureForm.due_day) : 10,
        next_due_date: restructureForm.next_due_date || undefined,
        notes: restructureForm.notes || 'Plan restructured via management portal',
      });

      setMessage({ type: 'success', text: 'Fee plan restructured successfully.' });
      setRestructureForm(emptyRestructure);
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to restructure plan.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Create new fee account
  const handleCreateAccountSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.student) {
      setMessage({ type: 'error', text: 'Please select a student.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        student: Number(createForm.student),
        active_package: createForm.active_package ? Number(createForm.active_package) : null,
        plan_code: createForm.plan_code,
        plan_name: createForm.plan_name,
        plan_type: createForm.plan_type,
        total_due: createForm.total_due || '0.00',
        registration_amount: createForm.registration_amount || '0.00',
        due_day: createForm.due_day ? Number(createForm.due_day) : 10,
        start_date: createForm.start_date || undefined,
        first_installment_date: createForm.first_installment_date || undefined,
        installment_count: createForm.installment_count ? Number(createForm.installment_count) : null,
        installment_amount: createForm.installment_amount ? createForm.installment_amount : null,
        notes: createForm.notes,
      };

      const res = await fdsApi.createFeeAccount(authFetchJson, payload);
      setIsCreateModalOpen(false);
      setCreateForm(emptyCreateAccount);
      setMessage({ type: 'success', text: 'Fee account created successfully.' });
      await fetchData();
      if (res && res.id) setSelectedAccountId(res.id);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create fee account.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Add installment
  const handleAddInstallment = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await fdsApi.addFeeInstallment(authFetchJson, selectedAccount.id, {
        sequence_number: Number(newInstallmentForm.sequence_number),
        label: newInstallmentForm.label || `Installment ${newInstallmentForm.sequence_number}`,
        due_date: newInstallmentForm.due_date,
        scheduled_amount: newInstallmentForm.scheduled_amount,
        notes: newInstallmentForm.notes,
      });
      setIsInstallmentModalOpen(false);
      setNewInstallmentForm({
        sequence_number: (selectedAccount.installments?.length || 0) + 2,
        label: '',
        due_date: new Date().toISOString().split('T')[0],
        scheduled_amount: '',
        notes: '',
      });
      setMessage({ type: 'success', text: 'Installment added successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add installment.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Add adjustment
  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await fdsApi.addFeeAdjustment(authFetchJson, selectedAccount.id, {
        adjustment_type: newAdjustmentForm.adjustment_type,
        amount_delta: newAdjustmentForm.amount_delta,
        reason: newAdjustmentForm.reason || 'Fee adjustment',
      });
      setIsAdjustmentModalOpen(false);
      setNewAdjustmentForm({ adjustment_type: 'DISCOUNT', amount_delta: '', reason: '' });
      setMessage({ type: 'success', text: 'Fee adjustment recorded successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record adjustment.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Edit / Delete entity modal
  const handleSaveEditEntity = async (e) => {
    e.preventDefault();
    if (!editingEntity) return;
    setSaving(true);
    try {
      if (editingEntity.type === 'ACCOUNT') {
        await fdsApi.updateFeeAccount(authFetchJson, editingEntity.data.id, {
          total_due: editingEntity.data.total_due,
          registration_amount: editingEntity.data.registration_amount,
          status: editingEntity.data.status,
          notes: editingEntity.data.notes,
        });
      } else if (editingEntity.type === 'INSTALLMENT') {
        await fdsApi.updateFeeInstallment(authFetchJson, selectedAccount.id, editingEntity.data.id, {
          scheduled_amount: editingEntity.data.scheduled_amount,
          due_date: editingEntity.data.due_date,
          label: editingEntity.data.label,
          status: editingEntity.data.status,
        });
      } else if (editingEntity.type === 'PAYMENT') {
        await fdsApi.updatePayment(authFetchJson, editingEntity.data.id, {
          paid_amount: editingEntity.data.paid_amount,
          pay_date: editingEntity.data.pay_date,
          mode_of_pay: editingEntity.data.mode_of_pay,
          remarks: editingEntity.data.remarks,
        });
      }
      setEditingEntity(null);
      setMessage({ type: 'success', text: 'Changes saved successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntity = async (type, accountId, entityId) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;
    setSaving(true);
    try {
      if (type === 'ACCOUNT') {
        await fdsApi.deleteFeeAccount(authFetchJson, accountId);
        setSelectedAccountId(null);
      } else if (type === 'INSTALLMENT') {
        await fdsApi.deleteFeeInstallment(authFetchJson, accountId, entityId);
      } else if (type === 'PAYMENT') {
        await fdsApi.deletePayment(authFetchJson, entityId);
      }
      setMessage({ type: 'success', text: `${type} deleted successfully.` });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Save Fee Structure Catalog
  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cat = structureForm.category || 'DANCE';
      const btype = structureForm.batch_type || 'WEEKEND';
      const generatedName = `${cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()} - ${btype.charAt(0).toUpperCase() + btype.slice(1).toLowerCase()}`;
      const payload = {
        name: structureForm.name?.trim() || generatedName,
        category: cat,
        batch_type: btype,
        amount: parseFloat(structureForm.amount) || 0,
        admission_fee: parseFloat(structureForm.admission_fee) || 0,
        duration_months: Number(structureForm.duration_months) || 1,
        sessions_per_week: Number(structureForm.sessions_per_week) || 2,
        is_active: structureForm.is_active ?? true,
      };
      if (editingStructureId) {
        await fdsApi.updateFeeStructure(authFetchJson, editingStructureId, payload);
        setMessage({ type: 'success', text: 'Fee structure package updated.' });
      } else {
        await fdsApi.createFeeStructure(authFetchJson, payload);
        setMessage({ type: 'success', text: 'New fee structure package created.' });
      }
      setIsCatalogModalOpen(false);
      setEditingStructureId(null);
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save fee structure.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStructure = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee package?')) return;
    try {
      await fdsApi.deleteFeeStructure(authFetchJson, id);
      setMessage({ type: 'success', text: 'Fee package deleted.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete package.' });
    }
  };

  // Handler: Save Fee Policies
  const handleSavePolicies = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fdsApi.updateFeePolicies(authFetchJson, feePolicies);
      setMessage({ type: 'success', text: 'Fee attendance policies saved successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save policies.' });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Export Payments
  const handleExport = async () => {
    try {
      const res = await fdsApi.exportPayments(authFetch);
      await downloadExcelFromResponse(res, `FDS_Fees_Collection_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export excel.' });
    }
  };

  if (!canViewFees) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="p-8 text-center text-gray-500 font-medium">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700 text-sm font-medium shadow-sm mb-3">
              <IndianRupee size={16} /> FDS Studio Accounting
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              FDS Fees Management
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage dance & fitness fee accounts, installments, partial collections, and restructures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
            >
              <Download size={16} /> Export
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Alert Notification */}
        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between transition-all ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        {/* 4 Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-gray-900">{currency(summary.totalDue || summary.total_billed)}</p>
            <p className="text-xs text-gray-400 mt-1">Total active studio receivables</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{currency(summary.totalPaid || summary.total_collected)}</p>
            <p className="text-xs text-emerald-500 mt-1">Successfully collected</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Balance Due</p>
            <p className="text-2xl font-bold text-indigo-600">{currency(summary.balanceDue || summary.total_balance)}</p>
            <p className="text-xs text-indigo-400 mt-1">Pending student balances</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-rose-600">{currency(summary.overdueAmount)}</p>
            <p className="text-xs text-rose-400 mt-1">Past scheduled due dates</p>
          </div>
        </div>

        {/* 6 Top-Level Navigation Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <button
            onClick={() => setMainTab('accounts')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            Accounts & Payments
          </button>
          <button
            onClick={() => setMainTab('spreadsheet')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'spreadsheet' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            Spreadsheet View
          </button>
          <button
            onClick={() => setMainTab('pending_students')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 ${mainTab === 'pending_students' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            <span>Pending Students</span>
            {pendingStudents.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${mainTab === 'pending_students' ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'}`}>
                {pendingStudents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('all_fees')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'all_fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            All Fees
          </button>
          <button
            onClick={() => setMainTab('catalog')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            Fee Catalog
          </button>
          <button
            onClick={() => setMainTab('policies')}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'policies' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
          >
            Settings & Policies
          </button>
        </div>

        {/* ─── TAB 1: ACCOUNTS & PAYMENTS (Master - Detail) ────────────────── */}
        {mainTab === 'accounts' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column (Master - Fee Accounts List) */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Fee Accounts</h2>
                    <p className="text-xs text-gray-500">Select an account to view and manage</p>
                  </div>
                  {canManageFees && (
                    <button
                      onClick={() => {
                        setCreateForm(emptyCreateAccount);
                        setIsCreateModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Plus size={14} /> New Account
                    </button>
                  )}
                </div>

                {/* Class Category Filter Pills */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {FDS_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${categoryFilter === cat.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-gray-600 hover:bg-slate-100'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search & Status Filter */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="col-span-2 relative">
                    <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search student or plan..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-slate-50 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-gray-200 bg-slate-50 text-xs outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="SETTLED">Settled</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="RESTRUCTURED">Restructured</option>
                  </select>
                </div>

                {/* Accounts List */}
                {loading ? (
                  <div className="py-16 text-center text-sm text-gray-400">Loading fee accounts...</div>
                ) : accounts.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                    <Receipt size={32} className="text-gray-300" />
                    <span>No fee accounts found.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                    {accounts.map(acc => {
                      const isSelected = selectedAccount?.id === acc.id;
                      return (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${isSelected ? 'border-indigo-400 bg-indigo-50/40 shadow-sm' : 'border-gray-100 hover:border-indigo-200 bg-white hover:bg-slate-50/60'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900">{acc.student_name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {acc.student_id_code || ''} • {acc.batch_name || acc.class_category || 'No Batch'}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(acc.status)}`}>
                                  {acc.status}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {acc.plan_name || acc.plan_code || acc.plan_type}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Balance</p>
                              <p className="text-sm font-bold text-indigo-700">{currency(acc.balance_due)}</p>
                              {acc.overdue_amount > 0 && (
                                <p className="text-[10px] font-semibold text-red-600 mt-0.5">
                                  {currency(acc.overdue_amount)} Overdue
                                </p>
                              )}
                            </div>
                          </div>

                          {canManageFees && (
                            <div className="mt-2 pt-2 border-t border-gray-100/80 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEntity({ type: 'ACCOUNT', data: { ...acc } });
                                }}
                                className="p-1 rounded bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 text-xs shadow-xs"
                                title="Edit Account"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEntity('ACCOUNT', acc.id);
                                }}
                                className="p-1 rounded bg-white border border-gray-200 text-gray-500 hover:text-red-600 text-xs shadow-xs"
                                title="Delete Account"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (Detail - Selected Account) */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[550px]">
                {!selectedAccount ? (
                  <div className="py-24 text-center text-gray-400 flex flex-col items-center gap-3">
                    <Receipt size={48} className="text-gray-300 opacity-60" />
                    <p className="text-base font-semibold text-gray-700">Select an Account</p>
                    <p className="text-sm text-gray-400 max-w-sm">
                      Choose an account from the left column to view balance breakdowns, installments, and payment controls.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Account Header Banner */}
                    <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100/60 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-extrabold text-gray-900">{selectedAccount.student_name}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusBadgeClass(selectedAccount.status)}`}>
                              {selectedAccount.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>ID: <strong className="text-gray-700">{selectedAccount.student_id_code || 'N/A'}</strong></span>
                            <span>Category: <strong className="text-gray-700">{selectedAccount.class_category || 'DANCE'}</strong></span>
                            <span>Batch: <strong className="text-gray-700">{selectedAccount.batch_name || 'N/A'}</strong></span>
                            {selectedAccount.trainer_name && (
                              <span>Trainer: <strong className="text-gray-700">{selectedAccount.trainer_name}</strong></span>
                            )}
                          </p>
                        </div>
                        {canManageFees && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingEntity({ type: 'ACCOUNT', data: { ...selectedAccount } })}
                              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 rounded-xl text-xs font-semibold shadow-xs"
                            >
                              Edit Account
                            </button>
                            <button
                              onClick={() => handleDeleteEntity('ACCOUNT', selectedAccount.id)}
                              className="px-3 py-1.5 bg-white border border-gray-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-xs"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 4 Mini Stat Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200/60 text-center">
                        <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-[11px] text-gray-500 font-medium">Total Due</p>
                          <p className="text-base font-bold text-gray-900">{currency(selectedAccount.total_due)}</p>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-[11px] text-gray-500 font-medium">Paid</p>
                          <p className="text-base font-bold text-emerald-600">{currency(selectedAccount.total_paid)}</p>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-[11px] text-gray-500 font-medium">Balance</p>
                          <p className="text-base font-bold text-indigo-600">{currency(selectedAccount.balance_due)}</p>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-[11px] text-gray-500 font-medium">Overdue</p>
                          <p className="text-base font-bold text-rose-600">{currency(selectedAccount.overdue_amount)}</p>
                        </div>
                      </div>
                    </div>

                    {/* 5 Action Sub-Tabs */}
                    <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
                      <button
                        onClick={() => setActiveSubTab('recordPayment')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeSubTab === 'recordPayment' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        Record Payment
                      </button>
                      <button
                        onClick={() => setActiveSubTab('restructure')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeSubTab === 'restructure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        Restructure
                      </button>
                      <button
                        onClick={() => setActiveSubTab('installments')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeSubTab === 'installments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        <span>Installments</span>
                        {selectedAccount.installments?.length > 0 && (
                          <span className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.2 rounded-full">
                            {selectedAccount.installments.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveSubTab('payments')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeSubTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        <span>Payments</span>
                        {selectedAccount.payments?.length > 0 && (
                          <span className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.2 rounded-full">
                            {selectedAccount.payments.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveSubTab('adjustments')}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeSubTab === 'adjustments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        <span>Adjustments</span>
                        {selectedAccount.adjustments?.length > 0 && (
                          <span className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.2 rounded-full">
                            {selectedAccount.adjustments.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* SUB-TAB 1: RECORD PAYMENT */}
                    {activeSubTab === 'recordPayment' && (
                      <form onSubmit={handleRecordPayment} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount (₹)*</label>
                            <input
                              type="number"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                              placeholder="e.g. 2500"
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Allocate to Installment</label>
                            <select
                              value={paymentForm.installment}
                              onChange={(e) => setPaymentForm(p => ({ ...p, installment: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            >
                              <option value="">Auto-allocate across pending installments</option>
                              {(selectedAccount.installments || []).map(inst => (
                                <option key={inst.id} value={inst.id}>
                                  #{inst.sequence_number} {inst.label} — {currency(inst.balance_amount)} balance
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
                            <select
                              value={paymentForm.payment_method}
                              onChange={(e) => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CARD">Card</option>
                              <option value="CHEQUE">Cheque</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Date & Time</label>
                            <input
                              type="datetime-local"
                              value={paymentForm.payment_date}
                              onChange={(e) => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / UTR</label>
                            <input
                              type="text"
                              value={paymentForm.reference}
                              onChange={(e) => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                              placeholder="Transaction ref #..."
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                          <textarea
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Optional notes regarding this fee transaction..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none min-h-[70px]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={saving || !canManageFees}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Receipt size={18} />
                          {saving ? 'Recording Payment...' : 'Record Payment'}
                        </button>
                      </form>
                    )}

                    {/* SUB-TAB 2: RESTRUCTURE */}
                    {activeSubTab === 'restructure' && (
                      <form onSubmit={handleRestructureSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Choose Template / Package</label>
                            <select
                              value={restructureForm.template_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                const pkg = feeStructures.find(f => String(f.id) === val);
                                setRestructureForm(p => ({
                                  ...p,
                                  template_id: val,
                                  total_due: pkg ? String(pkg.amount) : p.total_due,
                                }));
                              }}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            >
                              <option value="">Custom (No Template)</option>
                              {feeStructures.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.get_category_display || f.category} ({f.batch_type}) — {currency(f.amount)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Type</label>
                            <select
                              value={restructureForm.plan_type}
                              onChange={(e) => setRestructureForm(p => ({ ...p, plan_type: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            >
                              <option value="INSTALLMENT">Installment Plan</option>
                              <option value="MONTHLY">Monthly Plan</option>
                              <option value="PACKAGE">Full Package</option>
                              <option value="ONE_TIME">One Time</option>
                              <option value="CUSTOM">Custom</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">New Total Due (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={restructureForm.total_due}
                              onChange={(e) => setRestructureForm(p => ({ ...p, total_due: e.target.value }))}
                              placeholder="e.g. 15000"
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Due Day (1-31)</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={restructureForm.due_day}
                              onChange={(e) => setRestructureForm(p => ({ ...p, due_day: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Next Due Date</label>
                            <input
                              type="date"
                              value={restructureForm.next_due_date}
                              onChange={(e) => setRestructureForm(p => ({ ...p, next_due_date: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Restructuring*</label>
                          <textarea
                            value={restructureForm.notes}
                            onChange={(e) => setRestructureForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Reason for restructure (e.g., student switched from weekend to weekday, concession granted)..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none min-h-[70px]"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={saving || !canManageFees}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Repeat size={18} />
                          {saving ? 'Restructuring Plan...' : 'Apply Restructure'}
                        </button>
                      </form>
                    )}

                    {/* SUB-TAB 3: INSTALLMENTS */}
                    {activeSubTab === 'installments' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">Installment Schedule</h4>
                          {canManageFees && (
                            <button
                              onClick={() => {
                                setNewInstallmentForm({
                                  sequence_number: (selectedAccount.installments?.length || 0) + 1,
                                  label: `Installment ${(selectedAccount.installments?.length || 0) + 1}`,
                                  due_date: new Date().toISOString().split('T')[0],
                                  scheduled_amount: '',
                                  notes: '',
                                });
                                setIsInstallmentModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-colors"
                            >
                              <Plus size={14} /> Add Installment
                            </button>
                          )}
                        </div>

                        {(!selectedAccount.installments || selectedAccount.installments.length === 0) ? (
                          <div className="py-12 text-center text-sm text-gray-400 bg-slate-50 rounded-2xl border border-gray-100">
                            No installments configured for this fee account.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAccount.installments.map(inst => (
                              <div key={inst.id} className="p-3.5 rounded-2xl border border-gray-100 bg-slate-50 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">#{inst.sequence_number} {inst.label}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(inst.status)}`}>
                                      {inst.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">Due: {inst.due_date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">{currency(inst.scheduled_amount)}</p>
                                    <p className="text-xs text-indigo-600 font-medium">{currency(inst.balance_amount)} left</p>
                                  </div>
                                  {canManageFees && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setEditingEntity({ type: 'INSTALLMENT', data: { ...inst } })}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg bg-white border border-gray-200"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEntity('INSTALLMENT', selectedAccount.id, inst.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg bg-white border border-gray-200"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 4: PAYMENTS */}
                    {activeSubTab === 'payments' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900">Payment Transactions</h4>
                        {(!selectedAccount.payments || selectedAccount.payments.length === 0) ? (
                          <div className="py-12 text-center text-sm text-gray-400 bg-slate-50 rounded-2xl border border-gray-100">
                            No payment transactions recorded for this account.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAccount.payments.map(pay => (
                              <div key={pay.id} className="p-3.5 rounded-2xl border border-gray-100 bg-white shadow-xs flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">{pay.payment_id || `PAY-${pay.id}`}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {pay.mode_of_pay_display || pay.mode_of_pay}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {pay.pay_date} • {pay.remarks || 'No notes'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="text-base font-extrabold text-emerald-600">{currency(pay.paid_amount)}</p>
                                  {canManageFees && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setEditingEntity({ type: 'PAYMENT', data: { ...pay } })}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg bg-gray-50 border border-gray-200"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEntity('PAYMENT', selectedAccount.id, pay.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg bg-gray-50 border border-gray-200"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 5: ADJUSTMENTS */}
                    {activeSubTab === 'adjustments' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">Fee Adjustments</h4>
                          {canManageFees && (
                            <button
                              onClick={() => setIsAdjustmentModalOpen(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-colors"
                            >
                              <Plus size={14} /> Add Adjustment
                            </button>
                          )}
                        </div>

                        {(!selectedAccount.adjustments || selectedAccount.adjustments.length === 0) ? (
                          <div className="py-12 text-center text-sm text-gray-400 bg-slate-50 rounded-2xl border border-gray-100">
                            No adjustments recorded for this account.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAccount.adjustments.map(adj => (
                              <div key={adj.id} className="p-3.5 rounded-2xl border border-gray-100 bg-white shadow-xs flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">{adj.adjustment_type_display || adj.adjustment_type}</span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(adj.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{adj.reason}</p>
                                </div>
                                <p className={`text-base font-extrabold ${Number(adj.amount_delta) <= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                                  {Number(adj.amount_delta) > 0 ? `+${currency(adj.amount_delta)}` : currency(adj.amount_delta)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SPREADSHEET VIEW ─────────────────────────────────────── */}
        {mainTab === 'spreadsheet' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Spreadsheet Matrix</h2>
                <p className="text-sm text-gray-500">Cross-tabular student accounts and fee balances</p>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter sheet..."
                className="px-4 py-2 rounded-xl border border-gray-200 bg-slate-50 text-sm w-64 outline-none"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3.5 text-left">#</th>
                    <th className="px-4 py-3.5 text-left">Student Name</th>
                    <th className="px-4 py-3.5 text-left">Class Category</th>
                    <th className="px-4 py-3.5 text-left">Batch</th>
                    <th className="px-4 py-3.5 text-left">Plan / Package</th>
                    <th className="px-4 py-3.5 text-left">Status</th>
                    <th className="px-4 py-3.5 text-right">Total Due</th>
                    <th className="px-4 py-3.5 text-right">Total Paid</th>
                    <th className="px-4 py-3.5 text-right">Balance Due</th>
                    <th className="px-4 py-3.5 text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  {accounts.map((acc, idx) => (
                    <tr
                      key={acc.id}
                      onClick={() => { setSelectedAccountId(acc.id); setMainTab('accounts'); }}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{acc.student_name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClass(acc.class_category)}`}>
                          {acc.class_category || 'DANCE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{acc.batch_name || '-'}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{acc.plan_name || acc.plan_code || acc.plan_type}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(acc.status)}`}>
                          {acc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-900 font-semibold">{currency(acc.total_due)}</td>
                      <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">{currency(acc.total_paid)}</td>
                      <td className="px-4 py-3.5 text-right text-indigo-700 font-bold">{currency(acc.balance_due)}</td>
                      <td className="px-4 py-3.5 text-right text-rose-600 font-bold">{currency(acc.overdue_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PENDING STUDENTS ─────────────────────────────────────── */}
        {mainTab === 'pending_students' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students Pending Fee Account</h2>
                <p className="text-sm text-gray-500">Enrolled active students without an active fee account structure.</p>
              </div>
              {pendingStudents.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-sm font-bold rounded-xl">
                  <AlertCircle size={16} /> {pendingStudents.length} Students Pending
                </span>
              )}
            </div>

            {pendingStudents.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3 text-gray-400">
                <ShieldCheck size={52} className="text-emerald-500 opacity-80" />
                <h3 className="text-lg font-bold text-gray-800">All Clear!</h3>
                <p className="text-sm text-gray-500">Every active student has an active fee account created.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingStudents.map(student => (
                  <div key={student.id} className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">{student.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{student.student_id}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClass(student.class_category)}`}>
                          {student.class_category || 'DANCE'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        <p className="flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" />
                          <span>{student.contact_no || student.whatsapp_no || 'No phone'}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Layers size={13} className="text-gray-400" />
                          <span>Batch: {student.batch_name || 'Unassigned'}</span>
                        </p>
                        {student.suggested_package_name && (
                          <p className="text-indigo-600 font-medium pt-1">
                            Suggested: {student.suggested_package_name} ({currency(student.suggested_amount)})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setCreateForm({
                            ...emptyCreateAccount,
                            student: student.id,
                            active_package: student.suggested_package_id || '',
                            plan_name: student.suggested_package_name || '',
                            total_due: student.suggested_amount || '',
                          });
                          setIsCreateModalOpen(true);
                        }}
                        className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Create Fee Account
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ALL FEES TRANSACTIONS ───────────────────────────────── */}
        {mainTab === 'all_fees' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">All Fees Collection Ledger</h2>
                <p className="text-sm text-gray-500">Historical log of all payment receipts and transaction records</p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold shadow-xs"
              >
                <Download size={15} /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3.5 text-left">Receipt ID</th>
                    <th className="px-4 py-3.5 text-left">Date</th>
                    <th className="px-4 py-3.5 text-left">Student / Group</th>
                    <th className="px-4 py-3.5 text-left">Fees Type</th>
                    <th className="px-4 py-3.5 text-left">Mode</th>
                    <th className="px-4 py-3.5 text-left">Status</th>
                    <th className="px-4 py-3.5 text-right">Amount Paid</th>
                    <th className="px-4 py-3.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  {allPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.payment_id}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.pay_date}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{p.student_name || p.wedding_group_name || '-'}</div>
                        <div className="text-xs text-gray-400">{p.student_id_code || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.fees_type_detail?.category || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {p.mode_of_pay_display || p.mode_of_pay}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{currency(p.paid_amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">{currency(p.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5: FEE CATALOG ─────────────────────────────────────────── */}
        {mainTab === 'catalog' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Fee Structure Catalog</h2>
                <p className="text-sm text-gray-500">Standard studio rate packages and pricing structures</p>
              </div>
              {canManageFees && (
                <button
                  onClick={() => {
                    setStructureForm({
                      name: '',
                      category: 'DANCE',
                      batch_type: 'WEEKEND',
                      admission_fee: '0.00',
                      amount: '0.00',
                      duration_months: 1,
                      sessions_per_week: 2,
                      is_active: true,
                    });
                    setEditingStructureId(null);
                    setIsCatalogModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold shadow-md transition-colors"
                >
                  <Plus size={16} /> New Package
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feeStructures.map(fs => (
                <div key={fs.id} className="p-5 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50/60 shadow-xs flex flex-col justify-between group relative">
                  {canManageFees && (
                    <div className="absolute top-4 right-4 hidden group-hover:flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-xs border border-gray-200">
                      <button
                        onClick={() => {
                          setEditingStructureId(fs.id);
                          setStructureForm({
                            name: fs.name || '',
                            category: fs.category,
                            batch_type: fs.batch_type || 'WEEKEND',
                            admission_fee: fs.admission_fee || '0.00',
                            amount: fs.amount || '0.00',
                            duration_months: fs.duration_months || 1,
                            sessions_per_week: fs.sessions_per_week || 2,
                            is_active: fs.is_active,
                          });
                          setIsCatalogModalOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-indigo-600 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteStructure(fs.id)}
                        className="p-1 text-gray-500 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClass(fs.category)}`}>
                        {fs.category_display || fs.category}
                      </span>
                      <span className="text-xs font-bold text-gray-500 uppercase">{fs.batch_type_display || fs.batch_type}</span>
                    </div>

                    {fs.name && (
                      <h4 className="text-sm font-bold text-gray-900 mt-2">{fs.name}</h4>
                    )}

                    <div className="mt-4">
                      <p className="text-xs text-gray-400">Total Fee</p>
                      <p className="text-2xl font-black text-indigo-700">{currency(fs.amount)}</p>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {Number(fs.admission_fee) > 0 && (
                        <p>Admission: <strong className="text-gray-700">{currency(fs.admission_fee)}</strong></p>
                      )}
                      <p>Duration: <strong className="text-gray-700">{fs.duration_months} Month{fs.duration_months > 1 ? 's' : ''}</strong></p>
                      <p>Sessions: <strong className="text-gray-700">{fs.sessions_per_week} classes / week</strong></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: SETTINGS & POLICIES ─────────────────────────────────── */}
        {mainTab === 'policies' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Fee Attendance Policies</h2>
              <p className="text-sm text-gray-500 mt-1">Configure studio attendance enforcement rules linked to fee statuses.</p>
            </div>

            <form onSubmit={handleSavePolicies} className="space-y-4">
              <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feePolicies.block_without_fee_account}
                    onChange={(e) => setFeePolicies(p => ({ ...p, block_without_fee_account: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900">Block attendance for students without a Fee Account</div>
                    <div className="text-xs text-gray-500 mt-0.5">Trainers cannot mark attendance for any student who has not been enrolled into a fee structure.</div>
                  </div>
                </label>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feePolicies.pending_if_overdue}
                    onChange={(e) => setFeePolicies(p => ({ ...p, pending_if_overdue: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900">Send to Pending Approval if Fee Account is Overdue</div>
                    <div className="text-xs text-gray-500 mt-0.5">If marked Present while fee installments are overdue, attendance requires managerial clearance.</div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving || !canManageFees}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Policies'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE FEE ACCOUNT ──────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Create Student Fee Account</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student*</label>
                <select
                  value={createForm.student}
                  onChange={(e) => setCreateForm(p => ({ ...p, student: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                  required
                >
                  <option value="">Choose student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_id}) — {s.class_category || 'DANCE'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Package Template</label>
                <select
                  value={createForm.active_package}
                  onChange={(e) => {
                    const val = e.target.value;
                    const pkg = feeStructures.find(f => String(f.id) === val);
                    const pkgTitle = pkg ? (pkg.name || `${pkg.category_display || pkg.category} (${pkg.batch_type || 'Weekend'})`) : p.plan_name;
                    setCreateForm(p => ({
                      ...p,
                      active_package: val,
                      plan_name: pkgTitle,
                      total_due: pkg ? String(pkg.amount) : p.total_due,
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                >
                  <option value="">Custom Package</option>
                  {feeStructures.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name || `${f.category_display || f.category} (${f.batch_type || 'Weekend'})`} — {currency(f.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Type</label>
                  <select
                    value={createForm.plan_type}
                    onChange={(e) => setCreateForm(p => ({ ...p, plan_type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                  >
                    <option value="PACKAGE">Package</option>
                    <option value="INSTALLMENT">Installment</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_TIME">One Time</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Due (₹)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.total_due}
                    onChange={(e) => setCreateForm(p => ({ ...p, total_due: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={createForm.due_day}
                    onChange={(e) => setCreateForm(p => ({ ...p, due_day: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Installment Generation Section */}
              {(createForm.plan_type === 'INSTALLMENT' || createForm.plan_type === 'MONTHLY') && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <div className="text-xs font-bold text-indigo-900">Auto-Generate Installment Schedule</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Installment Count</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={createForm.installment_count}
                        onChange={(e) => setCreateForm(p => ({ ...p, installment_count: e.target.value }))}
                        placeholder="e.g. 3"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Amount per Installment</label>
                      <input
                        type="number"
                        step="0.01"
                        value={createForm.installment_amount}
                        onChange={(e) => setCreateForm(p => ({ ...p, installment_amount: e.target.value }))}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm outline-none min-h-[60px]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT ENTITY (Account, Installment, Payment) ─────────── */}
      {editingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit {editingEntity.type}</h3>
            <form onSubmit={handleSaveEditEntity} className="space-y-4">
              {editingEntity.type === 'ACCOUNT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Due</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingEntity.data.total_due}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, total_due: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={editingEntity.data.status}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, status: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="SETTLED">SETTLED</option>
                      <option value="OVERDUE">OVERDUE</option>
                      <option value="RESTRUCTURED">RESTRUCTURED</option>
                    </select>
                  </div>
                </>
              )}

              {editingEntity.type === 'INSTALLMENT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingEntity.data.scheduled_amount}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, scheduled_amount: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingEntity.data.due_date}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, due_date: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                  </div>
                </>
              )}

              {editingEntity.type === 'PAYMENT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Paid Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingEntity.data.paid_amount}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, paid_amount: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={editingEntity.data.pay_date}
                      onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, pay_date: e.target.value } })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingEntity(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD INSTALLMENT ─────────────────────────────────────── */}
      {isInstallmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Custom Installment</h3>
            <form onSubmit={handleAddInstallment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sequence #</label>
                  <input
                    type="number"
                    value={newInstallmentForm.sequence_number}
                    onChange={(e) => setNewInstallmentForm(p => ({ ...p, sequence_number: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={newInstallmentForm.label}
                    onChange={(e) => setNewInstallmentForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. 2nd Installment"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date*</label>
                  <input
                    type="date"
                    value={newInstallmentForm.due_date}
                    onChange={(e) => setNewInstallmentForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Amount*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInstallmentForm.scheduled_amount}
                    onChange={(e) => setNewInstallmentForm(p => ({ ...p, scheduled_amount: e.target.value }))}
                    placeholder="e.g. 3500"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsInstallmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md"
                >
                  Add Installment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD ADJUSTMENT ──────────────────────────────────────── */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Fee Adjustment</h3>
            <form onSubmit={handleAddAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Type</label>
                <select
                  value={newAdjustmentForm.adjustment_type}
                  onChange={(e) => setNewAdjustmentForm(p => ({ ...p, adjustment_type: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                >
                  <option value="DISCOUNT">Discount (Reduces Due)</option>
                  <option value="WAIVER">Waiver (Reduces Due)</option>
                  <option value="CONCESSION">Concession (Reduces Due)</option>
                  <option value="REFUND">Refund</option>
                  <option value="MANUAL">Manual Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Delta (₹)*</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAdjustmentForm.amount_delta}
                  onChange={(e) => setNewAdjustmentForm(p => ({ ...p, amount_delta: e.target.value }))}
                  placeholder="e.g. -500 (reduction) or +500 (extra charge)"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason*</label>
                <textarea
                  value={newAdjustmentForm.reason}
                  onChange={(e) => setNewAdjustmentForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g. Sibling discount approved..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none min-h-[60px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: FEE CATALOG PACKAGE ─────────────────────────────────── */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingStructureId ? 'Edit Fee Package' : 'Create Fee Package'}
            </h3>
            <form onSubmit={handleSaveStructure} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Package Name (Optional)</label>
                <input
                  type="text"
                  value={structureForm.name || ''}
                  onChange={(e) => setStructureForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Dance Weekend - Regular"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Class Category</label>
                  <select
                    value={structureForm.category}
                    onChange={(e) => setStructureForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  >
                    <option value="DANCE">Dance</option>
                    <option value="ZUMBA">Zumba</option>
                    <option value="YOGA">Yoga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Schedule</label>
                  <select
                    value={structureForm.batch_type}
                    onChange={(e) => setStructureForm(p => ({ ...p, batch_type: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  >
                    <option value="WEEKEND">Weekend</option>
                    <option value="WEEKDAY">Weekday</option>
                    <option value="ALL_DAYS">All Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fee Amount (₹)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structureForm.amount}
                    onChange={(e) => setStructureForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 2500"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Admission Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structureForm.admission_fee}
                    onChange={(e) => setStructureForm(p => ({ ...p, admission_fee: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={structureForm.duration_months}
                    onChange={(e) => setStructureForm(p => ({ ...p, duration_months: Number(e.target.value) }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sessions / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={structureForm.sessions_per_week}
                    onChange={(e) => setStructureForm(p => ({ ...p, sessions_per_week: Number(e.target.value) }))}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md"
                >
                  {editingStructureId ? 'Save Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
