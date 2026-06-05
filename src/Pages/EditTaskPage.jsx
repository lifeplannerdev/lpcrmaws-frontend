// Pages/EditTaskPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader, ArrowLeft } from 'lucide-react';
import TaskFormFields from '../Components/tasks/TaskFormFields';
import PrioritySelector from '../Components/tasks/PrioritySelector';
import StatusSelector from '../Components/tasks/StatusSelector';
import { usePermissions } from '../context/PermissionsContext';

export default function EditTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canAssignTasks = hasPermission('tasks:edit_any') || hasPermission('tasks:edit_tenant') || hasPermission('tasks:edit_own');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignTo: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    deadline: '',
  });

  // Fetch task details and team members
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let token = accessToken;
        
        if (!token) {
          token = await refreshAccessToken();
          if (!token) throw new Error('Authentication required');
        }

        // Fetch task details
        const taskResponse = await fetch(`${API_BASE_URL}/tasks/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!taskResponse.ok) {
          throw new Error('Failed to fetch task details');
        }

        const taskData = await taskResponse.json();

        // Convert date to YYYY-MM-DD format
        const deadlineDate = taskData.deadline ? taskData.deadline.split('T')[0] : '';

        setFormData({
          title: taskData.title,
          description: taskData.description,
          assignTo: taskData.assigned_to.toString(),
          priority: taskData.priority,
          status: taskData.status,
          deadline: deadlineDate,
        });

        // Fetch team members
        const membersResponse = await fetch(`${API_BASE_URL}/employees/list/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!membersResponse.ok) {
          throw new Error('Failed to fetch employees');
        }

        const membersData = await membersResponse.json();
        setTeamMembers(membersData.results || membersData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        alert('Failed to load task details. Please try again.');
        navigate('/tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, accessToken, refreshAccessToken, API_BASE_URL, navigate]);

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

    setSubmitting(true);

    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) {
        alert('Session expired. Please login again.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assigned_to: parseInt(formData.assignTo, 10),
        priority: formData.priority,
        status: formData.status,
        deadline: formData.deadline,
      };

      const response = await fetch(`${API_BASE_URL}/tasks/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data) {
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
        throw new Error(data.detail || 'Task update failed');
      }

      alert('Task updated successfully!');
      navigate(`/tasks/${id}`);
    } catch (error) {
      console.error('Error updating task:', error);
      alert(error.message || 'Failed to update task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle field change
  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600 font-medium">Loading task details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/tasks/${id}`)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors duration-200"
          disabled={submitting}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Task</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Task</h1>
          <p className="text-slate-600">Update the task details below</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 space-y-8">
              {/* Task Form Fields */}
              <TaskFormFields
                formData={formData}
                errors={errors}
                teamMembers={teamMembers}
                onFieldChange={handleFieldChange}
                disabled={submitting}
                isDropdownOpen={isDropdownOpen}
                setIsDropdownOpen={setIsDropdownOpen}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              {/* Priority Selector */}
              <PrioritySelector
                value={formData.priority}
                onChange={(value) => handleFieldChange('priority', value)}
                disabled={submitting}
              />

              {/* Status Selector */}
              <StatusSelector
                value={formData.status}
                onChange={(value) => handleFieldChange('status', value)}
                disabled={submitting}
              />
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-8 py-6 flex items-center justify-end gap-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate(`/tasks/${id}`)}
                className="px-6 py-3 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                Cancel
              </button>
              {canAssignTasks && (
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Task'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
