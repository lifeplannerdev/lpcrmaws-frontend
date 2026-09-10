/**
 * FDS API utility — all fetch helpers for the FDS module.
 * Uses the same authFetch pattern as the rest of the CRM.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const FDS_BASE = `${API_BASE_URL}/fds`;

export function buildQueryString(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const fdsApi = {
  // Master Sync: Google Sheets ➔ CRM Mirror
  syncMasterSheets: (af, formData = null) => af(`${FDS_BASE}/sync-master-sheets/`, { method: 'POST', ...(formData ? { body: formData } : {}) }),

  // Dashboard
  dashboard: (af) => af(`${FDS_BASE}/dashboard/`),

  // Fee Structures (Sheet 5)
  feeStructures: (af, params = {}) => af(`${FDS_BASE}/fee-structures/${buildQueryString(params)}`),
  createFeeStructure: (af, data) => af(`${FDS_BASE}/fee-structures/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateFeeStructure: (af, id, data) => af(`${FDS_BASE}/fee-structures/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteFeeStructure: (af, id) => af(`${FDS_BASE}/fee-structures/${id}/`, { method: 'DELETE' }),
  importFeeStructures: (af, formData) => af(`${FDS_BASE}/fee-structures/import_excel/`, { method: 'POST', body: formData }),
  exportFeeStructures: (af) => af(`${FDS_BASE}/fee-structures/export_excel/`),

  // Batches
  batches: (af, params = {}) => af(`${FDS_BASE}/batches/${buildQueryString(params)}`),
  createBatch: (af, data) => af(`${FDS_BASE}/batches/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateBatch: (af, id, data) => af(`${FDS_BASE}/batches/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteBatch: (af, id) => af(`${FDS_BASE}/batches/${id}/`, { method: 'DELETE' }),
  batchStudents: (af, id) => af(`${FDS_BASE}/batches/${id}/students/`),

  // Enquiries (Sheet 1)
  enquiries: (af, params = {}) => af(`${FDS_BASE}/enquiries/${buildQueryString(params)}`),
  enquiryStats: (af) => af(`${FDS_BASE}/enquiries/stats/`),
  createEnquiry: (af, data) => af(`${FDS_BASE}/enquiries/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateEnquiry: (af, id, data) => af(`${FDS_BASE}/enquiries/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteEnquiry: (af, id) => af(`${FDS_BASE}/enquiries/${id}/`, { method: 'DELETE' }),
  exportEnquiries: (af, params = {}) => af(`${FDS_BASE}/enquiries/export_excel/${buildQueryString(params)}`),
  importEnquiries: (af, formData) => af(`${FDS_BASE}/enquiries/import_excel/`, { method: 'POST', body: formData }),
  bulkImportEnquiries: (af, data) => af(`${FDS_BASE}/enquiries/bulk_import_excel/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),

  // Trials (Sheet 2)
  trials: (af, params = {}) => af(`${FDS_BASE}/trials/${buildQueryString(params)}`),
  trialStats: (af) => af(`${FDS_BASE}/trials/stats/`),
  createTrial: (af, data) => af(`${FDS_BASE}/trials/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateTrial: (af, id, data) => af(`${FDS_BASE}/trials/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteTrial: (af, id) => af(`${FDS_BASE}/trials/${id}/`, { method: 'DELETE' }),
  exportTrials: (af, params = {}) => af(`${FDS_BASE}/trials/export_excel/${buildQueryString(params)}`),
  importTrials: (af, formData) => af(`${FDS_BASE}/trials/import_excel/`, { method: 'POST', body: formData }),

  // Students / Registration Details (Sheet 4)
  students: (af, params = {}) => af(`${FDS_BASE}/students/${buildQueryString(params)}`),
  createStudent: (af, data) => af(`${FDS_BASE}/students/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateStudent: (af, id, data) => af(`${FDS_BASE}/students/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteStudent: (af, id) => af(`${FDS_BASE}/students/${id}/`, { method: 'DELETE' }),
  exportStudents: (af, params = {}) => af(`${FDS_BASE}/students/export_excel/${buildQueryString(params)}`),
  importStudents: (af, formData) => af(`${FDS_BASE}/students/import_excel/`, { method: 'POST', body: formData }),

  // Lead Sourcing Directory (Sheet 3)
  leadSourcing: (af, params = {}) => af(`${FDS_BASE}/lead-sourcing/${buildQueryString(params)}`),
  createLeadSourcing: (af, data) => af(`${FDS_BASE}/lead-sourcing/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateLeadSourcing: (af, id, data) => af(`${FDS_BASE}/lead-sourcing/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteLeadSourcing: (af, id) => af(`${FDS_BASE}/lead-sourcing/${id}/`, { method: 'DELETE' }),
  exportLeadSourcing: (af, params = {}) => af(`${FDS_BASE}/lead-sourcing/export_excel/${buildQueryString(params)}`),
  importLeadSourcing: (af, formData) => af(`${FDS_BASE}/lead-sourcing/import_excel/`, { method: 'POST', body: formData }),

  // Wedding Groups
  weddingGroups: (af, params = {}) => af(`${FDS_BASE}/wedding-groups/${buildQueryString(params)}`),
  createWeddingGroup: (af, data) => af(`${FDS_BASE}/wedding-groups/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updateWeddingGroup: (af, id, data) => af(`${FDS_BASE}/wedding-groups/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deleteWeddingGroup: (af, id) => af(`${FDS_BASE}/wedding-groups/${id}/`, { method: 'DELETE' }),

  // Attendance
  attendance: (af, params = {}) => af(`${FDS_BASE}/attendance/${buildQueryString(params)}`),
  bulkMarkAttendance: (af, data) => af(`${FDS_BASE}/attendance/bulk_mark/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  monthlyReport: (af, params) => af(`${FDS_BASE}/attendance/monthly_report/${buildQueryString(params)}`),

  // Payments & Fees Collection 2026 (Sheet 6)
  payments: (af, params = {}) => af(`${FDS_BASE}/payments/${buildQueryString(params)}`),
  monthlyLedger: (af) => af(`${FDS_BASE}/payments/monthly_ledger/`),
  updateMonthCell: (af, data) => af(`${FDS_BASE}/payments/update_month_cell/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  paymentSummary: (af, params = {}) => af(`${FDS_BASE}/payments/summary/${buildQueryString(params)}`),
  createPayment: (af, data) => af(`${FDS_BASE}/payments/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  updatePayment: (af, id, data) => af(`${FDS_BASE}/payments/${id}/`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  deletePayment: (af, id) => af(`${FDS_BASE}/payments/${id}/`, { method: 'DELETE' }),
  exportPayments: (af, params = {}) => af(`${FDS_BASE}/payments/export_excel/${buildQueryString(params)}`),
  importPayments: (af, formData) => af(`${FDS_BASE}/payments/import_excel/`, { method: 'POST', body: formData }),

  // Fee Accounts
  feeAccounts: (af, params = {}) => af(`${FDS_BASE}/fee-accounts/${buildQueryString(params)}`),

  // Trainers
  trainers: (af) => af(`${FDS_BASE}/trainers/`),
};

// Lead Sourcing Categories (Sheet 3)
export const LEAD_SOURCING_CATEGORIES = [
  { key: 'COLLEGES',  label: 'Prominent Colleges',       subtitle: 'Colleges in & around Kottayam', icon: 'GraduationCap' },
  { key: 'SCHOOLS',   label: 'Prominent Schools',        subtitle: 'Schools in & around Kottayam', icon: 'School' },
  { key: 'CLUBS',     label: 'Recreation & Clubs',       subtitle: 'Social Clubs in Kottayam', icon: 'Coffee' },
  { key: 'RESIDENTS', label: 'Resident Associations',    subtitle: 'Housing Hubs & Resident Welfare', icon: 'Users' },
  { key: 'VILLAS',    label: 'Villa Projects',           subtitle: 'Gated Communities in Kottayam', icon: 'Home' },
  { key: 'BUILDERS',  label: 'Builders & Residencies',   subtitle: 'Prominent Builders & Projects', icon: 'Building' },
];

// Category meta
export const FDS_CATEGORIES = [
  { key: 'ALL',   label: 'All Classes', tabClass: 'active-all',   dotClass: '' },
  { key: 'DANCE', label: 'Dance',       tabClass: 'active-dance',  dotClass: 'fds-dot-dance' },
  { key: 'ZUMBA', label: 'Zumba',       tabClass: 'active-zumba',  dotClass: 'fds-dot-zumba' },
  { key: 'YOGA',  label: 'Yoga',        tabClass: 'active-yoga',   dotClass: 'fds-dot-yoga'  },
];

export const FDS_STATUS_ENQUIRY = ['interested', 'not interested', 'will call back', 'NEED CALL BACK', 'trial interested', 'NEW', 'CONTACTED', 'CONVERTED'];
export const FDS_STATUS_TRIAL   = ['WILL INFORM', 'YES', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
export const FDS_STATUS_STUDENT = ['ACTIVE', 'INACTIVE'];
export const FDS_PAYMENT_STATUS = ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE'];
export const FDS_MODES_OF_PAY   = ['ONLINE', 'CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'];

export function getCategoryBadgeClass(cat) {
  if (!cat) return 'fds-badge-gray';
  return `fds-badge-${cat.toLowerCase()}`;
}

export function getStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('join') || s.includes('convert') || s.includes('paid') || s.includes('yes') || s === 'active') return 'fds-badge-green';
  if (s.includes('call') || s.includes('inform') || s.includes('partial') || s.includes('scheduled') || s.includes('pending')) return 'fds-badge-amber';
  if (s.includes('not') || s.includes('lost') || s.includes('cancel') || s.includes('overdue')) return 'fds-badge-red';
  if (s.includes('interest')) return 'fds-badge-gold';
  return 'fds-badge-gray';
}

/** Download a blob URL from an authenticated fetch response */
export async function downloadExcelFromResponse(response, filename) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
