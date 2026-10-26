import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  Download,
  FileCheck2,
  Lock,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import ReceiptTemplateRenderer from '../Components/fees/ReceiptTemplateRenderer';
import {
  exportReceiptElementToPdf,
  formatINR,
  getDefaultIssuerSnapshot,
  printReceiptElement,
} from '../utils/receiptUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ReceiptVerifyPage() {
  const { token } = useParams();
  const printRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showFullDocument, setShowFullDocument] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE_URL}/fees/receipts/verify/${encodeURIComponent(token || '')}/`
        );
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok) {
          setError(json.detail || 'No official receipt matches this verification token.');
          setData(json);
        } else {
          setData(json);
        }
      } catch {
        if (mounted) {
          setError('Unable to reach verification server. Please check your connection.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verifyToken();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleDownloadPdf = async () => {
    if (!printRef.current || !data) return;
    try {
      setExporting(true);
      const rNo = (data.receipt_number || 'Verified').replace(/\//g, '_');
      await exportReceiptElementToPdf(printRef.current, `Verified_Receipt_${rNo}.pdf`, false);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current || !data) return;
    printReceiptElement(printRef.current, `Verified_Receipt_${data.receipt_number || ''}`);
  };

  const company = data?.company || 'FLAG';
  const defaultIssuer = getDefaultIssuerSnapshot(company);
  const issuer = { ...defaultIssuer, ...(data?.issuer_snapshot || {}) };
  const vStatus = data?.verification_status || (error ? 'NOT_FOUND' : 'UNKNOWN');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Academy Trust Header */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center font-black text-white text-sm tracking-tighter shadow"
              style={{ backgroundColor: issuer.brand_color || '#4f46e5' }}
            >
              {company}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white">
                {issuer.organization_name || `${company} Official Receipt`}
              </h1>
              <p className="text-[11px] text-slate-400">
                Cryptographic Receipt & Tax Invoice Verification Portal
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-400/20 px-3 py-1.5 rounded-xl">
            <Lock size={13} /> HMAC-SHA256 Protected
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-700 shadow-2xl">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-slate-900">
              Verifying Cryptographic Signature...
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">Token: {token}</p>
          </div>
        ) : error || vStatus === 'NOT_FOUND' || vStatus === 'TAMPER_WARNING' ? (
          <div className="bg-white rounded-3xl p-8 text-slate-900 shadow-2xl border-4 border-red-500 space-y-4">
            <div className="flex items-center gap-4 text-red-600">
              <div className="p-3.5 rounded-2xl bg-red-100 shrink-0">
                <ShieldAlert size={34} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-red-600 block">
                  Security Alert • Verification Failed
                </span>
                <h2 className="text-2xl font-black text-slate-900">
                  {vStatus === 'TAMPER_WARNING'
                    ? 'Cryptographic Signature Mismatch'
                    : 'Unverified or Invalid Receipt Token'}
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {error ||
                'This receipt token could not be verified against the official FLAG German Academy ledger.'}
            </p>
            <div className="p-3.5 rounded-xl bg-slate-100 text-xs font-mono text-slate-600">
              Scanned Token: {token}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
            {/* Status Banner */}
            {vStatus === 'VALID' && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                    <ShieldCheck size={32} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 block">
                      Official Ledger Verification Passed
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      AUTHENTIC & VERIFIED RECEIPT
                    </h2>
                    <p className="text-xs text-emerald-100">
                      Cryptographically signed and active in the official academy register.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right bg-black/15 px-4 py-2.5 rounded-2xl">
                  <span className="text-[10px] uppercase text-emerald-100 font-bold block">
                    Verified Amount
                  </span>
                  <span className="text-2xl font-black text-white">
                    {formatINR(data.total_amount)}
                  </span>
                </div>
              </div>
            )}

            {vStatus === 'VOID' && (
              <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/20">
                  <Ban size={32} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-100 block">
                    Cancelled Document Notice
                  </span>
                  <h2 className="text-2xl font-black">RECEIPT VOIDED / CANCELLED</h2>
                  <p className="text-xs text-red-100 mt-0.5">
                    Reason: {data.void_reason || 'Cancelled by Accounts Department'}
                  </p>
                </div>
              </div>
            )}

            {vStatus === 'DRAFT' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/20">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 block">
                    Unissued Document Notice
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">DRAFT / UNISSUED RECEIPT</h2>
                  <p className="text-xs text-amber-100 mt-0.5">
                    This receipt is currently in DRAFT status and has not yet been officially issued as proof of payment.
                  </p>
                </div>
              </div>
            )}

            {vStatus !== 'VALID' && vStatus !== 'VOID' && vStatus !== 'DRAFT' && (
              <div className="bg-amber-500 text-white p-6 flex items-center gap-4">
                <AlertTriangle size={32} />
                <div>
                  <h2 className="text-xl font-black uppercase">Status: {vStatus}</h2>
                  <p className="text-xs">This document is currently marked as {data.status}.</p>
                </div>
              </div>
            )}

            {/* Certificate Details Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Receipt Number
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {data.receipt_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Issue Date
                  </span>
                  <span className="font-bold text-slate-800">
                    {data.issue_date
                      ? new Date(data.issue_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Payment Mode
                  </span>
                  <span className="font-bold text-slate-800">{data.payment_method}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Reference / UTR
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {data.payment_reference || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                    Recipient / Student Details
                  </span>
                  <div className="text-base font-extrabold text-slate-900">
                    {data.recipient_name}
                  </div>
                  {data.student_enrollment_code && (
                    <div className="text-slate-600">
                      <strong>Student ID:</strong> {data.student_enrollment_code}
                    </div>
                  )}
                  <div className="text-slate-600">
                    <strong>Billed To:</strong> {data.billed_to_type || 'STUDENT'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                    Academic Context
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {data.course_or_package_name || 'Standard Program'}
                  </div>
                  <div className="text-slate-600">
                    <strong>Batch & Campus:</strong>{' '}
                    {[data.batch_name, data.campus_name].filter(Boolean).join(' • ') || '-'}
                  </div>
                  {data.installment_label && (
                    <div className="text-slate-600">
                      <strong>Installment:</strong> {data.installment_label}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in Words & Cryptographic Metadata */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block">
                    Verified Amount in Words
                  </span>
                  <span className="text-xs font-bold text-slate-900 italic">
                    {data.amount_in_words}
                  </span>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] text-slate-600">
                  <div>
                    HMAC Seal: <strong className="text-slate-900">{data.signature_prefix}</strong>
                  </div>
                  <div>Revision: v{data.version || 1}</div>
                </div>
              </div>

              {/* Actions to View / Download Official A4 Receipt */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowFullDocument((v) => !v)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2"
                >
                  <FileCheck2 size={15} />
                  {showFullDocument ? 'Hide Full A4 Document' : 'Preview Full A4 Receipt'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer size={15} /> Print Copy
                  </button>
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={handleDownloadPdf}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Download size={15} />
                    {exporting ? 'Generating PDF...' : 'Download Verified PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expandable A4 Document Preview */}
        {data && showFullDocument && (
          <div className="overflow-x-auto bg-slate-800/80 p-4 rounded-3xl border border-slate-700 flex justify-center">
            <div className="shadow-2xl">
              <ReceiptTemplateRenderer receipt={data} />
            </div>
          </div>
        )}

        {/* Hidden 1:1 A4 Target for PDF/Print */}
        {data && (
          <div
            style={{
              position: 'fixed',
              left: '-10000px',
              top: 0,
              width: '210mm',
              pointerEvents: 'none',
              zIndex: -1,
            }}
            aria-hidden="true"
          >
            <ReceiptTemplateRenderer receipt={data} containerRef={printRef} />
          </div>
        )}
      </div>
    </div>
  );
}
