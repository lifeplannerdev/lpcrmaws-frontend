// pages/StudentEditPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../Components/common/Card';
import Alert from '../Components/common/Alert';
import StudentFormHeader from '../Components/students/addstudent/StudentFormHeader';
import StudentFormFields from '../Components/students/addstudent/StudentFormFields';
import StudentFormActions from '../Components/students/addstudent/StudentFormActions';
import { useStudentForm } from '../hooks/useStudentForm';
import { STATUS_CHOICES, BATCH_CHOICES } from '../Components/utils/studentConstants';
import { usePermissions } from '../context/PermissionsContext';

export default function StudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEditStudents = hasPermission('students:edit_any') || hasPermission('students:edit_tenant') || hasPermission('students:edit_own');
  
  const {
    formData,
    trainers,
    trainersLoading,
    academicBatches,
    batchesLoading,
    branches,
    branchesLoading,
    feeTemplates,
    feeTemplatesLoading,
    loading,
    fetchLoading,
    errors,
    handleChange,
    submitStudent,
  } = useStudentForm(id); // Pass student ID for edit mode

  const handleSubmit = (e) => {
    e.preventDefault();
    submitStudent(() => {
      navigate('/students');
    });
  };

  const handleCancel = () => {
    navigate('/students');
  };

  // Show loading state while fetching student data
  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">Loading student details...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if student data failed to load
  if (errors.submit && !formData.name) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-red-500">{errors.submit}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <StudentFormHeader 
          onBack={handleCancel}
          title="Edit Student"
          subtitle="Update the student information below"
        />

        <form onSubmit={handleSubmit}>
          {/* Error Alert */}
          {errors.submit && (
            <Alert
              type="error"
              message={errors.submit}
              className="mb-6"
            />
          )}

          {/* Form Card */}
          <Card padding="p-6">
            <StudentFormFields
              formData={formData}
              errors={errors}
              trainers={trainers}
              trainersLoading={trainersLoading}
              academicBatches={academicBatches}
              batchesLoading={batchesLoading}
              branches={branches}
              branchesLoading={branchesLoading}
              feeTemplates={feeTemplates}
              feeTemplatesLoading={feeTemplatesLoading}
              onChange={handleChange}
              batchChoices={BATCH_CHOICES}
              statusChoices={STATUS_CHOICES}
              canEditFees={hasPermission('fees:edit_any') || hasPermission('fees:edit_tenant')}
            />

            {canEditStudents && (
              <StudentFormActions
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                loading={loading}
                disabled={trainersLoading || fetchLoading}
                submitLabel="Update Student"
              />
            )}
          </Card>
        </form>
      </div>
    </div>
  );
}