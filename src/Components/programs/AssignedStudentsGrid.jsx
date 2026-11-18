import React, { useMemo } from 'react';
import { DataGrid, renderTextEditor } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import {
  buildAssigneeColumn,
  buildDeleteColumn,
  buildSelectionColumn,
  buildTimelineColumn,
  handleGridRowsChange,
} from './gridHelpers';

const STUDENT_EDITABLE_KEYS = [
  'name',
  'age',
  'phone',
  'email_address',
  'place',
  'qualification',
  'preferred_country',
  'preferred_program',
  'intake',
  'aps_status',
  'ielts_status',
  'german_status',
  'source',
];

const SOURCE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'insta', label: 'Insta' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'voxbay', label: 'Voxbay' },
  { value: 'walkin', label: 'Walk-in' },
];

const AssignedStudentsGrid = ({
  rows,
  canManage,
  staffList,
  selectedIds,
  onToggleAll,
  onToggleRow,
  onUpdateRow,
  onOpenTimeline,
  onDeleteRow,
}) => {
  const columns = useMemo(() => {
    const baseCols = [
      // Frozen block (up to EMAIL ADDRESS, matching Google Sheet)
      {
        key: 'sl_no',
        name: 'SL NO',
        width: 75,
        frozen: true,
        resizable: true,
      },
      {
        key: 'name',
        name: 'NAME',
        width: 170,
        frozen: true,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'age',
        name: 'AGE',
        width: 70,
        frozen: true,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'phone',
        name: 'PHONE',
        width: 130,
        frozen: true,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'email_address',
        name: 'EMAIL ADDRESS',
        width: 210,
        frozen: true,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      // Scrollable block
      {
        key: 'place',
        name: 'PLACE',
        width: 140,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'qualification',
        name: 'QUALIFICATION',
        width: 220,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'preferred_country',
        name: 'PREFERRED COUNTRY',
        width: 165,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'preferred_program',
        name: 'PREFERRED PROGRAM',
        width: 220,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'intake',
        name: 'INTAKE',
        width: 130,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'aps_status',
        name: 'APS STATUS',
        width: 140,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'ielts_status',
        name: 'IELTS STATUS',
        width: 140,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'german_status',
        name: 'GERMAN STATUS',
        width: 150,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'source',
        name: 'SOURCE',
        width: 140,
        resizable: true,
        renderCell: ({ row }) => {
          const currentVal = row.source || '';
          const matched = SOURCE_OPTIONS.find((opt) => opt.value === currentVal);
          if (!canManage) {
            return <span className="text-xs text-slate-700">{matched ? matched.label : currentVal}</span>;
          }
          return (
            <select
              aria-label={`Source for ${row.name || row.id}`}
              value={currentVal}
              onChange={(e) => onUpdateRow(row.id, { source: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">—</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        },
      },
    ];

    const finalCols = [];
    if (canManage) {
      finalCols.push(buildSelectionColumn({ rows, selectedIds, onToggleAll, onToggleRow }));
    }
    finalCols.push(...baseCols);
    if (canManage) {
      finalCols.push(buildAssigneeColumn({ staffList, onUpdateRow }));
    }
    finalCols.push(buildTimelineColumn({ onOpenTimeline }));
    if (canManage) {
      finalCols.push(buildDeleteColumn({ onDeleteRow }));
    }
    return finalCols;
  }, [canManage, rows, selectedIds, staffList, onToggleAll, onToggleRow, onUpdateRow, onOpenTimeline, onDeleteRow]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="h-[65vh] min-h-[420px]">
        <DataGrid
          columns={columns}
          rows={rows}
          rowKeyGetter={(r) => r.id}
          onRowsChange={(newRows, { indexes }) =>
            handleGridRowsChange({
              newRows,
              prevRows: rows,
              indexes,
              editableKeys: STUDENT_EDITABLE_KEYS,
              onUpdateRow,
            })
          }
          className="rdg-light h-full w-full text-xs"
          rowHeight={40}
          headerRowHeight={42}
        />
      </div>
    </div>
  );
};

export default AssignedStudentsGrid;
