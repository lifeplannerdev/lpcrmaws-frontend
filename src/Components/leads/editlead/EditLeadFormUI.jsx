import React from 'react';
import { Save } from 'lucide-react';
import ContactSection from '../newlead/ContactSection'
import LeadDetailsSection from '../newlead/LeadDetailsSection';
import AdditionalInfoSection from '../newlead/AdditionalInfoSection';
import AssignedToSection from '../newlead/AssignedToSection';
import Alert from '../../common/Alert';
import Card from '../../common/Card';
import Button from '../../common/Button';
import PageHeader from "../../common/PageHeader";
import { usePermissions } from '../../../context/PermissionsContext';

export default function EditLeadFormUI({
  formData,
  errors,
  apiError,
  submitted,
  submitting,
  handleInputChange,
  handleSubmit,
  handleBack
}) {
  const { hasPermission } = usePermissions();
  const canEditLead = hasPermission('leads:edit_any') || hasPermission('leads:edit_tenant') || hasPermission('leads:edit_own');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Edit Lead"
          description="Update the lead information below"
          onBack={handleBack}
          backText="Back to Leads"
          disabled={submitting}
        />

        {/* Success Message */}
        {submitted && (
          <Alert type="success" className="mb-6">
            Lead updated successfully! Redirecting...
          </Alert>
        )}

        {/* API Error Message */}
        {apiError && (
          <Alert type="error" className="mb-6">
            {apiError}
          </Alert>
        )}

        {/* Form Card */}
        <Card className="mb-6">
          <div className="space-y-8">
            {/* CORRECTED: Pass onChange instead of handleInputChange */}
            <ContactSection
              formData={formData}
              errors={errors}
              onChange={handleInputChange}
            />

            <LeadDetailsSection
              formData={formData}
              errors={errors}
              onChange={handleInputChange}
            />

            <AdditionalInfoSection
              formData={formData}
              onChange={handleInputChange}
            />

            <AssignedToSection
              formData={formData}
              errors={errors}
              onChange={handleInputChange}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end mb-6">
          {canEditLead && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              <Save className="h-5 w-5 mr-2" />
              {submitting ? 'Updating...' : 'Update Lead'}
            </Button>
          )}

          <Button
            onClick={handleBack}
            variant="outline"
            disabled={submitting}
            className="px-6 py-2"
          >
            Cancel
          </Button>
        </div>

        {/* Info Alert */}
        <Alert type="info">
          <strong>Note:</strong> Fields marked with * are required. Assignment changes will be
          reflected immediately after updating.
        </Alert>
      </div>
    </div>
  );
}