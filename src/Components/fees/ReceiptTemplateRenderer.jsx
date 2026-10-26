import React, { useMemo } from 'react';
import {
  DEFAULT_DISPLAY_OPTIONS,
  getDefaultIssuerSnapshot,
  formatINR,
  generateQrMatrix,
  round2,
} from '../../utils/receiptUtils';

export function QrCodeSvg({ value, size = 84, fgColor = '#0f172a' }) {
  const matrix = useMemo(() => generateQrMatrix(value || 'FLAG'), [value]);
  const count = matrix.length;
  const quietZone = 2;
  const viewBoxSize = count + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className="bg-white rounded p-0.5 border border-slate-200"
      aria-label="Verification QR Code"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function DefaultAcademySealSvg({ orgName = 'FLAG GERMAN ACADEMY', brandColor = '#312e81' }) {
  const cleanOrg = (orgName || 'FLAG GERMAN ACADEMY').toUpperCase().slice(0, 28);
  return (
    <svg width="92" height="92" viewBox="0 0 120 120" className="opacity-85 select-none">
      <circle cx="60" cy="60" r="54" fill="none" stroke={brandColor} strokeWidth="3" />
      <circle cx="60" cy="60" r="48" fill="none" stroke={brandColor} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={brandColor} strokeWidth="1.5" />
      <text
        x="60"
        y="25"
        textAnchor="middle"
        fill={brandColor}
        fontSize="7.2"
        fontWeight="800"
        letterSpacing="1.1"
      >
        {cleanOrg.slice(0, 22)}
      </text>
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fill={brandColor}
        fontSize="11"
        fontWeight="900"
        letterSpacing="1.5"
      >
        OFFICIAL
      </text>
      <text
        x="60"
        y="69"
        textAnchor="middle"
        fill={brandColor}
        fontSize="9"
        fontWeight="800"
        letterSpacing="1.2"
      >
        VERIFIED SEAL
      </text>
      <text
        x="60"
        y="99"
        textAnchor="middle"
        fill={brandColor}
        fontSize="7"
        fontWeight="700"
        letterSpacing="1.2"
      >
        ★ ACCOUNTS DEPT ★
      </text>
    </svg>
  );
}

const formatDateShort = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DOC_TYPE_LABELS = {
  RECEIPT: 'OFFICIAL FEE RECEIPT',
  TAX_INVOICE: 'GST TAX INVOICE',
  PROFORMA: 'PROFORMA INVOICE / QUOTATION',
};

const METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer (NEFT/IMPS/RTGS)',
  UPI: 'UPI',
  CHEQUE: 'Cheque / DD',
  CARD: 'Debit / Credit Card',
  OTHER: 'Other',
};

