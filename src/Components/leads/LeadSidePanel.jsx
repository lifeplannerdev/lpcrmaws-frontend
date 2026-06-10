import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  X, Phone, Mail, User, MapPin, Calendar, Tag, UserCheck, 
  ChevronRight, Award, CheckCircle, FileText, Clock, Users, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import UnifiedTimeline from './UnifiedTimeline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LeadSidePanel({ leadId, authFetch, onClose }) {
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // 'info', 'timeline', 'assignment'

  useEffect(() => {
    if (!leadId || !authFetch) return;
    
    let isMounted = true;
    const fetchLeadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/`);
        if (!res.ok) throw new Error('Failed to fetch lead');
        const data = await res.json();
        if (isMounted) setLead(data);
      } catch (err) {
        console.error('Failed to load lead:', err);
        if (isMounted) setError('Failed to load lead details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchLeadDetails();
    
    return () => { isMounted = false; };
  }, [leadId, authFetch]);

  const getStatusColor = (status) => ({
    'ENQUIRY':    'bg-blue-100   text-blue-700   border-blue-200',
    'CONTACTED':  'bg-yellow-100 text-yellow-700 border-yellow-200',
    'QUALIFIED':  'bg-purple-100 text-purple-700 border-purple-200',
    'CONVERTED':  'bg-green-100  text-green-700  border-green-200',
    'REGISTERED': 'bg-teal-100   text-teal-700   border-teal-200',
    'LOST':       'bg-red-100    text-red-700    border-red-200',
  })[status?.toUpperCase()] || 'bg-gray-100 text-gray-700 border-gray-200';

  const getPriorityColor = (priority) => ({
    'HIGH':   'bg-red-100    text-red-700',
    'MEDIUM': 'bg-yellow-100 text-yellow-700',
    'LOW':    'bg-gray-100   text-gray-700',
  })[priority?.toUpperCase()] || 'bg-gray-100 text-gray-700';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  // UI Components for Tabs
  const renderInfoTab = () => (
    <div className="space-y-4 p-4">
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-bold text-gray-900 mb-2 border-b pb-2 flex items-center gap-2">
          <User size={16} className="text-indigo-600"/> Contact Info
        </h4>
        <div className="flex items-start gap-3">
          <Phone size={16} className="text-gray-400 mt-0.5" />
          <div><p className="text-xs text-gray-500">Phone</p><p className="text-sm font-semibold text-gray-900">{lead.phone}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <Mail size={16} className="text-gray-400 mt-0.5" />
          <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-semibold text-gray-900">{lead.email || 'Not provided'}</p></div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin size={16} className="text-gray-400 mt-0.5" />
          <div><p className="text-xs text-gray-500">Location</p><p className="text-sm font-semibold text-gray-900">{lead.location || 'Not specified'}</p></div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-bold text-gray-900 mb-2 border-b pb-2 flex items-center gap-2">
          <Tag size={16} className="text-indigo-600"/> Lead Details
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-gray-500">Program</p><p className="text-sm font-semibold text-gray-900">{lead.program || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-500">Source</p><p className="text-sm font-semibold text-gray-900">{lead.source === 'OTHER' && lead.custom_source ? lead.custom_source : lead.source}</p></div>
          <div><p className="text-xs text-gray-500">Created On</p><p className="text-sm font-semibold text-gray-900">{formatDate(lead.created_at)}</p></div>
          <div><p className="text-xs text-gray-500">Doc Status</p><p className="text-sm font-semibold text-gray-900">{lead.document_status || 'PENDING'}</p></div>
        </div>
      </div>
    </div>
  );

  const renderAssignmentTab = () => (
    <div className="space-y-4 p-4">
      {/* Current Handler */}
      {lead.current_handler && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Current Handler</p>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm font-bold text-gray-900">{lead.current_handler.first_name} {lead.current_handler.last_name}</p>
          </div>
        </div>
      )}

      {/* Primary */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase">Primary</h4>
          <Award size={16} className="text-indigo-600" />
        </div>
        {lead.assigned_to ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {lead.assigned_to.first_name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{lead.assigned_to.first_name} {lead.assigned_to.last_name}</p>
              <p className="text-xs text-gray-600">{lead.assigned_to.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Not assigned</p>
        )}
      </div>

      {/* Sub */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase">Sub-Assignment</h4>
          <ChevronRight size={16} className="text-purple-600" />
        </div>
        {lead.sub_assigned_to ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {lead.sub_assigned_to.first_name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{lead.sub_assigned_to.first_name} {lead.sub_assigned_to.last_name}</p>
              <p className="text-xs text-gray-600">{lead.sub_assigned_to.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No sub-assignment</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white shadow-xl lg:border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white z-10 shrink-0">
        <h2 className="text-lg font-bold text-gray-900 truncate pr-2">Lead Summary</h2>
        <div className="flex items-center gap-1">
          <Link to={`/leads/view/${leadId}`} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Full Details">
            <ExternalLink size={18} />
          </Link>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-sm text-gray-500 font-medium">Loading details...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-2">{error}</p>
            <button onClick={() => setLead(null)} className="text-sm text-indigo-600 font-semibold hover:underline">Retry</button>
          </div>
        ) : lead ? (
          <div className="flex flex-col h-full">
            
            {/* Lead Quick Info */}
            <div className="p-4 bg-white shrink-0">
              <div className="flex gap-4 items-center mb-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
                  {lead.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{lead.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getStatusColor(lead.status)}`}>{lead.status}</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${getPriorityColor(lead.priority)}`}>{lead.priority}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-gray-700 text-sm font-semibold py-2 rounded-lg transition-colors">
                  <Phone size={16} /> Call
                </a>
                <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-gray-700 text-sm font-semibold py-2 rounded-lg transition-colors">
                  <Mail size={16} /> Email
                </a>
              </div>
            </div>

            {/* Mini-Tabs Navigation */}
            <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shrink-0">
              <button onClick={() => setActiveTab('timeline')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Clock size={16} /> Timeline
              </button>
              <button onClick={() => setActiveTab('info')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <FileText size={16} /> Info
              </button>
              <button onClick={() => setActiveTab('assignment')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assignment' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Users size={16} /> Team
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto bg-white">
              {activeTab === 'info' && renderInfoTab()}
              {activeTab === 'assignment' && renderAssignmentTab()}
              {activeTab === 'timeline' && (
                <div className="p-0">
                  <UnifiedTimeline authFetch={authFetch} leadIdOverride={leadId} isSidePanel={true} />
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
