import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatINR, round2 } from '../../utils/receiptUtils';
import ReceiptSettingsModal from './ReceiptSettingsModal';
import ReceiptStudioModal from './ReceiptStudioModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ReceiptsWorkspace({
  getToken,
  company = 'FLAG',
  accounts = [],
  students = [],
  canManageFees = true,
  canCreateReceipts = canManageFees,
  canManageSettings = canManageFees,
}) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Studio & Settings Modals
  const [studioOpen, setStudioOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (company) params.append('company', company);
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (docTypeFilter) params.append('document_type', docTypeFilter);
      if (methodFilter) params.append('payment_method', methodFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`${API_BASE_URL}/fees/receipts/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load receipts register');
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, statusFilter, docTypeFilter, methodFilter, startDate, endDate]);

  const stats = useMemo(() => {
    return receipts.reduce(
      (acc, r) => {
        if (r.status === 'VOID') {
          acc.voidCount += 1;
        } else if (r.status === 'ISSUED') {
          acc.issuedCount += 1;
          if (r.document_type !== 'PROFORMA') {
            acc.totalCollected += round2(r.total_amount);
            acc.totalTax += round2(r.total_tax_amount);
          }
        }
        if (r.document_type === 'PROFORMA' || !r.payment) {
          acc.standaloneOrProforma += 1;
        }
        return acc;
      },
      { issuedCount: 0, totalCollected: 0, totalTax: 0, standaloneOrProforma: 0, voidCount: 0 }
    );
  }, [receipts]);

  const handleOpenCreateStudio = () => {
    setSelectedReceipt(null);
    setAutoDownloadPdf(false);
    setStudioOpen(true);
  };

  const handleOpenEditStudio = (receipt, downloadImmediately = false) => {
    setSelectedReceipt(receipt);
    setAutoDownloadPdf(downloadImmediately);
    setStudioOpen(true);
  };

  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      toast.error('Please enter a mandatory reason for voiding this receipt.');
      return;
    }
    try {
      setVoiding(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/receipts/${voidTarget.id}/void/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.void_reason || data.detail || 'Failed to void receipt');
      }
      toast.success(`Receipt ${voidTarget.receipt_number} marked as VOID`);
      setVoidTarget(null);
      setVoidReason('');
      fetchReceipts();
    } catch (err) {
      toast.error(err.message || 'Error voiding receipt');
    } finally {
      setVoiding(false);
    }
  };

  const handleDeleteDraft = async (receipt) => {
    if (!window.confirm(`Delete draft receipt ${receipt.receipt_number}?`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/receipts/${receipt.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Could not delete receipt');
      }
      toast.success('Draft receipt deleted');
      fetchReceipts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
            <Sparkles size={13} /> Enterprise Digital Receipt & GST Invoice Studio
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Official Receipts, GST Tax Invoices & Proforma Register
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Every receipt is backed by Financial Year sequential numbering, Indian currency words conversion,
            100% manual field/line-item override controls, and public QR cryptographic verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {canManageSettings && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Settings size={15} />
              Branding & GST Settings
            </button>
          )}
          {(canCreateReceipts || canManageFees) && (
            <button
              type="button"
              onClick={handleOpenCreateStudio}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all"
            >
              <FilePlus2 size={16} />
              Create Receipt / Invoice
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Issued Receipts</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.issuedCount}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            Verified & Cryptographically Sealed
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Receipted Volume</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatINR(stats.totalCollected)}
          </div>
          <span className="text-[11px] text-slate-400">Excludes voided & proforma quotes</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Computed GST Component</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{formatINR(stats.totalTax)}</div>
          <span className="text-[11px] text-slate-400">CGST + SGST / IGST breakdown</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Standalone / Voided</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.standaloneOrProforma}{' '}
            <span className="text-sm font-semibold text-rose-600">({stats.voidCount} Void)</span>
          </div>
          <span className="text-[11px] text-slate-400">Full audit revision history</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReceipts()}
              placeholder="Search receipt no, student, phone, UTR reference, course, or batch..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="DRAFT">Draft</option>
            <option value="VOID">Void / Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="">All Document Types</option>
            <option value="RECEIPT">Official Fee Receipt</option>
            <option value="TAX_INVOICE">GST Tax Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <option value="">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
            title="Start Issue Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
            title="End Issue Date"
          />

          <button
            type="button"
            onClick={fetchReceipts}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Filter / Refresh
          </button>
        </div>

        {/* Receipts Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading official receipts register...</div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileCheck2 size={42} className="mx-auto text-slate-300" />
            <div className="text-base font-bold text-slate-800">No receipts generated yet</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Generate a receipt in one click from any student payment in the Accounts tab, or click
              &ldquo;Create Receipt / Invoice&rdquo; above to launch the Studio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt No.</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Recipient / Student</th>
                  <th className="px-4 py-3 text-left">Course & Batch</th>
                  <th className="px-4 py-3 text-left">Mode & Ref</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status & Seal</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {receipts.map((r) => {
                  const isVoid = r.status === 'VOID';
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isVoid ? 'bg-red-50/20 opacity-75' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-extrabold text-slate-900 flex items-center gap-1.5">
                          {r.receipt_number}
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                            v{r.version || 1}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{r.document_type}</span> • <span>{r.template_style}</span>
                          {r.is_manual_override && (
                            <span className="text-indigo-600 font-semibold">• Customized</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-IN') : '-'}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{r.recipient_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {[r.student_enrollment_code, r.recipient_phone].filter(Boolean).join(' • ') ||
                            'Standalone Recipient'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {r.course_or_package_name || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {[r.batch_name, r.campus_name].filter(Boolean).join(' • ') || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{r.payment_method}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {r.payment_reference || 'No Ref'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div
                          className={`font-extrabold text-sm ${
                            isVoid ? 'line-through text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatINR(r.total_amount)}
                        </div>
                        {r.tax_mode !== 'NONE' && round2(r.total_tax_amount) > 0 && (
                          <div className="text-[10px] text-slate-500">
                            Incl. GST: {formatINR(r.total_tax_amount)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isVoid
                              ? 'bg-red-100 text-red-700'
                              : r.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isVoid ? <Ban size={11} /> : <ShieldCheck size={11} />}
                          {r.status}
                        </span>
                        {r.verification_token && (
                          <a
                            href={`/verify-receipt/${r.verification_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-indigo-600 hover:underline mt-0.5 font-mono"
                          >
                            Verify QR <ExternalLink size={9} className="inline" />
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudio(r, false)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs"
                          >
                            Studio / View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudio(r, true)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Download A4 PDF"
                          >
                            <Download size={14} />
                          </button>
                          {canManageFees && !isVoid && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidTarget(r);
                                setVoidReason('');
                              }}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                              title="Void / Cancel Receipt"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {canManageFees && r.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(r)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600"
                              title="Delete Draft"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Controlled Void Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-100">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Void Official Receipt {voidTarget.receipt_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Issued receipts cannot be deleted. Voiding stamps a permanent VOID watermark and updates
                  the public QR verification portal.
                </p>
              </div>
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Cancellation / Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Cheque dishonoured / Duplicate entry / Replaced by revised invoice..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow"
                >
                  {voiding ? 'Voiding...' : 'Confirm Void Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Studio Modal */}
      {studioOpen && (
        <ReceiptStudioModal
          isOpen={studioOpen}
          onClose={() => {
            setStudioOpen(false);
            setSelectedReceipt(null);
            setAutoDownloadPdf(false);
          }}
          getToken={getToken}
          company={company}
          initialReceipt={selectedReceipt}
          accounts={accounts}
          students={students}
          canManageFees={canManageFees}
          autoDownloadOnLoad={autoDownloadPdf}
          onSaved={() => fetchReceipts()}
        />
      )}

      {/* Receipt Settings Modal */}
      {settingsOpen && (
        <ReceiptSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          getToken={getToken}
          company={company}
        />
      )}
    </div>
  );
}
