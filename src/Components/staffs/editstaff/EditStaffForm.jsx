import React, { useState, useCallback } from "react";
import EditStaffFormUI from "./EditStaffFormUI";

export default function EditStaffForm({
  formData,
  setFormData,
  staffId,
  authFetch,
  apiBaseUrl,
  navigate,
  hasDualAccess,
  dbRolesList
}) {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  }, [errors, apiError, setFormData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.officePhone?.trim()) {
      newErrors.officePhone = 'Company Phone is required';
    }
    if (!formData.db_roles || formData.db_roles.length === 0) {
      newErrors.db_roles = 'At least one role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setApiError('');

    const staffData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      username: formData.username,
      email: formData.email,
      office_phone: formData.officePhone,
      personal_phone: formData.personalPhone,
      phone: formData.officePhone, // keep mapping to phone as fallback
      voxbay_number: formData.voxbayNumber,
      location: formData.location,
      db_roles: formData.db_roles,
      team: formData.team,
      salary: formData.salary, 
      is_active: formData.isActive,
      company: formData.company,
    };

    try {
      const res = await authFetch(`${apiBaseUrl}/staff/${staffId}/update/`, {
        method: 'PUT',
        body: JSON.stringify(staffData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (responseData && typeof responseData === 'object') {
          const backendErrors = {};
          Object.keys(responseData).forEach(key => {
            if (Array.isArray(responseData[key])) {
              backendErrors[key] = responseData[key][0];
            } else if (typeof responseData[key] === 'string') {
              backendErrors[key] = responseData[key];
            }
          });
          setErrors(backendErrors);

          if (Object.keys(backendErrors).length === 0) {
            setApiError(responseData?.detail || responseData?.message || 'Failed to update staff');
          }
        }
        return;
      }

      // Success
      setSubmitted(true);
      setTimeout(() => {
        navigate('/staff');
      }, 1500);

    } catch (err) {
      setApiError(err.message || 'Network error occurred');
    }
  };

  const handleBack = () => {
    const confirmed = window.confirm(
      'Are you sure you want to go back? Any unsaved changes will be lost.'
    );
    if (confirmed) {
      navigate('/staff');
    }
  };

  return (
    <EditStaffFormUI
      formData={formData}
      errors={errors}
      apiError={apiError}
      submitted={submitted}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      handleBack={handleBack}
      hasDualAccess={hasDualAccess}
      dbRolesList={dbRolesList}
      onDbRolesChange={(roles) => setFormData({...formData, db_roles: roles})}
    />
  );
}