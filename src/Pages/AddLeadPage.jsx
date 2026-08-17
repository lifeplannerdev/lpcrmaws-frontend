// Pages/AddLeadPage.jsx - UPDATED WITH MANDATORY ASSIGNMENT
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import PageHeader from '../Components/common/PageHeader'; // Use common PageHeader
import ContactInfoSection from '../Components/leads/newlead/ContactSection';
import LeadDetailsSection from '../Components/leads/newlead/LeadDetailsSection';
import AdditionalInfoSection from '../Components/leads/newlead/AdditionalInfoSection';
import AssignedToSection from '../Components/leads/newlead/AssignedToSection';
import ActionButtons from '../Components/leads/newlead/ActionButtons';
import Alert from '../Components/common/Alert';
import Card from '../Components/common/Card';

export default function AddLeadPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: '',
    priority: 'MEDIUM',
    status: 'ENQUIRY',
    program: '',
    source: '',
    customSource: '',
    remarks: '',
    assignedTo: '',
    interestedCountry: '',
    interestedCourse: '',
    previousQualification: '',
    workExperience: '',
    budget: ''
  });

  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialPhone = params.get('phone');
    if (initialPhone) {
      setFormData(prev => ({
        ...prev,
        phone: initialPhone,
        source: 'VOXBAY CALL'
      }));
    }
  }, [location.search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.trim().length < 3)
      newErrors.name = 'Name must be at least 3 characters long';

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10,}$/.test(formData.phone.trim()))
      newErrors.phone = 'Phone number must be at least 10 digits and digits only';

    if (!formData.source) newErrors.source = 'Source is required';
    if (formData.source === 'OTHER' && !formData.customSource.trim())
      newErrors.customSource = 'Please specify custom source';

    if ((hasPermission('leads:assign_any') || hasPermission('leads:assign_tenant')) && !formData.assignedTo) {
      newErrors.assignedTo = 'Please assign this lead to a staff member';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    const leadData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      source: formData.source,
      custom_source: formData.source === 'OTHER' ? formData.customSource.trim() : '',
      email: formData.email?.trim() || null,
      program: formData.program || null,
      location: formData.location?.trim() || null,
      priority: formData.priority,
      status: formData.status,
      remarks: formData.remarks?.trim() ? `[${(await import('date-fns')).format(new Date(), 'dd/MM/yyyy HH:mm')}] ${user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'User')}: ${formData.remarks.trim()}` : '',
      assigned_to: formData.assignedTo ? parseInt(formData.assignedTo) : null,
      interested_country: formData.interestedCountry?.trim() || null,
      interested_course: formData.interestedCourse?.trim() || null,
      previous_qualification: formData.previousQualification?.trim() || null,
      work_experience: formData.workExperience?.trim() || null,
      budget: formData.budget?.trim() || null,
    };

    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch(`${API_BASE_URL}/leads/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(leadData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        console.error('Create error:', responseData);
        throw new Error(responseData?.detail || responseData?.message || 'Failed to create lead');
      }

      console.log('Lead created successfully:', responseData);
      setSubmitted(true);

      setTimeout(() => {
        setFormData({
          name: '',
          phone: '',
          email: '',
          location: '',
          priority: 'MEDIUM',
          status: 'ENQUIRY',
          program: '',
          source: '',
          customSource: '',
          remarks: '',
          assignedTo: '',
          interestedCountry: '',
          interestedCourse: '',
          previousQualification: '',
          workExperience: '',
          budget: ''
        });
        setSubmitted(false);
        navigate('/leads');
      }, 2000);

    } catch (err) {
      console.error('Add lead error:', err);
      alert(err.message || 'Something went wrong');
    }
  };

  const handleBack = () => {
    const confirmed = window.confirm(
      'Are you sure you want to go back? Any unsaved changes will be lost.'
    );
    if (confirmed) navigate('/leads');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Use Common PageHeader instead of LeadHeader */}
        <PageHeader
          title="Add New Lead"
          description="Fill in the details to add a new lead to your CRM"
          onBack={handleBack}
          backText="Back to Leads"
        />

        {/* Success Message */}
        {submitted && (
          <Alert
            type="success"
            title="Lead added successfully!"
            className="mb-6 animate-pulse"
          />
        )}

        {/* Form Card */}
        <Card padding="p-8" className="mb-6">
          <ContactInfoSection 
            formData={formData} 
            errors={errors} 
            onChange={handleInputChange} 
          />
          <LeadDetailsSection 
            formData={formData} 
            errors={errors} 
            onChange={handleInputChange} 
          />
          <AssignedToSection 
            formData={formData} 
            errors={errors} 
            onChange={handleInputChange} 
          />
          <AdditionalInfoSection 
            formData={formData} 
            onChange={handleInputChange} 
          />
          <ActionButtons 
            onSave={handleSubmit} 
            onCancel={handleBack} 
          />
        </Card>

        {/* Info Alert */}
        <Alert type="info" className="mt-6">
          <strong>Note:</strong> Fields marked with <span className="text-red-500">*</span> are required. Make sure to fill them before saving the lead.
        </Alert>
      </div>
    </div>
  );
}