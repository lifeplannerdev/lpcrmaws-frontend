// ── Canonical Status List (new data entry) ─────────────────────────
export const statusOptions = [
  { value: 'ENQUIRY',    label: 'Enquiry' },
  { value: 'JOB_ENQUIRY', label: 'Job Enquiry' },
  { value: 'B2B',        label: 'B2B' },
  { value: 'COLD_WARM',  label: 'Cold Warm' },
  { value: 'HOT',        label: 'Hot' },
  { value: 'CLOSED',     label: 'Closed' },
  { value: 'CONVERTED',  label: 'Converted' },
];

// ── All statuses including legacy (for Staff Analysis filters) ──────
export const allStatusOptions = [
  { value: 'ENQUIRY',       label: 'Enquiry' },
  { value: 'JOB_ENQUIRY',   label: 'Job Enquiry' },
  { value: 'B2B',           label: 'B2B' },
  { value: 'COLD_WARM',     label: 'Cold Warm' },
  { value: 'HOT',           label: 'Hot' },
  { value: 'CLOSED',        label: 'Closed' },
  { value: 'CONVERTED',     label: 'Converted' },
  // Legacy statuses (kept for historical data)
  { value: 'CONTACTED',     label: 'Contacted (Legacy)' },
  { value: 'QUALIFIED',     label: 'Qualified (Legacy)' },
  { value: 'NOT_INTERESTED', label: 'Not Interested (Legacy)' },
  { value: 'CNR',           label: 'Could Not Reach (Legacy)' },
  { value: 'REGISTERED',    label: 'Registered (Legacy)' },
];

// ── Statuses that do NOT require a mandatory followup ───────────────
export const NO_FOLLOWUP_STATUSES = ['CLOSED', 'CONVERTED', 'B2B', 'JOB_ENQUIRY'];

export const sourceOptions = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'AUTOMATION', label: 'Automation' },
  { value: 'ADS', label: 'Ads' },
  { value: 'BULK DATA', label: 'Bulk data' },
  { value: 'OTHER', label: 'Other' },
  { value: 'VOXBAY CALL', label: 'Voxbay' },

];

export const priorityOptions = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' }
];


export const programOptions = [
  { value: 'A1', label: 'A1 (Beginner)' },
  { value: 'A2', label: 'A2 (Elementary)' },
  { value: 'B1', label: 'B1 (Intermediate)' },
  { value: 'B2', label: 'B2 (Upper Intermediate)' },
  { value: 'A1 ONLINE', label: 'A1 (Online)' },
  { value: 'A2 ONLINE', label: 'A2 (Online)' },
  { value: 'B1 ONLINE', label: 'B1 (Online)' },
  { value: 'B2 ONLINE', label: 'B2 (Online)' },
  { value: 'A1 EXAM PREPERATION', label: 'A1 (Exam Preparation)' },
  { value: 'A2 EXAM PREPERATION', label: 'A2 (Exam Preparation)' },
  { value: 'B1 EXAM PREPERATION', label: 'B1 (Exam Preparation)' },
  { value: 'B2 EXAM PREPERATION', label: 'B2 (Exam Preparation)' },
  { value: 'PVP', label: 'PVP' },
  { value: 'AUSBILDUNG', label: 'AUSBILDUNG' },
  { value: 'GCC', label: 'GCC' },
  { value: 'FLAG', label: 'FLAG' },
  { value: 'NURSING RECRUITMENT', label: 'NURSING RECRUITMENT' },
  { value: 'STUDY', label: 'STUDY' },
  { value: 'SWITZERLAND', label: 'SWITZERLAND' },
];

