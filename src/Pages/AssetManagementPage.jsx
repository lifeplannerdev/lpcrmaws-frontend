import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import {
  Monitor,
  Plus,
  X,
  User,
  Edit,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Filter
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AssetManagementPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assetCategories, setAssetCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [locationSummaries, setLocationSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState(user?.company || 'LP');
  const [viewMode, setViewMode] = useState('list');
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    serial_number: '',
    provider: '',
    primary_sim: '',
    secondary_sim: '',
    assigned_to: '',
    assigned_location: '',
    branch: '',
    purchase_date: '',
    notes: '',
  });

  const [locationFormData, setLocationFormData] = useState({ name: '', branch: '' });
  const [branchFormData, setBranchFormData] = useState({ name: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [fileToUpload, setFileToUpload] = useState(null);

  const [errors, setErrors] = useState({});
  const { hasPermission } = usePermissions();
  const canManageAssets = hasPermission('assets:create') || hasPermission('assets:edit_any') || hasPermission('assets:edit_tenant') || hasPermission('assets:edit_own');



  const assetTypeOptions = ['Mobiles', 'Monitors', 'PC', 'Keyboard', 'Mouse', 'Laptops', 'SIM Card'];

  const fetchWithAuth = async (url, options = {}) => {
    try {
      let token = accessToken;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      });

      if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) throw new Error('Unable to refresh token');

        // Modify headers for retry
        const retryHeaders = { ...options.headers };
        if (retryHeaders.Authorization) {
          retryHeaders.Authorization = `Bearer ${token}`;
        }
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        return await retryResponse.json();
      }

      if (!response.ok) {
        if (response.status !== 204) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return {};
      }

      return response.status !== 204 ? await response.json() : {};
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/staffs/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setEmployees(data.results || data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/locations/?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setLocations(data.results || data || []);
    } catch (err) { console.error('Error fetching locations:', err); setLocations([]); }
  };

  const fetchLocationSummaries = async () => {
    try {
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/locations/summary/?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setLocationSummaries(data || []);
    } catch (err) { console.error('Error fetching location summaries:', err); setLocationSummaries([]); }
  };

  const fetchCategories = async () => {
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/asset-categories/`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setAssetCategories(data.results || data || []);
    } catch (err) { console.error('Error fetching categories:', err); setAssetCategories([]); }
  };

  const fetchBranches = async () => {
    try {
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/hr-branches/?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setBranches(data.results || data || []);
    } catch (err) { console.error('Error fetching branches:', err); setBranches([]); }
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/assets/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setAssets(data.results || data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchAssets();
      fetchEmployees();
      fetchLocations();
      fetchLocationSummaries();
      fetchCategories();
      fetchBranches();
    }
  }, [accessToken, companyFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSIMChange = (e) => {
    const { name, value } = e.target;
    if (value) {
      const otherMobile = assets.find(a => (a.primary_sim === parseInt(value) || a.secondary_sim === parseInt(value)) && a.id !== editingAsset?.id);
      if (otherMobile) {
        if (!window.confirm(`This SIM is currently in '${otherMobile.name}'. Do you want to move it?`)) {
          return;
        }
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Asset Name is required';
    if (!formData.category) newErrors.category = 'Asset Category is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const url = editingAsset
        ? `${API_BASE_URL}/assets/${editingAsset.id}/`
        : `${API_BASE_URL}/assets/`;

      const method = editingAsset ? 'PUT' : 'POST';

      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('category', formData.category);
      if (formData.serial_number) formDataObj.append('serial_number', formData.serial_number);
      formDataObj.append('company', companyFilter);

      if (formData.provider) formDataObj.append('provider', formData.provider);
      if (formData.primary_sim) formDataObj.append('primary_sim', formData.primary_sim);
      else if (editingAsset && editingAsset.primary_sim) formDataObj.append('primary_sim', '');
      
      if (formData.secondary_sim) formDataObj.append('secondary_sim', formData.secondary_sim);
      else if (editingAsset && editingAsset.secondary_sim) formDataObj.append('secondary_sim', '');

      if (formData.assigned_to) {
          formDataObj.append('assigned_to', formData.assigned_to);
      } else if (editingAsset && editingAsset.assigned_to) {
          formDataObj.append('assigned_to', '');
      }
      if (formData.assigned_location) {
          formDataObj.append('assigned_location', formData.assigned_location);
      } else if (editingAsset && editingAsset.assigned_location) {
          formDataObj.append('assigned_location', '');
      }

      if (formData.purchase_date) formDataObj.append('purchase_date', formData.purchase_date);
      if (formData.notes) formDataObj.append('notes', formData.notes);
      
      if (fileToUpload) {
        formDataObj.append('attachment', fileToUpload);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataObj,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save asset');
      }

      setShowModal(false);
      setEditingAsset(null);
      setFileToUpload(null);
      setFormData({
        name: '',
        category: '',
        serial_number: '',
        provider: '',
        primary_sim: '',
        secondary_sim: '',
        assigned_to: '',
        assigned_location: '',
        branch: '',
        purchase_date: '',
        notes: '',
      });
      setErrors({});
      fetchAssets();
    } catch (err) {
      console.error('Error saving asset:', err);
      setErrors({ submit: err.message || 'Failed to save asset' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (!locationFormData.name.trim()) return;
    setSubmitting(true);
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/locations/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: locationFormData.name,
          company: companyFilter,
          branch: locationFormData.branch || null
        })
      });
      if (!response.ok) throw new Error('Failed to save location');
      setShowLocationModal(false);
      setLocationFormData({ name: '', branch: '' });
      fetchLocations();
      fetchLocationSummaries();
    } catch (err) {
      console.error(err);
      alert('Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBranchSubmit = async () => {
    if (!branchFormData.name.trim()) return;
    setSubmitting(true);
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/hr-branches/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: branchFormData.name,
          company: companyFilter
        })
      });
      if (!response.ok) throw new Error('Failed to save branch');
      setShowBranchModal(false);
      setBranchFormData({ name: '' });
      fetchBranches();
    } catch (err) {
      console.error(err);
      alert('Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name.trim()) return;
    setSubmitting(true);
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/asset-categories/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: categoryFormData.name })
      });
      if (!response.ok) throw new Error('Failed to save category');
      setShowCategoryModal(false);
      setCategoryFormData({ name: '' });
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category || '',
      serial_number: asset.serial_number || '',
      provider: asset.provider || '',
      primary_sim: asset.primary_sim || '',
      secondary_sim: asset.secondary_sim || '',
      assigned_to: asset.assigned_to || '',
      assigned_location: asset.assigned_location || '',
      branch: asset.branch || '',
      purchase_date: asset.purchase_date || '',
      notes: asset.notes || '',
    });
    setFileToUpload(null);
    setShowModal(true);
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      const token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/assets/${assetId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      fetchAssets();
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Failed to delete asset');
    }
  };

  const getEmployeeName = (userId) => {
    if (!userId) return 'Unassigned';
    const employee = employees.find(e => e.id === userId);
    return employee ? (employee.full_name || employee.username) : 'Unknown';
  };

  const filteredAssets = assets.filter(asset => {
    const matchesEmployee = !selectedEmployee || asset.assigned_to === parseInt(selectedEmployee);
    const matchesCategory = !selectedCategory || asset.category === parseInt(selectedCategory);
    const matchesSearch =
      !searchTerm ||
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.primary_sim_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.secondary_sim_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.provider?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEmployee && matchesCategory && matchesSearch;
  });

  const nonAdminEmployees = employees.filter(emp => !emp.role_names?.some(r => r.toLowerCase() === 'admin'));
  const potentialParents = assets.filter(a => a.id !== editingAsset?.id && a.asset_type !== 'SIM');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Asset Management
              </h1>
              <p className="text-gray-600 text-lg">
                Track and manage company assets and inventory
              </p>
            </div>
            <div className="flex items-center gap-4">
              <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
              {canManageAssets && (
                <button
                onClick={() => {
                  setEditingAsset(null);
                  setFormData({
                    name: '',
                    category: '',
                    serial_number: '',
                    provider: '',
                    primary_sim: '',
                    secondary_sim: '',
                    assigned_to: '',
                    assigned_location: '',
                    branch: '',
                    purchase_date: '',
                    notes: '',
                  });
                  setFileToUpload(null);
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Asset
              </button>
            )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex space-x-4">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              Asset List
            </button>
            <button onClick={() => setViewMode('space')} className={`px-4 py-2 rounded-xl font-medium transition-colors ${viewMode === 'space' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              Space Inventory
            </button>
          </div>
          <div className="flex gap-2">
            {canManageAssets && (
              <>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                >
                  Manage Categories
                </button>
                {viewMode === 'space' && (
                  <>
                    <button
                      onClick={() => setShowBranchModal(true)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Branch
                    </button>
                    <button
                      onClick={() => setShowLocationModal(true)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Location
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {viewMode === 'list' && (
          <>
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
              >
                <option value="">All Categories</option>
                {assetCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Assigned Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
              >
                <option value="">All Employees</option>
                {nonAdminEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name || emp.username || `Employee #${emp.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Assets List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Monitor className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategory || selectedEmployee
                ? 'Try adjusting your filters.'
                : 'No assets have been added to this company yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${asset.assigned_to ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{asset.name}</h3>
                    <p className="text-sm text-gray-500">{asset.category_details?.name || 'Uncategorized'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${asset.assigned_to ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {asset.assigned_to ? 'Assigned' : 'Available'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {asset.serial_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">S/N:</span>
                      <span className="font-medium text-gray-800">{asset.serial_number}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><User className="w-4 h-4"/> Assigned:</span>
                    <span className="font-medium text-gray-800">{getEmployeeName(asset.assigned_to)}</span>
                  </div>
                  {asset.attachment_url && (
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-gray-500 flex items-center gap-1"><FileText className="w-4 h-4"/> Docs:</span>
                       <a href={asset.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">View File</a>
                     </div>
                  )}
                </div>

                {canManageAssets && (
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(asset)}
                      className="flex-1 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>
        )}

        {viewMode === 'space' && (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedBranchId('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedBranchId === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                All Branches
              </button>
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                    selectedBranchId === branch.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {branch.name}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locationSummaries
                .filter(loc => selectedBranchId === 'all' || loc.branch_id === selectedBranchId)
                .map(loc => (
                <div key={loc.id} onClick={() => setSelectedLocationId(loc.id)} className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{loc.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{loc.total_assets} Total Assets</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(loc.asset_counts).map(([cat, count]) => (
                    <span key={cat} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {locationSummaries.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                No locations found for this branch. Add locations in Space Management.
              </div>
            )}
          </div>
          </>
        )}

        {/* Location Detail Modal */}
        {selectedLocationId && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl my-8 relative p-6">
              <button onClick={() => setSelectedLocationId(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold mb-4">{locations.find(l => l.id === selectedLocationId)?.name} Details</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2 text-indigo-800 border-b pb-2">Room Fixtures & General Assets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assets.filter(a => a.assigned_location === selectedLocationId && !a.assigned_to).map(a => (
                  <div key={a.id} className="border border-gray-200 p-4 rounded-xl bg-gray-50 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900">{a.name}</p>
                      <p className="text-sm text-gray-500">{a.category_details?.name || 'Uncategorized'}</p>
                    </div>
                    {a.serial_number && <span className="text-xs text-gray-400 font-mono bg-white px-2 py-1 rounded">SN: {a.serial_number}</span>}
                  </div>
                ))}
                {assets.filter(a => a.assigned_location === selectedLocationId && !a.assigned_to).length === 0 && (
                  <p className="text-sm text-gray-400 col-span-2">No room fixtures assigned to this location.</p>
                )}
              </div>

              <h3 className="text-lg font-semibold mt-8 mb-2 text-indigo-800 border-b pb-2">Assigned People & Personal Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.find(l => l.id === selectedLocationId)?.assigned_staff?.map(emp => (
                  <div key={emp.id} className="border border-indigo-100 p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                        {emp.first_name?.[0] || emp.username?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assets.filter(a => a.assigned_to === emp.id).map(a => (
                        <span key={a.id} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-sm flex flex-col gap-0.5 shadow-sm">
                          <span className="font-medium text-indigo-900">{a.name}</span>
                          <span className="text-xs text-indigo-600">{a.category_details?.name} {a.primary_sim_details ? `(${a.primary_sim_details.name})` : ''}</span>
                        </span>
                      ))}
                      {assets.filter(a => a.assigned_to === emp.id).length === 0 && (
                        <span className="text-xs text-gray-400 italic">No assets assigned</span>
                      )}
                    </div>
                  </div>
                ))}
                {locations.find(l => l.id === selectedLocationId)?.assigned_staff?.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-2">No employees seated in this location.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] shadow-2xl flex flex-col relative">
              <div className="shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {errors.submit && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{errors.submit}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Asset Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. MacBook Pro M2"
                        className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Asset Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.category ? 'border-red-500' : 'border-gray-200'}`}
                      >
                        <option value="">-- Select Category --</option>
                        {assetCategories.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {assetCategories.find(c => c.id == formData.category)?.name === 'Mobiles' ? 'IMEI Number' : 'Serial Number'}
                      </label>
                      <input
                        type="text"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleInputChange}
                        placeholder={assetCategories.find(c => c.id == formData.category)?.name === 'Mobiles' ? "e.g. 351234567890123" : "ABC123XYZ"}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    {assetCategories.find(c => c.id == formData.category)?.name === 'SIM Card' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telecom Provider</label>
                        <input type="text" name="provider" value={formData.provider} onChange={handleInputChange} placeholder="e.g. Airtel, Jio" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                    )}

                    {assetCategories.find(c => c.id == formData.category)?.name === 'Mobiles' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary SIM</label>
                          <select name="primary_sim" value={formData.primary_sim} onChange={handleSIMChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                            <option value="">-- No SIM --</option>
                            {assets.filter(a => a.category_details?.name === 'SIM Card' && a.id !== editingAsset?.id).map(a => (
                              <option key={a.id} value={a.id}>{a.name} ({a.provider || 'Unknown'})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secondary SIM</label>
                          <select name="secondary_sim" value={formData.secondary_sim} onChange={handleSIMChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                            <option value="">-- No SIM --</option>
                            {assets.filter(a => a.category_details?.name === 'SIM Card' && a.id !== editingAsset?.id).map(a => (
                              <option key={a.id} value={a.id}>{a.name} ({a.provider || 'Unknown'})</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Assigned To (User)
                          </label>
                          <select
                            name="assigned_to"
                            value={formData.assigned_to}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (e.target.value) setFormData(prev => ({ ...prev, assigned_location: '' }));
                            }}
                            className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.assigned_to ? 'border-red-500' : 'border-gray-200'}`}
                          >
                            <option value="">-- Unassigned --</option>
                            {nonAdminEmployees.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name || emp.username || `Employee #${emp.id}`}
                              </option>
                            ))}
                          </select>
                          {errors.assigned_to && <p className="mt-1 text-sm text-red-500">{errors.assigned_to}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Assigned To (Branch)
                          </label>
                          <select
                            name="branch"
                            value={formData.branch}
                            onChange={(e) => {
                              handleInputChange(e);
                            }}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="">-- Unassigned --</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Assigned To (Location)
                          </label>
                          <select
                            name="assigned_location"
                            value={formData.assigned_location}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (e.target.value) setFormData(prev => ({ ...prev, assigned_to: '' }));
                            }}
                            className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.assigned_to ? 'border-red-500' : 'border-gray-200'}`}
                          >
                            <option value="">-- Unassigned --</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        name="purchase_date"
                        value={formData.purchase_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Attachment (Invoice/Photo)
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {editingAsset?.attachment_url && !fileToUpload && (
                        <p className="mt-2 text-sm text-gray-500">Current file: <a href={editingAsset.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Additional details..."
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                    {editingAsset ? 'Save Changes' : 'Add Asset'}
                  </button>
                </div>
            </div>
          </div>
        )}
        {/* Location Add Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] shadow-2xl flex flex-col relative">
              <div className="shrink-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Add Location</h2>
                <button onClick={() => setShowLocationModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location Name</label>
              <input
                type="text"
                placeholder="e.g. Server Room A"
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
              />
              
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
              <select
                value={locationFormData.branch}
                onChange={(e) => setLocationFormData({ ...locationFormData, branch: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-6"
              >
                <option value="">-- No Branch (Floating) --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              </div>
              <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl z-10">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLocationSubmit} 
                  disabled={submitting || !locationFormData.name.trim()} 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Add Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] shadow-2xl flex flex-col relative">
              <div className="shrink-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Existing Categories:</h3>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {assetCategories.map(c => (
                    <span key={c.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{c.name}</span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Keyboards"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              </div>
              <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl z-10">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCategorySubmit} 
                  disabled={submitting || !categoryFormData.name.trim()} 
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branch Add Modal */}
        {showBranchModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-3xl">
                <h2 className="text-xl font-bold text-gray-900">Add Branch</h2>
                <button onClick={() => setShowBranchModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kochi Office"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This branch will be created under the currently selected company filter: <span className="font-semibold text-gray-800">{companyFilter}</span>.
                </p>
              </div>
              <div className="shrink-0 p-6 border-t border-gray-100 bg-white rounded-b-3xl flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-50 border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBranchSubmit}
                  disabled={submitting || !branchFormData.name.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
