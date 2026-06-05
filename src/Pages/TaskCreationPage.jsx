// Pages/TaskCreationPage.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import TaskFormFields from '../Components/tasks/TaskFormFields';
import PrioritySelector from '../Components/tasks/PrioritySelector';
import { Building } from 'lucide-react';

export default function TaskCreationPage() {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  const hasDualAccess = hasPermission('system:access_flag');
  const canAssignTasks = hasPermission('tasks:edit_any') || hasPermission('tasks:edit_tenant') || hasPermission('tasks:edit_own');

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignTo: '',
    priority: 'MEDIUM',
    deadline: '',
    company: user?.company || 'LP',
  });

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            setTeamMembers([]);
            return;
          }
        }

        const url = formData.company ? `${API_BASE_URL}/employees/list/?company=${formData.company}` : `${API_BASE_URL}/employees/list/`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch employees: ${res.status}`);
        }

        const data = await res.json();
        console.log("employees data:", data);

        let employeeList = data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data.results && Array.isArray(data.results)) {
            employeeList = data.results;
          }
        }

        if (Array.isArray(employeeList) && employeeList.length > 0) {
          // Filter out ADMIN role employees
          const filteredEmployees = employeeList.filter(emp => !emp.role_names?.some(r => r.toLowerCase() === 'admin'));
          setTeamMembers(filteredEmployees);
        } else {
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setTeamMembers([]);
      }
    };

    fetchTeamMembers();
  }, [accessToken, refreshAccessToken, API_BASE_URL, formData.company]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required';
    }

    if (!formData.assignTo) {
      newErrors.assigned_to = 'Please select a team member';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) {
        alert('Session expired. Please login again.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assigned_to: parseInt(formData.assignTo, 10),
        priority: formData.priority,
        deadline: formData.deadline,
        company: formData.company,
      };

      const res = await fetch(`${API_BASE_URL}/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data) {
          const backendErrors = {};
          Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
              backendErrors[key] = data[key][0];
            } else {
              backendErrors[key] = data[key];
            }
          });
          setErrors(backendErrors);
          throw new Error(Object.values(backendErrors).join(', '));
        }
        throw new Error(data.detail || 'Task creation failed');
      }

      alert('Task created successfully!');

      setFormData({
        title: '',
        description: '',
        assignTo: '',
        priority: 'MEDIUM',
        deadline: '',
        company: user?.company || 'LP',
      });
      setErrors({});

      navigate('/staff/tasks');

    } catch (error) {
      console.error('Task creation error:', error);
      alert(error.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      assignTo: '',
      priority: 'MEDIUM',
      deadline: '',
      company: user?.company || 'LP',
    });
    setErrors({});
  };

  // Handle field change
  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors duration-200"
          disabled={loading}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create New Task</h1>
          <p className="text-slate-600">Fill in the details to create a new task for your team</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 space-y-8">
              {hasDualAccess && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building size={16} className="text-indigo-500" />
                    Company
                  </label>
                  <select
                    value={formData.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    disabled={loading}
                  >
                    <option value="LP">LP Group</option>
                    <option value="FLAG">FLAG</option>
                  </select>
                </div>
              )}

              {/* Task Form Fields */}
              <TaskFormFields
                formData={formData}
                errors={errors}
                teamMembers={teamMembers}
                onFieldChange={handleFieldChange}
                disabled={loading}
                isDropdownOpen={isDropdownOpen}
                setIsDropdownOpen={setIsDropdownOpen}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              {/* Priority Selector */}
              <PrioritySelector
                value={formData.priority}
                onChange={(value) => handleFieldChange('priority', value)}
                disabled={loading}
              />
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-8 py-6 flex items-center justify-end gap-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Cancel
              </button>
              {canAssignTasks && (
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
