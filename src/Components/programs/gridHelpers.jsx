import React from 'react';
import { History, Trash2 } from 'lucide-react';

export const getStaffDisplayName = (staff) =>
  staff?.name ||
  staff?.full_name ||
  `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim() ||
  staff?.username ||
  `Staff #${staff?.id ?? ''}`;

export const parseOptionalInt = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const parsed = Number.parseInt(String(val).trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const handleGridRowsChange = ({
  newRows,
  prevRows,
  indexes,
  editableKeys,
  intKeys = new Set(),
  onUpdateRow,
}) => {
  const targetIndexes = Array.isArray(indexes) ? indexes : [];
  targetIndexes.forEach((idx) => {
    const updated = newRows[idx];
    const original = prevRows[idx];
    if (!updated || !original) return;

    const patch = {};
    editableKeys.forEach((key) => {
      const nextVal = intKeys.has(key) ? parseOptionalInt(updated[key]) : String(updated[key] ?? '');
      const prevVal = intKeys.has(key) ? parseOptionalInt(original[key]) : String(original[key] ?? '');
      if (nextVal !== prevVal) {
        patch[key] = nextVal;
      }
    });

    if (Object.keys(patch).length > 0) {
      onUpdateRow(updated.id, patch);
    }
  });
};

export const buildSelectionColumn = ({ rows, selectedIds, onToggleAll, onToggleRow }) => {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  return {
    key: '_select',
    name: '',
    width: 44,
    frozen: true,
    resizable: false,
    renderHeaderCell: () => (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          aria-label="Select all rows"
          checked={allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      </div>
    ),
    renderCell: ({ row }) => (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          aria-label={`Select row ${row.sl_no ?? row.id}`}
          checked={selectedIds.has(row.id)}
          onChange={(e) => onToggleRow(row.id, e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      </div>
    ),
  };
};

export const buildAssigneeColumn = ({ staffList, onUpdateRow }) => ({
  key: 'assigned_to',
  name: 'ASSIGNED TO',
  width: 190,
  resizable: true,
  renderCell: ({ row }) => (
    <select
      aria-label={`Assign staff for row ${row.sl_no ?? row.id}`}
      value={row.assigned_to ?? ''}
      onChange={(e) => {
        const val = e.target.value ? Number(e.target.value) : null;
        onUpdateRow(row.id, { assigned_to: val });
      }}
      className="w-full h-full bg-transparent text-xs text-slate-800 border-0 focus:outline-none cursor-pointer"
    >
      <option value="">Unassigned</option>
      {staffList.map((staff) => (
        <option key={staff.id} value={staff.id}>
          {getStaffDisplayName(staff)}
        </option>
      ))}
    </select>
  ),
});

export const buildTimelineColumn = ({ onOpenTimeline }) => ({
  key: '_timeline',
  name: 'TIMELINE',
  width: 105,
  resizable: false,
  renderCell: ({ row }) => (
    <div className="flex items-center justify-center h-full">
      <button
        type="button"
        onClick={() => onOpenTimeline(row)}
        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        <span>History</span>
      </button>
    </div>
  ),
});

export const buildDeleteColumn = ({ onDeleteRow }) => ({
  key: '_delete',
  name: 'DELETE',
  width: 80,
  resizable: false,
  renderCell: ({ row }) => (
    <div className="flex items-center justify-center h-full">
      <button
        type="button"
        onClick={() => onDeleteRow(row)}
        aria-label={`Delete row ${row.sl_no ?? row.id}`}
        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  ),
});
