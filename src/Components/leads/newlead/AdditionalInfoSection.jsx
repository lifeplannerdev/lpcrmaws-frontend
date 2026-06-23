import React from 'react';
import FormField from '../../common/FormField';
import SectionHeader from '../../common/SectionHeader';
import MentionsTextarea from '../MentionsTextarea';

export default function AdditionalInfoSection({ formData, onChange }) {
  return (
    <div className="mb-8 pt-8 border-t border-gray-200">
      <SectionHeader 
        title="Additional Information" 
        showAction={false}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <FormField
          label="Interested Country"
          name="interestedCountry"
          type="text"
          value={formData.interestedCountry}
          onChange={onChange}
          placeholder="E.g., UK, Canada, Australia"
        />
        <FormField
          label="Interested Course"
          name="interestedCourse"
          type="text"
          value={formData.interestedCourse}
          onChange={onChange}
          placeholder="E.g., MSc Data Science"
        />
        <FormField
          label="Previous Qualification"
          name="previousQualification"
          type="text"
          value={formData.previousQualification}
          onChange={onChange}
          placeholder="E.g., BSc Computer Science"
        />
        <FormField
          label="Work Experience"
          name="workExperience"
          type="text"
          value={formData.workExperience}
          onChange={onChange}
          placeholder="E.g., 2 years as Developer"
        />
        <FormField
          label="Budget"
          name="budget"
          type="text"
          value={formData.budget}
          onChange={onChange}
          placeholder="E.g., 15k-20k GBP"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Remarks / Notes
        </label>
        <MentionsTextarea
          name="remarks"
          value={formData.remarks}
          onChange={onChange}
          rows={4}
          placeholder="Add any additional notes or remarks about this lead..."
        />
      </div>
    </div>
  );
}