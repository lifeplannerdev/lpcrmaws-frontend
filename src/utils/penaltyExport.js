import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export const MONTHS_LIST = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const getPenaltyUserId = (penalty) =>
  typeof penalty?.user === 'object' ? penalty.user?.id : penalty?.user;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDisplayMonth = (monthStr) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr || '-';
  const [year, month] = monthStr.split('-');
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(parsed.getTime())) return monthStr;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

/**
 * Filter penalties by date mode (all, month_year, date, range) and employee scope (all, single, multiple).
 */
export const filterPenaltiesForExport = (penalties = [], filters = {}) => {
  const {
    dateMode = 'all',
    year = '',
    month = '',
    specificDate = '',
    startDate = '',
    endDate = '',
    employeeScope = 'all',
    singleEmployeeId = '',
    selectedEmployeeIds = [],
  } = filters;

  const selectedIdSet = new Set((selectedEmployeeIds || []).map(String));

  return penalties.filter((penalty) => {
    const uId = getPenaltyUserId(penalty);

    // Employee scope filter
    if (employeeScope === 'single') {
      if (!singleEmployeeId || String(uId) !== String(singleEmployeeId)) return false;
    } else if (employeeScope === 'multiple') {
      if (selectedIdSet.size === 0 || !selectedIdSet.has(String(uId))) return false;
    }

    // Date filter
    const pMonth = penalty.month || '';
    const pDate = (penalty.date || '').slice(0, 10);

    if (dateMode === 'month_year') {
      if (year && month) {
        const target = `${year}-${month}`;
        if (pMonth !== target && !pDate.startsWith(target)) return false;
      } else if (year) {
        if (!pMonth.startsWith(`${year}-`) && !pDate.startsWith(`${year}-`)) return false;
      } else if (month) {
        const monthMatch = pMonth.endsWith(`-${month}`) || pDate.slice(5, 7) === month;
        if (!monthMatch) return false;
      }
    } else if (dateMode === 'date') {
      if (specificDate && pDate !== specificDate) return false;
    } else if (dateMode === 'range') {
      const comparableDate = pDate || (pMonth ? `${pMonth}-01` : '');
      if (startDate && (!comparableDate || comparableDate < startDate)) return false;
      if (endDate && (!comparableDate || comparableDate > endDate)) return false;
    }

    return true;
  });
};

export const buildEmployeeSummary = (penalties = [], getEmployeeName) => {
  const summaryMap = new Map();
  penalties.forEach((p) => {
    const uId = getPenaltyUserId(p);
    const name = getEmployeeName ? getEmployeeName(uId, p) : (p.user_name || `Employee #${uId}`);
    const key = String(uId ?? name);
    const amount = parseFloat(p.amount) || 0;
    const existing = summaryMap.get(key) || { employee: name, count: 0, total: 0 };
    existing.count += 1;
    existing.total += amount;
    summaryMap.set(key, existing);
  });
  return Array.from(summaryMap.values()).sort((a, b) => b.total - a.total);
};

