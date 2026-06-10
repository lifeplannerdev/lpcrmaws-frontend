import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Edit,
  UserCheck,
  UserX,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  MoreVertical,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadCSV, downloadPDF } from '../utils/exportUtils';
import Pagination from '../Components/common/Pagination';
import StaffPermissionsModal from '../Components/staffs/StaffPermissionsModal';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import { usePermissions } from '../context/PermissionsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StaffPage() {
  const navigate = useNavigate();
  const { user, accessToken, refreshAccessToken, loading: authLoading, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();

  const [staffMembers, setStaffMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // active, inactive, all
  const [companyFilter, setCompanyFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Auth fetch wrapper
  const authFetch = useCallback(
    async (url, options = {}, retry = true) => {
      if (!accessToken) throw new Error('No access token');

      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 401 && retry) {
        const newToken = await refreshAccessToken();
        if (!newToken) throw new Error('Session expired');
        return authFetch(url, options, false);
      }

      return res;
    },
    [accessToken, refreshAccessToken]
  );

  const fetchStaff = useCallback(
    async (page = 1, search = '', team = '', branch = '', status = 'active', company = '') => {
      if (!accessToken) return;

      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (team && team !== 'all') queryParams.append('team', team);
        if (branch && branch !== 'all') queryParams.append('branch_id', branch);
        if (status && status !== 'all') queryParams.append('status', status);
        if (company) queryParams.append('company', company);
        queryParams.append('page', page);
        queryParams.append('page_size', '50'); // Request 50 items per page

        const res = await authFetch(`${API_BASE_URL}/staff/?${queryParams.toString()}`);
        const data = await res.json();

        const mappedStaff = data.results
          .map((staff) => ({
            id: staff.id,
            name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.username,
            role: staff.role_names?.length 
              ? staff.role_names.join(', ')
              : 'Unassigned',
            department: staff.team || 'Unassigned',
            email: staff.email,
            phone: staff.phone,
            office_phone: staff.office_phone,
            personal_phone: staff.personal_phone,
            location: staff.location,
            status: staff.is_on_leave ? 'on_leave' : (staff.is_active ? 'active' : 'inactive'),
            joinDate: new Date(staff.date_joined).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }),
            // Professional initials-based avatar
            initials: `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || staff.username?.[0] || '?'}`.toUpperCase(),
            permissions: staff.permissions || [],
          }))
          // Filter out Admin roles
          .filter((staff) => {
            const hasAdminRole = staff.role_names?.some(r => r.toLowerCase() === 'admin');
            return !hasAdminRole;
          });

        setStaffMembers(mappedStaff);
        setPagination({
          count: data.count,
          next: data.next,
          previous: data.previous,
          currentPage: page,
        });
      } catch (err) {
        console.error('Failed to load staff:', err);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, authFetch]
  );


  useEffect(() => {
    if (authLoading || !accessToken) return;
    
    // Fetch branches
    const fetchBranches = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/branches/`);
        const data = await res.json();
        setBranches(data || []);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();

    fetchStaff(1, searchTerm, filterDepartment, filterBranch, filterStatus, companyFilter);
  }, [authLoading, accessToken, filterDepartment, filterBranch, filterStatus, companyFilter]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authLoading && accessToken) {
        fetchStaff(1, searchTerm, filterDepartment, filterBranch, filterStatus, companyFilter);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filterDepartment, filterBranch, filterStatus, companyFilter, accessToken, authLoading]);


  // Departments for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set(staffMembers.map((s) => s.department));
    return Array.from(depts).filter((d) => d !== 'Unassigned');
  }, [staffMembers]);

  // Stats cards
  const stats = useMemo(() => {
    const activeCount = staffMembers.filter((s) => s.status === 'active').length;
    const inactiveCount = staffMembers.filter((s) => s.status === 'inactive').length;
    const onLeaveCount = staffMembers.filter((s) => s.status === 'on_leave').length;

    return [
      { label: 'Total Staff', value: pagination.count.toString(), color: 'from-violet-500 to-purple-600', icon: Users, bgIcon: 'bg-violet-100', iconColor: 'text-violet-600' },
      { label: 'Active', value: activeCount.toString(), color: 'from-emerald-500 to-green-600', icon: CheckCircle, bgIcon: 'bg-emerald-100', iconColor: 'text-emerald-600' },
      { label: 'On Leave', value: onLeaveCount.toString(), color: 'from-amber-500 to-orange-600', icon: Clock, bgIcon: 'bg-amber-100', iconColor: 'text-amber-600' },
      { label: 'Inactive', value: inactiveCount.toString(), color: 'from-rose-500 to-red-600', icon: XCircle, bgIcon: 'bg-rose-100', iconColor: 'text-rose-600' },
    ];
  }, [staffMembers, pagination.count]);

  // Pagination handlers
  const handlePageClick = (page) => {
    fetchStaff(page, searchTerm, filterDepartment, filterBranch, filterStatus, companyFilter);
  };

  // Helper function to get gradient color based on name
  const getAvatarGradient = (name) => {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-violet-500 to-fuchsia-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-slate-600 to-gray-700',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const handleExportCSV = () => {
    const data = staffMembers.map(s => ({
      Name: s.name,
      Email: s.email,
      Phone: s.phone,
      Role: s.role,
      Department: s.department,
      Status: s.status,
      'Join Date': s.joinDate
    }));
    downloadCSV(data, 'staff_export.csv');
  };

  const handleExportPDF = () => {
    const el = document.getElementById('staff-exportable-view');
    if (el) downloadPDF(el, 'staff_export.pdf');
  };

  if (authLoading) return <div className="p-10 text-center">Checking session…</div>;

  const totalPages = Math.ceil(pagination.count / 50);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Gradient */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Staff Management
              </h1>
              <p className="text-slate-600 mt-2 text-lg">Manage your team members and their roles</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                PDF
              </button>
              <button
                onClick={() => navigate('/staff/create')}
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                Add Staff Member
              </button>
            </div>
          </div>
        </div>

        {/* Company Switcher */}
        <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />

        {/* Modern Stats Cards with Gradient */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-4xl font-bold text-slate-900 mt-3">{stat.value}</h3>
                    </div>
                    <div className={`${stat.bgIcon} w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={stat.iconColor} size={28} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All Staff' },
              { id: 'active', label: 'Active' },
              { id: 'on_leave', label: 'On Leave' },
              { id: 'inactive', label: 'Inactive' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilterStatus(tab.id); }}
                className={`
                  whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${filterStatus === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search by name, role, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 text-slate-700"
              />
            </div>

            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={20} />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="appearance-none pl-12 pr-10 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 text-slate-700 font-medium bg-white cursor-pointer min-w-[200px]"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={20} />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="appearance-none pl-12 pr-10 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 text-slate-700 font-medium bg-white cursor-pointer min-w-[200px]"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading / No Staff */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-slate-500 mt-4 text-lg">Loading staff members…</p>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-md">
            <Users size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">No staff members found</p>
          </div>
        ) : (
          <div id="staff-exportable-view">
            {/* Staff Cards - With Professional Initials Avatar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-white/50 hover:border-indigo-300/50 transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Professional Initials Avatar */}
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarGradient(staff.name)} flex items-center justify-center ring-2 ring-offset-2 ring-slate-100 shadow-lg`}>
                          <span className="text-white text-xl font-bold">{staff.initials}</span>
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-900">{staff.name}</h3>
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                            {staff.role}
                          </span>
                        </div>
                      </div>

                      {staff.status === 'active' ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <UserCheck size={12} /> Active
                        </span>
                      ) : staff.status === 'on_leave' ? (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Clock size={12} /> On Leave
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <UserX size={12} /> Inactive
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                        {staff.department}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} className="text-gray-400" />
                        {staff.office_phone || staff.phone || staff.personal_phone || 'N/A'}
                        {(staff.office_phone || staff.phone) ? (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Company</span>
                        ) : staff.personal_phone ? (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Personal</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{staff.location}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">Joined: {staff.joinDate}</div>

                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => navigate(`/staff/view/${staff.id}`)}
                        className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                      >
                        <UserCheck size={16} /> View
                      </button>
                      {(hasPermission('staff:edit_any') || hasPermission('staff:edit_tenant')) && (
                        <button
                          onClick={() => navigate(`/staff/edit/${staff.id}`)}
                          className="flex-1 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                        >
                          <Edit size={16} /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Only show pagination if there are more than 50 staff members */}
            {pagination.count > 50 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={totalPages}
                onPageChange={handlePageClick}
                className="mt-8"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
