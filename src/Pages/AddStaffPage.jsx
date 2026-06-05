import React, { useState, useCallback } from "react";
import StaffHeader from "../Components/staffs/newstaff/StaffHeader";
import StaffActionButtons from "../Components/staffs/newstaff/StaffActionButtons";
import PersonalInfoSection from "../Components/staffs/newstaff/PersonalInfoSection";
import ProfessionalInfoSection from "../Components/staffs/newstaff/ProfessionalInfoSection";
import SecuritySection from "../Components/staffs/newstaff/SecuritySection";
import Alert from "../Components/common/Alert";
import Card from "../Components/common/Card";
import { initialFormData } from "../Components/utils/staffConstants";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";

export default function AddStaffPage() {
  const { accessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const hasDualAccess = hasPermission('system:access_flag');
  const canEditStaff = hasPermission('staff:edit_any') || hasPermission('staff:edit_tenant');

  const [formData, setFormData] = useState(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [dbRolesList, setDbRolesList] = useState([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchBranchesAndRoles = async () => {
      try {
        const [branchesRes, rolesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/branches/`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${API_BASE_URL}/roles/`, { headers: { Authorization: `Bearer ${accessToken}` } })
        ]);
        if (branchesRes.ok) setBranches(await branchesRes.json() || []);
        if (rolesRes.ok) {
          const r = await rolesRes.json();
          setDbRolesList(r.results || r || []);
        }
      } catch (err) {
        console.error('Failed to load branches and roles', err);
      }
    };
    if (accessToken) fetchBranchesAndRoles();
  }, [accessToken, API_BASE_URL]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.officePhone?.trim()) {
      newErrors.officePhone = 'Company Phone is required';
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.officePhone)) {
      newErrors.officePhone = 'Company Phone format is invalid';
    }
    if (!formData.db_roles || formData.db_roles.length === 0) newErrors.db_roles = 'At least one role is required';
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const staffData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      username: formData.username,
      email: formData.email,
      office_phone: formData.officePhone,
      personal_phone: formData.personalPhone,
      phone: formData.officePhone, // Keep mapping to phone to satisfy any backend expectations
      location: formData.location || '',
      role: formData.role || '',
      db_roles: formData.db_roles,
      team: formData.team || '',
      is_active: formData.isActive,
      salary: formData.salary ? parseFloat(formData.salary) : null,
      password: formData.password,
      branch_id: formData.branch || null,
      company: formData.company || user?.company || 'LP',
    };


    try {
      const res = await fetch(`${API_BASE_URL}/staff/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(staffData),
      });


      if (res.status === 401) {
        setErrors({ general: 'Session expired. Please login again.' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        setErrors({ general: 'Server error. Please contact support.' });
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();

        if (typeof errorData === 'object' && !errorData.detail) {
          setErrors(errorData);
        } else {
          setErrors({ general: errorData.detail || 'Failed to create staff member. Please try again.' });
        }
        return;
      }

      const data = await res.json();
      setSubmitted(true);
      setTimeout(() => {
        setFormData(initialFormData);
        setSubmitted(false);
        navigate('/staff');
      }, 2000);

    } catch (err) {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <StaffHeader onBack={handleBack} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Success Message */}
        {submitted && (
          <Alert
            type="success"
            title="Staff member added successfully!"
            className="mb-6 animate-pulse"
          />
        )}

        {/* General Error Message */}
        {errors.general && (
          <Alert
            type="error"
            message={errors.general}
            className="mb-6"
          />
        )}

        {/* Form Card */}
        <Card padding="p-4 sm:p-6 lg:p-8">
          <PersonalInfoSection
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
          />

          <ProfessionalInfoSection
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
            branches={branches}
            hasDualAccess={hasDualAccess}
            dbRolesList={dbRolesList}
            onDbRolesChange={(roles) => setFormData({...formData, db_roles: roles})}
          />

          <SecuritySection
            formData={formData}
            errors={errors}
            onChange={handleInputChange}
          />

          {canEditStaff && (
            <StaffActionButtons
              onSubmit={handleSubmit}
              onCancel={handleBack}
            />
          )}
        </Card>

        {/* Info Card */}
        <Alert
          type="info"
          className="mt-6"
        >
          <p className="text-sm">
            <strong>Note:</strong> Fields marked with <span className="text-red-500">*</span> are required. The staff member will receive login credentials via email once their account is created.
          </p>
        </Alert>
      </div>
    </div>
  );
}