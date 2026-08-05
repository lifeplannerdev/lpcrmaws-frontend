import React, { useState, useEffect } from 'react';
import { useLeadsChannel } from '../../hooks/useLeadsChannel';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Clock, ChevronRight, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LiveLeadsBoard() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  
  const hasGlobalRead = user?.role === 'ADMIN' || 
                        user?.db_roles?.some(r => ['ADMIN', 'CEO', 'SUPER_ADMIN'].includes(r.name)) || 
                        hasPermission('leads:read_any') || 
                        hasPermission('leads:read_tenant');
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use real-time Pusher channel
  useLeadsChannel({
    onLeadCreated: (data) => {
      const isMine = data.lead?.assigned_to?.id === user?.id || data.lead?.sub_assigned_to?.id === user?.id;
      if (!hasGlobalRead && !isMine) return;

      setLeads((prev) => {
        if (prev.some(l => l.id === data.lead.id)) return prev;
        return [data.lead, ...prev].slice(0, 100); // Keep max 100
      });
    },
    onLeadUpdated: (data) => {
      const isMine = data.lead?.assigned_to?.id === user?.id || data.lead?.sub_assigned_to?.id === user?.id;
      if (!hasGlobalRead && !isMine) {
        setLeads((prev) => prev.filter(l => l.id !== data.lead.id));
        return;
      }
      setLeads((prev) => prev.map(l => l.id === data.lead.id ? { ...l, ...data.lead } : l));
    },
    onLeadDeleted: (data) => {
      setLeads((prev) => prev.filter(l => l.id !== data.lead_id));
    }
  });

  useEffect(() => {
    let isMounted = true;
    const fetchRecentLeads = async () => {
      if (!accessToken) return;
      setLoading(true);
      try {
        let token = accessToken;
        const makeReq = (t) => fetch(`${API_BASE_URL}/leads/?daily_agenda=true&page_size=100`, {
          headers: { Authorization: `Bearer ${t}` }
        });
        let res = await makeReq(token);
        
        if (res.status === 401) {
          token = await refreshAccessToken();
          if (token) res = await makeReq(token);
        }

        if (res.ok && isMounted) {
          const data = await res.json();
          // Adjust based on your paginated response structure (usually data.results.leads)
          const results = data.results?.leads || data.results || (Array.isArray(data) ? data : []);
          setLeads(results.slice(0, 100));
        } else if (isMounted) {
          setError('Failed to load recent leads');
        }
      } catch (err) {
        if (isMounted) setError('Error connecting to server');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecentLeads();
    return () => { isMounted = false; };
  }, [accessToken, refreshAccessToken]);

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s.includes('ANSWERED')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('NOT ANSWERED') || s.includes('MISSED') || s.includes('CANCEL')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('ENQUIRY')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('ADMISSION')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (s.includes('CLOSED')) return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200'; // Default
  };

  const getSourceBadge = (lead) => {
    if (lead.assignment_source === 'UNIQUE_MISSED_CALL') {
      return <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ml-2 border border-orange-200">Missed Call</span>;
    }
    if (lead.assignment_source === 'ADMIN_ASSIGNED') {
      return <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ml-2 border border-indigo-200">Admin</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Activity size={16} className="text-emerald-500 animate-pulse" /> Live Leads Feed
        </h3>
        <button 
          onClick={() => navigate('/leads')}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      {/* Grid Header (Like a Spreadsheet) */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        <div className="col-span-2">Lead Info</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-3">Remarks</div>
        <div className="col-span-2">Handler</div>
        <div className="col-span-1 text-right">Time</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col max-h-[400px] overflow-y-auto">
        {leads.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs font-semibold">
            No leads found.
          </div>
        ) : (
          leads.map((lead, index) => {
            const h = lead.current_handler;
            const handlerName = h ? `${h.first_name || ''} ${h.last_name || ''}`.trim() || h.email : 'Unassigned';
            
            return (
              <div 
                key={lead.id} 
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors items-center group"
              >
                
                {/* Lead Name & Source */}
                <div className="col-span-2">
                  <div className="font-bold text-gray-900 text-sm truncate flex items-center">
                    {lead.name}
                    {getSourceBadge(lead)}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                    {lead.source || 'UNKNOWN SOURCE'}
                  </div>
                </div>

                {/* Contact (Phone / Email) */}
                <div className="col-span-2">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-gray-700 text-sm font-semibold">
                      <Phone size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">{lead.phone || 'No phone'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="col-span-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(lead.status)} inline-block truncate max-w-full text-center`}>
                    {(lead.status || 'NEW').replace('_', ' ')}
                  </span>
                </div>

                {/* Remarks */}
                <div className="col-span-3">
                  <p className="text-xs text-gray-600 truncate" title={lead.remarks || ''}>
                    {lead.remarks || <span className="text-gray-300 italic">No remarks</span>}
                  </p>
                </div>

                {/* Handler */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <User size={12} className="text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700 truncate">
                    {handlerName}
                  </span>
                </div>

                {/* Time */}
                <div className="col-span-1 text-right flex flex-col items-end justify-center">
                  <div className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">
                    {lead.created_at ? format(parseISO(lead.created_at), 'h:mm a') : '—'}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
