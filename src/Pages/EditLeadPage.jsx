import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import EditLeadForm from '../Components/leads/editlead/EditLeadForm';

export default function EditLeadPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const authFetch = useCallback(async (url, options = {}, retry = true) => {
    let token = accessToken;

    if (!token) {
      token = await refreshAccessToken();
      if (!token) throw new Error('No access token available');
    }

    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (res.status === 401 && retry) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error('Session expired');
      return authFetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      }, false);
    }
    return res;
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const fetchLeadData = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/`);
        if (!res.ok) throw new Error('Failed to fetch lead');

        const lead = await res.json();

        let assignedToValue = '';
        if (lead.assigned_to) {
          if (typeof lead.assigned_to === 'object' && lead.assigned_to !== null) {
            assignedToValue = lead.assigned_to.id ? String(lead.assigned_to.id) : '';
          } else if (typeof lead.assigned_to === 'number') {
            assignedToValue = String(lead.assigned_to);
          } else if (typeof lead.assigned_to === 'string') {
            assignedToValue = lead.assigned_to;
          }
        }

        setFormData({
          name: lead.name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          location: lead.location || '',
          priority: lead.priority || 'MEDIUM',
          status: lead.status || 'ENQUIRY',
          program: lead.program || '',
          source: lead.source || '',
          customSource: lead.custom_source || '',
          remarks: lead.remarks || '',
          assignedTo: assignedToValue,
          interestedCountry: lead.interested_country || '',
          interestedCourse: lead.interested_course || '',
          previousQualification: lead.previous_qualification || '',
          workExperience: lead.work_experience || '',
          budget: lead.budget || ''
        });
      } catch (err) {
        setApiError('Failed to load lead data');
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLeadData();
    }
  }, [leadId, authFetch, API_BASE_URL]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  return (
    <EditLeadForm
      formData={formData}
      setFormData={setFormData}
      leadId={leadId}
      authFetch={authFetch}
      apiBaseUrl={API_BASE_URL}
      navigate={navigate}
      initialApiError={apiError}
    />
  );
}