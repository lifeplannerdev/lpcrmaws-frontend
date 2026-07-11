export const BATCH_CHOICES = [
  { value: 'A1', label: 'A1 (Beginner)' },
  { value: 'A2', label: 'A2 (Elementary)' },
  { value: 'B1', label: 'B1 (Intermediate)' },
  { value: 'B2', label: 'B2 (Upper Intermediate)' },
];

export const STATUS_CHOICES = [
  { value: 'PENDING_ENROLLMENT', label: 'Pending Enrollment' },
  { value: 'PENDING_BATCH_ASSIGNMENT', label: 'Pending Batch Assignment' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXAM_PREPARATION', label: 'Exam Preparation' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DROPPED', label: 'Dropped' },
];

export const initialStudentFormData = {
  name: '',
  batch: '',
  academic_batch: '',
  branch: '',
  trainer: '',
  status: 'PENDING_ENROLLMENT',
  admission_date: new Date().toISOString().split('T')[0],
  student_class: '',
  email: '',
  phone_number: '',
  drive_link: '',
  notes: '',
  fee_template: '',
  parent_name: '',
  parent_phone: '',
  mode_of_study: 'OFFLINE',
  preferred_level: '',
  fee_attendance_policy: 'FLEXIBLE',
  company: 'LP',
};
