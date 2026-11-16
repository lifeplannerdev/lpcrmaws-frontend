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
  'sl_no',
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
];
const STUDENT_INT_KEYS = new Set(['sl_no', 'age']);

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
        renderEditCell: renderTextEditor,
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
              intKeys: STUDENT_INT_KEYS,
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
