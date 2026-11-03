import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import ReceiptStudioModal from '../../Components/fees/ReceiptStudioModal';
import ReceiptsWorkspace from '../../Components/fees/ReceiptsWorkspace';
import ReceiptTemplateRenderer from '../../Components/fees/ReceiptTemplateRenderer';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Filter,
  Landmark,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatINR,
  getDefaultIssuerSnapshot,
  printReceiptElement,
} from '../../utils/receiptUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const CANONICAL_COMPANIES = [
  {
    code: 'FLAG',
    name: 'FLAG German Language Academy',
    subtitle: 'Foreign Language Academy for Global Careers',
    prefix: 'FLAG',
    brand_color: '#312e81',
    divisions: ['FLG-KOC', 'FLG-KTM'],
    currency: 'INR',
    is_active: true,
  },
  {
    code: 'FDS',
    name: 'FILMAATIC Dance Studio',
    subtitle: 'Dance • Fitness • Wedding Choreography',
    prefix: 'FDS',
    brand_color: '#4f46e5',
    divisions: ['Kottayam', 'Kochi'],
    currency: 'INR',
    is_active: true,
  },
  {
    code: 'LP',
    name: 'Life Planner Universal',
    subtitle: 'Study Abroad & Global Processing',
    prefix: 'LP',
    brand_color: '#0f766e',
    divisions: ['Study Abroad', 'GCC Students'],
    currency: 'INR',
    is_active: true,
  },
];

