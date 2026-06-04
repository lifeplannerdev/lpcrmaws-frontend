// pages/AddStudentPage.jsx
import { useNavigate } from 'react-router-dom';
import Card from '../Components/common/Card';
import Alert from '../Components/common/Alert'
import StudentFormHeader from '../Components/students/addstudent/StudentFormHeader'
import StudentFormFields from '../Components/students/addstudent/StudentFormFields';
import StudentFormActions from '../Components/students/addstudent/StudentFormActions';
import { useStudentForm } from '../hooks/useStudentForm';
import { STATUS_CHOICES, BATCH_CHOICES } from '../Components/utils/studentConstants';

export default function AddStudentPage() {
  const navigate = useNavigate();
  
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
    errors,
    handleChange,
    submitStudent,
  } = useStudentForm();

  const handleSubmit = (e) => {
    e.preventDefault();
    submitStudent(() => {
      navigate('/students');
    });
  };

  const handleCancel = () => {
    navigate('/students');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <StudentFormHeader 
          onBack={handleCancel}
          title="Add New Student"
          subtitle="Fill in the student information below"
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
            />

            <StudentFormActions
              onCancel={handleCancel}
              onSubmit={handleSubmit}
              loading={loading}
              disabled={trainersLoading || feeTemplatesLoading}
              submitLabel="Save Student"
            />
          </Card>
        </form>
      </div>
    </div>
  );
}
