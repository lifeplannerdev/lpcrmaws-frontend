/**
 * FLAG Digital Receipt & Invoice Engine (Frontend Utilities)
 * - Indian Currency Amount-to-Words (Crores, Lakhs, Thousands, Paise)
 * - Deterministic GST Calculator (NONE, INCLUSIVE 18%, EXCLUSIVE 18%, Intra/Inter-State)
 * - Self-contained ISO/IEC 18004 QR Code Matrix -> Crisp Vector SVG Generator (Zero external network/CORS dependency)
 * - High-DPI A4 PDF Export & Direct Print Runner
 */
import html2pdf from 'html2pdf.js';

export const DEFAULT_DISPLAY_OPTIONS = {
  show_ledger_summary: true,
  show_installment_schedule: false,
  show_tax_breakdown: true,
  show_bank_details: true,
  show_signature_and_stamp: true,
  show_qr_verification: true,
  show_amount_in_words: true,
  show_sac_column: true,
  show_discount_line: true,
  show_watermark: true,
  show_student_academic_info: true,
  show_terms: true,
};

export const DEFAULT_ISSUER_SNAPSHOT = {
  company: 'FLAG',
  organization_name: 'FLAG German Language Academy',
  subtitle: 'Foreign Language Academy for Global Careers',
  address: 'Kochi | Kottayam | Kerala, India',
  phone: '+91 98460 00000',
  email: 'accounts@flagacademy.in',
  website: 'www.flagacademy.in',
  gstin: '',
  pan_number: '',
  place_of_supply: 'Kerala (32)',
  sac_code: '999293',
  logo_url: '',
  signature_image: '',
  stamp_image: '',
  watermark_text: 'FLAG GERMAN ACADEMY',
  authorized_signatory_name: 'Authorized Signatory',
  authorized_signatory_designation: 'Accounts & Finance Department',
  bank_name: '',
  account_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  footer_note: 'Thank you for choosing FLAG German Academy.',
  brand_color: '#312e81',
};

export function round2(val) {
  const n = Number(String(val ?? 0).replace(/,/g, '').replace(/₹/g, '').trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatINR(val, showSymbol = true) {
  const num = round2(val);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitWords(n) {
  if (n <= 0) return '';
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t}-${o}` : t;
}

function threeDigitWords(n) {
  if (n <= 0) return '';
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const parts = [];
  if (h > 0) parts.push(`${ONES[h]} Hundred`);
  if (rem > 0) parts.push(twoDigitWords(rem));
  return parts.join(' ');
}

function indianIntegerToWords(n) {
  if (n === 0) return 'Zero';
  if (n < 0) return `Minus ${indianIntegerToWords(Math.abs(n))}`;

  const parts = [];
  const crores = Math.floor(n / 10000000);
  let rem = n % 10000000;

  if (crores > 0) {
    parts.push(`${crores >= 100 ? indianIntegerToWords(crores) : twoDigitWords(crores)} Crore`);
  }

  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;
  if (lakhs > 0) {
    parts.push(`${twoDigitWords(lakhs)} Lakh`);
  }

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;
  if (thousands > 0) {
    parts.push(`${twoDigitWords(thousands)} Thousand`);
  }

  if (rem > 0) {
    parts.push(threeDigitWords(rem));
  }

  return parts.join(' ');
}

export function amountToWords(amount) {
  const num = round2(amount);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  let rupees = Math.floor(abs);
  let paise = Math.round((abs - rupees) * 100);
  if (paise >= 100) {
    rupees += 1;
    paise -= 100;
  }

  const prefix = isNeg ? 'Minus ' : '';
  const rupeeWords = indianIntegerToWords(rupees);
  if (paise > 0) {
    return `${prefix}Rupees ${rupeeWords} and ${twoDigitWords(paise)} Paise Only`;
  }
  return `${prefix}Rupees ${rupeeWords} Only`;
}

export function getIndianFinancialYear(dateInput) {
  const dt = dateInput ? new Date(dateInput) : new Date();
  const year = Number.isNaN(dt.getTime()) ? new Date().getFullYear() : dt.getFullYear();
  const month = Number.isNaN(dt.getTime()) ? new Date().getMonth() + 1 : dt.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function normalizeLineItems(
  lineItems = [],
  subtotalAmount = 0,
  defaultSac = '999293',
  fallbackTitle = 'Course Tuition Fee',
  fallbackPeriod = ''
) {
  const normalizedItems = [];
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    lineItems.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object') return;
      const parsedQty = round2(raw.quantity ?? 1);
      const qty = parsedQty <= 0 ? 1 : parsedQty;
      const hasUnit = raw.unit_price !== undefined && raw.unit_price !== null && raw.unit_price !== '';
      const rawAmt = round2(raw.amount ?? 0);
      const unitPrice = hasUnit ? Math.max(0, round2(raw.unit_price)) : Math.max(0, rawAmt);
      const lineDisc = Math.max(0, round2(raw.discount ?? 0));
      const computedAmt = Math.max(0, round2(qty * unitPrice - lineDisc));

      normalizedItems.push({
        sl_no: idx + 1,
        title: String(raw.title ?? raw.particulars ?? `Item #${idx + 1}`),
        description: String(raw.description ?? ''),
        sac_code: String(raw.sac_code ?? defaultSac),
        period: String(raw.period ?? raw.installment ?? ''),
        quantity: qty.toFixed(2),
        unit_price: unitPrice.toFixed(2),
        discount: lineDisc.toFixed(2),
        amount: computedAmt.toFixed(2),
      });
    });
  }

  if (normalizedItems.length === 0) {
    const amt = Math.max(0, round2(subtotalAmount));
    normalizedItems.push({
      sl_no: 1,
      title: fallbackTitle || 'Course Tuition Fee',
      description: '',
      sac_code: defaultSac || '999293',
      period: fallbackPeriod || '',
      quantity: '1.00',
      unit_price: amt.toFixed(2),
      discount: '0.00',
      amount: amt.toFixed(2),
    });
  }

  return normalizedItems;
}

