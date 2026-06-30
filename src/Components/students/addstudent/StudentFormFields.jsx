// Components/students/StudentFormFields.jsx
import React from 'react';
import FormField from '../../common/FormField';
import { Mail, Phone, Link as LinkIcon } from 'lucide-react';

export default function StudentFormFields({
  formData,
  errors,
  trainers,
  trainersLoading,
  onChange,
  batchChoices,
  statusChoices,
  academicBatches = [],
  batchesLoading = false,
  branches = [],
  branchesLoading = false,
  feeTemplates = [],
  feeTemplatesLoading = false,
}) {
  // Transform trainers for select options
  const trainerOptions = trainers.map(trainer => ({
    value: trainer.id,
    label: trainer.user_name || 
      `${trainer.user?.first_name || ''} ${trainer.user?.last_name || ''}`.trim() || 
      trainer.email || 
      `Trainer ${trainer.id}`
  }));

  const batchOptions = academicBatches.map(batch => ({
    value: batch.id,
    label: `${batch.name} (${batch.academic_year}) - ${batch.grade}`
  }));

  const branchOptions = branches.map(branch => ({
    value: branch.id,
    label: branch.name
  }));

  const feeTemplateOptions = feeTemplates.map(template => ({
    value: template.id,
    label: `${template.name} ${template.total_amount ? `- ₹${template.total_amount}` : ''}`,
  }));

  const modeOfStudyOptions = [
    { value: 'OFFLINE', label: 'Offline' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'HYBRID', label: 'Hybrid' },
  ];

  const preferredLevelOptions = [
    { value: 'A1', label: 'A1' },
    { value: 'A2', label: 'A2' },
    { value: 'B1', label: 'B1' },
    { value: 'B2', label: 'B2' },
    { value: 'A1-B2', label: 'A1 to B2' },
    { value: 'OTHER', label: 'Other' },
  ];

  const feeAttendancePolicyOptions = [
    { value: 'FLEXIBLE', label: 'Flexible' },
    { value: 'STRICT', label: 'Strict (Requires Fee Approval if Overdue)' },
  ];

  return (
    <div className="space-y-8">
      {/* Basic Information Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <FormField
            label="Student Name"
            name="name"
            value={formData.name}
            onChange={onChange}
            required
            error={errors.name}
            className="md:col-span-2"
          />

          {/* Email */}
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            icon={Mail}
            error={errors.email}
          />

          {/* Phone */}
          <FormField
            label="Phone Number"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={onChange}
            icon={Phone}
            error={errors.phone_number}
          />

          {/* Admission Date */}
          <FormField
            label="Admission Date"
            name="admission_date"
            type="date"
            value={formData.admission_date}
            onChange={onChange}
            required
            error={errors.admission_date}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Parent Information Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Parent Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Parent Name"
            name="parent_name"
            value={formData.parent_name}
            onChange={onChange}
            error={errors.parent_name}
          />
          <FormField
            label="Parent Phone"
            name="parent_phone"
            type="tel"
            value={formData.parent_phone}
            onChange={onChange}
            icon={Phone}
            error={errors.parent_phone}
          />
        </div>
      </div>

      {/* Academic Information Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Academic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FormField
              label="Batch"
              name="batch"
              type="select"
              value={formData.batch}
              onChange={onChange}
              options={batchChoices}
              placeholder="Select Batch"
            />
          </div>

          {/* Academic Batch - now a dropdown connected to AcademicBatch model */}
          <div>
            <FormField
              label="Academic Batch"
              name="academic_batch"
              type="select"
              value={formData.academic_batch}
              onChange={onChange}
              options={batchOptions}
              placeholder={batchesLoading ? 'Loading batches...' : 'Select Batch'}
              required
              error={errors.academic_batch}
            />
            {academicBatches.length === 0 && !batchesLoading && (
              <p className="mt-1 text-sm text-yellow-600">No batches available</p>
            )}
          </div>

          {/* Class - now a text field */}
          <FormField
            label="Class"
            name="student_class"
            value={formData.student_class}
            onChange={onChange}
          />

          {/* Mode of Study */}
          <FormField
            label="Mode of Study"
            name="mode_of_study"
            type="select"
            value={formData.mode_of_study}
            onChange={onChange}
            options={modeOfStudyOptions}
          />

          {/* Preferred Level */}
          <FormField
            label="Preferred Level"
            name="preferred_level"
            type="select"
            value={formData.preferred_level}
            onChange={onChange}
            options={preferredLevelOptions}
          />

          {/* Trainer */}
          <div>
            <FormField
              label="Trainer"
              name="trainer"
              type="select"
              value={formData.trainer}
              onChange={onChange}
              options={trainerOptions}
              placeholder={trainersLoading ? 'Loading trainers...' : 'Select Trainer'}
              required
              error={errors.trainer}
            />
            {trainers.length === 0 && !trainersLoading && (
              <p className="mt-1 text-sm text-yellow-600">No trainers available</p>
            )}
          </div>

          {/* Branch */}
          <div>
            <FormField
              label="Branch"
              name="branch"
              type="select"
              value={formData.branch}
              onChange={onChange}
              options={branchOptions}
              placeholder={branchesLoading ? 'Loading branches...' : 'Select Branch'}
              required
              error={errors.branch}
            />
            {branches.length === 0 && !branchesLoading && (
              <p className="mt-1 text-sm text-yellow-600">No branches available</p>
            )}
          </div>

          {/* Status */}
          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={onChange}
            options={statusChoices}
          />

          {/* Start Date */}
          <FormField
            label="Start Date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={onChange}
            error={errors.start_date}
          />

          {/* End Date */}
          <FormField
            label="End Date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={onChange}
            error={errors.end_date}
          />

          {/* Drive Link */}
          <FormField
            label="Drive Link"
            name="drive_link"
            type="url"
            value={formData.drive_link}
            onChange={onChange}
            placeholder="https://drive.google.com/..."
            icon={LinkIcon}
            className="md:col-span-2"
          />

          {/* Notes */}
          <FormField
            label="Notes"
            name="notes"
            type="textarea"
            value={formData.notes}
            onChange={onChange}
            placeholder="Additional notes about the student..."
            rows={4}
            className="md:col-span-2"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Fee Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormField
              label="Fee Template"
              name="fee_template"
              type="select"
              value={formData.fee_template}
              onChange={onChange}
              options={feeTemplateOptions}
              placeholder={feeTemplatesLoading ? 'Loading templates...' : 'Select Fee Template'}
              error={errors.fee_template}
            />
            <p className="mt-1 text-sm text-gray-500">
              Choose a standard plan from the catalog. If you leave this blank, the student will be created with pending fee setup.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <FormField
              label="Fee Attendance Policy"
              name="fee_attendance_policy"
              type="select"
              value={formData.fee_attendance_policy}
              onChange={onChange}
              options={feeAttendancePolicyOptions}
              error={errors.fee_attendance_policy}
            />
            <p className="mt-1 text-sm text-gray-500">
              Set how attendance marking behaves for this student when they have overdue fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