export const buildPeriodLabel = (filters = {}) => {
  const { dateMode = 'all', year = '', month = '', specificDate = '', startDate = '', endDate = '' } = filters;
  if (dateMode === 'month_year') {
    const monthName = MONTHS_LIST.find((m) => m.value === month)?.label;
    if (year && monthName) return `${monthName} ${year}`;
    if (year) return `Year ${year}`;
    if (monthName) return `${monthName} (All Years)`;
    return 'All Months & Years';
  }
  if (dateMode === 'date') {
    return specificDate ? formatDisplayDate(specificDate) : 'All Dates';
  }
  if (dateMode === 'range') {
    if (startDate && endDate) return `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
    if (startDate) return `From ${formatDisplayDate(startDate)}`;
    if (endDate) return `Up to ${formatDisplayDate(endDate)}`;
    return 'Custom Range';
  }
  return 'All Time';
};

export const exportPenaltiesToExcel = ({
  penalties,
  company = 'LP',
  periodLabel = 'All Time',
  employeeScopeLabel = 'All Staff',
  getEmployeeName,
}) => {
  const totalAmount = penalties.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const detailRows = penalties.map((p, idx) => {
    const uId = getPenaltyUserId(p);
    const empName = getEmployeeName ? getEmployeeName(uId, p) : (p.user_name || `Employee #${uId}`);
    return {
      '#': idx + 1,
      Employee: empName,
      'Act / Reason': p.act || '-',
      'Amount (INR)': Number((parseFloat(p.amount) || 0).toFixed(2)),
      Month: formatDisplayMonth(p.month),
      Date: formatDisplayDate(p.date),
    };
  });

  detailRows.push({
    '#': '',
    Employee: 'TOTAL',
    'Act / Reason': `${penalties.length} record(s) | ${company} | ${periodLabel} | ${employeeScopeLabel}`,
    'Amount (INR)': Number(totalAmount.toFixed(2)),
    Month: '',
    Date: '',
  });

  const wsDetails = XLSX.utils.json_to_sheet(detailRows);
  wsDetails['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 48 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
  ];

  const summaryRows = buildEmployeeSummary(penalties, getEmployeeName).map((row, idx) => ({
    '#': idx + 1,
    Employee: row.employee,
    'Penalty Count': row.count,
    'Total Amount (INR)': Number(row.total.toFixed(2)),
  }));
  summaryRows.push({
    '#': '',
    Employee: 'GRAND TOTAL',
    'Penalty Count': penalties.length,
    'Total Amount (INR)': Number(totalAmount.toFixed(2)),
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Penalties');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Employee Summary');

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Penalties_${company}_${safePeriod}.xlsx`);
};

export const buildPenaltyReportHtml = ({
  penalties,
  company = 'LP',
  periodLabel = 'All Time',
  employeeScopeLabel = 'All Staff',
  getEmployeeName,
}) => {
  const totalAmount = penalties.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const summaryRows = buildEmployeeSummary(penalties, getEmployeeName);
  const generatedOn = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const rowsHtml = penalties
    .map((p, idx) => {
      const uId = getPenaltyUserId(p);
      const empName = getEmployeeName ? getEmployeeName(uId, p) : (p.user_name || `Employee #${uId}`);
      const amount = (parseFloat(p.amount) || 0).toFixed(2);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${idx + 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;">${escapeHtml(empName)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(p.act || '-')}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#b91c1c;">₹${amount}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#4b5563;">${escapeHtml(formatDisplayMonth(p.month))}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#4b5563;">${escapeHtml(formatDisplayDate(p.date))}</td>
        </tr>
      `;
    })
    .join('');

  const summaryHtml = summaryRows
    .map(
      (s) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(s.employee)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#4b5563;">${s.count}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#b91c1c;">₹${s.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;padding:20px;max-width:1000px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <h1 style="margin:0;font-size:20px;color:#312e81;">Penalty Management Report</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#4b5563;">
            Company: <strong>${escapeHtml(company)}</strong> &nbsp;|&nbsp;
            Period: <strong>${escapeHtml(periodLabel)}</strong> &nbsp;|&nbsp;
            Staff: <strong>${escapeHtml(employeeScopeLabel)}</strong>
          </p>
        </div>
        <div style="text-align:right;font-size:11px;color:#6b7280;">
          <div>Generated: ${escapeHtml(generatedOn)}</div>
          <div style="margin-top:4px;font-size:14px;font-weight:700;color:#b91c1c;">
            Total: ₹${totalAmount.toFixed(2)} (${penalties.length} ${penalties.length === 1 ? 'record' : 'records'})
          </div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;">#</th>
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;">Employee</th>
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;">Act / Reason</th>
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;text-align:right;">Amount</th>
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;">Month</th>
            <th style="padding:8px 10px;border-bottom:2px solid #d1d5db;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#6b7280;">No penalties match the selected filters.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="background:#eef2ff;font-weight:700;">
            <td colspan="3" style="padding:9px 10px;border-top:2px solid #4f46e5;">Grand Total (${penalties.length} records)</td>
            <td style="padding:9px 10px;border-top:2px solid #4f46e5;text-align:right;color:#b91c1c;">₹${totalAmount.toFixed(2)}</td>
            <td colspan="2" style="padding:9px 10px;border-top:2px solid #4f46e5;"></td>
          </tr>
        </tfoot>
      </table>

      ${
        summaryRows.length > 1
          ? `
        <h3 style="margin:0 0 8px;font-size:14px;color:#312e81;">Employee-wise Summary</h3>
        <table style="width:60%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f3f4f6;text-align:left;">
              <th style="padding:6px 10px;border-bottom:1px solid #d1d5db;">Employee</th>
              <th style="padding:6px 10px;border-bottom:1px solid #d1d5db;text-align:center;">Count</th>
              <th style="padding:6px 10px;border-bottom:1px solid #d1d5db;text-align:right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>${summaryHtml}</tbody>
        </table>
      `
          : ''
      }
    </div>
  `;
};

export const exportPenaltiesToPDF = async (options) => {
  const html = buildPenaltyReportHtml(options);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  const safePeriod = (options.periodLabel || 'All_Time').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const filename = `Penalties_${options.company || 'LP'}_${safePeriod}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: 0.4,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
};

export const printPenaltiesReport = (options) => {
  const html = buildPenaltyReportHtml(options);
  const printWindow = window.open('', '_blank', 'width=1050,height=750');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups to print.');
  }
  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Penalty Management Report - ${escapeHtml(options.company || 'LP')}</title>
        <style>
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