export function calculateReceiptFinancials({
  lineItems = [],
  subtotalAmount = 0,
  discountAmount = 0,
  taxMode = 'NONE',
  supplyType = 'INTRA_STATE',
  gstRate = 18,
  cgstRate = null,
  sgstRate = null,
  igstRate = null,
  defaultSac = '999293',
  fallbackTitle = 'Course Tuition Fee',
  fallbackPeriod = '',
}) {
  const normalizedItems = normalizeLineItems(
    lineItems,
    subtotalAmount,
    defaultSac,
    fallbackTitle,
    fallbackPeriod
  );

  const subtotal = round2(normalizedItems.reduce((acc, item) => acc + round2(item.amount), 0));
  const discount = Math.min(subtotal, Math.max(0, round2(discountAmount)));
  const netAfterDiscount = round2(subtotal - discount);

  const mode = String(taxMode || 'NONE').toUpperCase();
  const supply = String(supplyType || 'INTRA_STATE').toUpperCase();

  let effectiveRate = round2(gstRate ?? 18);
  if (supply === 'INTER_STATE') {
    if (igstRate !== null && igstRate !== undefined && igstRate !== '') {
      effectiveRate = round2(igstRate);
    }
  } else if (cgstRate !== null && cgstRate !== '' && sgstRate !== null && sgstRate !== '') {
    effectiveRate = round2(round2(cgstRate) + round2(sgstRate));
  }
  if (effectiveRate < 0) effectiveRate = 0;

  let taxableAmount = netAfterDiscount;
  let outCgstRate = 0;
  let outSgstRate = 0;
  let outIgstRate = 0;
  let outCgstAmount = 0;
  let outSgstAmount = 0;
  let outIgstAmount = 0;
  let totalTaxAmount = 0;
  let totalAmount = netAfterDiscount;

  if (mode === 'INCLUSIVE' && effectiveRate > 0) {
    totalAmount = netAfterDiscount;
    taxableAmount = round2(totalAmount / (1 + effectiveRate / 100));
    totalTaxAmount = round2(totalAmount - taxableAmount);
    if (supply === 'INTER_STATE') {
      outIgstRate = effectiveRate;
      outIgstAmount = totalTaxAmount;
    } else {
      outCgstRate = cgstRate !== null && cgstRate !== '' ? round2(cgstRate) : round2(effectiveRate / 2);
      outSgstRate = round2(effectiveRate - outCgstRate);
      outCgstAmount = round2(totalTaxAmount * (outCgstRate / effectiveRate));
      outSgstAmount = round2(totalTaxAmount - outCgstAmount);
    }
  } else if (mode === 'EXCLUSIVE' && effectiveRate > 0) {
    taxableAmount = netAfterDiscount;
    if (supply === 'INTER_STATE') {
      outIgstRate = effectiveRate;
      outIgstAmount = round2((taxableAmount * outIgstRate) / 100);
      totalTaxAmount = outIgstAmount;
    } else {
      outCgstRate = cgstRate !== null && cgstRate !== '' ? round2(cgstRate) : round2(effectiveRate / 2);
      outSgstRate = round2(effectiveRate - outCgstRate);
      outCgstAmount = round2((taxableAmount * outCgstRate) / 100);
      outSgstAmount = round2((taxableAmount * outSgstRate) / 100);
      totalTaxAmount = round2(outCgstAmount + outSgstAmount);
    }
    totalAmount = round2(taxableAmount + totalTaxAmount);
  }

  return {
    line_items: normalizedItems,
    subtotal_amount: subtotal.toFixed(2),
    discount_amount: discount.toFixed(2),
    taxable_amount: taxableAmount.toFixed(2),
    tax_mode: mode,
    supply_type: supply,
    cgst_rate: outCgstRate.toFixed(2),
    cgst_amount: outCgstAmount.toFixed(2),
    sgst_rate: outSgstRate.toFixed(2),
    sgst_amount: outSgstAmount.toFixed(2),
    igst_rate: outIgstRate.toFixed(2),
    igst_amount: outIgstAmount.toFixed(2),
    total_tax_amount: totalTaxAmount.toFixed(2),
    total_amount: totalAmount.toFixed(2),
    amount_in_words: amountToWords(totalAmount),
  };
}

