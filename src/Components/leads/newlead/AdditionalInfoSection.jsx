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