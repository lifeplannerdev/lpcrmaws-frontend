import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Download,
  Search,
  Users,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import AssignedProgramsGrid from '../Components/programs/AssignedProgramsGrid';
import AssignedStudentsGrid from '../Components/programs/AssignedStudentsGrid';
import ChangeTimelineDrawer from '../Components/programs/ChangeTimelineDrawer';
import BulkImportModal from '../Components/programs/BulkImportModal';
import { getStaffDisplayName, parseOptionalInt } from '../Components/programs/gridHelpers';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TABS = {
  PROGRAMS: 'programs',
  STUDENTS: 'students',
};

const ENDPOINTS = {
  [TABS.PROGRAMS]: 'assigned-programs',
  [TABS.STUDENTS]: 'assigned-students-db',
};

const INITIAL_PROGRAM_FORM = {
  sl_no: '',
  project: '',
  country: '',
  assignment: '',
  completed: '',
  presentation: '',
  training_to_team: '',
  assigned_to: '',
};

const SOURCE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'insta', label: 'Insta' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'voxbay', label: 'Voxbay' },
  { value: 'walkin', label: 'Walk-in' },
];

const INITIAL_STUDENT_FORM = {
  sl_no: '',
  name: '',
  age: '',
  phone: '',
  email_address: '',
  place: '',
  qualification: '',
  preferred_country: '',
  preferred_program: '',
  intake: '',
  aps_status: '',
  ielts_status: '',
  german_status: '',
  source: '',
  assigned_to: '',
};

