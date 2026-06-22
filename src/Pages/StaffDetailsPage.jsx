import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, CheckCircle, 
  XCircle, Laptop, Smartphone, Clock, Edit, ShieldAlert, ArrowLeft
} from 'lucide-react';
import StaffPermissionsModal from '../Components/staffs/StaffPermissionsModal';
import { Can, usePermissions } from '../context/PermissionsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StaffDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, refreshAccessToken, authLoading } = useAuth();
  
  const [staff, setStaff] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('profile'); // profile, assets
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canEditStaff = hasPermission('staff:edit_any') || hasPermission('staff:edit_tenant');

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

  const fetchStaffDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/staff/${id}/`);
      if (!res.ok) throw new Error('Failed to fetch staff details');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, authFetch]);

  const fetchTimelineEvents = useCallback(async () => {
    try {
      setTimelineLoading(true);
      const res = await authFetch(`${API_BASE_URL}/staff/${id}/asset-timeline/`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch timeline events', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [id, authFetch]);

  useEffect(() => {
    if (id && !authLoading) {
      fetchStaffDetails();
    }
  }, [id, authLoading, fetchStaffDetails]);

  useEffect(() => {
    if (activeTab === 'assets' && id && !authLoading) {
      fetchTimelineEvents();
    }
  }, [activeTab, id, authLoading, fetchTimelineEvents]);

  // If an asset updates, we may want to re-fetch staff details to update phone numbers
  const handleAssetUpdate = () => {
    fetchStaffDetails();
    fetchTimelineEvents();
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-violet-500 to-fuchsia-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
    ];
    const index = (name || '').charCodeAt(0) % gradients.length || 0;
    return gradients[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col">
        <p className="text-red-500 text-lg mb-4">{error || 'Staff not found'}</p>
        <button onClick={() => navigate('/staff')} className="text-indigo-600 underline">Back to Staff</button>
      </div>
    );
  }

  const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.username;
  const initials = `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || staff.username?.[0] || ''}`.toUpperCase();
  const primaryPhone = staff.office_phone || staff.phone || staff.personal_phone || 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/staff')}
          className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Staff List
        </button>

        {/* Header Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 transform transition-all duration-300">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 mb-6">
              <div className="flex items-end gap-6">
                <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${getAvatarGradient(fullName)} flex items-center justify-center ring-4 ring-white shadow-2xl`}>
                  <span className="text-white text-5xl font-bold">{initials}</span>
                </div>
                <div className="mb-2">
                  <h1 className="text-3xl font-extrabold text-slate-900">{fullName}</h1>
                  <p className="text-indigo-600 font-semibold mt-1">{(staff.role_names?.join(', ') || '').replace(/_/g, ' ').toUpperCase()}</p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex gap-3">
                {canEditStaff && (
                  <>
                    <button
                      onClick={() => setPermissionsModalOpen(true)}
                      className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm font-medium flex items-center gap-2"
                    >
                      <ShieldAlert size={18} /> Permissions
                    </button>
                    <button
                      onClick={() => navigate(`/staff/edit/${staff.id}`)}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 font-medium flex items-center gap-2"
                    >
                      <Edit size={18} /> Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-8 inline-flex">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Profile Info
          </button>
          <Can perform="assets:read_any">
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === 'assets' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Assets & Timeline
            </button>
          </Can>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-500">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <User size={22} className="text-indigo-500" />
                  Contact Information
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Primary Phone</p>
                      <p className="text-slate-900 font-semibold">{primaryPhone}</p>
                      <div className="flex gap-2 mt-1">
                        {staff.office_phone && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">Company: {staff.office_phone}</span>}
                        {staff.personal_phone && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">Personal: {staff.personal_phone}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Voxbay Information */}
                  {(staff.voxbay_number || staff.voxbay_extension) && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Voxbay Integration</p>
                        <p className="text-slate-900 font-semibold">
                          {staff.voxbay_extension ? `Ext: ${staff.voxbay_extension}` : 'No Extension'}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {staff.voxbay_number && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">Number: {staff.voxbay_number}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Email Address</p>
                      <p className="text-slate-900 font-semibold">{staff.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Location</p>
                      <p className="text-slate-900 font-semibold">{staff.location || 'N/A'}</p>
                      {staff.responsible_locations?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500 mb-1">Responsible Areas:</p>
                          <div className="flex flex-wrap gap-1">
                            {staff.responsible_locations.map(loc => (
                              <span key={loc.id} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                                {loc.name} {loc.branch ? `(${loc.branch})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Briefcase size={22} className="text-indigo-500" />
                  Work Details
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Department/Team</p>
                      <p className="text-slate-900 font-semibold mt-1">{staff.team || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Company</p>
                      <p className="text-slate-900 font-semibold mt-1">{staff.company}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Join Date</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar size={16} className="text-slate-400" />
                        <p className="text-slate-900 font-semibold">{staff.join_date || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Status</p>
                      <div className="mt-1">
                        {staff.is_active ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <CheckCircle size={14} /> ACTIVE
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <XCircle size={14} /> INACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Assigned Assets List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Laptop size={22} className="text-indigo-500" />
                      Assigned Assets
                    </h3>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                      {staff.assets?.length || 0} Total
                    </span>
                  </div>

                  {staff.assets?.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Laptop size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium">No assets currently assigned to this staff member.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Mobile Phones */}
                      {staff.assets?.filter(a => a.category_details?.name === 'Mobiles').length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Mobile Phones</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {staff.assets.filter(a => a.category_details?.name === 'Mobiles').map(asset => (
                              <div key={asset.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                      <Smartphone size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900">{asset.name}</h4>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{asset.category_details?.name}</p>
                                    </div>
                                  </div>
                                  <span className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                                    {asset.company}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {asset.serial_number && (
                                    <p className="text-sm text-slate-600">S/N: <span className="font-medium text-slate-900">{asset.serial_number}</span></p>
                                  )}
                                  {asset.primary_sim_details && (
                                    <div className="text-sm text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                      <p className="font-semibold text-slate-800 flex items-center gap-1">Primary SIM</p>
                                      <p>Number: <span className="font-medium text-slate-900">{asset.primary_sim_details.serial_number || asset.primary_sim_details.name}</span></p>
                                      {asset.primary_sim_details.provider && <p>Provider: <span className="font-medium text-slate-900">{asset.primary_sim_details.provider}</span></p>}
                                    </div>
                                  )}
                                  {asset.secondary_sim_details && (
                                    <div className="text-sm text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                      <p className="font-semibold text-slate-800 flex items-center gap-1">Secondary SIM</p>
                                      <p>Number: <span className="font-medium text-slate-900">{asset.secondary_sim_details.serial_number || asset.secondary_sim_details.name}</span></p>
                                      {asset.secondary_sim_details.provider && <p>Provider: <span className="font-medium text-slate-900">{asset.secondary_sim_details.provider}</span></p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Standalone SIMs */}
                      {staff.assets?.filter(a => ['SIM Card', 'SIM'].includes(a.category_details?.name) || a.provider).length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Standalone SIMs</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {staff.assets.filter(a => ['SIM Card', 'SIM'].includes(a.category_details?.name) || a.provider).map(asset => (
                              <div key={asset.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                      <Smartphone size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900">{asset.name}</h4>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{asset.category_details?.name || 'SIM Card'}</p>
                                    </div>
                                  </div>
                                  <span className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                                    {asset.company}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {asset.provider && (
                                    <p className="text-sm text-slate-600">Provider: <span className="font-medium text-slate-900">{asset.provider}</span></p>
                                  )}
                                  {asset.serial_number && (
                                    <p className="text-sm text-slate-600">Number: <span className="font-medium text-slate-900">{asset.serial_number}</span></p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Assets */}
                      {staff.assets?.filter(a => a.category_details?.name !== 'Mobiles' && !['SIM Card', 'SIM'].includes(a.category_details?.name) && !a.provider).length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Other Assets</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {staff.assets.filter(a => a.category_details?.name !== 'Mobiles' && !['SIM Card', 'SIM'].includes(a.category_details?.name) && !a.provider).map(asset => (
                              <div key={asset.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                      <Laptop size={20} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900">{asset.name}</h4>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{asset.category_details?.name || 'Asset'}</p>
                                    </div>
                                  </div>
                                  <span className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                                    {asset.company}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {asset.serial_number && (
                                    <p className="text-sm text-slate-600">S/N: <span className="font-medium text-slate-900">{asset.serial_number}</span></p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Space Inventory */}
                {staff.responsible_locations?.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <MapPin size={22} className="text-indigo-500" />
                        Space Inventory
                      </h3>
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                        {staff.responsible_locations.length} Locations
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {staff.responsible_locations.map(loc => {
                        const assets = loc.assigned_assets || [];
                        const categoryCounts = assets.reduce((acc, a) => {
                          const cat = a.category || 'Other';
                          acc[cat] = (acc[cat] || 0) + 1;
                          return acc;
                        }, {});
                        
                        return (
                          <div key={loc.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 transition-colors">
                            <h4 className="font-extrabold text-slate-900 text-lg uppercase tracking-wide mb-1">{loc.name} {loc.branch_details ? `(${loc.branch_details.name})` : ''}</h4>
                            <p className="text-sm text-slate-500 font-medium mb-4">{assets.length} Total Assets</p>
                            
                            {assets.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(categoryCounts).map(([cat, count]) => (
                                  <span key={cat} className="px-3 py-1 bg-white border border-slate-200 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                                    {cat}: {count}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">No assets assigned here.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Asset Timeline */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100 h-full">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Clock size={22} className="text-indigo-500" />
                    Asset Timeline
                  </h3>
                  
                  {timelineLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : timelineEvents.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-slate-500 text-sm">No asset history available.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
                      {timelineEvents.map((event, idx) => (
                        <div key={event.id} className="relative pl-6">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            event.action.includes('ASSIGNED') ? 'bg-emerald-500' :
                            event.action.includes('UNASSIGNED') ? 'bg-amber-500' :
                            'bg-indigo-500'
                          }`}></div>
                          
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">{event.action_label}</span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {permissionsModalOpen && (
        <StaffPermissionsModal
          isOpen={permissionsModalOpen}
          onClose={() => setPermissionsModalOpen(false)}
          staffId={staff.id}
          currentPermissions={staff.permissions}
          authFetch={authFetch}
          apiBaseUrl={API_BASE_URL}
          onSave={() => {
            setPermissionsModalOpen(false);
            fetchStaffDetails();
          }}
        />
      )}
    </div>
  );
}