export default function ReceiptTemplateRenderer({ receipt, containerRef }) {
  const data = receipt || {};
  const defaultIssuer = getDefaultIssuerSnapshot(data.company);
  const issuer = { ...defaultIssuer, ...(data.issuer_snapshot || {}) };
  const opts = { ...DEFAULT_DISPLAY_OPTIONS, ...(data.display_options || {}) };
  const brandColor = issuer.brand_color || '#312e81';
  const templateStyle = (data.template_style || 'EXECUTIVE').toUpperCase();

  const isVoid = data.status === 'VOID';
  const isDraft = data.status === 'DRAFT';
  const isSettled =
    !isVoid &&
    data.document_type !== 'PROFORMA' &&
    round2(data.ledger_balance_due) <= 0 &&
    round2(data.ledger_total_fee) > 0;
  const statusBadge = isVoid
    ? 'VOID / CANCELLED'
    : isSettled
    ? 'SETTLED'
    : data.payment_status_badge || (data.document_type === 'PROFORMA' ? 'PROFORMA' : 'PAID');

  const verifyUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = data.verification_token || 'preview-token';
    return `${origin}/verify-receipt/${token}`;
  }, [data.verification_token]);

  const items = Array.isArray(data.line_items) && data.line_items.length > 0
    ? data.line_items
    : [
        {
          sl_no: 1,
          title: data.course_or_package_name || 'Course Tuition Fee',
          description: '',
          sac_code: issuer.sac_code || '999293',
          period: data.installment_label || '',
          quantity: '1.00',
          unit_price: String(data.subtotal_amount || data.total_amount || '0.00'),
          discount: '0.00',
          amount: String(data.subtotal_amount || data.total_amount || '0.00'),
        },
      ];

  const hasTax = data.tax_mode && data.tax_mode !== 'NONE' && round2(data.total_tax_amount) > 0;
  const isInterState = data.supply_type === 'INTER_STATE';

  if (templateStyle === 'DUAL_SLIP') {
    return (
      <div
        ref={containerRef}
        className="bg-white text-slate-900 mx-auto relative overflow-hidden"
        style={{
          width: '210mm',
          maxHeight: '297mm',
          padding: '7mm 10mm',
          boxSizing: 'border-box',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          pageBreakInside: 'avoid',
          pageBreakAfter: 'avoid',
          overflow: 'hidden',
        }}
      >
        {['STUDENT COPY', 'OFFICE / ACCOUNTS COPY'].map((copyLabel, idx) => (
          <React.Fragment key={copyLabel}>
            {idx === 1 && (
              <div className="my-4 flex items-center gap-3 text-xs text-slate-400 select-none">
                <span className="font-mono">✂️</span>
                <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                <span className="uppercase tracking-widest font-semibold text-[10px]">
                  Cut Along Dashed Line — Retain Office Copy for Audit
                </span>
                <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              </div>
            )}

            <div className="border-2 border-slate-800 rounded-xl p-4 relative overflow-hidden bg-white">
              {opts.show_watermark && (
                <div
                  className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
                  style={{ opacity: 0.035, transform: 'rotate(-18deg)' }}
                >
                  <span className="text-4xl font-black tracking-widest uppercase text-slate-900">
                    {issuer.watermark_text || issuer.organization_name}
                  </span>
                </div>
              )}

              {isVoid && (
                <div
                  className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-20"
                  style={{ transform: 'rotate(-16deg)' }}
                >
                  <div className="border-4 border-red-600 text-red-600/80 px-6 py-1.5 rounded-lg font-black text-3xl tracking-widest uppercase bg-white/80">
                    VOID / CANCELLED
                  </div>
                </div>
              )}

              {/* Header */}
              <div
                className="flex items-start justify-between pb-3 mb-3 border-b-2"
                style={{ borderColor: brandColor }}
              >
                <div className="flex items-center gap-3">
                  {issuer.logo_url ? (
                    <img
                      src={issuer.logo_url}
                      alt="Logo"
                      className="h-11 w-auto object-contain receipt-logo"
                      style={{ maxHeight: '42px', maxWidth: '150px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      className="h-11 w-11 rounded-lg flex items-center justify-center text-white font-black text-lg tracking-tighter"
                      style={{ backgroundColor: brandColor }}
                    >
                      FLAG
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                      {issuer.organization_name}
                    </h2>
                    <p className="text-[11px] text-slate-500">{issuer.address}</p>
                    <p className="text-[10px] text-slate-500">
                      {[issuer.phone && `Tel: ${issuer.phone}`, issuer.email && `Email: ${issuer.email}`, issuer.gstin && `GSTIN: ${issuer.gstin}`]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider text-white uppercase"
                    style={{ backgroundColor: brandColor }}
                  >
                    {copyLabel}
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    No: <span className="font-mono">{data.receipt_number || 'AUTO-GENERATED'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Date: {formatDateShort(data.issue_date)}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Received From</span>
                  <span className="font-bold text-slate-900">{data.recipient_name || '-'}</span>
                  {data.student_enrollment_code && (
                    <span className="text-[10px] text-slate-500 block">ID: {data.student_enrollment_code}</span>
                  )}
                  {data.recipient_phone && (
                    <span className="text-[10px] text-slate-500 block">Ph: {data.recipient_phone}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Academic Details</span>
                  <span className="font-semibold text-slate-800">{data.course_or_package_name || '-'}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {[data.batch_name && `Batch: ${data.batch_name}`, data.campus_name && `Campus: ${data.campus_name}`]
                      .filter(Boolean)
                      .join(' • ') || 'Standard Enrollment'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Payment Details</span>
                  <span className="font-semibold text-slate-800">
                    {METHOD_LABELS[data.payment_method] || data.payment_method || 'UPI'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Ref: {data.payment_reference || 'N/A'} • Status: <strong>{statusBadge}</strong>
                  </span>
                  <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
                    Paid On: {formatDateShort(data.payment_date || data.issue_date)}
                  </span>
                </div>
              </div>

              {/* Compact Table */}
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                    <th className="py-1.5 px-2 text-left w-8">#</th>
                    <th className="py-1.5 px-2 text-left">Particulars / Fee Description</th>
                    {opts.show_sac_column && <th className="py-1.5 px-2 text-center w-20">SAC</th>}
                    <th className="py-1.5 px-2 text-left w-28">Installment</th>
                    <th className="py-1.5 px-2 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2 text-slate-500">{i + 1}</td>
                      <td className="py-1.5 px-2 font-semibold text-slate-900">
                        {item.title}
                        {item.description && (
                          <span className="block text-[10px] font-normal text-slate-500">{item.description}</span>
                        )}
                      </td>
                      {opts.show_sac_column && (
                        <td className="py-1.5 px-2 text-center font-mono text-[10px] text-slate-600">
                          {item.sac_code || '-'}
                        </td>
                      )}
                      <td className="py-1.5 px-2 text-[11px] text-slate-600">{item.period || data.installment_label || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatINR(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Ledger & Footer */}
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-7 space-y-1.5">
                  {opts.show_amount_in_words && (
                    <div className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Amount in Words</span>
                      <span className="font-semibold text-slate-800 italic">{data.amount_in_words}</span>
                    </div>
                  )}
                  {opts.show_ledger_summary && (
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] bg-indigo-50/60 border border-indigo-100 rounded px-2.5 py-1.5">
                      <div>
                        <span className="text-slate-500 block">Total Fee</span>
                        <strong className="text-slate-900">{formatINR(data.ledger_total_fee)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Prev. Paid</span>
                        <strong className="text-slate-700">{formatINR(data.ledger_previously_paid)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">This Receipt</span>
                        <strong className="text-emerald-700">{formatINR(data.total_amount)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Balance Due</span>
                        {isSettled ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            SETTLED
                          </span>
                        ) : (
                          <strong className="text-rose-700">{formatINR(data.ledger_balance_due)}</strong>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-5 flex items-center justify-between gap-2 border-t pt-2 border-slate-200">
                  {opts.show_qr_verification && (
                    <div className="flex items-center gap-2">
                      <QrCodeSvg value={verifyUrl} size={56} fgColor="#0f172a" />
                      <div className="text-[9px] text-slate-500 leading-tight">
                        <strong className="text-slate-700 block">Scan to Verify</strong>
                        ID: {(data.verification_token || 'PREVIEW').slice(0, 10)}
                      </div>
                    </div>
                  )}
                  <div className="text-right ml-auto">
                    {hasTax && opts.show_tax_breakdown && (
                      <div className="text-[10px] text-slate-500 mb-0.5">
                        Taxable: {formatINR(data.taxable_amount)} + GST: {formatINR(data.total_tax_amount)}
                      </div>
                    )}
                    <div
                      className="px-3 py-1.5 rounded-lg text-white font-black text-sm"
                      style={{ backgroundColor: brandColor }}
                    >
                      TOTAL: {formatINR(data.total_amount)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      {issuer.authorized_signatory_name || 'Authorized Signatory'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (templateStyle === 'GST_INVOICE') {
    return (
      <div
        ref={containerRef}
        className="bg-white text-slate-900 mx-auto relative overflow-hidden flex flex-col justify-between"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '12mm 14mm',
          boxSizing: 'border-box',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        {opts.show_watermark && (
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0.035, transform: 'rotate(-30deg)' }}
          >
            <span className="text-6xl font-black tracking-widest uppercase text-slate-900">
              {issuer.watermark_text || issuer.organization_name}
            </span>
          </div>
        )}

        {isVoid && (
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-20"
            style={{ transform: 'rotate(-24deg)' }}
          >
            <div className="border-8 border-red-600 text-red-600/80 px-10 py-3 rounded-2xl font-black text-5xl tracking-widest uppercase bg-white/85">
              VOID / CANCELLED
            </div>
          </div>
        )}

        <div>
          {/* Statutory Top Header */}
          <div className="border-2 border-slate-900">
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-widest uppercase">
                {DOC_TYPE_LABELS[data.document_type] || 'TAX INVOICE CUM FEE RECEIPT'}
              </span>
              <span className="text-[11px] font-mono">
                Original for Recipient • FY {data.financial_year || '2026-27'}
              </span>
            </div>

            <div className="grid grid-cols-12 border-b border-slate-900">
              <div className="col-span-7 p-4 border-r border-slate-900">
                <div className="flex items-start gap-3">
                  {issuer.logo_url ? (
                    <img
                      src={issuer.logo_url}
                      alt="Logo"
                      className="h-12 w-auto object-contain receipt-logo"
                      style={{ maxHeight: '48px', maxWidth: '160px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-black text-lg"
                      style={{ backgroundColor: brandColor }}
                    >
                      FLAG
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-slate-900 uppercase">{issuer.organization_name}</h1>
                    <p className="text-xs text-slate-600">{issuer.subtitle}</p>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">{issuer.address}</p>
                    <div className="mt-2 text-[10.5px] space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-3 text-slate-700">
                        <div><strong>GSTIN:</strong> {issuer.gstin || 'EXEMPT / NA'}</div>
                        <div><strong>PAN:</strong> {issuer.pan_number || 'NA'}</div>
                        <div><strong>Phone:</strong> {issuer.phone || '-'}</div>
                      </div>
                      <div className="text-[10px] text-slate-700 break-all leading-tight">
                        <strong>Email:</strong> {issuer.email || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-5 p-4 text-xs space-y-1.5 bg-slate-50">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-semibold">Invoice / Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900">{data.receipt_number || 'AUTO-GENERATED'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-semibold">Issue Date:</span>
                  <span className="font-semibold text-slate-900">{formatDateShort(data.issue_date)}</span>
                </div>
                {data.payment_date && (
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500 font-semibold">Payment Date:</span>
                    <span className="font-semibold text-slate-900">{formatDateShort(data.payment_date)}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-semibold">Place of Supply:</span>
                  <span className="font-semibold text-slate-900">{data.place_of_supply || issuer.place_of_supply || 'Kerala (32)'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500 font-semibold">Supply Type:</span>
                  <span className="font-semibold text-slate-900">
                    {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Payment Status:</span>
                  <span className="font-extrabold text-emerald-700">{statusBadge}</span>
                </div>
              </div>
            </div>

            {/* Billed To & Academic Context */}
            <div className="grid grid-cols-12 border-b border-slate-900 text-xs">
              <div className="col-span-6 p-3.5 border-r border-slate-900">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Billed To ({data.billed_to_type || 'STUDENT'})
                </div>
                <div className="font-bold text-sm text-slate-900">{data.recipient_name || '-'}</div>
                {data.parent_or_sponsor_name && (
                  <div className="text-slate-600">C/O / Sponsor: {data.parent_or_sponsor_name}</div>
                )}
                {data.recipient_address && (
                  <div className="text-slate-600 whitespace-pre-line mt-0.5">{data.recipient_address}</div>
                )}
                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                  {data.recipient_phone && <div><strong>Phone:</strong> {data.recipient_phone}</div>}
                  {data.recipient_email && <div><strong>Email:</strong> {data.recipient_email}</div>}
                  <div><strong>Recipient GSTIN:</strong> {data.recipient_gstin || 'Unregistered / Consumer'}</div>
                </div>
              </div>

              <div className="col-span-6 p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Academic & Payment Reference
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                  <div className="text-slate-500">Student ID:</div>
                  <div className="font-semibold text-slate-900">{data.student_enrollment_code || '-'}</div>
                  <div className="text-slate-500">Course / Package:</div>
                  <div className="font-semibold text-slate-900">{data.course_or_package_name || '-'}</div>
                  <div className="text-slate-500">Batch & Campus:</div>
                  <div className="font-semibold text-slate-900">
                    {[data.batch_name, data.campus_name].filter(Boolean).join(' • ') || '-'}
                  </div>
                  <div className="text-slate-500">Payment Date:</div>
                  <div className="font-semibold text-slate-900">
                    {data.payment_date ? formatDateShort(data.payment_date) : formatDateShort(data.issue_date)}
                  </div>
                  <div className="text-slate-500">Payment Mode:</div>
                  <div className="font-semibold text-slate-900">
                    {METHOD_LABELS[data.payment_method] || data.payment_method}
                  </div>
                  <div className="text-slate-500">UTR / Reference:</div>
                  <div className="font-mono font-semibold text-slate-900">{data.payment_reference || '-'}</div>
                </div>
              </div>
            </div>

            {/* Statutory Itemized Table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 text-[10px] uppercase font-extrabold text-slate-800">
                  <th className="p-2 border-r border-slate-900 text-center w-10">SL</th>
                  <th className="p-2 border-r border-slate-900 text-left">Description of Service</th>
                  <th className="p-2 border-r border-slate-900 text-center w-20">SAC</th>
                  <th className="p-2 border-r border-slate-900 text-center w-14">Qty</th>
                  <th className="p-2 border-r border-slate-900 text-right w-24">Rate (₹)</th>
                  <th className="p-2 border-r border-slate-900 text-right w-20">Disc (₹)</th>
                  <th className="p-2 text-right w-28">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="p-2.5 border-r border-slate-900 text-center">{idx + 1}</td>
                    <td className="p-2.5 border-r border-slate-900">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.description && <div className="text-[11px] text-slate-600">{item.description}</div>}
                      {item.period && <div className="text-[10px] text-indigo-700 font-medium">Period: {item.period}</div>}
                    </td>
                    <td className="p-2.5 border-r border-slate-900 text-center font-mono">{item.sac_code || '999293'}</td>
                    <td className="p-2.5 border-r border-slate-900 text-center">{item.quantity || '1.00'}</td>
                    <td className="p-2.5 border-r border-slate-900 text-right">{formatINR(item.unit_price, false)}</td>
                    <td className="p-2.5 border-r border-slate-900 text-right">{formatINR(item.discount, false)}</td>
                    <td className="p-2.5 text-right font-bold">{formatINR(item.amount, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tax & Totals Summary */}
            <div className="grid grid-cols-12 border-t border-slate-900 text-xs">
              <div className="col-span-7 p-3.5 border-r border-slate-900 space-y-2.5">
                {opts.show_amount_in_words && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Total Invoice Amount in Words
                    </span>
                    <span className="font-bold text-slate-900 italic">{data.amount_in_words}</span>
                  </div>
                )}

                {opts.show_ledger_summary && (
                  <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                      Student Fee Account Statement
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Course Fee</span>
                        <strong>{formatINR(data.ledger_total_fee)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Prev. Paid</span>
                        <strong>{formatINR(data.ledger_previously_paid)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Current Paid</span>
                        <strong className="text-emerald-700">{formatINR(data.total_amount)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Balance Due</span>
                        {isSettled ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            SETTLED
                          </span>
                        ) : (
                          <strong className="text-rose-700">{formatINR(data.ledger_balance_due)}</strong>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {opts.show_bank_details && (issuer.bank_name || issuer.upi_id) && (
                  <div className="text-[11px] text-slate-600 pt-1">
                    <strong className="text-slate-800">Bank / Remittance Details: </strong>
                    {[
                      issuer.bank_name && `Bank: ${issuer.bank_name}`,
                      issuer.account_number && `A/C: ${issuer.account_number}`,
                      issuer.ifsc_code && `IFSC: ${issuer.ifsc_code}`,
                      issuer.upi_id && `UPI: ${issuer.upi_id}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </div>
                )}
              </div>

              <div className="col-span-5 p-3.5 space-y-1.5 bg-slate-50">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">{formatINR(data.subtotal_amount)}</span>
                </div>
                {round2(data.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Less: Discount / Concession:</span>
                    <span>- {formatINR(data.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-semibold">Taxable Value:</span>
                  <span className="font-bold">{formatINR(data.taxable_amount)}</span>
                </div>
                {opts.show_tax_breakdown && (
                  <>
                    {isInterState ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST ({data.igst_rate || 18}%):</span>
                        <span>{formatINR(data.igst_amount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST ({data.cgst_rate || 9}%):</span>
                          <span>{formatINR(data.cgst_amount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST ({data.sgst_rate || 9}%):</span>
                          <span>{formatINR(data.sgst_amount)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
                  <span>GRAND TOTAL ({data.tax_mode === 'INCLUSIVE' ? 'Incl. GST' : 'INR'}):</span>
                  <span>{formatINR(data.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Footer */}
        <div className="border-2 border-slate-900 p-4 mt-4 grid grid-cols-12 gap-4 items-center text-xs break-inside-avoid">
          <div className="col-span-7 space-y-2">
            {opts.show_qr_verification && (
              <div className="flex items-center gap-3">
                <QrCodeSvg value={verifyUrl} size={78} fgColor="#0f172a" />
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-bold text-slate-900 uppercase">Cryptographic QR Verification</div>
                  <div>Token: <span className="font-mono">{data.verification_token || 'PREVIEW-MODE'}</span></div>
                  {data.signature_prefix && (
                    <div>HMAC Seal: <span className="font-mono">{data.signature_prefix}</span></div>
                  )}
                  <div className="text-slate-500">Scan QR code to verify authenticity online.</div>
                </div>
              </div>
            )}
            {opts.show_terms && data.terms_and_conditions && (
              <div className="text-[10px] text-slate-500 whitespace-pre-line pt-1 border-t border-slate-200">
                <strong className="text-slate-700 block mb-0.5">Terms & Conditions:</strong>
                {data.terms_and_conditions}
              </div>
            )}
          </div>

          <div className="col-span-5 text-right flex flex-col items-end justify-end">
            <div className="text-[11px] font-bold text-slate-700 mb-1">For {issuer.organization_name}</div>
            {opts.show_signature_and_stamp && (
              <div className="flex items-center justify-end gap-3 my-1">
                {issuer.stamp_image ? (
                  <img
                    src={issuer.stamp_image}
                    alt="Official Stamp"
                    className="h-20 w-20 object-contain receipt-stamp"
                    style={{ maxHeight: '72px', maxWidth: '72px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <DefaultAcademySealSvg orgName={issuer.organization_name} brandColor={brandColor} />
                )}
                {issuer.signature_image && (
                  <img
                    src={issuer.signature_image}
                    alt="Signature"
                    className="h-14 w-auto object-contain receipt-signature"
                    style={{ maxHeight: '48px', maxWidth: '135px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                    crossOrigin="anonymous"
                  />
                )}
              </div>
            )}
            <div className="font-bold text-slate-900">{issuer.authorized_signatory_name || 'Authorized Signatory'}</div>
            <div className="text-[10px] text-slate-500">{issuer.authorized_signatory_designation}</div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT TEMPLATE: "EXECUTIVE" (Modern Swiss/German Corporate A4)
  return (
    <div
      ref={containerRef}
      className="bg-white text-slate-900 mx-auto relative overflow-hidden flex flex-col justify-between"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '12mm 14mm',
        boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Subtle Diagonal Security Watermark */}
      {opts.show_watermark && (
        <div
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.032, transform: 'rotate(-32deg)' }}
        >
          <span className="text-6xl font-black tracking-widest uppercase text-slate-900 text-center leading-tight">
            {issuer.watermark_text || issuer.organization_name}
          </span>
        </div>
      )}

      {/* Status Overlay Stamp for VOID or DRAFT */}
      {isVoid && (
        <div
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-20"
          style={{ transform: 'rotate(-24deg)' }}
        >
          <div className="border-8 border-red-600 text-red-600/85 px-10 py-3 rounded-2xl font-black text-5xl tracking-widest uppercase bg-white/85 shadow-sm">
            VOID / CANCELLED
            {data.void_reason && (
              <span className="block text-xs font-bold tracking-normal text-center mt-1">
                Reason: {data.void_reason}
              </span>
            )}
          </div>
        </div>
      )}

      {isDraft && !isVoid && (
        <div
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-20"
          style={{ transform: 'rotate(-24deg)' }}
        >
          <div className="border-4 border-amber-500/60 text-amber-600/50 px-8 py-2 rounded-2xl font-black text-4xl tracking-widest uppercase">
            DRAFT PREVIEW
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-5">
        {/* Top Accent Bar & Executive Header */}
        <div
          className="rounded-2xl p-6 text-white flex items-start justify-between gap-6"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, #0f172a 100%)`,
          }}
        >
          <div className="flex items-start gap-4">
            {issuer.logo_url ? (
              <div className="bg-white p-2 rounded-xl shadow-sm shrink-0" style={{ maxHeight: '64px', maxWidth: '180px' }}>
                <img
                  src={issuer.logo_url}
                  alt="Academy Logo"
                  className="h-14 w-auto object-contain receipt-logo"
                  style={{ maxHeight: '50px', maxWidth: '160px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                  crossOrigin="anonymous"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/15 border border-white/25 flex flex-col items-center justify-center shrink-0">
                <span className="text-xl font-black tracking-tighter text-white">FLAG</span>
                <span className="text-[8px] uppercase tracking-widest text-amber-300 font-bold">GERMAN</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">
                {issuer.organization_name}
              </h1>
              {issuer.subtitle && (
                <p className="text-xs text-indigo-200 font-medium mt-0.5">{issuer.subtitle}</p>
              )}
              <p className="text-[11px] text-slate-300 mt-1.5 whitespace-pre-line">{issuer.address}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-300 mt-1">
                {issuer.phone && <span>Tel: {issuer.phone}</span>}
                {issuer.email && <span>Email: {issuer.email}</span>}
                {issuer.website && <span>Web: {issuer.website}</span>}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-extrabold tracking-widest uppercase">
              {DOC_TYPE_LABELS[data.document_type] || 'OFFICIAL FEE RECEIPT'}
            </span>
            <div className="mt-2.5 text-[11px] text-slate-300 space-y-0.5">
              {issuer.gstin && (
                <div>
                  GSTIN: <strong className="text-white font-mono">{issuer.gstin}</strong>
                </div>
              )}
              {issuer.pan_number && (
                <div>
                  PAN: <strong className="text-white font-mono">{issuer.pan_number}</strong>
                </div>
              )}
              <div>
                FY: <strong className="text-white">{data.financial_year || '2026-27'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Meta Strip */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receipt Number</div>
            <div className="text-sm font-black font-mono text-slate-900 mt-0.5 break-all">
              {data.receipt_number || 'AUTO-GENERATED'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Info</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              Issued: {formatDateShort(data.issue_date)}
            </div>
            {data.payment_date && (
              <div className="text-[10px] text-slate-600 font-semibold">
                Paid: {formatDateShort(data.payment_date)}
              </div>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode & Ref</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {METHOD_LABELS[data.payment_method] || data.payment_method || 'UPI'}
            </div>
            {data.payment_reference && (
              <div className="text-[10px] font-mono text-slate-500 truncate">Ref: {data.payment_reference}</div>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</div>
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                  isVoid
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : statusBadge === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : statusBadge === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {statusBadge}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Profile Block */}
        <div className="grid grid-cols-12 gap-4">
          <div
            className={`${
              opts.show_student_academic_info ? 'col-span-6' : 'col-span-12'
            } rounded-xl border border-slate-200 p-4 bg-white`}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 mb-1.5">
              Received From / Billed To ({data.billed_to_type || 'STUDENT'})
            </div>
            <div className="text-base font-extrabold text-slate-900">{data.recipient_name || '-'}</div>
            {data.student_enrollment_code && (
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                Enrollment ID: <span className="font-mono text-slate-900">{data.student_enrollment_code}</span>
              </div>
            )}
            {data.parent_or_sponsor_name && (
              <div className="text-xs text-slate-600 mt-0.5">
                Parent / Sponsor: <strong className="text-slate-800">{data.parent_or_sponsor_name}</strong>
              </div>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {data.recipient_phone && <div>Phone: {data.recipient_phone}</div>}
              {data.recipient_email && <div>Email: {data.recipient_email}</div>}
              {data.recipient_address && <div className="whitespace-pre-line">{data.recipient_address}</div>}
              {data.recipient_gstin && (
                <div>
                  Customer GSTIN: <span className="font-mono font-semibold">{data.recipient_gstin}</span>
                </div>
              )}
            </div>
          </div>

          {opts.show_student_academic_info && (
            <div className="col-span-6 rounded-xl border border-slate-200 p-4 bg-white">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 mb-1.5">
                Academic & Course Context
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Course / Package</span>
                  <span className="font-bold text-slate-900">{data.course_or_package_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Batch</span>
                  <span className="font-semibold text-slate-800">{data.batch_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Campus / Branch</span>
                  <span className="font-semibold text-slate-800">{data.campus_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Level & Mode</span>
                  <span className="font-semibold text-slate-800">
                    {[data.grade_level && `Level ${data.grade_level}`, data.mode_of_study || 'Offline']
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Itemized Particulars Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr
                className="text-white text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: brandColor }}
              >
                <th className="py-2.5 px-3 text-left w-10">SL</th>
                <th className="py-2.5 px-3 text-left">Particulars / Description</th>
                {opts.show_sac_column && <th className="py-2.5 px-3 text-center w-20">SAC Code</th>}
                <th className="py-2.5 px-3 text-left w-32">Period / Installment</th>
                <th className="py-2.5 px-3 text-center w-14">Qty</th>
                <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                {opts.show_discount_line && <th className="py-2.5 px-3 text-right w-20">Disc (₹)</th>}
                <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-3 text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.title}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                    )}
                  </td>
                  {opts.show_sac_column && (
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                      {item.sac_code || issuer.sac_code || '999293'}
                    </td>
                  )}
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {item.period || data.installment_label || '-'}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{item.quantity || '1.00'}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatINR(item.unit_price, false)}</td>
                  {opts.show_discount_line && (
                    <td className="py-3 px-3 text-right text-slate-600">{formatINR(item.discount, false)}</td>
                  )}
                  <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                    {formatINR(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Amount in Words + Ledger */}
        <div className="grid grid-cols-12 gap-5 items-start break-inside-avoid">
          <div className="col-span-7 space-y-3">
            {opts.show_amount_in_words && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Amount in Words
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 italic">
                  {data.amount_in_words}
                </div>
              </div>
            )}

            {opts.show_ledger_summary && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                    Student Fee Account Ledger Summary
                  </span>
                  {data.ledger_next_due_date && round2(data.ledger_balance_due) > 0 && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Next Due: {formatDateShort(data.ledger_next_due_date)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Package Fee</span>
                    <span className="font-bold text-slate-900">{formatINR(data.ledger_total_fee)}</span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Concession</span>
                    <span className="font-semibold text-slate-700">{formatINR(data.ledger_discount)}</span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-indigo-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Prev. Paid</span>
                    <span className="font-semibold text-slate-700">{formatINR(data.ledger_previously_paid)}</span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-emerald-200">
                    <span className="text-[9px] text-emerald-600 uppercase font-bold block">This Receipt</span>
                    <span className="font-extrabold text-emerald-700">{formatINR(data.ledger_current_paid || data.total_amount)}</span>
                  </div>
                  <div className={`rounded-lg p-2 border ${isSettled ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-rose-200'}`}>
                    <span className={`text-[9px] uppercase font-bold block ${isSettled ? 'text-emerald-700' : 'text-rose-600'}`}>Balance Due</span>
                    {isSettled ? (
                      <span className="font-extrabold text-emerald-700 text-xs tracking-wider">SETTLED</span>
                    ) : (
                      <span className="font-extrabold text-rose-700">{formatINR(data.ledger_balance_due)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {opts.show_installment_schedule &&
              Array.isArray(data.installment_schedule_snapshot) &&
              data.installment_schedule_snapshot.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Installment Schedule
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 px-2 text-left">Installment</th>
                        <th className="py-1 px-2 text-left">Due Date</th>
                        <th className="py-1 px-2 text-right">Scheduled</th>
                        <th className="py-1 px-2 text-right">Paid</th>
                        <th className="py-1 px-2 text-right">Balance</th>
                        <th className="py-1 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.installment_schedule_snapshot.map((inst, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-medium">{inst.label || `#${inst.sequence_number}`}</td>
                          <td className="py-1 px-2">{formatDateShort(inst.due_date)}</td>
                          <td className="py-1 px-2 text-right">{formatINR(inst.scheduled_amount)}</td>
                          <td className="py-1 px-2 text-right text-emerald-700">{formatINR(inst.paid_amount)}</td>
                          <td className="py-1 px-2 text-right font-semibold">{formatINR(inst.balance_amount)}</td>
                          <td className="py-1 px-2 text-center font-bold">{inst.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            {opts.show_bank_details && (issuer.bank_name || issuer.upi_id) && (
              <div className="rounded-xl border border-slate-200 p-3 text-[11px] bg-slate-50/70">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Academy Bank & UPI Details
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-700">
                  {issuer.bank_name && <div><strong>Bank:</strong> {issuer.bank_name}</div>}
                  {issuer.account_name && <div><strong>A/C Name:</strong> {issuer.account_name}</div>}
                  {issuer.account_number && <div><strong>A/C No:</strong> {issuer.account_number}</div>}
                  {issuer.ifsc_code && <div><strong>IFSC:</strong> {issuer.ifsc_code}</div>}
                  {issuer.upi_id && <div className="col-span-2"><strong>UPI ID:</strong> {issuer.upi_id}</div>}
                </div>
              </div>
            )}

            {data.notes && (
              <div className="rounded-xl border border-slate-200 p-3 text-xs bg-amber-50/40">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Remarks / Notes</span>
                <span className="text-slate-800 whitespace-pre-line">{data.notes}</span>
              </div>
            )}
          </div>

          {/* Right Financial Totals Card */}
          <div className="col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatINR(data.subtotal_amount)}</span>
            </div>

            {opts.show_discount_line && round2(data.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Special Discount / Concession</span>
                <span className="font-semibold">- {formatINR(data.discount_amount)}</span>
              </div>
            )}

            {opts.show_tax_breakdown && data.tax_mode !== 'NONE' && (
              <>
                <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5">
                  <span>Taxable Value ({data.tax_mode === 'INCLUSIVE' ? 'GST Incl.' : 'GST Excl.'})</span>
                  <span className="font-semibold text-slate-900">{formatINR(data.taxable_amount)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST ({data.igst_rate || 18}%)</span>
                    <span className="font-medium">{formatINR(data.igst_amount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({data.cgst_rate || 9}%)</span>
                      <span className="font-medium">{formatINR(data.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({data.sgst_rate || 9}%)</span>
                      <span className="font-medium">{formatINR(data.sgst_amount)}</span>
                    </div>
                  </>
                )}
              </>
            )}

            <div
              className="mt-3 rounded-xl p-3.5 text-white flex items-center justify-between"
              style={{ backgroundColor: brandColor }}
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-200">
                  {data.document_type === 'PROFORMA' ? 'Total Payable' : 'Total Received'}
                </div>
                <div className="text-[10px] text-indigo-200">
                  {data.tax_mode === 'INCLUSIVE'
                    ? 'Inclusive of all taxes'
                    : data.tax_mode === 'EXCLUSIVE'
                    ? 'Including GST'
                    : 'Official Net Amount'}
                </div>
              </div>
              <div className="text-xl font-black tracking-tight">{formatINR(data.total_amount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Authenticity Footer (QR + Terms + Stamp/Signatory) */}
      <div className="relative z-10 mt-6 pt-4 border-t-2 border-slate-200 break-inside-avoid">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-7 space-y-2.5">
            {opts.show_qr_verification && (
              <div className="flex items-center gap-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <QrCodeSvg value={verifyUrl} size={74} fgColor="#0f172a" />
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    Cryptographically Verified Receipt
                  </div>
                  <div>
                    Verification ID: <span className="font-mono font-semibold text-slate-800">{data.verification_token || 'LIVE-STUDIO-PREVIEW'}</span>
                  </div>
                  {data.signature_prefix && (
                    <div>
                      Digital Signature: <span className="font-mono text-slate-700">{data.signature_prefix}</span>
                    </div>
                  )}
                  <div className="text-slate-400">
                    Scan QR code with any smartphone camera to verify authenticity online.
                  </div>
                </div>
              </div>
            )}

            {opts.show_terms && data.terms_and_conditions && (
              <div className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line">
                <strong className="text-slate-700 uppercase tracking-wider block text-[9px]">
                  Terms & Conditions
                </strong>
                {data.terms_and_conditions}
              </div>
            )}
          </div>

          <div className="col-span-5 text-right flex flex-col items-end justify-end">
            {opts.show_signature_and_stamp && (
              <div className="flex items-center justify-end gap-4 mb-1">
                {issuer.stamp_image ? (
                  <img
                    src={issuer.stamp_image}
                    alt="Official Seal"
                    className="h-20 w-20 object-contain receipt-stamp"
                    style={{ maxHeight: '72px', maxWidth: '72px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <DefaultAcademySealSvg orgName={issuer.organization_name} brandColor={brandColor} />
                )}
                {issuer.signature_image && (
                  <img
                    src={issuer.signature_image}
                    alt="Authorized Signature"
                    className="h-14 w-auto object-contain receipt-signature"
                    style={{ maxHeight: '48px', maxWidth: '135px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                    crossOrigin="anonymous"
                  />
                )}
              </div>
            )}
            <div className="w-48 border-t border-slate-400 pt-1.5">
              <div className="text-xs font-extrabold text-slate-900">
                {issuer.authorized_signatory_name || 'Authorized Signatory'}
              </div>
              <div className="text-[10px] text-slate-500">
                {issuer.authorized_signatory_designation || `For ${issuer.organization_name}`}
              </div>
              {data.created_by_name && (
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Issued by: {data.created_by_name} {data.version > 1 ? `• Rev v${data.version}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {issuer.footer_note && (
          <div className="mt-3 pt-2 border-t border-slate-100 text-center text-[10px] font-semibold text-slate-400">
            {issuer.footer_note}
          </div>
        )}
      </div>
    </div>
  );
}
