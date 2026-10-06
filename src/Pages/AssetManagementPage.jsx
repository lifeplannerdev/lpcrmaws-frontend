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
  Filter,
  Building,
  Building2,
  Layers,
  Box,
  Package,
  Users,
  ChevronRight,
  MapPin,
  FolderTree
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
  const [branchSearchTerm, setBranchSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    serial_number: '',
    provider: '',
    assigned_to: '',
    assigned_location: '',
    branch: '',
    purchase_date: '',
    notes: '',
  });

  const [locationFormData, setLocationFormData] = useState({ name: '', branch: '', assigned_to: '' });
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
      const params = new URLSearchParams({ is_active: 'true' });
      if (companyFilter) params.set('company', companyFilter);
      const response = await fetch(`${API_BASE_URL}/staffs/?${params}`, {
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

  useEffect(() => {
    if (locations.length > 0) {
      const exists = locations.some(l => l.id === selectedLocationId);
      if (!exists) {
        setSelectedLocationId(locations[0].id);
      }
    } else {
      setSelectedLocationId(null);
    }
  }, [locations, selectedLocationId]);

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

      if (formData.branch) {
          formDataObj.append('branch', formData.branch);
      } else if (editingAsset && editingAsset.branch) {
          formDataObj.append('branch', '');
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
        assigned_to: '',
        assigned_location: '',
        branch: '',
        purchase_date: '',
        notes: '',
      });
      setErrors({});
      fetchAssets();
      fetchLocations();
      fetchLocationSummaries();
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
          branch: locationFormData.branch || null,
          assigned_to: locationFormData.assigned_to || null
        })
      });
      if (!response.ok) throw new Error('Failed to save cabin');
      const newCabin = await response.json();
      setShowLocationModal(false);
      setLocationFormData({ name: '', branch: '', assigned_to: '' });
      if (newCabin && newCabin.id) {
        setSelectedLocationId(newCabin.id);
      }
      fetchLocations();
      fetchLocationSummaries();
    } catch (err) {
      console.error(err);
      alert('Failed to save cabin');
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
      fetchLocations();
      fetchLocationSummaries();
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Failed to delete asset');
    }
  };

  const handleDeleteCabin = async (cabinId) => {
    const cabin = locations.find(l => l.id === cabinId);
    if (!window.confirm(`Are you sure you want to delete cabin "${cabin?.name || cabinId}"?`)) {
      return;
    }
    try {
      const token = accessToken || await refreshAccessToken();
      const response = await fetch(`${API_BASE_URL}/locations/${cabinId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete cabin');
      setSelectedLocationId(null);
      fetchAssets();
      fetchLocations();
      fetchLocationSummaries();
    } catch (err) {
      console.error('Error deleting cabin:', err);
      alert('Failed to delete cabin');
    }
  };

  const getCabinTotalAssetCount = (cabinId) => {
    const cabin = locations.find(l => Number(l.id) === Number(cabinId));
    if (!cabin) return 0;
    const generalCount = assets.filter(a => Number(a.assigned_location) === Number(cabinId) && !a.assigned_to).length;
    const cabinOccupantIds = new Set();
    if (cabin.assigned_to) cabinOccupantIds.add(Number(cabin.assigned_to));
    employees.forEach(emp => {
      if (emp.location && cabin.name && (emp.location.trim().toLowerCase() === cabin.name.trim().toLowerCase() || String(emp.location).trim() === String(cabin.id))) {
        cabinOccupantIds.add(Number(emp.id));
      }
    });
    const memberAssetCount = assets.filter(a => {
      if (!a.assigned_to) return false;
      if (Number(a.assigned_location) === Number(cabinId)) return true;
      if (!a.assigned_location && cabinOccupantIds.has(Number(a.assigned_to))) return true;
      return false;
    }).length;
    return generalCount + memberAssetCount;
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
      asset.category_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.provider?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEmployee && matchesCategory && matchesSearch;
  });

  const nonAdminEmployees = employees.filter(emp => !emp.role_names?.some(r => r.toLowerCase() === 'admin'));

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
              Space Management (Hierarchy)
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
                      <Plus className="w-4 h-4" /> Add Cabin
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
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Space Management Hierarchy</h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {branches.length} Branches • {locations.length} Cabins
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canManageAssets && (
                  <>
                    <button
                      onClick={() => setShowBranchModal(true)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Branch
                    </button>
                    <button
                      onClick={() => setShowLocationModal(true)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Cabin
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Two-Level Hierarchy View (Branch -> Cabin) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Level 1 & 2: Hierarchy Navigator (Branch -> Cabin) */}
              <div className="lg:col-span-4 bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Branches & Cabins
                  </h3>
                  <span className="text-xs font-semibold text-gray-400">Select Cabin</span>
                </div>

                {/* Branch / Cabin Search & Branch Filter */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search branches or cabins..."
                      value={branchSearchTerm}
                      onChange={(e) => setBranchSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  {branches.length > 1 && (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-gray-700"
                    >
                      <option value="all">All Branches ({branches.length})</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                  {branches.length === 0 && locations.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      No branches or cabins defined. Add a branch or cabin to begin.
                    </div>
                  ) : (
                    <>
                      {branches
                        .filter(branch => selectedBranchId === 'all' || String(branch.id) === String(selectedBranchId))
                        .filter(branch => {
                          if (!branchSearchTerm.trim()) return true;
                          const term = branchSearchTerm.toLowerCase();
                          const branchMatches = branch.name?.toLowerCase().includes(term);
                          const cabinMatches = locations.some(l => l.branch === branch.id && l.name?.toLowerCase().includes(term));
                          return branchMatches || cabinMatches;
                        })
                        .map(branch => {
                          const branchCabins = locations.filter(l => 
                            l.branch === branch.id && 
                            (!branchSearchTerm.trim() || l.name?.toLowerCase().includes(branchSearchTerm.toLowerCase()) || branch.name?.toLowerCase().includes(branchSearchTerm.toLowerCase()))
                          );
                        return (
                          <div key={branch.id} className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3">
                            {/* Level 1: Branch */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-indigo-600" />
                                <span className="font-bold text-gray-900 text-sm">{branch.name}</span>
                              </div>
                              <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {branchCabins.length} {branchCabins.length === 1 ? 'Cabin' : 'Cabins'}
                              </span>
                            </div>

                            {/* Level 2: Cabins under this Branch */}
                            <div className="pl-4 border-l-2 border-indigo-200/60 ml-2 space-y-1.5 mt-2">
                              {branchCabins.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-1">No cabins in this branch</p>
                              ) : (
                                branchCabins.map(cabin => {
                                  const cabinAssetCount = getCabinTotalAssetCount(cabin.id);
                                  const isSelected = Number(selectedLocationId) === Number(cabin.id);
                                  return (
                                    <button
                                      key={cabin.id}
                                      onClick={() => setSelectedLocationId(cabin.id)}
                                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs font-medium ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white shadow-md'
                                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                                        <span className="truncate font-semibold">{cabin.name}</span>
                                      </div>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {cabinAssetCount} Assets
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Cabins without branch */}
                      {(selectedBranchId === 'all') && locations.filter(l => !l.branch && (!branchSearchTerm.trim() || l.name?.toLowerCase().includes(branchSearchTerm.toLowerCase()))).length > 0 && (
                        <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-gray-600 text-sm">Other / Floating Cabins</span>
                            </div>
                            <span className="text-[11px] font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              {locations.filter(l => !l.branch && (!branchSearchTerm.trim() || l.name?.toLowerCase().includes(branchSearchTerm.toLowerCase()))).length}
                            </span>
                          </div>
                          <div className="pl-4 border-l-2 border-gray-200 ml-2 space-y-1.5 mt-2">
                            {locations.filter(l => !l.branch && (!branchSearchTerm.trim() || l.name?.toLowerCase().includes(branchSearchTerm.toLowerCase()))).map(cabin => {
                              const cabinAssetCount = getCabinTotalAssetCount(cabin.id);
                              const isSelected = Number(selectedLocationId) === Number(cabin.id);
                              return (
                                <button
                                  key={cabin.id}
                                  onClick={() => setSelectedLocationId(cabin.id)}
                                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs font-medium ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                                    <span className="truncate font-semibold">{cabin.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {cabinAssetCount} Assets
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Selected Cabin Detail Area */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {(() => {
                  const selectedCabin = locations.find(l => Number(l.id) === Number(selectedLocationId));
                  if (!selectedCabin) {
                    return (
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
                        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-gray-700 mb-1">Select a Cabin</h4>
                        <p className="text-sm text-gray-400">
                          Choose a cabin from the hierarchy on the left to view its members, assigned assets, and general assets.
                        </p>
                      </div>
                    );
                  }

                  const cabinBranch = branches.find(b => Number(b.id) === Number(selectedCabin.branch));
                  const cabinManager = employees.find(e => Number(e.id) === Number(selectedCabin.assigned_to));

                  // General assets assigned directly to this cabin (no assigned_to)
                  const generalAssets = assets.filter(a => Number(a.assigned_location) === Number(selectedCabin.id) && !a.assigned_to);

                  // Personal assets placed in this cabin
                  const personalAssetsInCabin = assets.filter(a => Number(a.assigned_location) === Number(selectedCabin.id) && a.assigned_to);
                  
                  // Occupant employees:
                  const memberMap = new Map();

                  employees.forEach(emp => {
                    const matchesLocation = emp.location && selectedCabin.name &&
                      (emp.location.trim().toLowerCase() === selectedCabin.name.trim().toLowerCase() || String(emp.location).trim() === String(selectedCabin.id));
                    const isManager = selectedCabin.assigned_to && Number(emp.id) === Number(selectedCabin.assigned_to);
                    const hasAssetInCabin = personalAssetsInCabin.some(a => Number(a.assigned_to) === Number(emp.id));

                    if (matchesLocation || isManager || hasAssetInCabin) {
                      // Associated assets: either explicitly placed in this cabin, or assigned directly to the occupant without another cabin location
                      const memberAssets = assets.filter(a => 
                        Number(a.assigned_to) === Number(emp.id) && 
                        (Number(a.assigned_location) === Number(selectedCabin.id) || (!a.assigned_location && (matchesLocation || isManager)))
                      );

                      memberMap.set(emp.id, {
                        ...emp,
                        isManager,
                        assetsInCabin: memberAssets,
                        allPersonalAssets: assets.filter(a => Number(a.assigned_to) === Number(emp.id)),
                      });
                    }
                  });

                  personalAssetsInCabin.forEach(a => {
                    if (a.assigned_to && !memberMap.has(a.assigned_to)) {
                      const empDetails = a.assigned_to_details || { id: a.assigned_to, username: `User #${a.assigned_to}` };
                      const memberAssets = assets.filter(item => 
                        Number(item.assigned_to) === Number(a.assigned_to) && 
                        Number(item.assigned_location) === Number(selectedCabin.id)
                      );
                      memberMap.set(a.assigned_to, {
                        ...empDetails,
                        isManager: Number(selectedCabin.assigned_to) === Number(a.assigned_to),
                        assetsInCabin: memberAssets,
                        allPersonalAssets: assets.filter(item => Number(item.assigned_to) === Number(a.assigned_to)),
                      });
                    }
                  });

                  const cabinMembers = Array.from(memberMap.values());

                  return (
                    <>
                      {/* Cabin Header Banner */}
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
                              <span>{cabinBranch ? cabinBranch.name : 'Branch'}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                              <span>{selectedCabin.name}</span>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                              {selectedCabin.name}
                            </h2>
                            {cabinManager && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                Space Manager: <span className="font-semibold text-gray-800">{cabinManager.full_name || cabinManager.username}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {canManageAssets && (
                              <>
                                <button
                                  onClick={() => handleDeleteCabin(selectedCabin.id)}
                                  className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
                                  title="Delete this cabin"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete Cabin
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAsset(null);
                                    setFormData({
                                      name: '',
                                      category: '',
                                      serial_number: '',
                                      provider: '',
                                      assigned_to: '',
                                      assigned_location: selectedCabin.id,
                                      branch: selectedCabin.branch || '',
                                      purchase_date: '',
                                      notes: '',
                                    });
                                    setFileToUpload(null);
                                    setShowModal(true);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                  <Plus className="w-4 h-4" /> Add Asset to Cabin
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                          <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/50">
                            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Total Assets</span>
                            <span className="text-xl font-black text-indigo-950">
                              {generalAssets.length + cabinMembers.reduce((acc, m) => acc + (m.assetsInCabin?.length || 0), 0)}
                            </span>
                          </div>
                          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100/50">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Cabin Members</span>
                            <span className="text-xl font-black text-blue-950">
                              {cabinMembers.length}
                            </span>
                          </div>
                          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100/50">
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">General Assets</span>
                            <span className="text-xl font-black text-emerald-950">
                              {generalAssets.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 1: Cabin Members & Associated Assets */}
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">Cabin Members</h3>
                              <p className="text-xs text-gray-500">Employees in this cabin and their assigned assets</p>
                            </div>
                          </div>
                          <span className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full border border-blue-100">
                            {cabinMembers.length} {cabinMembers.length === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>

                        {cabinMembers.length === 0 ? (
                          <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                            <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-500">No employees currently assigned to this cabin.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cabinMembers.map(member => (
                              <div key={member.id} className="border border-gray-200/80 rounded-xl p-4 bg-white shadow-xs flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                      {member.first_name?.[0] || member.username?.[0] || '?'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <h4 className="font-bold text-gray-900 text-sm truncate">
                                          {member.first_name ? `${member.first_name} ${member.last_name || ''}` : member.username}
                                        </h4>
                                        {member.isManager && (
                                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                            Manager
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                    </div>
                                  </div>

                                  {/* Member's Associated Assets */}
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                      Associated Assets ({member.assetsInCabin.length}):
                                    </span>
                                    {member.assetsInCabin.length === 0 ? (
                                      <p className="text-xs text-gray-400 italic">No assets currently associated with this member.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {member.assetsInCabin.map(a => (
                                          <span
                                            key={a.id}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex flex-col"
                                          >
                                            <span className="font-semibold">{a.name}</span>
                                            <span className="text-[10px] text-indigo-600 font-medium">
                                              {a.classification || a.category_details?.name || 'Asset'}
                                              {a.serial_number ? ` • S/N: ${a.serial_number}` : ''}
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: General Cabin Assets (Assigned Directly to Cabin) */}
                      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Box className="w-5 h-5 text-emerald-600" />
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">General Cabin Assets</h3>
                              <p className="text-xs text-gray-500">Shared fixtures and general assets assigned directly to this cabin</p>
                            </div>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1 rounded-full border border-emerald-100">
                            {generalAssets.length} {generalAssets.length === 1 ? 'General Asset' : 'General Assets'}
                          </span>
                        </div>

                        {generalAssets.length === 0 ? (
                          <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                            <Box className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-500">No general assets assigned directly to this cabin.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {generalAssets.map(a => (
                              <div key={a.id} className="border border-gray-200/80 rounded-xl p-3.5 bg-white shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
                                <div>
                                  <div className="flex justify-between items-start mb-1.5">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{a.name}</h4>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                                      General
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs text-gray-500">
                                    <p className="text-indigo-600 font-semibold">{a.classification || a.category_details?.name || 'Uncategorized'}</p>
                                    {a.serial_number && (
                                      <p className="font-mono text-gray-600 text-[11px]">S/N: {a.serial_number}</p>
                                    )}
                                    {a.provider && (
                                      <p className="text-gray-600 text-[11px]">Provider: {a.provider}</p>
                                    )}
                                    {a.attachment_url && (
                                      <a 
                                        href={a.attachment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-emerald-600 hover:text-emerald-800 text-[11px] font-semibold flex items-center gap-1 pt-1"
                                      >
                                        <FileText className="w-3 h-3" /> View Document
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {canManageAssets && (
                                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                                    <button
                                      onClick={() => handleEdit(a)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                    >
                                      <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(a.id)}
                                      className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 ml-auto"
                                    >
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
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

                    {['SIM Card', 'SIM'].includes(assetCategories.find(c => c.id == formData.category)?.name) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telecom Provider</label>
                        <input type="text" name="provider" value={formData.provider} onChange={handleInputChange} placeholder="e.g. Airtel, Jio" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                    )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Assigned To (Employee)
                        </label>
                        <select
                          name="assigned_to"
                          value={formData.assigned_to}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">-- Unassigned (General Asset) --</option>
                          {nonAdminEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name || emp.username || `Employee #${emp.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Branch
                        </label>
                        <select
                          name="branch"
                          value={formData.branch}
                          onChange={(e) => {
                            handleInputChange(e);
                            setFormData(prev => ({ ...prev, assigned_location: '' }));
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
                          Assigned Cabin / Space
                        </label>
                        <select
                          name="assigned_location"
                          value={formData.assigned_location}
                          onChange={(e) => {
                            const selectedLocId = e.target.value;
                            const locObj = locations.find(l => String(l.id) === String(selectedLocId));
                            setFormData(prev => ({
                              ...prev,
                              assigned_location: selectedLocId,
                              branch: locObj?.branch ? String(locObj.branch) : prev.branch
                            }));
                          }}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">-- None / Floating --</option>
                          {(formData.branch 
                            ? locations.filter(loc => loc.branch === parseInt(formData.branch))
                            : locations
                          ).map(loc => {
                            const bName = branches.find(b => b.id === loc.branch)?.name;
                            return (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} {bName ? `(${bName})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

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
        {/* Cabin / Space Add Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] shadow-2xl flex flex-col relative">
              <div className="shrink-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-2xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Add Cabin / Space</h2>
                <button onClick={() => setShowLocationModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cabin / Space Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cabin 101, Meeting Room A"
                  value={locationFormData.name}
                  onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
                />
                
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
                <select
                  value={locationFormData.branch}
                  onChange={(e) => setLocationFormData({ ...locationFormData, branch: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
                >
                  <option value="">-- No Branch (Floating) --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cabin Manager / Lead (Optional)</label>
                <select
                  value={locationFormData.assigned_to}
                  onChange={(e) => setLocationFormData({ ...locationFormData, assigned_to: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-2"
                >
                  <option value="">-- No Manager Assigned --</option>
                  {nonAdminEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || emp.username || `Employee #${emp.id}`}</option>
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
                  {submitting ? 'Saving...' : 'Save Cabin / Space'}
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
