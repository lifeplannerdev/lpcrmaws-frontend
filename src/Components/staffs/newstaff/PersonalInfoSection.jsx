import React from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import FormField from '../../common/FormField'
import IconContainer from '../../common/IconContainer';

const PersonalInfoSection = React.memo(({ formData, errors, onChange }) => {
  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <IconContainer 
          icon={User} 
          gradient="from-blue-500 to-indigo-600"
          size="sm"
        />
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Personal Information
          </h2>
          <p className="text-sm text-gray-500 font-medium">Basic details about the staff member</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={onChange}
          error={errors.firstName}
          required
          placeholder="Enter first name"
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={onChange}
          error={errors.lastName}
          required
          placeholder="Enter last name"
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Username"
          name="username"
          value={formData.username}
          onChange={onChange}
          error={errors.username}
          required
          placeholder="Enter username"
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          error={errors.email}
          required
          placeholder="email@example.com"
          icon={Mail}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Company Phone"
          name="officePhone"
          type="tel"
          value={formData.officePhone}
          onChange={onChange}
          error={errors.officePhone}
          required
          placeholder="+1 (555) 000-0000"
          icon={Phone}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Personal Phone"
          name="personalPhone"
          type="tel"
          value={formData.personalPhone}
          onChange={onChange}
          error={errors.personalPhone}
          placeholder="+1 (555) 000-0000"
          icon={Phone}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />

        <FormField
          label="Location"
          name="location"
          value={formData.location}
          onChange={onChange}
          placeholder="Enter location"
          icon={MapPin}
          className="px-4 py-3 border-2 rounded-xl font-medium"
        />
      </div>
    </div>
  );
});

PersonalInfoSection.displayName = 'PersonalInfoSection';

export default PersonalInfoSection;