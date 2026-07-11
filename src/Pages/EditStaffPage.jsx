import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";
import EditStaffForm from "../Components/staffs/editstaff/EditStaffForm";

export default function EditStaffPage() {
  const { id } = useParams();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    officePhone: '',
    personalPhone: '',
    location: '',
    db_roles: [],
    team: '',
    salary: '',
    isActive: true,
    company: 'LP',
    branch: '',
    assets: [],
  });
  const [dbRolesList, setDbRolesList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

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
    const fetchStaffDetails = async () => {
      setLoading(true);
      try {
        const [staffRes, rolesRes, branchesRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/staff/${id}/`),
          authFetch(`${API_BASE_URL}/roles/`),
          authFetch(`${API_BASE_URL}/branches/`)
        ]);

        if (!staffRes.ok) {
          setFetchError('Failed to fetch staff details');
          setTimeout(() => navigate('/staff'), 2000);
          return;
        }

        const data = await staffRes.json();
        const rolesData = rolesRes.ok ? await rolesRes.json() : [];
        const branchesData = branchesRes.ok ? await branchesRes.json() : [];
        setDbRolesList(rolesData.results || rolesData);
        setBranches(branchesData.results || branchesData);
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          username: data.username || '',
          email: data.email || '',
          officePhone: data.office_phone || data.phone || '',
          personalPhone: data.personal_phone || '',
          voxbayNumber: data.voxbay_number || '',
          voxbayExtension: data.voxbay_extension || '',
          location: data.location || '',
          db_roles: data.db_roles || [],
          salary: data.salary || '',
          team: data.team || '',
          isActive: data.is_active ?? true,
          company: data.company || 'LP',
          branch: data.branch_id || data.branch || '',
          assets: data.assets || [],
        });
      } catch (err) {
        setFetchError('Network error occurred');
        setTimeout(() => navigate('/staff'), 2000);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStaffDetails();
    }
  }, [id, API_BASE_URL, authFetch, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{fetchError}</p>
          <p className="mt-2 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <EditStaffForm 
      formData={formData} 
      setFormData={setFormData}
      staffId={id}
      authFetch={authFetch}
      apiBaseUrl={API_BASE_URL}
      navigate={navigate}
      hasDualAccess={hasPermission('staff:access_flag')}
      dbRolesList={dbRolesList}
      branches={branches}
    />
  );
}