export default function GlobalFeesPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();

  const getToken = useCallback(async () => accessToken || (await refreshAccessToken()), [accessToken, refreshAccessToken]);

  // Company management state
  const [companies, setCompanies] = useState(CANONICAL_COMPANIES);
  const [activeCompany, setActiveCompany] = useState(() => {
    if (user?.company === 'LP') return 'LP';
    if (user?.company === 'FDS') return 'FDS';
    return 'FLAG';
  });

  // Active dataset state (strictly company-isolated)
  const [students, setStudents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'receipts'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Ledger / Student selection
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Receipt Studio & Preview state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialStudent, setStudioInitialStudent] = useState(null);
  const [studioInitialReceipt, setStudioInitialReceipt] = useState(null);

  // Direct Viewing & Printing Modal
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const printPreviewRef = useRef(null);

  // Active company reference to discard stale async responses
  const activeCompanyRef = useRef(activeCompany);
  useEffect(() => {
    activeCompanyRef.current = activeCompany;
  }, [activeCompany]);

  // Fetch company registry
  useEffect(() => {
    let isSubscribed = true;
    const fetchCompanies = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/fees/companies/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isSubscribed && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
        }
      } catch {
        // Fallback to canonical list silently
      }
    };
    fetchCompanies();
    return () => {
      isSubscribed = false;
    };
  }, [getToken]);

  // Fetch company student records with strict zero-bleed data isolation
  const fetchStudents = useCallback(async (targetCompany) => {
    const companyToLoad = targetCompany || activeCompanyRef.current;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/fees/students/?company=${encodeURIComponent(companyToLoad)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // Verify the response still matches the currently active company
      if (activeCompanyRef.current !== companyToLoad) {
        return; // Discard stale response to prevent cross-company leakage
      }

      if (!res.ok) {
        setStudents([]);
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : [];

      // Double-check isolation: verify records do not carry foreign company tag
      const isolatedList = list.filter((item) => {
        if (item.company) {
          return item.company.toUpperCase() === companyToLoad.toUpperCase();
        }
        return true;
      });

      setStudents(isolatedList);

      // Also fetch company fee accounts for receipt studio and ledger linking
      try {
        if (companyToLoad.toUpperCase() === 'FLAG') {
          const accRes = await fetch(`${API_BASE_URL}/fees/accounts/?company=FLAG`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (accRes.ok && activeCompanyRef.current === companyToLoad) {
            const accData = await accRes.json();
            setAccounts(Array.isArray(accData) ? accData : (accData.results || []));
          }
        } else if (companyToLoad.toUpperCase() === 'FDS') {
          const accRes = await fetch(`${API_BASE_URL}/fds/fee-accounts/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (accRes.ok && activeCompanyRef.current === companyToLoad) {
            const accData = await accRes.json();
            setAccounts(Array.isArray(accData) ? accData : (accData.results || []));
          }
        } else if (companyToLoad.toUpperCase() === 'LP') {
          const lpAccounts = isolatedList.map((s) => ({
            id: s.id,
            student: s.id,
            student_name: s.student_name,
            plan_name: s.division || 'Processing Fee',
            balance_due: s.balance_due,
            total_due: s.total_fee,
            total_paid: s.total_paid,
            company: 'LP',
          }));
          if (activeCompanyRef.current === companyToLoad) {
            setAccounts(lpAccounts);
          }
        }
      } catch (accErr) {
        console.warn('Error loading company fee accounts', accErr);
      }
    } catch {
      if (activeCompanyRef.current === companyToLoad) {
        setStudents([]);
        setAccounts([]);
      }
    } finally {
      if (activeCompanyRef.current === companyToLoad) {
        setLoading(false);
      }
    }
  }, [getToken]);

  // Immediate State Reset & Switch Handler
  const handleCompanyChange = (newCompany) => {
    if (newCompany === activeCompany) return;

    // 1. IMMEDIATELY WIPE ALL DATA TO PREVENT CROSS-COMPANY DATA BLEED
    setStudents([]);
    setAccounts([]);
    setSelectedStudent(null);
    setStudioInitialStudent(null);
    setStudioInitialReceipt(null);
    setViewingReceipt(null);
    setStudioOpen(false);
    setSearch('');
    setStatusFilter('ALL');

    // 2. Set new active company
    setActiveCompany(newCompany);
    activeCompanyRef.current = newCompany;

    // 3. Trigger clean fetch for the target company
    fetchStudents(newCompany);
  };

  // Initial load or company changes
  useEffect(() => {
    fetchStudents(activeCompany);
  }, [activeCompany, fetchStudents]);

  // Active Company Metadata
  const currentCompanyMeta = useMemo(() => {
    return (
      companies.find((c) => c.code === activeCompany) ||
      CANONICAL_COMPANIES.find((c) => c.code === activeCompany) || {
        code: activeCompany,
        name: `${activeCompany} Division`,
        brand_color: '#312e81',
      }
    );
  }, [companies, activeCompany]);

  // Computed Financial Metrics (Derived strictly from current company's loaded students)
  const financialKPIs = useMemo(() => {
    let totalFee = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let paidCount = 0;
    let overdueCount = 0;

    students.forEach((s) => {
      const fee = Number(s.total_fee || s.total_fees || 0);
      const paid = Number(s.total_paid || s.paid_amount || 0);
      const due = Number(s.balance_due || s.balance || Math.max(0, fee - paid));

      totalFee += fee;
      totalPaid += paid;
      totalDue += due;

      const st = String(s.status || '').toUpperCase();
      if (st === 'PAID') paidCount++;
      if (st === 'OVERDUE' || due > 0) overdueCount++;
    });

    return {
      totalFee,
      totalPaid,
      totalDue,
      studentCount: students.length,
      paidCount,
      overdueCount,
    };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = String(s.student_name || s.name || '').toLowerCase();
      const sid = String(s.student_id || s.roll_number || s.id || '').toLowerCase();
      const email = String(s.email || '').toLowerCase();
      const phone = String(s.phone || '').toLowerCase();
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        sid.includes(query) ||
        email.includes(query) ||
        phone.includes(query);

      const status = String(s.status || '').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && status === 'PAID') ||
        (statusFilter === 'PARTIAL' && (status === 'PARTIAL' || status === 'PARTIALLY_PAID')) ||
        (statusFilter === 'OVERDUE' && (status === 'OVERDUE' || Number(s.balance_due || 0) > 0)) ||
        (statusFilter === 'PENDING' && (status === 'PENDING' || status === 'UNPAID'));

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  // Action: Launch Receipt Studio for a student or general
  const handleOpenStudio = (student = null) => {
    setStudioInitialReceipt(null);
    if (student) {
      setStudioInitialStudent({
        id: student.id,
        student_id: student.student_id || student.roll_number || String(student.id),
        student_name: student.student_name || student.name,
        name: student.student_name || student.name,
        email: student.email || '',
        phone: student.phone || '',
        division: student.division || student.campus || '',
        balance_due: student.balance_due,
        total_fee: student.total_fee,
        fee_account_id: student.fee_account_id,
      });
    } else {
      setStudioInitialStudent(null);
    }
    setStudioOpen(true);
  };

  // Action: Print an individual receipt
  const handlePrintReceipt = async (receiptData) => {
    if (!receiptData) return;
    try {
      const targetTitle = `${activeCompany}_Receipt_${receiptData.receipt_number || 'Official'}`;
      if (printPreviewRef.current) {
        await printReceiptElement(printPreviewRef.current, targetTitle);
      } else {
        toast.error('Print element not ready');
      }
    } catch (err) {
      console.error('Print failed', err);
      toast.error('Failed to trigger printing');
    }
  };

  // Helper: Open View Receipt Modal with normalized template data
  const handleViewReceipt = (receipt) => {
    const issuer = getDefaultIssuerSnapshot(activeCompany);
    const normalized = {
      ...receipt,
      company: activeCompany,
      organization_name: issuer.organization_name,
      subtitle: issuer.subtitle,
      watermark_text: issuer.watermark_text,
      brand_color: issuer.brand_color,
      terms: issuer.terms,
      footer_note: issuer.footer_note,
      sac_code: issuer.sac_code || '999293',
      line_items: receipt.line_items || [
        {
          sl_no: 1,
          title: 'Course & Processing Tuition Fee',
          sac_code: '999293',
          amount: String(receipt.total_amount || receipt.amount || '0.00'),
          unit_price: String(receipt.total_amount || receipt.amount || '0.00'),
          quantity: '1',
          discount: '0.00',
        },
      ],
      net_amount: receipt.net_amount || receipt.total_amount || receipt.amount || 0,
      total_amount: receipt.total_amount || receipt.amount || 0,
      amount_paid: receipt.amount_paid || receipt.amount || 0,
      display_options: {
        show_ledger_summary: true,
        show_tax_breakdown: true,
        show_bank_details: true,
        show_signature_and_stamp: true,
        show_qr_verification: true,
        show_amount_in_words: true,
        show_sac_column: true,
        show_watermark: true,
        show_terms: true,
      },
    };
    setViewingReceipt(normalized);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" data-testid="global-fees-page">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header & Dynamic Company Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
                style={{ backgroundColor: currentCompanyMeta.brand_color || '#312e81' }}
              >
                <Landmark size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight" data-testid="page-title">
                    Global Fees & Accounts
                  </h1>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white"
                    style={{ backgroundColor: currentCompanyMeta.brand_color || '#312e81' }}
                    data-testid="active-company-badge"
                  >
                    {activeCompany}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Multi-company fee records, ledgers, and official receipt studio with strict data isolation
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchStudents(activeCompany)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Refresh fee records"
                data-testid="refresh-btn"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenStudio()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                style={{ backgroundColor: currentCompanyMeta.brand_color || '#312e81' }}
                data-testid="issue-receipt-btn"
              >
                <Plus size={16} />
                <span>Issue Receipt / Invoice</span>
              </button>
            </div>
          </div>

          {/* Dynamic Company Selection Tabs */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} />
                Select Active Company:
              </span>
              <div
                className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1"
                role="tablist"
                aria-label="Active Company"
              >
                {companies.map((comp) => {
                  const isActive = comp.code === activeCompany;
                  return (
                    <button
                      key={comp.code}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleCompanyChange(comp.code)}
                      data-testid={`company-tab-${comp.code}`}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: comp.brand_color || '#64748b' }}
                      />
                      <span>{comp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                        {comp.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-cards-grid">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Fee Volume</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900" data-testid="kpi-total-volume">
                {formatINR(financialKPIs.totalFee)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {currentCompanyMeta.name} total tuition
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Collected</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-emerald-600" data-testid="kpi-total-paid">
                {formatINR(financialKPIs.totalPaid)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {financialKPIs.paidCount} accounts settled in full
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Outstanding Balance</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-rose-600" data-testid="kpi-total-due">
                {formatINR(financialKPIs.totalDue)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {financialKPIs.overdueCount} accounts with pending dues
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900" data-testid="kpi-student-count">
                {financialKPIs.studentCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Active in {activeCompany} division
              </p>
            </div>
          </div>
        </div>

        {/* View Tabs: Student Fee Records vs Receipts Register */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            data-testid="tab-students"
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={14} />
            <span>Student Fee Records & Ledgers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {students.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            data-testid="tab-receipts"
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'receipts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt size={14} />
            <span>Digital Receipts Register</span>
          </button>
        </div>

        {/* Tab 1: Student Fee Records & Ledger */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Fee Records Table */}
            <div
              className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all ${
                selectedStudent ? 'lg:col-span-2' : 'lg:col-span-3'
              }`}
            >
              {/* Filter and Search Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${activeCompany} students...`}
                    data-testid="student-search-input"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-600"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="status-filter-select"
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-indigo-600 cursor-pointer"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PAID">Settled (Paid)</option>
                    <option value="PARTIAL">Partially Paid</option>
                    <option value="OVERDUE">Overdue / Balance Due</option>
                    <option value="PENDING">Pending / Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Table Content */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw size={24} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-medium">Loading {activeCompany} student fee accounts...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2" data-testid="empty-students-msg">
                  <Building2 size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    No fee records found for {currentCompanyMeta.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Zero-bleed isolation active: No foreign records from other divisions are shown.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="students-table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">ID / Roll</th>
                        <th className="px-4 py-3">Campus / Division</th>
                        <th className="px-4 py-3 text-right">Total Fee</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Balance Due</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredStudents.map((s) => {
                        const fee = Number(s.total_fee || s.total_fees || 0);
                        const paid = Number(s.total_paid || s.paid_amount || 0);
                        const due = Number(s.balance_due || s.balance || Math.max(0, fee - paid));
                        const status = String(s.status || (due === 0 ? 'PAID' : 'PARTIAL')).toUpperCase();
                        const isSelected = selectedStudent?.id === s.id;

                        return (
                          <tr
                            key={s.id}
                            onClick={() => setSelectedStudent(isSelected ? null : s)}
                            data-testid={`student-row-${s.id}`}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-200' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{s.student_name || s.name}</span>
                                {s.account_count > 1 && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100"
                                    title={`${s.account_count} fee accounts linked`}
                                  >
                                    {s.account_count} Accounts
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {s.email || s.phone || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {s.student_id || s.roll_number || `STU-${s.id}`}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                {s.division || s.campus || activeCompany}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {formatINR(fee)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              {formatINR(paid)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">
                              {formatINR(due)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                  status === 'EXITED'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : status === 'PAID'
                                    : status === 'OVERDUE'
                                    ? 'bg-rose-100 text-rose-700'
                                    : status === 'PARTIAL' || status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenStudio(s)}
                                title="Issue receipt for student"
                                data-testid={`issue-receipt-btn-${s.id}`}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                              >
                                <Receipt size={13} />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Student Ledger Drawer / Details Panel */}
            {selectedStudent && (
              <div
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 self-start"
                data-testid="student-ledger-panel"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {selectedStudent.student_name || selectedStudent.name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        {selectedStudent.student_id || selectedStudent.roll_number || `STU-${selectedStudent.id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Ledger Breakdown Cards */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Operating Division:</span>
                    <span className="font-bold text-slate-900">{activeCompany}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Contact Email:</span>
                    <span className="font-medium text-slate-700">{selectedStudent.email || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Contact Phone:</span>
                    <span className="font-medium text-slate-700">{selectedStudent.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Total Course Fee:</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(selectedStudent.total_fee || selectedStudent.total_fees || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Total Settled:</span>
                    <span className="font-bold text-emerald-600">
                      {formatINR(selectedStudent.total_paid || selectedStudent.paid_amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5">
                    <span className="text-slate-500">Balance Due:</span>
                    <span className="font-bold text-rose-600">
                      {formatINR(
                        (selectedStudent.status === 'EXITED' || selectedStudent.student_status === 'exited')
                          ? 0
                          : (selectedStudent.balance_due ||
                              Math.max(
                                0,
                                Number(selectedStudent.total_fee || 0) - Number(selectedStudent.total_paid || 0)
                              ))
                      )}
                  </div>

                  {/* Multiple Fee Accounts Breakdown if student has > 1 account */}
                  {selectedStudent.fee_accounts && selectedStudent.fee_accounts.length > 1 && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Fee Accounts ({selectedStudent.fee_accounts.length})</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          Multi-Account
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                        {selectedStudent.fee_accounts.map((acc, idx) => (
                          <div key={acc.id || idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                            <div className="flex justify-between font-semibold text-slate-800">
                              <span className="truncate max-w-[130px]">{acc.plan_name || `Account #${acc.id}`}</span>
                              <span className="text-slate-900 font-bold">{formatINR(acc.total_due)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                              <span>Paid: <strong className="text-emerald-600">{formatINR(acc.total_paid)}</strong></span>
                              <span>Due: <strong className="text-rose-600">{formatINR((selectedStudent.status === 'EXITED' || selectedStudent.student_status === 'exited' || acc.status === 'EXITED') ? 0 : acc.balance_due)}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenStudio(selectedStudent)}
                    data-testid="ledger-issue-receipt-btn"
                    className="w-full py-2 px-3 text-xs font-bold text-white rounded-xl shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: currentCompanyMeta.brand_color || '#312e81' }}
                  >
                    <Plus size={14} />
                    <span>Generate Official Receipt</span>
                  </button>
                  {selectedStudent.latest_receipt_number && (
                    <button
                      type="button"
                      onClick={() =>
                        handleViewReceipt({
                          receipt_number: selectedStudent.latest_receipt_number,
                          recipient_name: selectedStudent.student_name || selectedStudent.name,
                          student_code: selectedStudent.student_id,
                          amount: selectedStudent.total_paid || selectedStudent.paid_amount || 0,
                          company: activeCompany,
                        })
                      }
                      data-testid="ledger-view-latest-btn"
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>View Latest Receipt ({selectedStudent.latest_receipt_number})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Digital Receipts Register Workspace */}
        {activeTab === 'receipts' && (
          <div className="space-y-4" data-testid="receipts-workspace-container">
            <ReceiptsWorkspace
              getToken={getToken}
              company={activeCompany}
              students={students}
              canManageFees={true}
              canCreateReceipts={true}
              canManageSettings={hasPermission('fees:accounts')}
            />
          </div>
        )}
      </main>

      {/* Modal 1: Receipt Studio Modal */}
      {studioOpen && (
        <ReceiptStudioModal
          isOpen={studioOpen}
          onClose={() => setStudioOpen(false)}
          getToken={getToken}
          company={activeCompany}
          initialStudent={studioInitialStudent}
          initialReceipt={studioInitialReceipt}
          students={students}
          accounts={accounts}
          onSaved={() => {
            fetchStudents(activeCompany);
            setStudioOpen(false);
          }}
        />
      )}

      {/* Modal 2: Direct Receipt Viewer & Print Element */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="receipt-view-modal"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {viewingReceipt.receipt_number || 'Official Fee Receipt'} — {activeCompany}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(viewingReceipt)}
                  data-testid="modal-print-btn"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Preview */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-xl rounded-sm p-4 w-[210mm] max-w-full">
                <ReceiptTemplateRenderer
                  receipt={viewingReceipt}
                  containerRef={printPreviewRef}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