/**
 * Self-contained ISO/IEC 18004 QR Code Generator (Byte Mode, ECC Level L)
 * Dynamically selects the smallest QR Version (1..15, up to 520 bytes) that fits
 * the full UTF-8 byte length without ever truncating URLs or tokens.
 */
const QR_VERSIONS = [
  null,
  { totalCodewords: 26, ecCodewordsPerBlock: 7, numBlocks: 1, align: [] },
  { totalCodewords: 44, ecCodewordsPerBlock: 10, numBlocks: 1, align: [6, 18] },
  { totalCodewords: 70, ecCodewordsPerBlock: 15, numBlocks: 1, align: [6, 22] },
  { totalCodewords: 100, ecCodewordsPerBlock: 20, numBlocks: 1, align: [6, 26] },
  { totalCodewords: 134, ecCodewordsPerBlock: 26, numBlocks: 1, align: [6, 30] },
  { totalCodewords: 172, ecCodewordsPerBlock: 18, numBlocks: 2, align: [6, 34] },
  { totalCodewords: 196, ecCodewordsPerBlock: 20, numBlocks: 2, align: [6, 22, 38] },
  { totalCodewords: 242, ecCodewordsPerBlock: 24, numBlocks: 2, align: [6, 24, 42] },
  { totalCodewords: 292, ecCodewordsPerBlock: 30, numBlocks: 2, align: [6, 26, 46] },
  { totalCodewords: 346, ecCodewordsPerBlock: 18, numBlocks: 4, align: [6, 28, 50] },
  { totalCodewords: 404, ecCodewordsPerBlock: 20, numBlocks: 4, align: [6, 30, 54] },
  { totalCodewords: 466, ecCodewordsPerBlock: 24, numBlocks: 4, align: [6, 32, 58] },
  { totalCodewords: 532, ecCodewordsPerBlock: 26, numBlocks: 4, align: [6, 34, 62] },
  { totalCodewords: 581, ecCodewordsPerBlock: 30, numBlocks: 4, align: [6, 26, 46, 66] },
  { totalCodewords: 655, ecCodewordsPerBlock: 22, numBlocks: 6, align: [6, 26, 48, 70] },
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecLen - 1; j++) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[ecLen - 1] = gfMul(gen[ecLen], factor);
  }
  return rem;
}