const AssignedProgramsStudentsPage = () => {
  const { user, accessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const canManage = Boolean(user?.is_superuser || hasPermission('processing:prog_stud_manage'));
  const canViewAssigned = Boolean(canManage || hasPermission('processing:prog_stud_assigned'));

  const [activeTab, setActiveTab] = useState(TABS.PROGRAMS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  const [staffList, setStaffList] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_PROGRAM_FORM);
  const [creating, setCreating] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [timelineRow, setTimelineRow] = useState(null);

  const endpointPrefix = ENDPOINTS[activeTab];

  const fetchStaff = useCallback(async () => {
    if (!canManage || !accessToken) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/employees/?roles=DOCUMENTATION,OPERATION`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load Documentation & Operation staff list');
    }
  }, [canManage, accessToken]);

  const fetchRows = useCallback(async () => {
    if (!canViewAssigned || !accessToken) return;
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (canManage && staffFilter !== 'all') params.assigned_to = staffFilter;

      const res = await axios.get(`${API_BASE_URL}/${endpointPrefix}/`, {
        params,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setRows(list);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load tracker rows');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canViewAssigned, canManage, accessToken, endpointPrefix, search, staffFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleSwitchTab = (tab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setBulkAssignee('');
    setTimelineRow(null);
    setShowAddModal(false);
    setShowImportModal(false);
  };

  const handleToggleAll = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(rows.map((r) => r.id)));
      }
    },
    [rows]
  );

  const handleToggleRow = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleUpdateRow = useCallback(
    async (rowId, patch) => {
      const previous = rows;
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
      try {
        const res = await axios.patch(`${API_BASE_URL}/${endpointPrefix}/${rowId}/`, patch, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setRows((prev) => prev.map((r) => (r.id === rowId ? res.data : r)));
        toast.success('Updated');
      } catch (err) {
        setRows(previous);
        toast.error(err.response?.data?.detail || 'Failed to save change');
      }
    },
    [rows, endpointPrefix, accessToken]
  );

  const handleDeleteRow = useCallback(
    async (row) => {
      const label = row.project || row.name || `row #${row.sl_no ?? row.id}`;
      if (!window.confirm(`Delete "${label}"? This action cannot be undone.`)) return;
      try {
        await axios.delete(`${API_BASE_URL}/${endpointPrefix}/${row.id}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
        toast.success('Row deleted');
        fetchRows();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to delete row');
      }
    },
    [endpointPrefix, accessToken, fetchRows]
  );

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const assignedTo = bulkAssignee === '' || bulkAssignee === 'unassigned' ? null : Number(bulkAssignee);
      const res = await axios.post(
        `${API_BASE_URL}/${endpointPrefix}/bulk-assign/`,
        { ids: Array.from(selectedIds), assigned_to: assignedTo },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(`Updated assignment for ${res.data?.updated_count ?? selectedIds.size} row(s)`);
      setSelectedIds(new Set());
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk assign failed');
    } finally {
      setBulkAssigning(false);
    }
  };

  const openAddModal = () => {
    setAddForm(activeTab === TABS.PROGRAMS ? INITIAL_PROGRAM_FORM : INITIAL_STUDENT_FORM);
    setShowAddModal(true);
  };

  const handleCreateRow = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = { ...addForm };
      payload.sl_no = parseOptionalInt(payload.sl_no);
      if (activeTab === TABS.STUDENTS) {
        payload.age = String(payload.age ?? '').trim();
      }
      payload.assigned_to = payload.assigned_to ? Number(payload.assigned_to) : null;

      await axios.post(`${API_BASE_URL}/${endpointPrefix}/`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Row added');
      setShowAddModal(false);
      fetchRows();
    } catch (err) {
      const data = err.response?.data;
      let errMsg = data?.detail || 'Failed to create row';
      if (!data?.detail && data && typeof data === 'object') {
        const firstEntry = Object.entries(data)[0];
        if (firstEntry) {
          const [field, msgs] = firstEntry;
          errMsg = `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
        }
      }
      toast.error(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleExportExcel = () => {
    const isPrograms = activeTab === TABS.PROGRAMS;
    const exportRows = rows.map((r) => {
      if (isPrograms) {
        const base = {
          'SL.NO.': r.sl_no ?? '',
          PROJECT: r.project ?? '',
          COUNTRY: r.country ?? '',
          ASSIGNMENT: r.assignment ?? '',
          COMPLETED: r.completed ?? '',
          PRESENTATION: r.presentation ?? '',
          'TRAINING TO TEAM': r.training_to_team ?? '',
        };
        if (canManage) base['ASSIGNED TO'] = r.assigned_to_name || '';
        return base;
      }
      const base = {
        'SL NO': r.sl_no ?? '',
        NAME: r.name ?? '',
        AGE: r.age ?? '',
        PHONE: r.phone ?? '',
        'EMAIL ADDRESS': r.email_address ?? '',
        PLACE: r.place ?? '',
        QUALIFICATION: r.qualification ?? '',
        'PREFERRED COUNTRY': r.preferred_country ?? '',
        'PREFERRED PROGRAM': r.preferred_program ?? '',
        INTAKE: r.intake ?? '',
        'APS STATUS': r.aps_status ?? '',
        'IELTS STATUS': r.ielts_status ?? '',
        'GERMAN STATUS': r.german_status ?? '',
        SOURCE: r.source ?? '',
      };
      if (canManage) base['ASSIGNED TO'] = r.assigned_to_name || '';
      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      isPrograms ? 'Assigned Programs' : 'Assigned Students Database'
    );
    XLSX.writeFile(
      workbook,
      isPrograms ? 'assigned_programs.xlsx' : 'assigned_students_database.xlsx'
    );
  };

  const addModalFields = useMemo(() => {
    if (activeTab === TABS.PROGRAMS) {
      return [
        { key: 'project', label: 'PROJECT', required: true },
        { key: 'country', label: 'COUNTRY' },
        { key: 'assignment', label: 'ASSIGNMENT' },
        { key: 'completed', label: 'COMPLETED' },
        { key: 'presentation', label: 'PRESENTATION' },
        { key: 'training_to_team', label: 'TRAINING TO TEAM' },
      ];
    }
    return [
      { key: 'name', label: 'NAME', required: true },
      { key: 'age', label: 'AGE', type: 'number' },
      { key: 'phone', label: 'PHONE' },
      { key: 'email_address', label: 'EMAIL ADDRESS', type: 'email' },
      { key: 'place', label: 'PLACE' },
      { key: 'qualification', label: 'QUALIFICATION' },
      { key: 'preferred_country', label: 'PREFERRED COUNTRY' },
      { key: 'preferred_program', label: 'PREFERRED PROGRAM' },
      { key: 'intake', label: 'INTAKE' },
      { key: 'aps_status', label: 'APS STATUS' },
      { key: 'ielts_status', label: 'IELTS STATUS' },
      { key: 'german_status', label: 'GERMAN STATUS' },
      { key: 'source', label: 'SOURCE', type: 'select', options: SOURCE_OPTIONS },
    ];
  }, [activeTab]);

  if (!canViewAssigned) {
    return (
      <div className="p-8 text-center text-slate-600">
        You do not have permission to access Assigned Programs &amp; Assigned Students.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="p-4 sm:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Assigned Programs &amp; Assigned Students</h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {canManage
              ? 'Manage processing tracker sheets, assign Documentation & Operation staff, and audit row timelines.'
              : 'View and update rows assigned to you. Every change is logged to the row timeline.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Row</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                <span>Import Excel</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleSwitchTab(TABS.PROGRAMS)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === TABS.PROGRAMS
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Programs
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab(TABS.STUDENTS)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === TABS.STUDENTS
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Students Database
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[210px] sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === TABS.PROGRAMS
                  ? 'Search project, country, assignment...'
                  : 'Search name, phone, email, country...'
              }
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {canManage && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              <select
                aria-label="Filter by assigned staff"
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Staff</option>
                <option value="unassigned">Unassigned</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {getStaffDisplayName(staff)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Assign Action Bar (Manage Only) */}
      {canManage && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-indigo-900">
            {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select staff for bulk assignment"
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="unassigned">Unassign</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {getStaffDisplayName(staff)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkAssigning}
              onClick={handleBulkAssign}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {bulkAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Assign Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
          <span className="text-sm">Loading rows...</span>
        </div>
      ) : activeTab === TABS.PROGRAMS ? (
        <AssignedProgramsGrid
          rows={rows}
          canManage={canManage}
          staffList={staffList}
          selectedIds={selectedIds}
          onToggleAll={handleToggleAll}
          onToggleRow={handleToggleRow}
          onUpdateRow={handleUpdateRow}
          onOpenTimeline={setTimelineRow}
          onDeleteRow={handleDeleteRow}
        />
      ) : (
        <AssignedStudentsGrid
          rows={rows}
          canManage={canManage}
          staffList={staffList}
          selectedIds={selectedIds}
          onToggleAll={handleToggleAll}
          onToggleRow={handleToggleRow}
          onUpdateRow={handleUpdateRow}
          onOpenTimeline={setTimelineRow}
          onDeleteRow={handleDeleteRow}
        />
      )}

      {/* Add Row Modal (Manage Only) */}
      {canManage && showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Add Row">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">
                Add {activeTab === TABS.PROGRAMS ? 'Assigned Program' : 'Assigned Student Record'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close add modal"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRow} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addModalFields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`add-${field.key}`} className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={`add-${field.key}`}
                        required={Boolean(field.required)}
                        value={addForm[field.key] ?? ''}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Select {field.label}</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`add-${field.key}`}
                        type={field.type || 'text'}
                        required={Boolean(field.required)}
                        value={addForm[field.key] ?? ''}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
                <div>
                  <label htmlFor="add-assigned_to" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
                    ASSIGNED TO
                  </label>
                  <select
                    id="add-assigned_to"
                    value={addForm.assigned_to ?? ''}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {getStaffDisplayName(staff)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal (Manage Only) */}
      {canManage && (
        <BulkImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          mode={activeTab}
          endpointPrefix={endpointPrefix}
          staffList={staffList}
          accessToken={accessToken}
          onImported={fetchRows}
        />
      )}

      {/* Change Timeline Drawer */}
      <ChangeTimelineDrawer
        isOpen={Boolean(timelineRow)}
        onClose={() => setTimelineRow(null)}
        endpointPrefix={endpointPrefix}
        row={timelineRow}
        accessToken={accessToken}
      />
      </main>
    </div>
  );
};

export default AssignedProgramsStudentsPage;
