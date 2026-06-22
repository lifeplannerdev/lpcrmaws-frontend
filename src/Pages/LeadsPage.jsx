import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import LeadsPageHeader from '../Components/leads/LeadsPageHeader';
import LeadsStatsCards from '../Components/leads/LeadsStatsCards';
import LeadsFilters from '../Components/leads/LeadsFilters';
import LeadsTable from '../Components/leads/LeadsTable';
import LeadsKanbanBoard from '../Components/leads/LeadsKanbanBoard';
import SpreadsheetView from '../Components/leads/SpreadsheetView';
import LeadSidePanel from '../Components/leads/LeadSidePanel';
import { Users, UserPlus, CheckCircle, TrendingUp, LayoutList, LayoutGrid, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../Components/common/Pagination';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import { Can } from '../context/PermissionsContext';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_SIZE = 20; 

const EXCLUDED_STAFF_ROLES = ['TRAINER', 'ACCOUNTS', 'HR', 'MEDIA', 'ADMIN', 'CEO','PROCESSING','DOCUMENTATION'];

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-6 py-5">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </td>
    ))}
  </tr>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
          <tr>
            {['Lead Info', 'Contact', 'Status', 'Source', 'Priority', 'Assignment', 'Date', 'Actions'].map(h => (
              <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </tbody>
      </table>
    </div>
  </div>
);

export default function LeadsPage() {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const { accessToken, refreshAccessToken, loading: authLoading, user } = useAuth();

  const tokenRef = useRef(accessToken);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const [leads, setLeads]                     = useState([]);
  const [stats, setStats]                     = useState({ new: 0, qualified: 0, converted: 0 });
  const [searchTerm, setSearchTerm]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus]       = useState('all');
  const [filterPriority, setFilterPriority]   = useState('all');
  const [filterSource, setFilterSource]       = useState('all');
  const [filterStaff, setFilterStaff]         = useState('all');
  const [filterCampaign, setFilterCampaign]   = useState('');
  const [filterToday, setFilterToday]         = useState(false);
  const [companyFilter, setCompanyFilter]     = useState('');
  const [viewMode, setViewMode]               = useState('list'); // 'list' | 'kanban'
  const [loading, setLoading]                 = useState(false);
  const [initialLoad, setInitialLoad]         = useState(true);
  const [staffMembers, setStaffMembers]       = useState([]);
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalCount, setTotalCount]           = useState(0);

  // Debounce search — wait 400ms after user stops typing
  const debounceTimer = useRef(null);
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(value);
    }, 400);
  }, []);

  const statusColors = useMemo(() => ({
    enquiry:    'bg-blue-100   text-blue-700',
    contacted:  'bg-yellow-100 text-yellow-700',
    qualified:  'bg-purple-100 text-purple-700',
    converted:  'bg-green-100  text-green-700',
    registered: 'bg-teal-100   text-teal-700',
    lost:       'bg-red-100    text-red-700',
  }), []);

  // ✅ authFetch no longer depends on accessToken — uses ref, stays stable
  const authFetch = useCallback(async (url, options = {}, signal = null, retry = true) => {
    let token = tokenRef.current;
    if (!token) throw new Error('No access token');

    const res = await fetch(url, {
      ...options,
      signal,
      credentials: 'include',
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 && retry) {
      const tok = await refreshAccessToken();
      if (!tok) throw new Error('Session expired');
      tokenRef.current = tok;
      return authFetch(url, options, signal, false);
    }
    return res;
  }, [refreshAccessToken]);

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/leads/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => prev - 1);
      alert('Lead deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete lead');
    }
  };

  //  Stable filter setters — prevents LeadsFilters re-rendering on every render
  const handleSetFilterStatus   = useCallback(v => { setPage(1); setFilterStatus(v);   }, []);
  const handleSetFilterPriority = useCallback(v => { setPage(1); setFilterPriority(v); }, []);
  const handleSetFilterSource   = useCallback(v => { setPage(1); setFilterSource(v);   }, []);
  const handleSetFilterStaff    = useCallback(v => { setPage(1); setFilterStaff(v);    }, []);
  
  const handleExportExcel = async () => {
    try {
      const paramsObj = {};
      if (companyFilter)            paramsObj.company   = companyFilter;
      if (debouncedSearch)          paramsObj.search    = debouncedSearch;
      if (filterStatus !== 'all')   paramsObj.status    = filterStatus.toUpperCase();
      if (filterPriority !== 'all') paramsObj.priority  = filterPriority.toUpperCase();
      if (filterSource !== 'all')   paramsObj.source    = filterSource.toUpperCase();
      if (filterStaff !== 'all') {
        if (filterStaff === 'unassigned') paramsObj.assigned_to__isnull = 'true';
        else                              paramsObj.assigned_to          = filterStaff;
      }
      if (filterCampaign)           paramsObj.campaign_name__icontains = filterCampaign;
      if (filterToday)              paramsObj.created_at__date = new Date().toISOString().split('T')[0];

      const res = await authFetch(`${API_BASE_URL}/leads/export/?${new URLSearchParams(paramsObj)}`);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export leads');
    }
  };

  //  Single effect: staff + leads fetched in parallel; stale requests aborted automatically
  useEffect(() => {
    if (authLoading || !accessToken) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const paramsObj = { page, page_size: PAGE_SIZE };

        if (companyFilter)            paramsObj.company   = companyFilter;
        if (debouncedSearch)          paramsObj.search    = debouncedSearch;
        if (filterStatus !== 'all')   paramsObj.status    = filterStatus.toUpperCase();
        if (filterPriority !== 'all') paramsObj.priority  = filterPriority.toUpperCase();
        if (filterSource !== 'all')   paramsObj.source    = filterSource.toUpperCase();
        if (filterStaff !== 'all') {
          if (filterStaff === 'unassigned') paramsObj.assigned_to__isnull = 'true';
          else                              paramsObj.assigned_to          = filterStaff;
        }
        if (filterCampaign)           paramsObj.campaign_name__icontains = filterCampaign;
        if (filterToday)              paramsObj.created_at__date = new Date().toISOString().split('T')[0];

        //  Parallel: staff only on first load, leads every time
        const [leadsRes, staffRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/leads/?${new URLSearchParams(paramsObj)}`, {}, signal),
          initialLoad ? authFetch(`${API_BASE_URL}/employees/list/`, {}, signal) : Promise.resolve(null),
        ]);

        if (signal.aborted) return;

        // Process staff (first load only)
        if (staffRes && staffRes.ok) {
          const staffData = await staffRes.json();
          const staffArray = Array.isArray(staffData)
            ? staffData
            : (staffData.results || staffData.employees || []);
          if (Array.isArray(staffArray)) {
            setStaffMembers(
              staffArray.filter(u => !EXCLUDED_STAFF_ROLES.includes((u.role || '').toUpperCase()))
            );
          }
        }

        // Process leads
        if (!leadsRes.ok) throw new Error('Failed to fetch leads');
        const data = await leadsRes.json();
        const leadsData = data.results?.leads || data.results || [];
        const statsData = data.results?.stats || {};

        setLeads(leadsData.map(l => ({
          id:              l.id,
          name:            l.name,
          phone:           l.phone,
          email:           l.email    || 'No email provided',
          location:        l.location || 'No location',
          status:          l.status.toLowerCase(),
          source:          l.source,
          interest:        l.program,
          program:         l.program,
          priority:        l.priority,
          assigned_to:     l.assigned_to,
          assigned_by:     l.assigned_by,
          sub_assigned_to: l.sub_assigned_to,
          sub_assigned_by: l.sub_assigned_by,
          current_handler: l.current_handler,
          date:            new Date(l.created_at).toLocaleDateString('en-IN'),
          created_at:      l.created_at,
        })));

        setStats(statsData);
        setTotalCount(data.count || 0);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setInitialLoad(false);
      } catch (err) {
        if (err.name === 'AbortError') return; // silently ignore cancelled requests
        console.error('Failed to load data:', err);
        alert('Failed to load leads. Please try again.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchAll();

    // Cancel in-flight request when filters change before it completes
    return () => controller.abort();
  }, [
    authLoading, authFetch,
    page, debouncedSearch,
    filterStatus, filterPriority, filterSource, filterStaff, companyFilter,
    filterCampaign, filterToday,
  ]);

  const statsCards = useMemo(() => [
    { label: 'Total Leads', value: totalCount,           color: 'bg-blue-500',   icon: Users       },
    { label: 'New Leads',   value: stats.new || 0,       color: 'bg-indigo-500', icon: UserPlus    },
    { label: 'Qualified',   value: stats.qualified || 0, color: 'bg-purple-500', icon: CheckCircle },
    { label: 'Converted',   value: stats.converted || 0, color: 'bg-green-500',  icon: TrendingUp  },
  ], [totalCount, stats]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-10 text-center">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LeadsPageHeader />

        {/* Company Switcher & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
          
          <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl p-1 shadow-sm w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'list' 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={18} />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={18} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'spreadsheet' 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={18} />
              Spreadsheet
            </button>
          </div>
          
          <Can perform="leads:view_any">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              Export Excel
            </button>
          </Can>
        </div>

        {/* Stats + filters always visible — no layout jump on load */}
        <LeadsStatsCards stats={statsCards} />

        <LeadsFilters
          searchTerm={searchTerm}
          setSearchTerm={handleSearchChange}
          filterStatus={filterStatus}
          setFilterStatus={handleSetFilterStatus}
          filterPriority={filterPriority}
          setFilterPriority={handleSetFilterPriority}
          filterSource={filterSource}
          setFilterSource={handleSetFilterSource}
          filterStaff={filterStaff}
          setFilterStaff={handleSetFilterStaff}
          staffMembers={staffMembers}
          filterCampaign={filterCampaign}
          setFilterCampaign={(v) => { setPage(1); setFilterCampaign(v); }}
          filterToday={filterToday}
          setFilterToday={(v) => { setPage(1); setFilterToday(v); }}
        />

        {/* Skeleton on first load; stale table + subtle banner on filter changes */}
        {initialLoad && loading ? (
          <TableSkeleton />
        ) : (
          <div className="flex relative">
            <div className={`transition-all duration-300 ease-in-out ${leadId ? 'w-full lg:w-[calc(100%-400px)] lg:pr-6 hidden lg:block' : 'w-full'}`}>
              {loading && (
                <div className="text-center py-2 text-sm text-blue-600 font-medium animate-pulse mb-2">
                  Updating results…
                </div>
              )}

              {viewMode === 'list' ? (
                <LeadsTable
                  leads={leads}
                  statusColors={statusColors}
                  onDeleteLead={handleDeleteLead}
                  activeLeadId={leadId}
                />
              ) : viewMode === 'spreadsheet' ? (
                <div className="h-[75vh] w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <SpreadsheetView leads={leads} authFetch={authFetch} onUpdateLead={(updatedLead) => {
                    setLeads(prev => prev.map(l => l.id === updatedLead.id ? {...l, ...updatedLead} : l));
                  }} />
                </div>
              ) : (
                <LeadsKanbanBoard
                  leads={leads}
                  statusColors={statusColors}
                  onLeadClick={(lead) => navigate(`/leads/${lead.id}`)}
                  onDragEnd={async (result) => {
                    const { destination, source, draggableId } = result;
                    if (!destination || (destination.droppableId === source.droppableId)) return;
                    
                    const newStatus = destination.droppableId;
                    // Optimistically update
                    setLeads(prev => prev.map(l => l.id.toString() === draggableId ? { ...l, status: newStatus } : l));
                    
                    try {
                      const res = await authFetch(`${API_BASE_URL}/leads/${draggableId}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus.toUpperCase() })
                      });
                      if (!res.ok) throw new Error('Status update failed');
                    } catch (e) {
                      // Revert on error
                      setLeads(prev => prev.map(l => l.id.toString() === draggableId ? { ...l, status: source.droppableId } : l));
                      alert('Failed to update lead status');
                    }
                  }}
                />
              )}

              {viewMode === 'list' && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="mt-8"
                />
              )}
            </div>

            {/* Side Panel Overlay / Split */}
            {leadId && (
              <>
                {/* Mobile Backdrop */}
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => navigate('/leads')} />
                
                {/* Side Panel */}
                <div className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-[90vw] lg:static lg:w-[400px] lg:z-auto bg-white shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out translate-x-0 overflow-hidden rounded-l-2xl lg:rounded-2xl border border-gray-200">
                  <LeadSidePanel leadId={leadId} authFetch={authFetch} onClose={() => navigate('/leads')} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
