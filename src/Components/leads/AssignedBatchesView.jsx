import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react';
import SpreadsheetView from './SpreadsheetView';
import Pagination from '../common/Pagination';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BATCH_LEADS_PAGE_SIZE = 20;

const formatUserName = (u) => {
  if (!u) return 'System';
  const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return full || u.username || u.email || `User #${u.id}`;
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export default function AssignedBatchesView({
  authFetch,
  companyFilter,
  filterStaff,
  staffMembers = [],
  hasGlobalRead,
  onOpenLeadPanel,
  refreshKey = 0,
  onBatchCountChange,
}) {
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [batchSearch, setBatchSearch] = useState('');
  const [localStaffFilter, setLocalStaffFilter] = useState(filterStaff || 'all');
  const [hideEmptyBatches, setHideEmptyBatches] = useState(false);

  const [expandedBatches, setExpandedBatches] = useState({});
  const [batchLeadsState, setBatchLeadsState] = useState({});

  const effectiveStaff = hasGlobalRead ? localStaffFilter : 'all';

  const fetchBatches = useCallback(async () => {
    if (!authFetch) return;
    setLoadingBatches(true);
    try {
      const params = new URLSearchParams({
        page: String(batchPage),
        page_size: '15',
      });
      if (companyFilter) params.set('company', companyFilter);
      if (hasGlobalRead && effectiveStaff && effectiveStaff !== 'all' && effectiveStaff !== 'unassigned') {
        params.set('assigned_to', effectiveStaff);
      }
      if (batchSearch.trim()) params.set('search', batchSearch.trim());
      if (hideEmptyBatches) params.set('include_empty', 'false');

      const res = await authFetch(`${API_BASE_URL}/leads/assignment-batches/?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load assignment batches');
      const data = await res.json();
      const rows = data.results || data || [];
      setBatches(rows);
      const count = data.count ?? rows.length;
      setBatchTotalPages(Math.max(1, Math.ceil(count / 15)));
      if (onBatchCountChange) onBatchCountChange(count);
    } catch (err) {
      console.error('Error loading assignment batches:', err);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, [authFetch, batchPage, companyFilter, effectiveStaff, hasGlobalRead, batchSearch, hideEmptyBatches, onBatchCountChange]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches, refreshKey]);

  const fetchLeadsForBatch = useCallback(
    async (batchId, overrides = {}) => {
      const current = batchLeadsState[batchId] || {
        leads: [],
        loading: false,
        page: 1,
        totalPages: 1,
        totalCount: 0,
        includeReassignedOut: false,
        search: '',
        status: 'all',
      };
      const nextPage = overrides.page ?? current.page;
      const includeReassignedOut = overrides.includeReassignedOut ?? current.includeReassignedOut;
      const search = overrides.search ?? current.search;
      const status = overrides.status ?? current.status;

      setBatchLeadsState((prev) => ({
        ...prev,
        [batchId]: {
          ...current,
          ...overrides,
          loading: true,
        },
      }));

      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          page_size: String(BATCH_LEADS_PAGE_SIZE),
          include_reassigned_out: String(includeReassignedOut),
        });
        if (search.trim()) params.set('search', search.trim());
        if (status && status !== 'all') params.set('status', status);

        const res = await authFetch(
          `${API_BASE_URL}/leads/assignment-batches/${batchId}/leads/?${params.toString()}`
        );
        if (!res.ok) throw new Error('Failed to fetch batch leads');
        const data = await res.json();
        const leadsList = data.results || data || [];
        const total = data.count ?? leadsList.length;

        setBatchLeadsState((prev) => ({
          ...prev,
          [batchId]: {
            ...(prev[batchId] || current),
            ...overrides,
            leads: leadsList,
            loading: false,
            page: nextPage,
            totalCount: total,
            totalPages: Math.max(1, Math.ceil(total / BATCH_LEADS_PAGE_SIZE)),
          },
        }));
      } catch (err) {
        console.error(`Failed to load leads for batch ${batchId}:`, err);
        setBatchLeadsState((prev) => ({
          ...prev,
          [batchId]: {
            ...(prev[batchId] || current),
            loading: false,
          },
        }));
      }
    },
    [authFetch, batchLeadsState]
  );

  const toggleBatchExpand = (batchId) => {
    setExpandedBatches((prev) => {
      const nextOpen = !prev[batchId];
      if (nextOpen && !batchLeadsState[batchId]?.leads?.length && !batchLeadsState[batchId]?.loading) {
        fetchLeadsForBatch(batchId, { page: 1 });
      }
      return { ...prev, [batchId]: nextOpen };
    });
  };

  const handleBatchLeadUpdated = (batchId, updatedLead) => {
    setBatchLeadsState((prev) => {
      const st = prev[batchId];
      if (!st) return prev;
      return {
        ...prev,
        [batchId]: {
          ...st,
          leads: st.leads.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l)),
        },
      };
    });
  };

  return (
    <div className="space-y-4">
      {/* Batch Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={batchSearch}
            onChange={(e) => {
              setBatchPage(1);
              setBatchSearch(e.target.value);
            }}
            placeholder="Search assignment batches by title, sender, or note..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {hasGlobalRead && staffMembers.length > 0 && (
            <select
              value={localStaffFilter}
              onChange={(e) => {
                setBatchPage(1);
                setLocalStaffFilter(e.target.value);
              }}
              className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Assigned Staff</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username || `Staff #${s.id}`}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideEmptyBatches}
              onChange={(e) => {
                setBatchPage(1);
                setHideEmptyBatches(e.target.checked);
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Hide Empty / Fully Reassigned Batches
          </label>

          <button
            type="button"
            onClick={fetchBatches}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Batch List */}
      {loadingBatches ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">Loading assignment batches...</span>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Assignment Batches Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Leads assigned from the Lead Command Centre or Bulk Reassign will appear here grouped by each assignment batch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const isOpen = !!expandedBatches[batch.id];
            const st = batchLeadsState[batch.id] || {
              leads: [],
              loading: false,
              page: 1,
              totalPages: 1,
              totalCount: 0,
              includeReassignedOut: false,
              search: '',
              status: 'all',
            };

            return (
              <div
                key={batch.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Batch Header Row */}
                <button
                  type="button"
                  data-testid={`batch-toggle-${batch.id}`}
                  onClick={() => toggleBatchExpand(batch.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 truncate">{batch.title}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {batch.assignment_type || 'PRIMARY'}
                        </span>
                        {batch.reassigned_out_count > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {batch.reassigned_out_count} moved out
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                          To: <strong className="text-gray-700">{formatUserName(batch.assigned_to)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          By: <strong className="text-gray-700">{formatUserName(batch.assigned_by)}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatDateTime(batch.created_at)}
                        </span>
                        {batch.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-gray-600 truncate max-w-xs" title={batch.notes}>
                              “{batch.notes}”
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Pills */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                      Active: {batch.active_count} / {batch.total_assigned_count}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                      New: {batch.new_count}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">
                      In Progress: {batch.contacted_count}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Converted: {batch.converted_count}
                    </span>
                    {batch.overdue_followups_count > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Overdue: {batch.overdue_followups_count}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded Batch Spreadsheet */}
                {isOpen && (
                  <div className="border-t border-gray-200 bg-slate-50/40">
                    <div className="px-5 py-3 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={st.search}
                            onChange={(e) => fetchLeadsForBatch(batch.id, { search: e.target.value, page: 1 })}
                            placeholder="Filter leads in this batch..."
                            className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                          />
                        </div>
                        <select
                          value={st.status}
                          onChange={(e) => fetchLeadsForBatch(batch.id, { status: e.target.value, page: 1 })}
                          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="ENQUIRY">Enquiry</option>
                          <option value="COLD">Cold</option>
                          <option value="WARM">Warm</option>
                          <option value="HOT">Hot</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          data-testid={`toggle-reassigned-${batch.id}`}
                          checked={st.includeReassignedOut}
                          onChange={(e) =>
                            fetchLeadsForBatch(batch.id, {
                              includeReassignedOut: e.target.checked,
                              page: 1,
                            })
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Show Reassigned Out ({batch.reassigned_out_count || 0})
                      </label>
                    </div>

                    {st.loading ? (
                      <div className="p-8 flex items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium">Loading batch leads...</span>
                      </div>
                    ) : st.leads.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        No leads in this batch match your current filter.
                      </div>
                    ) : (
                      <div className="h-[440px] w-full flex flex-col bg-white">
                        <SpreadsheetView
                          leads={st.leads}
                          authFetch={authFetch}
                          showLifecycleColumns={true}
                          hideAddRow={true}
                          preserveOrder={true}
                          onOpenLeadPanel={onOpenLeadPanel}
                          onUpdateLead={(updatedLead) => handleBatchLeadUpdated(batch.id, updatedLead)}
                        />
                      </div>
                    )}

                    {st.totalPages > 1 && (
                      <div className="px-4 py-3 bg-white border-t border-gray-100">
                        <Pagination
                          currentPage={st.page}
                          totalPages={st.totalPages}
                          onPageChange={(p) => fetchLeadsForBatch(batch.id, { page: p })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {batchTotalPages > 1 && (
            <Pagination
              currentPage={batchPage}
              totalPages={batchTotalPages}
              onPageChange={setBatchPage}
              className="mt-4"
            />
          )}
        </div>
      )}
    </div>
  );
}
