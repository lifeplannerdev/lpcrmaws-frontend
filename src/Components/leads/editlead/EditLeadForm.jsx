import React, { useState, useRef } from 'react';
import EditLeadFormUI from './EditLeadFormUI.jsx';

export default function EditLeadForm({
  formData,
  setFormData,
  leadId,
  authFetch,
  apiBaseUrl,
  navigate,
  initialApiError = ''
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(initialApiError);

  // Track the original assignedTo so we only call assign/unassign when it actually changes
  const originalAssignedTo = useRef(formData.assignedTo);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.source) {
      newErrors.source = 'Source is required';
    }

    if (formData.source === 'OTHER' && !formData.customSource?.trim()) {
      newErrors.customSource = 'Please specify custom source';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setApiError('');

    // Helper to parse assignedTo string → number or null
    const parseAssignedTo = (val) => {
      if (!val || val === '') return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    const currentAssignedTo = parseAssignedTo(formData.assignedTo);
    const previousAssignedTo = parseAssignedTo(originalAssignedTo.current);

    // Only call assign/unassign API if the assignment actually changed
    const assignmentChanged = currentAssignedTo !== previousAssignedTo;

    // Prepare the lead update payload (no assignment fields — handled separately)
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim() || null,
      location: formData.location?.trim() || null,
      priority: formData.priority,
      status: formData.status,
      program: formData.program || null,
      source: formData.source,
      custom_source: formData.source === 'OTHER' ? formData.customSource.trim() : '',
      remarks: formData.remarks?.trim() || '',
      interested_country: formData.interestedCountry?.trim() || null,
      interested_course: formData.interestedCourse?.trim() || null,
      previous_qualification: formData.previousQualification?.trim() || null,
      work_experience: formData.workExperience?.trim() || null,
      budget: formData.budget?.trim() || null,
    };

    try {
      // Step 1: Update the lead details
      const res = await authFetch(`${apiBaseUrl}/leads/${leadId}/`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();

      if (!res.ok) {
        // Handle backend validation errors
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
            setApiError(responseData?.detail || responseData?.message || 'Failed to update lead');
          }
        }
        throw new Error('Validation failed');
      }

      // Step 2: Only handle assignment if it actually changed
      if (assignmentChanged) {
        if (currentAssignedTo !== null) {
          // Assign to the newly selected user
          // Prompt for cascading assignment
          const shouldCascade = window.confirm(
            'Do you want to cascade this assignment to all active processing tasks for this lead?'
          );

          const assignPayload = {
            lead_id: parseInt(leadId),
            assigned_to_id: currentAssignedTo,
            cascade: shouldCascade
          };

          const assignRes = await authFetch(`${apiBaseUrl}/leads/assign/`, {
            method: 'POST',
            body: JSON.stringify(assignPayload)
          });

          if (!assignRes.ok) {
            const assignData = await assignRes.json();
            const errorMsg = assignData?.error || assignData?.detail || 'Unknown error';
            setApiError(`Lead updated but assignment failed: ${errorMsg}`);
            return;
          }
        } else if (previousAssignedTo !== null) {
          // Only unassign if there was a previous assignment being cleared
          const unassignPayload = {
            lead_id: parseInt(leadId),
            unassign_type: 'PRIMARY'
          };

          const unassignRes = await authFetch(`${apiBaseUrl}/leads/unassign/`, {
            method: 'POST',
            body: JSON.stringify(unassignPayload)
          });

          if (!unassignRes.ok) {
            const unassignData = await unassignRes.json();
            const errorMsg = unassignData?.error || unassignData?.detail || 'Unknown error';
            setApiError(`Lead updated but unassignment failed: ${errorMsg}`);
            return;
          }
        }

        // Sync the ref so a second save doesn't re-trigger assignment
        originalAssignedTo.current = formData.assignedTo;
      }

      // Success!
      setSubmitted(true);
      setTimeout(() => {
        navigate('/leads');
      }, 2000);

    } catch (err) {
      if (err.message !== 'Validation failed') {
        setApiError(err.message || 'Something went wrong while updating the lead');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    const confirmed = window.confirm(
      'Are you sure you want to go back? Any unsaved changes will be lost.'
    );
    if (confirmed) {
      navigate('/leads');
    }
  };

  return (
    <EditLeadFormUI
      formData={formData}
      errors={errors}
      apiError={apiError}
      submitted={submitted}
      submitting={submitting}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      handleBack={handleBack}
    />
  );
}
