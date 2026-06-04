// src/hooks/useStudentForm.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { initialStudentFormData } from '../Components/utils/studentConstants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useStudentForm(studentId = null) {
  const { accessToken, refreshAccessToken, user } = useAuth();
  
  const [formData, setFormData] = useState(initialStudentFormData);
  const [trainers, setTrainers] = useState([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [academicBatches, setAcademicBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [feeTemplatesLoading, setFeeTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [feeTemplateTouched, setFeeTemplateTouched] = useState(false);

  const company = user?.company || 'LP';

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      company,
    }));
  }, [company]);

  // Fetch student data if editing
  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  // Fetch trainers, batches, branches
  useEffect(() => {
    fetchTrainers();
    fetchAcademicBatches();
    fetchBranches();
    fetchFeeTemplates();
  }, [accessToken, company]);

  useEffect(() => {
    if (!feeTemplateTouched) {
      const suggestedTemplate = suggestFeeTemplate(formData.batch, feeTemplates);
      if (suggestedTemplate) {
        setFormData(prev => ({ ...prev, fee_template: String(suggestedTemplate.id) }));
      }
    }
  }, [formData.batch, feeTemplates, feeTemplateTouched]);

  const suggestFeeTemplate = (batchValue, templates) => {
    if (!batchValue || !Array.isArray(templates) || templates.length === 0) {
      return null;
    }

    const normalizedBatch = String(batchValue).trim().toUpperCase();
    const baseLabel = normalizedBatch.split(' ')[0];

    const exactMatch = templates.find((template) => (
      String(template.course_label || '').trim().toUpperCase() === baseLabel
    ));
    if (exactMatch) return exactMatch;

    const codeMatch = templates.find((template) => (
      String(template.code || '').toUpperCase().includes(baseLabel)
    ));
    return codeMatch || null;
  };

  const fetchStudent = async () => {
    try {
      setFetchLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) {
        throw new Error('No token available');
      }

      const response = await axios.get(`${API_BASE_URL}/students/${studentId}/`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setFormData(prev => ({
        ...initialStudentFormData,
        ...prev,
        ...response.data,
        fee_template: response.data.fee_template || prev.fee_template || '',
        company: response.data.company || prev.company || company,
      }));
      setErrors({});
    } catch (err) {
      console.error('Failed to fetch student:', err);
      setErrors({ submit: 'Failed to load student details' });
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      setTrainersLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) {
        console.error('No token available');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/trainers/`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      let trainersData = [];
      if (res.data.results) {
        trainersData = res.data.results;
      } else if (Array.isArray(res.data)) {
        trainersData = res.data;
      } else {
        console.error('Unexpected response format:', res.data);
      }
      setTrainers(trainersData);
    } catch (err) {
      console.error('Failed to load trainers:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setTrainersLoading(false);
    }
  };

  const fetchAcademicBatches = async () => {
    try {
      setBatchesLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/trainers/academic-batches/`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      let batchesData = [];
      if (res.data.results) {
        batchesData = res.data.results;
      } else if (Array.isArray(res.data)) {
        batchesData = res.data;
      }
      setAcademicBatches(batchesData);
    } catch (err) {
      console.error('Failed to load academic batches:', err);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      setBranchesLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/branches/`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      let branchesData = [];
      if (res.data.results) {
        branchesData = res.data.results;
      } else if (Array.isArray(res.data)) {
        branchesData = res.data;
      }
      setBranches(branchesData);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setBranchesLoading(false);
    }
  };

  const fetchFeeTemplates = async () => {
    try {
      setFeeTemplatesLoading(true);
      let token = accessToken || await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/fees/catalog/`, {
        params: { company, active: 'true' },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const templatesData = Array.isArray(res.data) ? res.data : [];
      setFeeTemplates(templatesData);
    } catch (err) {
      console.error('Failed to load fee templates:', err);
      setFeeTemplates([]);
    } finally {
      setFeeTemplatesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fee_template') {
      setFeeTemplateTouched(true);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    if (!formData.academic_batch) {
      newErrors.academic_batch = 'Academic Batch is required';
    }
    if (!formData.branch) {
      newErrors.branch = 'Branch is required';
    }
    if (!formData.trainer) {
      newErrors.trainer = 'Trainer is required';
    }
    if (!formData.admission_date) {
      newErrors.admission_date = 'Admission date is required';
    }
    if (formData.fee_template && isNaN(Number(formData.fee_template))) {
      newErrors.fee_template = 'Select a valid fee template';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone_number && formData.phone_number.length < 10) {
      newErrors.phone_number = 'Phone number must be at least 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitStudent = async (onSuccess) => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Clean up empty fields
      const submitData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (submitData.fee_template) {
        submitData.fee_template = Number(submitData.fee_template);
      } else {
        delete submitData.fee_template;
      }

      // Determine if we're creating or updating
      if (studentId) {
        // Update existing student
        await axios.put(`${API_BASE_URL}/students/${studentId}/`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        });
      } else {
        // Create new student
        await axios.post(`${API_BASE_URL}/students/`, submitData, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      }

      // Success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to save student', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.data) {
        const backendErrors = {};
        Object.entries(err.response.data).forEach(([key, value]) => {
          backendErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ submit: `Failed to ${studentId ? 'update' : 'create'} student. Please try again.` });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
