import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import {
  IndianRupee,
  Plus,
  X,
  Calendar,
  User,
  Edit,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  TrendingDown,
  Filter
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function PenaltyManagementPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [penalties, setPenalties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState(user?.company || 'LP');

  const [formData, setFormData] = useState({
    user: '',
    act: '',
    amount: '',
    month: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});
  const { hasPermission } = usePermissions();
  const canManagePenalties = hasPermission('penalties:edit_any');
  const generateMonthOptions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => ({
      value: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
      label: `${month} ${currentYear}`
    }));
  };

  const monthOptions = generateMonthOptions();

  const fetchWithAuth = async (url, options = {}) => {
    try {
      let token = accessToken;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) throw new Error('Unable to refresh token');

        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }

        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  // Fetch all employees (handle pagination)
  const fetchEmployees = async () => {
    try {
      console.log('🔍 Fetching employees from:', `${API_BASE_URL}/staffs/`);
      const data = await fetchWithAuth(`${API_BASE_URL}/staffs/`);
      
      console.log('📦 Raw API response:', data);
      
      // Handle the response structure
      let employeeList = [];
      if (data.results && Array.isArray(data.results)) {
        employeeList = data.results;
        console.log('✅ Found paginated results:', employeeList.length, 'employees');
      } else if (Array.isArray(data)) {
        employeeList = data;
        console.log('✅ Found direct array:', employeeList.length, 'employees');
      } else {
        console.error('❌ Unexpected data structure:', data);
        employeeList = [];
      }
      
      // Log first employee for debugging
      if (employeeList.length > 0) {
        console.log('👤 Sample employee:', employeeList[0]);
      } else {
        console.warn('⚠️ No employees found in response');
      }
      
      setEmployees(employeeList);
    } catch (err) {
      console.error('❌ Error fetching employees:', err);
      console.error('Error message:', err.message);
      setEmployees([]);
    }
  };

  // Fetch penalties
  const fetchPenalties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const data = await fetchWithAuth(`${API_BASE_URL}/penalties/?${params}`);
      console.log('Fetched penalties:', data);
      setPenalties(data.results || data || []);
    } catch (err) {
      console.error('Error fetching penalties:', err);
      setPenalties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchPenalties();
      fetchEmployees();
    }
  }, [accessToken, companyFilter]);

  // Calculate total penalty for filtered month
  const calculateTotalPenalty = () => {
    return filteredPenalties.reduce((sum, penalty) => {
      return sum + (parseFloat(penalty.amount) || 0);
    }, 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.user) {
      newErrors.user = 'Employee is required';
    }
    if (!formData.act.trim()) {
      newErrors.act = 'Act/Reason is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.month) {
      newErrors.month = 'Month is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const url = editingPenalty
        ? `${API_BASE_URL}/penalties/${editingPenalty.id}/`
        : `${API_BASE_URL}/penalties/`;

      const method = editingPenalty ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save penalty');
      }

      // Success
      setShowModal(false);
      setEditingPenalty(null);
      setFormData({
        user: '',
        act: '',
        amount: '',
        month: '',
        date: new Date().toISOString().split('T')[0]
      });
      setErrors({});
      fetchPenalties();
    } catch (err) {
      console.error('Error saving penalty:', err);
      setErrors({ submit: err.message || 'Failed to save penalty' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (penalty) => {
    setEditingPenalty(penalty);
    setFormData({
      user: penalty.user_id || penalty.user,
      act: penalty.act,
      amount: penalty.amount,
      month: penalty.month,
      date: penalty.date
    });
    setShowModal(true);
  };

  const handleDelete = async (penaltyId) => {
    if (!window.confirm('Are you sure you want to delete this penalty?')) {
      return;
    }

    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/penalties/${penaltyId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete penalty');
      }

      fetchPenalties();
    } catch (err) {
      console.error('Error deleting penalty:', err);
      alert('Failed to delete penalty');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMonth = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Get employee name by user ID
  const getEmployeeName = (userId) => {
    if (!userId) return 'Unknown';
    const employee = employees.find(e => e.id === userId || e.user === userId);
    if (!employee) return 'Unknown';
    // Use full_name from backend serializer
    return employee.full_name || employee.username || `Employee #${userId}`;
  };

  // Filter penalties
  const filteredPenalties = penalties.filter(penalty => {
    const matchesMonth = !selectedMonth || penalty.month === selectedMonth;
    const matchesEmployee = !selectedEmployee || penalty.user === parseInt(selectedEmployee);
    const matchesSearch =
      !searchTerm ||
      penalty.act?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployeeName(penalty.user).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesEmployee && matchesSearch;
  });

  const totalPenalty = calculateTotalPenalty();

  // Filter out ADMIN role from employee list for dropdowns
  const nonAdminEmployees = employees.filter(emp => emp.role !== 'ADMIN');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Penalty Management
              </h1>
              <p className="text-gray-600 text-lg">
                Track and manage employee penalties
              </p>
            </div>
            <div className="flex items-center gap-4">
              <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
              {canManagePenalties && (
                <button
                onClick={() => {
                  setEditingPenalty(null);
                  setFormData({
                    user: '',
                    act: '',
                    amount: '',
                    month: '',
                    date: new Date().toISOString().split('T')[0]
                  });
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Penalty
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Debug Info - Remove in production */}
        {employees.length === 0 && !loading && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 font-semibold">⚠️ No employees loaded. Check browser console for details.</p>
          </div>
        )}

        {/* Stats Card */}
        {selectedMonth && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 shadow-lg mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium mb-1">
                  Total Penalties for {formatMonth(selectedMonth)}
                </p>
                <p className="text-4xl font-bold">
                  ₹{totalPenalty.toFixed(2)}
                </p>
                <p className="text-indigo-100 text-sm mt-1">
                  {filteredPenalties.length} {filteredPenalties.length === 1 ? 'penalty' : 'penalties'} recorded
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <TrendingDown className="w-12 h-12" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Months</option>
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Employees</option>
                {nonAdminEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name || emp.username || `Employee #${emp.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by act or employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Penalties List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading penalties...</p>
            </div>
          </div>
        ) : filteredPenalties.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-md border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Penalties Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedMonth || selectedEmployee
                ? 'Try adjusting your filters'
                : 'No penalties have been recorded yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Act/Reason</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Month</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Date</th>
                      {canManagePenalties && (
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPenalties.map((penalty) => (
                      <tr key={penalty.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getEmployeeName(penalty.user).charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">
                              {getEmployeeName(penalty.user)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700">{penalty.act}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                            <IndianRupee className="w-4 h-4" />
                            {parseFloat(penalty.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700">{formatMonth(penalty.month)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(penalty.date)}</span>
                          </div>
                        </td>
                        {canManagePenalties && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(penalty)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(penalty.id)}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredPenalties.map((penalty) => (
                <div
                  key={penalty.id}
                  className="bg-white rounded-xl p-5 shadow-md border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {getEmployeeName(penalty.user).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {getEmployeeName(penalty.user)}
                        </p>
                        <p className="text-sm text-gray-500">{formatMonth(penalty.month)}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                      <IndianRupee className="w-4 h-4" />
                      {parseFloat(penalty.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Act/Reason</p>
                    <p className="text-gray-900">{penalty.act}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(penalty.date)}</span>
                    </div>
                    {canManagePenalties && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(penalty)}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(penalty.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingPenalty ? 'Edit Penalty' : 'Add New Penalty'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingPenalty(null);
                    setErrors({});
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                {errors.submit && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {errors.submit}
                  </div>
                )}

                <div className="space-y-5">
                  {/* Employee */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="user"
                      value={formData.user}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.user ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Employee</option>
                      {nonAdminEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name || emp.username || `Employee #${emp.id}`}
                        </option>
                      ))}
                    </select>
                    {errors.user && (
                      <p className="mt-1 text-sm text-red-500">{errors.user}</p>
                    )}
                  </div>

                  {/* Act/Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Act/Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="act"
                      value={formData.act}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe the reason for penalty..."
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.act ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.act && (
                      <p className="mt-1 text-sm text-red-500">{errors.act}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.amount ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                    )}
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.month ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Month</option>
                      {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.month && (
                      <p className="mt-1 text-sm text-red-500">{errors.month}</p>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-500">{errors.date}</p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-8 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPenalty(null);
                      setErrors({});
                    }}
                    disabled={submitting}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {editingPenalty ? 'Updating...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        {editingPenalty ? 'Update Penalty' : 'Add Penalty'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}