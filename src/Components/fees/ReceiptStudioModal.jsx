import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReceiptTemplateRenderer from './ReceiptTemplateRenderer';
import {
  amountToWords,
  calculateReceiptFinancials,
  DEFAULT_DISPLAY_OPTIONS,
  DEFAULT_ISSUER_SNAPSHOT,
  exportReceiptElementToPdf,
  formatINR,
  getIndianFinancialYear,
  printReceiptElement,
  round2,
} from '../../utils/receiptUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const toLocalDatetimeInput = (isoOrDate) => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const createEmptyLineItem = (sacCode = '999293', title = 'Course Tuition Fee', amount = '0.00', period = '') => ({
  sl_no: 1,
  title,
  description: '',
  sac_code: sacCode,
  period,
  quantity: '1.00',
  unit_price: String(round2(amount).toFixed(2)),
  discount: '0.00',
  amount: String(round2(amount).toFixed(2)),
});

export default function ReceiptStudioModal({
  isOpen,
  onClose,
  getToken,
  company = 'FLAG',
  initialReceipt = null,
  initialPayment = null,
  initialAccount = null,
  initialStudent = null,
  accounts = [],
  students = [],
  onSaved,
  autoDownloadOnLoad = false,
}) {
  const previewRef = useRef(null);
  const exportTargetRef = useRef(null);

  const [activeSection, setActiveSection] = useState('source_recipient');
  const [zoom, setZoom] = useState(0.72);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Override locks
  const [manualNumberUnlock, setManualNumberUnlock] = useState(false);
  const [manualFinancialOverride, setManualFinancialOverride] = useState(false);
  const [manualWordsOverride, setManualWordsOverride] = useState(false);
  const [manualLedgerOverride, setManualLedgerOverride] = useState(false);

  // Email popover state
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to_email: '',
    subject: '',
    message: 'Thank you for your fee payment at FLAG German Language Academy. Please find your official receipt attached.',
    attach_pdf: true,
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  const [form, setForm] = useState({
    id: null,
    company,
    student: '',
    account: '',
    payment: '',
    receipt_number: '',
    financial_year: getIndianFinancialYear(),
    document_type: 'RECEIPT',
    status: 'ISSUED',
    issue_date: toLocalDatetimeInput(),
    verification_token: '',
    signature_prefix: '',
    is_manual_override: false,

    billed_to_type: 'STUDENT',
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    parent_or_sponsor_name: '',
    recipient_address: '',
    recipient_gstin: '',
    place_of_supply: 'Kerala (32)',
    student_enrollment_code: '',

    course_or_package_name: '',
    batch_name: '',
    campus_name: '',
    grade_level: '',
    mode_of_study: '',

    subtotal_amount: '0.00',
    discount_amount: '0.00',
    taxable_amount: '0.00',
    tax_mode: 'INCLUSIVE',
    supply_type: 'INTRA_STATE',
    gst_rate: '18.00',
    cgst_rate: '9.00',
    cgst_amount: '0.00',
    sgst_rate: '9.00',
    sgst_amount: '0.00',
    igst_rate: '0.00',
    igst_amount: '0.00',
    total_tax_amount: '0.00',
    total_amount: '0.00',
    amount_in_words: 'Rupees Zero Only',

    payment_method: 'UPI',
    payment_reference: '',
    payment_date: toLocalDatetimeInput(),
    installment_label: '',
    payment_status_badge: 'PAID',

    ledger_total_fee: '0.00',
    ledger_discount: '0.00',
    ledger_previously_paid: '0.00',
    ledger_current_paid: '0.00',
    ledger_total_paid: '0.00',
    ledger_balance_due: '0.00',
    ledger_next_due_date: '',
    installment_schedule_snapshot: [],

    template_style: 'EXECUTIVE',
    display_options: { ...DEFAULT_DISPLAY_OPTIONS },
    line_items: [createEmptyLineItem('999293', 'Course Tuition Fee', '0.00', '')],
    issuer_snapshot: { ...DEFAULT_ISSUER_SNAPSHOT },
    snapshot_data: {},
    notes: '',
    terms_and_conditions:
      '1. Fees once paid are non-refundable and non-transferable unless specified in the academy policy.\n' +
      '2. This is a computer-generated digital receipt with cryptographic QR verification.\n' +
      '3. Subject to Kochi jurisdiction.',
    version: 1,
    void_reason: '',
  });

  const recalculateLedgerValues = (state) => {
    if (manualLedgerOverride) return state;
    const totalFee = round2(state.ledger_total_fee);
    const disc = round2(state.ledger_discount);
    const prevPaid = round2(state.ledger_previously_paid);
    const isProforma = state.document_type === 'PROFORMA';
    const thisPaid = isProforma ? 0 : round2(state.total_amount ?? state.ledger_current_paid);
    const totPaid = round2(prevPaid + thisPaid);
    const balDue = Math.max(0, round2(totalFee - disc - totPaid));

    return {
      ...state,
      ledger_current_paid: thisPaid.toFixed(2),
      ledger_total_paid: totPaid.toFixed(2),
      ledger_balance_due: balDue.toFixed(2),
    };
  };

  // Recalculate financials deterministically whenever line items, discount, or tax rules change (unless manualFinancialOverride is active)
  const recomputeFromItems = (nextState, forceRecalc = false) => {
    if (manualFinancialOverride && !forceRecalc) {
      const words = manualWordsOverride
        ? nextState.amount_in_words
        : amountToWords(nextState.total_amount);
      const updated = {
        ...nextState,
        amount_in_words: words,
        ledger_current_paid: nextState.total_amount,
      };
      return recalculateLedgerValues(updated);
    }

    const calc = calculateReceiptFinancials({
      lineItems: nextState.line_items,
      subtotalAmount: nextState.subtotal_amount,
      discountAmount: nextState.discount_amount,
      taxMode: nextState.tax_mode,
      supplyType: nextState.supply_type,
      gstRate: nextState.gst_rate,
      defaultSac: nextState.issuer_snapshot?.sac_code || '999293',
      fallbackTitle: nextState.course_or_package_name || 'Course Tuition Fee',
      fallbackPeriod: nextState.installment_label || '',
    });

    const words = manualWordsOverride ? nextState.amount_in_words : calc.amount_in_words;

    const updated = {
      ...nextState,
      ...calc,
      amount_in_words: words,
      ledger_current_paid: calc.total_amount,
    };
    return recalculateLedgerValues(updated);
  };

  // Hydrate studio when opened
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const initializeStudio = async () => {
      try {
        setLoading(true);
        const token = await getToken();

        // Case 1: Editing / Viewing an existing saved FeeReceipt
        if (initialReceipt && initialReceipt.id) {
          const res = await fetch(`${API_BASE_URL}/fees/receipts/${initialReceipt.id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fullReceipt = res.ok ? await res.json() : initialReceipt;
          if (!mounted) return;
          hydrateReceiptObject(fullReceipt);
          return;
        }

        // Case 2: 1-Click from an existing FeePayment
        if (initialPayment && initialPayment.id) {
          try {
            const res = await fetch(`${API_BASE_URL}/fees/receipts/from-payment/${initialPayment.id}/`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            });
            if (res.ok) {
              const generatedReceipt = await res.json();
              if (!mounted) return;
              hydrateReceiptObject(generatedReceipt);
              if (onSaved) onSaved(generatedReceipt, true);
              return;
            } else {
              const errData = await res.json().catch(() => ({}));
              console.warn('from-payment did not return 200, loading interactive studio with payment preloaded:', errData);
            }
          } catch (fetchErr) {
            console.warn('from-payment fetch error:', fetchErr);
          }
        }

        // Case 3: New Receipt (optionally linked to an Account or Student, or Standalone)
        const settingsRes = await fetch(
          `${API_BASE_URL}/fees/receipt-settings/?company=${encodeURIComponent(company)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const settingsData = settingsRes.ok ? await settingsRes.json() : {};

        const targetStudentId =
          initialStudent?.id || initialAccount?.student || '';
        const targetAccountId = initialAccount?.id || '';

        const accountPayments = Array.isArray(initialAccount?.payments) ? initialAccount.payments : [];
        const targetPayment = initialPayment || (accountPayments.length > 0 ? accountPayments[accountPayments.length - 1] : null);
        const hasPayment = Boolean(targetPayment && targetPayment.amount);
        const isAccountSettled = Number(initialAccount?.balance_due || 0) <= 0 && Number(initialAccount?.total_paid || 0) > 0;

        let previewMeta = null;
        if (targetStudentId || targetAccountId) {
          const prevRes = await fetch(`${API_BASE_URL}/fees/receipts/calculate-preview/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              company,
              student: targetStudentId || null,
              account: targetAccountId || null,
              payment: targetPayment?.id || null,
              subtotal_amount: hasPayment
                ? targetPayment.amount
                : isAccountSettled
                ? initialAccount?.total_paid || '0.00'
                : initialAccount?.balance_due || '0.00',
            }),
          });
          if (prevRes.ok) {
            previewMeta = await prevRes.json();
          }
        }

        if (!mounted) return;

        const issuerSnap = {
          ...DEFAULT_ISSUER_SNAPSHOT,
          ...(previewMeta?.issuer_snapshot || {}),
          organization_name: settingsData.organization_name || DEFAULT_ISSUER_SNAPSHOT.organization_name,
          subtitle: settingsData.subtitle ?? DEFAULT_ISSUER_SNAPSHOT.subtitle,
          address: settingsData.address ?? DEFAULT_ISSUER_SNAPSHOT.address,
          phone: settingsData.phone ?? DEFAULT_ISSUER_SNAPSHOT.phone,
          email: settingsData.email ?? DEFAULT_ISSUER_SNAPSHOT.email,
          website: settingsData.website ?? DEFAULT_ISSUER_SNAPSHOT.website,
          gstin: settingsData.gstin ?? '',
          pan_number: settingsData.pan_number ?? '',
          place_of_supply: settingsData.place_of_supply || 'Kerala (32)',
          sac_code: settingsData.sac_code || '999293',
          logo_url: settingsData.logo_url || '',
          signature_image: settingsData.signature_image || '',
          stamp_image: settingsData.stamp_image || '',
          watermark_text: settingsData.watermark_text || 'FLAG GERMAN ACADEMY',
          authorized_signatory_name: settingsData.authorized_signatory_name || 'Authorized Signatory',
          authorized_signatory_designation:
            settingsData.authorized_signatory_designation || 'Accounts & Finance Department',
          bank_name: settingsData.bank_name || '',
          account_name: settingsData.account_name || '',
          account_number: settingsData.account_number || '',
          ifsc_code: settingsData.ifsc_code || '',
          upi_id: settingsData.upi_id || '',
          footer_note: settingsData.footer_note || DEFAULT_ISSUER_SNAPSHOT.footer_note,
          brand_color: settingsData.brand_color || '#312e81',
        };

        const stuMeta = previewMeta?.student_metadata || {};
        const ledMeta = previewMeta?.ledger_snapshot || {};

        let defaultAmount = '0.00';
        if (hasPayment) {
          defaultAmount = round2(targetPayment.amount).toFixed(2);
        } else if (isAccountSettled) {
          defaultAmount = round2(initialAccount?.total_paid || initialAccount?.total_due || 0).toFixed(2);
        } else {
          defaultAmount = round2(initialAccount?.balance_due || initialAccount?.total_due || 0).toFixed(2);
        }

        const initialDocType = (!hasPayment && !isAccountSettled && round2(initialAccount?.balance_due || 0) > 0) ? 'PROFORMA' : 'RECEIPT';
        const initialBadge = isAccountSettled ? 'SETTLED' : (initialDocType === 'PROFORMA' ? 'PROFORMA' : 'PAID');

        const courseTitle =
          stuMeta.course_or_package_name ||
          initialAccount?.plan_name ||
          initialAccount?.plan_code ||
          'Course Tuition Fee';

        const totFee = ledMeta.ledger_total_fee || String(initialAccount?.total_due || defaultAmount);
        const disc = ledMeta.ledger_discount || String(initialAccount?.discount || '0.00');
        let prevPaid = '0.00';
        if (hasPayment && initialAccount?.total_paid) {
          prevPaid = Math.max(0, round2(Number(initialAccount.total_paid) - Number(targetPayment.amount))).toFixed(2);
        } else if (ledMeta.ledger_previously_paid) {
          prevPaid = ledMeta.ledger_previously_paid;
        }
        const curPaid = initialDocType === 'PROFORMA' ? '0.00' : defaultAmount;
        const totPaid = round2(Number(prevPaid) + Number(curPaid)).toFixed(2);
        const balDue = Math.max(0, round2(Number(totFee) - Number(disc) - Number(totPaid))).toFixed(2);

        const baseDraft = {
          id: null,
          company,
          student: targetStudentId || '',
          account: targetAccountId || '',
          payment: targetPayment ? targetPayment.id : '',
          receipt_number: '',
          financial_year: getIndianFinancialYear(),
          document_type: initialDocType,
          status: 'ISSUED',
          issue_date: toLocalDatetimeInput(),
          verification_token: '',
          signature_prefix: '',
          is_manual_override: false,

          billed_to_type: 'STUDENT',
          recipient_name: stuMeta.recipient_name || initialStudent?.name || initialAccount?.student_name || '',
          recipient_phone: stuMeta.recipient_phone || initialStudent?.phone || '',
          recipient_email: stuMeta.recipient_email || initialStudent?.email || '',
          parent_or_sponsor_name: stuMeta.parent_or_sponsor_name || initialStudent?.parent_name || '',
          recipient_address: stuMeta.recipient_address || '',
          recipient_gstin: '',
          place_of_supply: settingsData.place_of_supply || 'Kerala (32)',
          student_enrollment_code: stuMeta.student_enrollment_code || '',

          course_or_package_name: courseTitle,
          batch_name: stuMeta.batch_name || initialStudent?.batch_name || '',
          campus_name: stuMeta.campus_name || initialAccount?.branch_name || '',
          grade_level: stuMeta.grade_level || '',
          mode_of_study: stuMeta.mode_of_study || '',

          subtotal_amount: defaultAmount,
          discount_amount: '0.00',
          tax_mode: settingsData.default_gst_mode || 'INCLUSIVE',
          supply_type: 'INTRA_STATE',
          gst_rate: String(settingsData.default_gst_rate || '18.00'),

          payment_method: targetPayment?.payment_method || 'UPI',
          payment_reference: targetPayment?.reference || '',
          payment_date: targetPayment?.payment_date ? toLocalDatetimeInput(targetPayment.payment_date) : toLocalDatetimeInput(),
          installment_label: targetPayment?.installment?.label || (targetPayment?.installment ? `Installment #${targetPayment.installment.sequence_number || ''}` : ''),
          payment_status_badge: initialBadge,

          ledger_total_fee: totFee,
          ledger_discount: disc,
          ledger_previously_paid: prevPaid,
          ledger_current_paid: curPaid,
          ledger_total_paid: totPaid,
          ledger_balance_due: balDue,
          ledger_next_due_date: ledMeta.ledger_next_due_date || '',
          installment_schedule_snapshot: ledMeta.installment_schedule_snapshot || [],

          template_style: settingsData.default_template || 'EXECUTIVE',
          display_options: {
            ...DEFAULT_DISPLAY_OPTIONS,
            ...(settingsData.default_display_options || {}),
          },
          line_items: [
            createEmptyLineItem(
              settingsData.sac_code || '999293',
              hasPayment
                ? `${courseTitle} - Payment (${targetPayment.latest_receipt_number || targetPayment.receipt_number || targetPayment.payment_method})`
                : isAccountSettled
                ? `${courseTitle} - Full Course Settlement`
                : courseTitle,
              defaultAmount,
              targetPayment?.installment?.label || ''
            ),
          ],
          issuer_snapshot: issuerSnap,
          snapshot_data: {},
          notes: '',
          terms_and_conditions:
            settingsData.default_terms_and_conditions ||
            '1. Fees once paid are non-refundable and non-transferable unless specified in the academy policy.\n' +
              '2. This is a computer-generated digital receipt with cryptographic QR verification.\n' +
              '3. Subject to Kochi jurisdiction.',
          version: 1,
          void_reason: '',
        };

        setManualNumberUnlock(false);
        setManualFinancialOverride(false);
        setManualWordsOverride(false);
        setManualLedgerOverride(false);
        setForm(recomputeFromItems(baseDraft, true));
      } catch (err) {
        console.error('Error initializing receipt studio:', err);
        toast.error('Failed to initialize receipt studio');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeStudio();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialReceipt?.id, initialPayment?.id, initialAccount?.id, initialStudent?.id]);

  const hydrateReceiptObject = (r) => {
    const gstCombined = round2(
      Number(r.igst_rate) || Number(r.cgst_rate || 0) + Number(r.sgst_rate || 0) || 18
    );

    const hydrated = {
      id: r.id || null,
      saved_status: r.id ? r.status || 'ISSUED' : null,
      company: r.company || company,
      student: r.student || '',
      account: r.account || '',
      payment: r.payment || '',
      receipt_number: r.receipt_number || '',
      financial_year: r.financial_year || getIndianFinancialYear(r.issue_date),
      document_type: r.document_type || 'RECEIPT',
      status: r.status || 'ISSUED',
      issue_date: toLocalDatetimeInput(r.issue_date),
      verification_token: r.verification_token || '',
      signature_prefix: r.signature_prefix || '',
      is_manual_override: Boolean(r.is_manual_override),

      billed_to_type: r.billed_to_type || 'STUDENT',
      recipient_name: r.recipient_name || '',
      recipient_phone: r.recipient_phone || '',
      recipient_email: r.recipient_email || '',
      parent_or_sponsor_name: r.parent_or_sponsor_name || '',
      recipient_address: r.recipient_address || '',
      recipient_gstin: r.recipient_gstin || '',
      place_of_supply: r.place_of_supply || 'Kerala (32)',
      student_enrollment_code: r.student_enrollment_code || '',

      course_or_package_name: r.course_or_package_name || '',
      batch_name: r.batch_name || '',
      campus_name: r.campus_name || '',
      grade_level: r.grade_level || '',
      mode_of_study: r.mode_of_study || '',

      subtotal_amount: String(r.subtotal_amount ?? '0.00'),
      discount_amount: String(r.discount_amount ?? '0.00'),
      taxable_amount: String(r.taxable_amount ?? '0.00'),
      tax_mode: r.tax_mode || 'NONE',
      supply_type: r.supply_type || 'INTRA_STATE',
      gst_rate: gstCombined.toFixed(2),
      cgst_rate: String(r.cgst_rate ?? '9.00'),
      cgst_amount: String(r.cgst_amount ?? '0.00'),
      sgst_rate: String(r.sgst_rate ?? '9.00'),
      sgst_amount: String(r.sgst_amount ?? '0.00'),
      igst_rate: String(r.igst_rate ?? '0.00'),
      igst_amount: String(r.igst_amount ?? '0.00'),
      total_tax_amount: String(r.total_tax_amount ?? '0.00'),
      total_amount: String(r.total_amount ?? '0.00'),
      amount_in_words: r.amount_in_words || amountToWords(r.total_amount || 0),

      payment_method: r.payment_method || 'UPI',
      payment_reference: r.payment_reference || '',
      payment_date: toLocalDatetimeInput(r.payment_date || r.issue_date),
      installment_label: r.installment_label || '',
      payment_status_badge: r.payment_status_badge || 'PAID',

      ledger_total_fee: String(r.ledger_total_fee ?? '0.00'),
      ledger_discount: String(r.ledger_discount ?? '0.00'),
      ledger_previously_paid: String(r.ledger_previously_paid ?? '0.00'),
      ledger_current_paid: String(r.ledger_current_paid ?? r.total_amount ?? '0.00'),
      ledger_total_paid: String(r.ledger_total_paid ?? '0.00'),
      ledger_balance_due: String(r.ledger_balance_due ?? '0.00'),
      ledger_next_due_date: r.ledger_next_due_date || '',
      installment_schedule_snapshot: Array.isArray(r.installment_schedule_snapshot)
        ? r.installment_schedule_snapshot
        : [],

      template_style: r.template_style || 'EXECUTIVE',
      display_options: {
        ...DEFAULT_DISPLAY_OPTIONS,
        ...(r.display_options || {}),
      },
      line_items:
        Array.isArray(r.line_items) && r.line_items.length > 0
          ? r.line_items
          : [
              createEmptyLineItem(
                r.issuer_snapshot?.sac_code || '999293',
                r.course_or_package_name || 'Course Tuition Fee',
                r.subtotal_amount || r.total_amount || '0.00',
                r.installment_label || ''
              ),
            ],
      issuer_snapshot: {
        ...DEFAULT_ISSUER_SNAPSHOT,
        ...(r.issuer_snapshot || {}),
      },
      snapshot_data: r.snapshot_data || {},
      notes: r.notes || '',
      terms_and_conditions: r.terms_and_conditions || '',
      version: r.version || 1,
      void_reason: r.void_reason || '',
    };

    const autoCalc = calculateReceiptFinancials({
      lineItems: hydrated.line_items,
      subtotalAmount: hydrated.subtotal_amount,
      discountAmount: hydrated.discount_amount,
      taxMode: hydrated.tax_mode,
      supplyType: hydrated.supply_type,
      gstRate: hydrated.gst_rate,
      defaultSac: hydrated.issuer_snapshot?.sac_code || '999293',
      fallbackTitle: hydrated.course_or_package_name || 'Course Tuition Fee',
      fallbackPeriod: hydrated.installment_label || '',
    });
    const hasCustomFinancials =
      Boolean(r.is_manual_override) &&
      (round2(autoCalc.total_amount) !== round2(hydrated.total_amount) ||
        round2(autoCalc.taxable_amount) !== round2(hydrated.taxable_amount) ||
        round2(autoCalc.subtotal_amount) !== round2(hydrated.subtotal_amount) ||
        round2(autoCalc.discount_amount) !== round2(hydrated.discount_amount) ||
        round2(autoCalc.total_tax_amount) !== round2(hydrated.total_tax_amount) ||
        round2(autoCalc.cgst_rate) !== round2(hydrated.cgst_rate) ||
        round2(autoCalc.sgst_rate) !== round2(hydrated.sgst_rate) ||
        round2(autoCalc.igst_rate) !== round2(hydrated.igst_rate) ||
        round2(autoCalc.cgst_amount) !== round2(hydrated.cgst_amount) ||
        round2(autoCalc.sgst_amount) !== round2(hydrated.sgst_amount) ||
        round2(autoCalc.igst_amount) !== round2(hydrated.igst_amount));
    const expectedWords = amountToWords(hydrated.total_amount || 0);
    const hasCustomWords =
      Boolean(hydrated.amount_in_words) &&
      hydrated.amount_in_words.trim() !== expectedWords.trim();

    setManualFinancialOverride(hasCustomFinancials);
    setManualWordsOverride(hasCustomWords);
    setManualLedgerOverride(false);
    setForm(hydrated);
    setEmailForm((prev) => ({
      ...prev,
      to_email: hydrated.recipient_email || '',
      subject: `Official Fee Receipt ${hydrated.receipt_number || ''} - ${hydrated.issuer_snapshot.organization_name}`,
    }));
  };

  // Auto-download PDF if requested once loaded
  useEffect(() => {
    if (isOpen && !loading && autoDownloadOnLoad && exportTargetRef.current) {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loading, autoDownloadOnLoad]);

  const operatingModeLabel = useMemo(() => {
    if (form.payment) {
      return form.is_manual_override
        ? 'Mode B: Payment-Linked + Manual Overrides'
        : 'Mode A: Auto-Linked from Payment';
    }
    if (form.account || form.student) {
      return 'Mode B: Student/Account Linked + Editable';
    }
    return 'Mode C: 100% Standalone Manual Receipt / Proforma';
  }, [form.payment, form.account, form.student, form.is_manual_override]);

  if (!isOpen) return null;

  // Auto-pull from selected Student or Fee Account
  const handleAutoPullFromLink = async (studentIdOverride, accountIdOverride) => {
    const stuId = studentIdOverride !== undefined ? studentIdOverride : form.student;
    const accId = accountIdOverride !== undefined ? accountIdOverride : form.account;
    if (!stuId && !accId && !form.payment) {
      toast.error('Select a student or fee account to auto-populate.');
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/receipts/calculate-preview/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company,
          student: stuId || null,
          account: accId || null,
          payment: form.payment || null,
          tax_mode: form.tax_mode,
          supply_type: form.supply_type,
          gst_rate: form.gst_rate,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch student/account metadata');
      const data = await res.json();
      const stu = data.student_metadata || {};
      const led = data.ledger_snapshot || {};
      const fin = data.financials || {};

      setForm((prev) => {
        const nextAmount =
          round2(prev.total_amount) > 0
            ? prev.total_amount
            : fin.total_amount || led.ledger_balance_due || led.ledger_total_fee || '0.00';
        const courseName =
          stu.course_or_package_name || prev.course_or_package_name || 'Course Tuition Fee';

        const updated = {
          ...prev,
          student: stuId || prev.student,
          account: accId || prev.account,
          recipient_name: stu.recipient_name || prev.recipient_name,
          recipient_phone: stu.recipient_phone || prev.recipient_phone,
          recipient_email: stu.recipient_email || prev.recipient_email,
          parent_or_sponsor_name: stu.parent_or_sponsor_name || prev.parent_or_sponsor_name,
          recipient_address: stu.recipient_address || prev.recipient_address,
          student_enrollment_code: stu.student_enrollment_code || prev.student_enrollment_code,
          course_or_package_name: courseName,
          batch_name: stu.batch_name || prev.batch_name,
          campus_name: stu.campus_name || prev.campus_name,
          grade_level: stu.grade_level || prev.grade_level,
          mode_of_study: stu.mode_of_study || prev.mode_of_study,
          ledger_total_fee: led.ledger_total_fee ?? prev.ledger_total_fee,
          ledger_discount: led.ledger_discount ?? prev.ledger_discount,
          ledger_previously_paid: led.ledger_previously_paid ?? prev.ledger_previously_paid,
          ledger_current_paid: nextAmount,
          ledger_total_paid: led.ledger_total_paid ?? prev.ledger_total_paid,
          ledger_balance_due: led.ledger_balance_due ?? prev.ledger_balance_due,
          ledger_next_due_date: led.ledger_next_due_date || prev.ledger_next_due_date,
          installment_schedule_snapshot:
            led.installment_schedule_snapshot || prev.installment_schedule_snapshot,
          line_items:
            prev.line_items.length === 1 && round2(prev.line_items[0].amount) === 0
              ? [
                  createEmptyLineItem(
                    prev.issuer_snapshot?.sac_code || '999293',
                    courseName,
                    nextAmount,
                    prev.installment_label
                  ),
                ]
              : prev.line_items,
        };
        return recomputeFromItems(updated, true);
      });
      toast.success('Student & Fee Account details synced');
    } catch (err) {
      toast.error(err.message || 'Could not auto-pull details');
    }
  };

  const selectedAccountObj = useMemo(() => {
    if (!form.account) return null;
    return accounts.find((a) => String(a.id) === String(form.account)) || initialAccount || null;
  }, [form.account, accounts, initialAccount]);

  const availablePayments = useMemo(() => {
    if (!selectedAccountObj) return [];
    return Array.isArray(selectedAccountObj.payments) ? selectedAccountObj.payments : [];
  }, [selectedAccountObj]);

  const isCurrentAccountSettled = useMemo(() => {
    if (!selectedAccountObj) return false;
    return Number(selectedAccountObj.balance_due || 0) <= 0 && Number(selectedAccountObj.total_paid || 0) > 0;
  }, [selectedAccountObj]);

  const handleSelectPaymentRecord = (paymentId) => {
    if (!paymentId) {
      setForm((prev) => ({ ...prev, payment: '' }));
      return;
    }
    const payObj = availablePayments.find((p) => String(p.id) === String(paymentId));
    if (!payObj) return;

    setForm((prev) => {
      const payAmount = round2(payObj.amount).toFixed(2);
      const payDate = payObj.payment_date ? toLocalDatetimeInput(payObj.payment_date) : prev.payment_date;
      const ref = payObj.reference || '';
      const method = payObj.payment_method || 'UPI';
      const rNum = payObj.latest_receipt_number || payObj.receipt_number || `Payment #${payObj.id}`;
      const courseTitle = prev.course_or_package_name || selectedAccountObj?.plan_name || 'Course Tuition Fee';

      const totFee = round2(prev.ledger_total_fee || selectedAccountObj?.total_due || payAmount);
      const disc = round2(prev.ledger_discount || selectedAccountObj?.discount || 0);
      const accTotPaid = round2(selectedAccountObj?.total_paid || payAmount);
      const prevPaid = Math.max(0, round2(accTotPaid - Number(payAmount))).toFixed(2);
      const curPaid = payAmount;
      const totPaid = (Number(prevPaid) + Number(curPaid)).toFixed(2);
      const balDue = Math.max(0, round2(totFee - disc - Number(totPaid))).toFixed(2);

      const updated = {
        ...prev,
        payment: payObj.id,
        document_type: 'RECEIPT',
        payment_status_badge: balDue <= 0 ? 'SETTLED' : 'PAID',
        payment_method: method,
        payment_reference: ref,
        payment_date: payDate,
        subtotal_amount: payAmount,
        installment_label: payObj.installment?.label || prev.installment_label || '',
        ledger_total_fee: totFee.toFixed(2),
        ledger_discount: disc.toFixed(2),
        ledger_previously_paid: prevPaid,
        ledger_current_paid: curPaid,
        ledger_total_paid: totPaid,
        ledger_balance_due: balDue,
        line_items: [
          createEmptyLineItem(
            prev.issuer_snapshot?.sac_code || '999293',
            `${courseTitle} - Payment (${rNum})`,
            payAmount,
            payObj.installment?.label || ''
          ),
        ],
      };
      return recomputeFromItems(updated, true);
    });
    toast.success(`Loaded payment record: ${formatINR(payObj.amount)}`);
  };

  const handleLoadSettlementReceipt = () => {
    if (!selectedAccountObj) return;
    setForm((prev) => {
      const fullAmount = round2(selectedAccountObj.total_paid || selectedAccountObj.total_due || prev.ledger_total_fee).toFixed(2);
      const courseTitle = prev.course_or_package_name || selectedAccountObj.plan_name || 'Course Tuition Fee';
      const updated = {
        ...prev,
        payment: '',
        document_type: 'RECEIPT',
        payment_status_badge: 'SETTLED',
        subtotal_amount: fullAmount,
        ledger_total_fee: fullAmount,
        ledger_discount: '0.00',
        ledger_previously_paid: '0.00',
        ledger_current_paid: fullAmount,
        ledger_total_paid: fullAmount,
        ledger_balance_due: '0.00',
        line_items: [
          createEmptyLineItem(
            prev.issuer_snapshot?.sac_code || '999293',
            `${courseTitle} - Full Course Fee Settlement`,
            fullAmount,
            'Full Clearance'
          ),
        ],
      };
      return recomputeFromItems(updated, true);
    });
    toast.success('Loaded Full Settlement Clearance Receipt');
  };

  const handleLoadProformaInvoice = () => {
    if (!selectedAccountObj) return;
    setForm((prev) => {
      const balAmount = round2(selectedAccountObj.balance_due || 0).toFixed(2);
      const courseTitle = prev.course_or_package_name || selectedAccountObj.plan_name || 'Course Tuition Fee';
      const totFee = round2(selectedAccountObj.total_due || prev.ledger_total_fee).toFixed(2);
      const prevPaid = round2(selectedAccountObj.total_paid || 0).toFixed(2);
      const updated = {
        ...prev,
        payment: '',
        document_type: 'PROFORMA',
        payment_status_badge: 'PROFORMA',
        subtotal_amount: balAmount,
        ledger_total_fee: totFee,
        ledger_previously_paid: prevPaid,
        ledger_current_paid: '0.00',
        ledger_total_paid: prevPaid,
        ledger_balance_due: balAmount,
        line_items: [
          createEmptyLineItem(
            prev.issuer_snapshot?.sac_code || '999293',
            `${courseTitle} - Balance Due Invoice`,
            balAmount,
            'Remaining Due'
          ),
        ],
      };
      return recomputeFromItems(updated, true);
    });
    toast.success('Loaded Proforma Invoice for Balance Due');
  };

  // Line Item Handlers
  const handleLineItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = prev.line_items.map((item, idx) => {
        if (idx !== index) return item;
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
          const parsedQ = round2(updatedItem.quantity ?? 1);
          const q = parsedQ <= 0 ? 1 : parsedQ;
          const u = Math.max(0, round2(updatedItem.unit_price ?? 0));
          const d = Math.max(0, round2(updatedItem.discount ?? 0));
          updatedItem.amount = Math.max(0, round2(q * u - d)).toFixed(2);
        } else if (field === 'amount') {
          const amt = Math.max(0, round2(value));
          const parsedQ = round2(updatedItem.quantity ?? 1);
          const q = parsedQ <= 0 ? 1 : parsedQ;
          const d = Math.max(0, round2(updatedItem.discount ?? 0));
          updatedItem.unit_price = round2((amt + d) / q).toFixed(2);
        }
        return updatedItem;
      });
      return recomputeFromItems({ ...prev, line_items: items, is_manual_override: true });
    });
  };

  const handleAddLineItem = (presetTitle = 'Additional Fee Item', presetAmount = '0.00') => {
    setForm((prev) => {
      const nextItems = [
        ...prev.line_items,
        {
          sl_no: prev.line_items.length + 1,
          title: presetTitle,
          description: '',
          sac_code: prev.issuer_snapshot?.sac_code || '999293',
          period: prev.installment_label || '',
          quantity: '1.00',
          unit_price: round2(presetAmount).toFixed(2),
          discount: '0.00',
          amount: round2(presetAmount).toFixed(2),
        },
      ];
      return recomputeFromItems({ ...prev, line_items: nextItems, is_manual_override: true });
    });
  };

  const handleRemoveLineItem = (index) => {
    setForm((prev) => {
      if (prev.line_items.length <= 1) {
        toast.error('At least one line item is required on a receipt.');
        return prev;
      }
      const nextItems = prev.line_items
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, sl_no: idx + 1 }));
      return recomputeFromItems({ ...prev, line_items: nextItems, is_manual_override: true });
    });
  };

  const handleSplitRegistrationAndTuition = () => {
    const currentTotal = round2(form.total_amount || form.subtotal_amount || 0);
    const matchingAccount = accounts.find((a) => String(a.id) === String(form.account));
    const regFee = round2(matchingAccount?.registration_amount || 10000);
    const splitReg = currentTotal > regFee ? regFee : round2(currentTotal * 0.25);
    const splitTuition = Math.max(0, round2(currentTotal - splitReg));

    setForm((prev) => {
      const splitItems = [
        createEmptyLineItem(
          prev.issuer_snapshot?.sac_code || '999293',
          'Registration & Enrollment Fee',
          splitReg,
          'Registration'
        ),
        {
          ...createEmptyLineItem(
            prev.issuer_snapshot?.sac_code || '999293',
            prev.course_or_package_name || 'Course Tuition Fee',
            splitTuition,
            prev.installment_label || 'Tuition Installment'
          ),
          sl_no: 2,
        },
      ];
      return recomputeFromItems({ ...prev, line_items: splitItems, is_manual_override: true }, true);
    });
    toast.success('Split into Registration Fee + Course Tuition Fee');
  };

  const handleRecalculateLedgerBalance = () => {
    setForm((prev) => {
      const totalFee = round2(prev.ledger_total_fee);
      const disc = round2(prev.ledger_discount);
      const prevPaid = round2(prev.ledger_previously_paid);
      const currPaid = round2(prev.total_amount);
      const totPaid = round2(prevPaid + currPaid);
      const balDue = Math.max(0, round2(totalFee - disc - totPaid));
      return {
        ...prev,
        ledger_current_paid: currPaid.toFixed(2),
        ledger_total_paid: totPaid.toFixed(2),
        ledger_balance_due: balDue.toFixed(2),
        payment_status_badge:
          prev.document_type === 'PROFORMA'
            ? 'PROFORMA'
            : balDue > 0
            ? 'PARTIAL'
            : 'PAID',
      };
    });
    toast.success('Account ledger balance recalculated');
  };

  const handleToggleDisplayOption = (key) => {
    setForm((prev) => ({
      ...prev,
      display_options: {
        ...prev.display_options,
        [key]: !prev.display_options?.[key],
      },
    }));
  };

  const handleRefreshBrandingFromSettings = async () => {
    try {
      const token = await getToken();
      const comp = form.company || company || 'FLAG';
      const res = await fetch(`${API_BASE_URL}/fees/receipt-settings/?company=${encodeURIComponent(comp)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load company settings');
      const s = await res.json();
      setForm((prev) => ({
        ...prev,
        template_style: s.default_template || prev.template_style,
        terms_and_conditions: s.default_terms_and_conditions || prev.terms_and_conditions,
        display_options: {
          ...prev.display_options,
          ...(s.default_display_options || {}),
        },
        issuer_snapshot: {
          ...prev.issuer_snapshot,
          organization_name: s.organization_name || prev.issuer_snapshot.organization_name,
          subtitle: s.subtitle ?? prev.issuer_snapshot.subtitle,
          address: s.address ?? prev.issuer_snapshot.address,
          phone: s.phone ?? prev.issuer_snapshot.phone,
          email: s.email ?? prev.issuer_snapshot.email,
          website: s.website ?? prev.issuer_snapshot.website,
          gstin: s.gstin ?? prev.issuer_snapshot.gstin,
          pan_number: s.pan_number ?? prev.issuer_snapshot.pan_number,
          place_of_supply: s.place_of_supply || prev.issuer_snapshot.place_of_supply,
          sac_code: s.sac_code || prev.issuer_snapshot.sac_code,
          logo_url: s.logo_url ?? prev.issuer_snapshot.logo_url,
          signature_image: s.signature_image ?? prev.issuer_snapshot.signature_image,
          stamp_image: s.stamp_image ?? prev.issuer_snapshot.stamp_image,
          watermark_text: s.watermark_text || prev.issuer_snapshot.watermark_text,
          authorized_signatory_name: s.authorized_signatory_name || prev.issuer_snapshot.authorized_signatory_name,
          authorized_signatory_designation: s.authorized_signatory_designation || prev.issuer_snapshot.authorized_signatory_designation,
          bank_name: s.bank_name ?? prev.issuer_snapshot.bank_name,
          account_name: s.account_name ?? prev.issuer_snapshot.account_name,
          account_number: s.account_number ?? prev.issuer_snapshot.account_number,
          ifsc_code: s.ifsc_code ?? prev.issuer_snapshot.ifsc_code,
          upi_id: s.upi_id ?? prev.issuer_snapshot.upi_id,
          footer_note: s.footer_note || prev.issuer_snapshot.footer_note,
          brand_color: s.brand_color || prev.issuer_snapshot.brand_color,
        },
      }));
      toast.success(`Branding refreshed from ${comp} settings`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to reload settings');
    }
  };

  const handleSaveReceipt = async (andDownload = false) => {
    if (!form.recipient_name?.trim()) {
      toast.error('Recipient / Student Name is required.');
      setActiveSection('source_recipient');
      return null;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const isEditing = Boolean(form.id);
      const url = isEditing
        ? `${API_BASE_URL}/fees/receipts/${form.id}/`
        : `${API_BASE_URL}/fees/receipts/`;
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        ...form,
        company: form.company || company,
        student: form.student ? Number(form.student) : null,
        account: form.account ? Number(form.account) : null,
        payment: form.payment ? Number(form.payment) : null,
        receipt_number: manualNumberUnlock || isEditing ? form.receipt_number : '',
        issue_date: form.issue_date ? new Date(form.issue_date).toISOString() : new Date().toISOString(),
        payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : new Date().toISOString(),
        ledger_next_due_date: form.ledger_next_due_date || null,
        manual_financial_override: manualFinancialOverride,
        manual_words_override: manualWordsOverride,
        manual_ledger_override: manualLedgerOverride,
        gst_rate: form.gst_rate,
      };

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstErr =
          data.detail ||
          data.receipt_number ||
          data.recipient_name ||
          JSON.stringify(data);
        throw new Error(Array.isArray(firstErr) ? firstErr[0] : firstErr);
      }

      hydrateReceiptObject(data);
      toast.success(
        isEditing
          ? `Receipt ${data.receipt_number} updated (v${data.version})`
          : `Official Receipt ${data.receipt_number} generated`
      );
      if (onSaved) onSaved(data, false);

      if (andDownload) {
        setTimeout(() => {
          handleDownloadPdf(data.receipt_number);
        }, 150);
      }
      return data;
    } catch (err) {
      toast.error(err.message || 'Failed to save receipt');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (overrideReceiptNo) => {
    const target = exportTargetRef.current || previewRef.current;
    if (!target) return;
    try {
      setExportingPdf(true);
      const rNo = (overrideReceiptNo || form.receipt_number || 'DRAFT').replace(/\//g, '_');
      const rName = (form.recipient_name || 'Student').replace(/\s+/g, '_');
      await exportReceiptElementToPdf(target, `FLAG_Receipt_${rNo}_${rName}.pdf`, false);
      toast.success('High-DPI A4 PDF downloaded');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const target = exportTargetRef.current || previewRef.current;
    if (!target) return;
    printReceiptElement(target, `Receipt_${form.receipt_number || 'Preview'}`);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    let currentReceiptId = form.id;
    if (!currentReceiptId) {
      const saved = await handleSaveReceipt(false);
      if (!saved?.id) return;
      currentReceiptId = saved.id;
    }

    if (!emailForm.to_email || !emailForm.to_email.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }

    try {
      setSendingEmail(true);
      let pdfBase64 = null;
      const target = exportTargetRef.current || previewRef.current;
      if (emailForm.attach_pdf && target) {
        pdfBase64 = await exportReceiptElementToPdf(target, 'Receipt.pdf', true);
      }

      const token = await getToken();
      const verifyUrl = `${window.location.origin}/verify-receipt/${form.verification_token}`;
      const res = await fetch(`${API_BASE_URL}/fees/receipts/${currentReceiptId}/send-email/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: emailForm.to_email,
          subject: emailForm.subject,
          message: emailForm.message,
          verify_url: verifyUrl,
          pdf_base64: pdfBase64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.to_email || data.detail || 'Failed to dispatch email');
      }
      toast.success(data.detail || `Receipt emailed to ${emailForm.to_email}`);
      setShowEmailDrawer(false);
    } catch (err) {
      toast.error(err.message || 'Email dispatch failed');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWhatsAppShare = async () => {
    let rNo = form.receipt_number;
    let vToken = form.verification_token;
    if (!form.id) {
      const saved = await handleSaveReceipt(false);
      if (saved) {
        rNo = saved.receipt_number;
        vToken = saved.verification_token;
      }
    }
    const verifyUrl = `${window.location.origin}/verify-receipt/${vToken || 'preview'}`;
    const phoneDigits = String(form.recipient_phone || '').replace(/\D/g, '');
    const normalizedPhone =
      phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

    const text = [
      `*${form.issuer_snapshot?.organization_name || 'FLAG German Language Academy'}*`,
      `Official Fee Receipt: *${rNo || 'Issued'}*`,
      `Student: *${form.recipient_name}*`,
      `Course: ${form.course_or_package_name || 'German Language Program'}`,
      `Amount Received: *${formatINR(form.total_amount)}* (${form.amount_in_words})`,
      `Payment Mode: ${form.payment_method}${form.payment_reference ? ` (Ref: ${form.payment_reference})` : ''}`,
      `Verify Receipt Authenticity: ${verifyUrl}`,
    ].join('\n');

    const waUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const isVoidLocked = form.status === 'VOID';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md">
      {/* Top Studio Command Bar */}
      <div className="h-16 px-5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner shrink-0">
            <FileCheck2 size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight truncate">
                FLAG Digital Receipt & Invoice Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 whitespace-nowrap">
                {operatingModeLabel}
              </span>
              {form.id && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {form.receipt_number} • v{form.version || 1}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Auto-linked data + 100% manual field, line-item, tax & ledger override + Cryptographic QR seal
            </p>
          </div>
        </div>

        {/* Template & DocType Quick Switchers */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          {[
            { id: 'EXECUTIVE', label: 'Executive A4' },
            { id: 'GST_INVOICE', label: 'GST Tax Invoice' },
            { id: 'DUAL_SLIP', label: 'Dual-Slip Voucher' },
          ].map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, template_style: tpl.id }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                form.template_style === tpl.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
            title="Print A4 Receipt"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
            title="Share via WhatsApp"
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailDrawer((v) => !v)}
            className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5"
            title="Email PDF Receipt"
          >
            <Mail size={15} />
            <span className="hidden sm:inline">Email</span>
          </button>

          <button
            type="button"
            disabled={exportingPdf}
            onClick={() => handleDownloadPdf()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-600"
          >
            <Download size={15} />
            {exportingPdf ? 'Exporting...' : 'PDF'}
          </button>

          {!isVoidLocked && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveReceipt(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Save size={15} />
                {saving ? 'Saving...' : form.id ? 'Update Receipt' : 'Save Receipt'}
              </button>
              <button
                type="button"
                disabled={saving || exportingPdf}
                onClick={() => handleSaveReceipt(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles size={15} />
                Save & PDF
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Optional Email Dispatch Drawer */}
      {showEmailDrawer && (
        <div className="bg-slate-900/95 border-b border-indigo-500/30 px-6 py-3.5 text-white animate-fadeIn">
          <form onSubmit={handleSendEmail} className="max-w-6xl mx-auto flex flex-wrap items-end gap-3">
            <div className="w-64">
              <label className="block text-[10px] font-bold uppercase text-indigo-300 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                required
                value={emailForm.to_email}
                onChange={(e) => setEmailForm({ ...emailForm, to_email: e.target.value })}
                placeholder="student@example.com"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-bold uppercase text-indigo-300 mb-1">
                Email Subject
              </label>
              <input
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Official Fee Receipt"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[10px] font-bold uppercase text-indigo-300 mb-1">
                Custom Note
              </label>
              <input
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailForm.attach_pdf}
                onChange={(e) => setEmailForm({ ...emailForm, attach_pdf: e.target.checked })}
                className="rounded text-indigo-500"
              />
              Attach A4 PDF
            </label>
            <button
              type="submit"
              disabled={sendingEmail}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Send size={14} />
              {sendingEmail ? 'Sending...' : 'Send Now'}
            </button>
            <button
              type="button"
              onClick={() => setShowEmailDrawer(false)}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Split-Screen Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANE: Interactive Control & Override Builder */}
        <div className="w-full lg:w-[48%] xl:w-[46%] bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Sub-Navigation Tabs */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0">
            {[
              { id: 'source_recipient', label: '1. Recipient & Course', icon: UserCheck },
              { id: 'particulars_tax', label: '2. Line Items & GST', icon: FileSpreadsheet },
              { id: 'payment_ledger', label: '3. Payment & Ledger', icon: Layers },
              { id: 'toggles_notes', label: '4. Visibility Toggles', icon: Eye },
              { id: 'issuer_audit', label: '5. Branding & Audit', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeSection === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Left Pane Scrollable Controls */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                Preparing Receipt Studio...
              </div>
            ) : (
              <>
                {isVoidLocked && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
                    <div>
                      <strong className="font-extrabold uppercase block">
                        This receipt is VOID / CANCELLED
                      </strong>
                      <span>Reason: {form.void_reason || 'Cancelled by administrator'}</span>
                    </div>
                    <Lock size={18} className="text-red-600 shrink-0" />
                  </div>
                )}

                {/* Document Type, Template & Status Bar */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                      Document Type
                    </label>
                    <select
                      disabled={isVoidLocked}
                      value={form.document_type}
                      onChange={(e) => {
                        const docType = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          document_type: docType,
                          payment_status_badge:
                            docType === 'PROFORMA'
                              ? 'PROFORMA'
                              : prev.payment_status_badge === 'PROFORMA'
                              ? 'PAID'
                              : prev.payment_status_badge,
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="RECEIPT">Official Fee Receipt</option>
                      <option value="TAX_INVOICE">GST Tax Invoice</option>
                      <option value="PROFORMA">Proforma Invoice / Quote</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                      Layout Template
                    </label>
                    <select
                      value={form.template_style}
                      onChange={(e) => setForm((prev) => ({ ...prev, template_style: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="EXECUTIVE">FLAG Executive A4</option>
                      <option value="GST_INVOICE">Classic GST Tax Invoice</option>
                      <option value="DUAL_SLIP">Compact Dual-Slip Voucher</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                      Document Status
                    </label>
                    <select
                      disabled={isVoidLocked}
                      value={form.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          status: nextStatus,
                          payment_status_badge:
                            nextStatus === 'REFUNDED'
                              ? 'REFUNDED'
                              : prev.document_type === 'PROFORMA'
                              ? 'PROFORMA'
                              : prev.payment_status_badge === 'REFUNDED'
                              ? 'PAID'
                              : prev.payment_status_badge,
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="ISSUED">ISSUED (Official)</option>
                      {(!form.id || !form.saved_status || form.saved_status === 'DRAFT') && (
                        <option value="DRAFT">DRAFT (Preview)</option>
                      )}
                      <option value="REFUNDED">REFUNDED</option>
                      {isVoidLocked && <option value="VOID">VOID / CANCELLED</option>}
                    </select>
                  </div>
                </div>

                {/* TAB 1: SOURCE & RECIPIENT & ACADEMIC CONTEXT */}
                {activeSection === 'source_recipient' && (
                  <div className="space-y-4">
                    {/* Smart Auto-Link Box */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                            Smart Auto-Link (Optional — Leave Blank for Standalone Mode)
                          </h3>
                          <p className="text-[11px] text-indigo-700">
                            Select a student or fee account to auto-fill all fields, then freely edit any field below.
                          </p>
                        </div>
                        {(form.student || form.account || form.payment) && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                student: '',
                                account: '',
                                payment: '',
                              }))
                            }
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            Unlink (Standalone)
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                            Link Fee Account
                          </label>
                          <select
                            value={form.account || ''}
                            onChange={(e) => {
                              const accId = e.target.value;
                              const accObj = accounts.find((a) => String(a.id) === String(accId));
                              const stuId = accObj?.student || form.student;
                              setForm((prev) => ({ ...prev, account: accId, student: stuId }));
                              if (accId) handleAutoPullFromLink(stuId, accId);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs"
                          >
                            <option value="">-- Standalone / No Account --</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.student_name} — {acc.plan_name || acc.plan_code} (Bal: {formatINR(acc.balance_due)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                            Or Link Enrolled Student
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={form.student || ''}
                              onChange={(e) => {
                                const stuId = e.target.value;
                                const matchingAcc = accounts.find((a) => String(a.student) === String(stuId));
                                setForm((prev) => ({
                                  ...prev,
                                  student: stuId,
                                  account: matchingAcc ? matchingAcc.id : prev.account,
                                }));
                                if (stuId) handleAutoPullFromLink(stuId, matchingAcc?.id || '');
                              }}
                              className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs"
                            >
                              <option value="">-- Walk-in / Ad-Hoc Recipient --</option>
                              {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.branch_name ? `(${s.branch_name})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAutoPullFromLink(form.student, form.account)}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                              title="Sync from Student & Account"
                            >
                              <RefreshCw size={13} /> Sync
                            </button>
                          </div>
                        </div>
                      </div>

                      {availablePayments.length > 0 && (
                        <div className="mt-3 p-3.5 rounded-xl bg-white border border-indigo-200 shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                              <FileCheck2 size={15} className="text-indigo-600" />
                              Select Payment to Receipt:
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {availablePayments.length} Payment{availablePayments.length > 1 ? 's' : ''} on record
                            </span>
                          </div>

                          <select
                            value={form.payment || ''}
                            onChange={(e) => handleSelectPaymentRecord(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/20 text-xs font-semibold text-slate-900"
                          >
                            <option value="">-- Custom / Manual Bill (No specific payment linked) --</option>
                            {availablePayments.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.latest_receipt_number || p.receipt_number || `Payment #${p.id}`} — {formatINR(p.amount)} via {p.payment_method} on {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} {p.reference ? `(Ref: ${p.reference})` : ''}
                              </option>
                            ))}
                          </select>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Quick Fetch:</span>
                            {availablePayments.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPaymentRecord(p.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  String(form.payment) === String(p.id)
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                                }`}
                              >
                                {p.latest_receipt_number || p.receipt_number || `Pay #${p.id}`}: {formatINR(p.amount)}
                              </button>
                            ))}
                            {isCurrentAccountSettled && (
                              <button
                                type="button"
                                onClick={handleLoadSettlementReceipt}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm"
                              >
                                🎓 Full Settlement Receipt ({formatINR(selectedAccountObj?.total_paid || form.ledger_total_fee)})
                              </button>
                            )}
                            {round2(selectedAccountObj?.balance_due || 0) > 0 && (
                              <button
                                type="button"
                                onClick={handleLoadProformaInvoice}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                              >
                                📄 Proforma for Balance Due ({formatINR(selectedAccountObj?.balance_due)})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recipient Override Fields */}
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Recipient / Billing Profile (100% Editable)
                        </h3>
                        <select
                          value={form.billed_to_type}
                          onChange={(e) => setForm({ ...form, billed_to_type: e.target.value })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50"
                        >
                          <option value="STUDENT">Billed To: Student</option>
                          <option value="PARENT">Billed To: Parent / Guardian</option>
                          <option value="SPONSOR">Billed To: Corporate Sponsor</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Recipient Full Name *
                          </label>
                          <input
                            required
                            value={form.recipient_name}
                            onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                            placeholder="Student or Sponsor Name"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Student ID / Enrollment Code
                          </label>
                          <input
                            value={form.student_enrollment_code}
                            onChange={(e) => setForm({ ...form, student_enrollment_code: e.target.value })}
                            placeholder="e.g. FLAG-STU-0042"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                          <input
                            value={form.recipient_phone}
                            onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                            placeholder="+91 ..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={form.recipient_email}
                            onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                            placeholder="student@email.com"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Parent / Guardian / Sponsor Name
                          </label>
                          <input
                            value={form.parent_or_sponsor_name}
                            onChange={(e) => setForm({ ...form, parent_or_sponsor_name: e.target.value })}
                            placeholder="Optional C/O or Sponsor"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Customer / Sponsor GSTIN (Optional)
                          </label>
                          <input
                            value={form.recipient_gstin}
                            onChange={(e) =>
                              setForm({ ...form, recipient_gstin: e.target.value.toUpperCase() })
                            }
                            placeholder="Unregistered / Consumer"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Billing Address (Optional)
                          </label>
                          <input
                            value={form.recipient_address}
                            onChange={(e) => setForm({ ...form, recipient_address: e.target.value })}
                            placeholder="City, State, PIN"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Place of Supply</label>
                          <input
                            value={form.place_of_supply}
                            onChange={(e) => setForm({ ...form, place_of_supply: e.target.value })}
                            placeholder="Kerala (32)"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Academic Context Override */}
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Academic Context Snapshot
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Course / Package Name
                          </label>
                          <input
                            value={form.course_or_package_name}
                            onChange={(e) => setForm({ ...form, course_or_package_name: e.target.value })}
                            placeholder="e.g. FLAG German A1 to B2 Full Package"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Batch Name</label>
                          <input
                            value={form.batch_name}
                            onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                            placeholder="e.g. A1 Morning Batch"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Campus / Branch</label>
                          <input
                            value={form.campus_name}
                            onChange={(e) => setForm({ ...form, campus_name: e.target.value })}
                            placeholder="e.g. Kochi / Kottayam"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">CEFR Grade / Level</label>
                          <input
                            value={form.grade_level}
                            onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                            placeholder="e.g. A1, A2, B1, B2"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Mode of Study</label>
                          <input
                            value={form.mode_of_study}
                            onChange={(e) => setForm({ ...form, mode_of_study: e.target.value })}
                            placeholder="Offline / Online / Hybrid"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: LINE ITEMS & TAX CALCULATOR */}
                {activeSection === 'particulars_tax' && (
                  <div className="space-y-4">
                    {/* Quick Preset Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddLineItem('Course Tuition Fee', '0.00')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Plus size={13} /> Add Row
                        </button>
                        <button
                          type="button"
                          onClick={handleSplitRegistrationAndTuition}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold"
                        >
                          Split Reg. + Tuition
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddLineItem('Exam / Goethe Prep Fee', '3500.00')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        >
                          + Exam Fee
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddLineItem('Study Material & Books', '2000.00')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        >
                          + Study Material
                        </button>
                      </div>
                    </div>

                    {/* Itemized Rows */}
                    <div className="space-y-3">
                      {form.line_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase text-indigo-600">
                              Line Item #{idx + 1}
                            </span>
                            {form.line_items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                            <div className="md:col-span-6">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Particulars / Title
                              </label>
                              <input
                                value={item.title}
                                onChange={(e) => handleLineItemChange(idx, 'title', e.target.value)}
                                placeholder="e.g. German A1-B2 Tuition Fee"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Period / Installment
                              </label>
                              <input
                                value={item.period || ''}
                                onChange={(e) => handleLineItemChange(idx, 'period', e.target.value)}
                                placeholder="e.g. Installment 1"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                SAC / HSN Code
                              </label>
                              <input
                                value={item.sac_code || ''}
                                onChange={(e) => handleLineItemChange(idx, 'sac_code', e.target.value)}
                                placeholder="999293"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
                            <div className="col-span-2 md:col-span-5">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Sub-Description / Remarks (Optional)
                              </label>
                              <input
                                value={item.description || ''}
                                onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                placeholder="Batch / module details..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qty</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-right"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Rate (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-right"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-indigo-700 mb-0.5">
                                Line Total (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50/50 text-xs font-extrabold text-indigo-950 text-right"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* GST & Tax Engine Controls */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Tax / GST Calculation Engine
                        </h3>
                        <button
                          type="button"
                          onClick={() => setManualFinancialOverride((v) => !v)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                            manualFinancialOverride
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {manualFinancialOverride ? <Unlock size={12} /> : <Lock size={12} />}
                          {manualFinancialOverride ? 'Manual Totals Unlocked' : 'Auto-Calculated Totals'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Tax Mode
                          </label>
                          <select
                            value={form.tax_mode}
                            onChange={(e) =>
                              setForm((prev) =>
                                recomputeFromItems({ ...prev, tax_mode: e.target.value }, true)
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="INCLUSIVE">GST Inclusive (Back-calculates 18% from Total)</option>
                            <option value="EXCLUSIVE">GST Exclusive (Adds 18% on top of Subtotal)</option>
                            <option value="NONE">No Tax / Exempt Fee Receipt</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Supply Type
                          </label>
                          <select
                            value={form.supply_type}
                            onChange={(e) =>
                              setForm((prev) =>
                                recomputeFromItems({ ...prev, supply_type: e.target.value }, true)
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                            <option value="INTER_STATE">Inter-State (IGST)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            GST Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.gst_rate}
                            onChange={(e) =>
                              setForm((prev) =>
                                recomputeFromItems({ ...prev, gst_rate: e.target.value }, true)
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Subtotal (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            readOnly={!manualFinancialOverride}
                            value={form.subtotal_amount}
                            onChange={(e) =>
                              setForm((prev) =>
                                recomputeFromItems({ ...prev, subtotal_amount: e.target.value })
                              )
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                              manualFinancialOverride ? 'bg-white border-amber-300' : 'bg-slate-100 border-slate-200'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Discount / Concession (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.discount_amount}
                            onChange={(e) =>
                              setForm((prev) =>
                                recomputeFromItems(
                                  { ...prev, discount_amount: e.target.value },
                                  !manualFinancialOverride
                                )
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Taxable Value (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            readOnly={!manualFinancialOverride}
                            value={form.taxable_amount}
                            onChange={(e) => setForm({ ...form, taxable_amount: e.target.value })}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                              manualFinancialOverride ? 'bg-white border-amber-300' : 'bg-slate-100 border-slate-200'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-emerald-700 mb-0.5">
                            Grand Total Received (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            readOnly={!manualFinancialOverride}
                            value={form.total_amount}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                total_amount: e.target.value,
                                ledger_current_paid: e.target.value,
                                amount_in_words: manualWordsOverride
                                  ? prev.amount_in_words
                                  : amountToWords(e.target.value),
                              }))
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black ${
                              manualFinancialOverride
                                ? 'bg-amber-50 border-amber-400 text-amber-950'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Amount in Words Control */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Amount in Words (Indian Numbering System)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setManualWordsOverride((prev) => {
                                const next = !prev;
                                if (!next) {
                                  setForm((f) => ({
                                    ...f,
                                    amount_in_words: amountToWords(f.total_amount),
                                  }));
                                }
                                return next;
                              })
                            }
                            className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            {manualWordsOverride ? <Unlock size={11} /> : <Lock size={11} />}
                            {manualWordsOverride ? 'Custom Words Unlocked' : 'Unlock to Edit Words'}
                          </button>
                        </div>
                        <input
                          readOnly={!manualWordsOverride}
                          value={form.amount_in_words}
                          onChange={(e) => setForm({ ...form, amount_in_words: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs italic font-semibold ${
                            manualWordsOverride
                              ? 'bg-white border-indigo-300 text-slate-900'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PAYMENT & ACCOUNT LEDGER SNAPSHOT */}
                {activeSection === 'payment_ledger' && (
                  <div className="space-y-4">
                    {/* Receipt Number & Payment Info */}
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Receipt Identifier & Payment Metadata
                        </h3>
                        <button
                          type="button"
                          onClick={() => setManualNumberUnlock((v) => !v)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {manualNumberUnlock ? <Unlock size={12} /> : <Lock size={12} />}
                          {manualNumberUnlock ? 'Manual Receipt No. Active' : 'Override Receipt No.'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Receipt Number
                          </label>
                          <input
                            readOnly={!manualNumberUnlock && !form.id}
                            value={form.receipt_number}
                            onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                            placeholder="AUTO (e.g. FLAG/2026-27/0001)"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                              manualNumberUnlock || form.id
                                ? 'bg-white border-indigo-300 text-slate-900'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Issue Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={form.issue_date}
                            onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Payment Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={form.payment_date}
                            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Payment Mode
                          </label>
                          <select
                            value={form.payment_method}
                            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="UPI">UPI</option>
                            <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Debit / Credit Card</option>
                            <option value="CHEQUE">Cheque / DD</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Reference / UTR / Txn ID
                          </label>
                          <input
                            value={form.payment_reference}
                            onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                            placeholder="UTR / Cheque / Receipt Ref"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Status Stamp Badge
                          </label>
                          <select
                            value={form.payment_status_badge}
                            onChange={(e) => setForm({ ...form, payment_status_badge: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                          >
                            <option value="PAID">PAID (Full / Installment Cleared)</option>
                            <option value="PARTIAL">PARTIAL PAYMENT</option>
                            <option value="SETTLED">ACCOUNT SETTLED</option>
                            <option value="PROFORMA">PROFORMA / QUOTATION</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Installment / Milestone Label
                        </label>
                        <input
                          value={form.installment_label}
                          onChange={(e) => setForm({ ...form, installment_label: e.target.value })}
                          placeholder="e.g. Installment 2 of 3 / Registration Fee"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>
                    </div>

                    {/* Account Balance Summary Override */}
                    <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                            Account Balance Summary (Printed on Receipt)
                          </h3>
                          <p className="text-[11px] text-indigo-700">
                            Customize or hide the student's overall fee ledger summary on this receipt.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRecalculateLedgerBalance}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Auto-Compute Balance
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Total Course Fee (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.ledger_total_fee}
                            onChange={(e) => setForm({ ...form, ledger_total_fee: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Special Discount (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.ledger_discount}
                            onChange={(e) => setForm({ ...form, ledger_discount: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Previously Paid (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.ledger_previously_paid}
                            onChange={(e) => setForm({ ...form, ledger_previously_paid: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                            This Receipt Amount (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.ledger_current_paid}
                            onChange={(e) => setForm({ ...form, ledger_current_paid: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-rose-700 mb-1">
                            Remaining Balance Due (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.ledger_balance_due}
                            onChange={(e) => setForm({ ...form, ledger_balance_due: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 text-xs font-bold text-rose-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Next Installment Due Date
                          </label>
                          <input
                            type="date"
                            value={form.ledger_next_due_date || ''}
                            onChange={(e) => setForm({ ...form, ledger_next_due_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: VISIBILITY TOGGLES & NOTES */}
                {activeSection === 'toggles_notes' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Per-Receipt Visibility Toggles (Live Preview Updates)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[
                          { key: 'show_ledger_summary', label: 'Show Account Balance Summary Box' },
                          { key: 'show_installment_schedule', label: 'Show Installment Schedule Table' },
                          { key: 'show_tax_breakdown', label: 'Show GST Breakdown (CGST / SGST / IGST)' },
                          { key: 'show_bank_details', label: 'Show Academy Bank & UPI Details' },
                          { key: 'show_signature_and_stamp', label: 'Show Official Seal & Signatory' },
                          { key: 'show_qr_verification', label: 'Show Cryptographic Verification QR Code' },
                          { key: 'show_amount_in_words', label: 'Show Amount in Words Callout' },
                          { key: 'show_sac_column', label: 'Show SAC / HSN Code Column' },
                          { key: 'show_discount_line', label: 'Show Discount / Concession Line' },
                          { key: 'show_watermark', label: 'Show Diagonal Background Watermark' },
                          { key: 'show_student_academic_info', label: 'Show Student Academic Context Block' },
                          { key: 'show_terms', label: 'Show Terms & Conditions Footer' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-indigo-50/40"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(form.display_options?.[item.key])}
                              onChange={() => handleToggleDisplayOption(item.key)}
                              className="w-4 h-4 rounded text-indigo-600"
                            />
                            <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Custom Remarks / Notes on Receipt
                        </label>
                        <textarea
                          rows={2}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          placeholder="Optional remarks printed on the receipt..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Terms & Conditions (Override for this receipt)
                        </label>
                        <textarea
                          rows={3}
                          value={form.terms_and_conditions}
                          onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: ISSUER SNAPSHOT & AUDIT TRAIL */}
                {activeSection === 'issuer_audit' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Issuer Header, GSTIN & Signatory Override (For This Receipt)
                        </h3>
                        <button
                          type="button"
                          onClick={handleRefreshBrandingFromSettings}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                        >
                          <RefreshCw size={12} />
                          Reload Latest Settings Branding ({form.company || company || 'FLAG'})
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Academy / Organization Name
                          </label>
                          <input
                            value={form.issuer_snapshot?.organization_name || ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                issuer_snapshot: {
                                  ...form.issuer_snapshot,
                                  organization_name: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Academy GSTIN
                          </label>
                          <input
                            value={form.issuer_snapshot?.gstin || ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                issuer_snapshot: {
                                  ...form.issuer_snapshot,
                                  gstin: e.target.value.toUpperCase(),
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Authorized Signatory Name
                          </label>
                          <input
                            value={form.issuer_snapshot?.authorized_signatory_name || ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                issuer_snapshot: {
                                  ...form.issuer_snapshot,
                                  authorized_signatory_name: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Signatory Designation
                          </label>
                          <input
                            value={form.issuer_snapshot?.authorized_signatory_designation || ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                issuer_snapshot: {
                                  ...form.issuer_snapshot,
                                  authorized_signatory_designation: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Verification & Revision History */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <History size={14} /> Cryptographic Verification & Audit Trail
                        </h3>
                        {form.verification_token && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/verify-receipt/${form.verification_token}`;
                              navigator.clipboard?.writeText(url);
                              toast.success('Public verification link copied!');
                            }}
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Copy size={12} /> Copy Verify Link
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">
                            Verification Token
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {form.verification_token || 'Generated on Save'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">
                            HMAC-SHA256 Seal Prefix
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            {form.signature_prefix || 'Computed on Save'}
                          </span>
                        </div>
                      </div>

                      {Array.isArray(form.snapshot_data?.revisions) &&
                        form.snapshot_data.revisions.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] font-bold uppercase text-slate-500">
                              Immutable Revision Snapshots ({form.snapshot_data.revisions.length})
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1.5">
                              {form.snapshot_data.revisions.map((rev, i) => (
                                <div
                                  key={i}
                                  className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-bold text-indigo-700">v{rev.version}</span> •{' '}
                                    <span className="font-semibold">{rev.action}</span> by{' '}
                                    <span>{rev.actor}</span>
                                  </div>
                                  <div className="text-slate-500 font-mono text-[10px]">
                                    {formatINR(rev.total_amount)} •{' '}
                                    {rev.timestamp ? new Date(rev.timestamp).toLocaleString() : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Live A4 WYSIWYG Preview */}
        <div className="flex-1 bg-slate-900 flex flex-col h-full overflow-hidden relative">
          {/* Preview Toolbar */}
          <div className="h-11 px-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">Live A4 Print Preview</span>
              <span className="text-slate-500">• 210mm × 297mm Vector Layout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, round2(z - 0.1)))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="font-mono text-[11px] w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.1, round2(z + 0.1)))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Scaled A4 Canvas Viewport */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 150ms ease',
              }}
              className="shadow-2xl rounded-sm ring-1 ring-white/10"
            >
              <ReceiptTemplateRenderer receipt={form} containerRef={previewRef} />
            </div>
          </div>

          {/* Offscreen Full-Scale 1:1 A4 Render Target for Crisp PDF & Print Export */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '210mm',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: -9999,
            }}
            aria-hidden="true"
          >
            <ReceiptTemplateRenderer receipt={form} containerRef={exportTargetRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
