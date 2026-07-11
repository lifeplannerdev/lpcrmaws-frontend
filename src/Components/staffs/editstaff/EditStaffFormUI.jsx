import React from "react";
import StaffHeader from "../newstaff/StaffHeader";
import StaffActionButtons from "../newstaff/StaffActionButtons";
import PersonalInfoSection from "../newstaff/PersonalInfoSection";
import ProfessionalInfoSection from "../newstaff/ProfessionalInfoSection";
import AssignedAssetsSection from "./AssignedAssetsSection";
import { usePermissions } from "../../../context/PermissionsContext";

export default function EditStaffFormUI({
  formData,
  errors,
  apiError,
  submitted,
  handleInputChange,
  handleSubmit,
  handleBack,
  hasDualAccess,
  dbRolesList,
  onDbRolesChange,
  branches
}) {
  const { hasPermission } = usePermissions();
  const canEditStaff = hasPermission('staff:edit_any') || hasPermission('staff:edit_tenant');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <StaffHeader 
        onBack={handleBack} 
        title="Edit Staff Member" 
        subtitle="Update staff member details" 
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Success Message */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Staff member updated successfully!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Error Message */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">
                  {apiError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8">
          <PersonalInfoSection
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
          />

          <ProfessionalInfoSection
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
            hasDualAccess={hasDualAccess}
            dbRolesList={dbRolesList}
            onDbRolesChange={onDbRolesChange}
            branches={branches}
          />

          <AssignedAssetsSection assets={formData.assets} />

          {canEditStaff && (
            <StaffActionButtons
              onSubmit={handleSubmit}
              onCancel={handleBack}
              isEdit={true}
            />
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Fields marked with <span className="text-red-500">*</span> are required. Password cannot be changed from this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}