export function generateQrMatrix(text) {
  const payload = new TextEncoder().encode(String(text || 'FLAG'));
  const maxVersion = QR_VERSIONS.length - 1;
  let version = 1;
  while (version <= maxVersion) {
    const vInfo = QR_VERSIONS[version];
    const dataCapacity = vInfo.totalCodewords - vInfo.ecCodewordsPerBlock * vInfo.numBlocks;
    const headerBytes = version <= 9 ? 2 : 3;
    if (payload.length + headerBytes <= dataCapacity) break;
    version++;
  }
  if (version > maxVersion) {
    throw new Error(`QR payload (${payload.length} bytes) exceeds maximum supported QR capacity.`);
  }

  const vInfo = QR_VERSIONS[version];
  const dataCapacity = vInfo.totalCodewords - vInfo.ecCodewordsPerBlock * vInfo.numBlocks;

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100) + character count indicator (8 bits for V1-9, 16 bits for V10+)
  pushBits(0b0100, 4);
  pushBits(payload.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8);
  }

  const maxBits = dataCapacity * 8;
  const terminator = Math.min(4, Math.max(0, maxBits - bits.length));
  pushBits(0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataBytes.push(b);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < dataCapacity) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // Split into blocks and compute Reed-Solomon EC
  const numBlocks = vInfo.numBlocks;
  const baseDataLen = Math.floor(dataCapacity / numBlocks);
  const extraBlocks = dataCapacity % numBlocks;
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const len = baseDataLen + (b >= numBlocks - extraBlocks ? 1 : 0);
    const block = dataBytes.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, vInfo.ecCodewordsPerBlock));
  }

  const interleaved = [];
  const maxBlockLen = baseDataLen + (extraBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) interleaved.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < vInfo.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      interleaved.push(ecBlocks[b][i]);
    }
  }

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFunctionModule = (r, c, dark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = Boolean(dark);
    isFunction[r][c] = true;
  };

  const drawFinder = (r, c) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const y = r + dy;
        const x = c + dx;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        const inOuter = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6 && (dy === 0 || dy === 6 || dx === 0 || dx === 6);
        const inInner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        setFunctionModule(y, x, inOuter || inInner);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const alignCoords = vInfo.align;
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const r = alignCoords[i];
      const c = alignCoords[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dark = Math.max(Math.abs(dy), Math.abs(dx)) !== 1;
          setFunctionModule(r + dy, c + dx, dark);
        }
      }
    }
  }

  // Version information blocks (6x3 top-right and 3x6 bottom-left) required for Versions >= 7
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const versionBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }

  // Reserve format info areas & dark module before placing data bits
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
    if (i < 8) {
      if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
      if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
    }
  }
  setFunctionModule(size - 8, 8, true);

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = interleaved.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark = ((interleaved[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          // Apply mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) dark = !dark;
          modules[r][c] = dark;
        }
      }
    }
  }

  // Format information for ECC Level L (01) and Mask 0 (000) -> BCH & XOR mask = 0x77c4
  const formatBits = 0x77c4;
  // Copy 1 (top-left around finder)
  for (let i = 0; i <= 5; i++) setFunctionModule(i, 8, ((formatBits >>> i) & 1) !== 0);
  setFunctionModule(7, 8, ((formatBits >>> 6) & 1) !== 0);
  setFunctionModule(8, 8, ((formatBits >>> 7) & 1) !== 0);
  setFunctionModule(8, 7, ((formatBits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunctionModule(8, 14 - i, ((formatBits >>> i) & 1) !== 0);

  // Copy 2 (top-right horizontal & bottom-left vertical)
  for (let i = 0; i < 8; i++) setFunctionModule(8, size - 1 - i, ((formatBits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunctionModule(size - 15 + i, 8, ((formatBits >>> i) & 1) !== 0);
  setFunctionModule(size - 8, 8, true);

  return modules;
}

export async function waitForElementAssets(element, timeoutMs = 3000) {
  const tasks = [];
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    tasks.push(document.fonts.ready.catch(() => {}));
  }
  if (element && typeof element.querySelectorAll === 'function') {
    const images = Array.from(element.querySelectorAll('img'));
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return;
      tasks.push(
        new Promise((resolve) => {
          const done = () => {
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            resolve();
          };
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
      );
    });
  }
  if (tasks.length === 0) return;
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export async function exportReceiptElementToPdf(element, filename = 'FLAG_Receipt.pdf', returnBase64 = false) {
  if (!element) return null;
  await waitForElementAssets(element);
  const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const opt = {
    margin: 0,
    filename: cleanName,
    image: { type: 'jpeg', quality: 0.99 },
    html2canvas: {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  if (returnBase64) {
    return await html2pdf().set(opt).from(element).outputPdf('datauristring');
  }
  await html2pdf().set(opt).from(element).save();
  return true;
}

export async function printReceiptElement(element, title = 'Official Fee Receipt') {
  if (!element) return;
  await waitForElementAssets(element);
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    window.print();
    return;
  }
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
        <script>
          (function() {
            function triggerPrint() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 150);
            }
            window.addEventListener('load', function() {
              var fontPromise = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function(){}) : Promise.resolve();
              var imgPromises = Array.prototype.slice.call(document.images || []).map(function(img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function(resolve) {
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                });
              });
              Promise.race([
                Promise.all([fontPromise].concat(imgPromises)),
                new Promise(function(resolve) { setTimeout(resolve, 2500); })
              ]).then(triggerPrint);
            });
          })();
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

