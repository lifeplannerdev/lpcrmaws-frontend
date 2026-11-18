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

const PROGRAM_EDITABLE_KEYS = [
  'project',
  'country',
  'assignment',
  'completed',
  'presentation',
  'training_to_team',
];

const AssignedProgramsGrid = ({
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
      {
        key: 'sl_no',
        name: 'SL.NO.',
        width: 85,
        frozen: true,
        resizable: true,
      },
      {
        key: 'project',
        name: 'PROJECT',
        width: 280,
        frozen: true,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'country',
        name: 'COUNTRY',
        width: 150,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'assignment',
        name: 'ASSIGNMENT',
        width: 140,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'completed',
        name: 'COMPLETED',
        width: 140,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'presentation',
        name: 'PRESENTATION',
        width: 150,
        resizable: true,
        renderEditCell: renderTextEditor,
      },
      {
        key: 'training_to_team',
        name: 'TRAINING TO TEAM',
        width: 210,
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
              editableKeys: PROGRAM_EDITABLE_KEYS,
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

export default AssignedProgramsGrid;
