import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid, renderTextEditor as textEditor } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { format, isToday, parseISO, isSameDay, subDays } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = [
  'ENQUIRY', 'CONTACTED', 'QUALIFIED', 'NOT_INTERESTED',
  'CONVERTED', 'CNR', 'REGISTERED'
];

function statusEditor({ row, onRowChange }) {
  return (
    <select
      autoFocus
      className="w-full h-full border-none outline-none bg-white text-gray-900 px-2"
      value={row.status?.toUpperCase() || 'ENQUIRY'}
      onChange={(e) => onRowChange({ ...row, status: e.target.value }, true)}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
      ))}
    </select>
  );
}

const columns = [
  { key: 'created_at', name: 'Date', width: 120, renderCell: (p) => format(parseISO(p.row.created_at), 'dd/MM/yyyy') },
  { key: 'id', name: 'Serial Number', width: 80 },
  { key: 'name', name: 'Name', width: 150, renderEditCell: textEditor },
  { key: 'phone', name: 'Phone Number', width: 150, renderEditCell: textEditor },
  { key: 'email', name: 'Email Address', width: 200, renderEditCell: textEditor },
  { key: 'interested_country', name: 'Interested Country', width: 150, renderEditCell: textEditor },
  { key: 'interested_course', name: 'Interested Course', width: 200, renderEditCell: textEditor },
  { key: 'previous_qualification', name: 'Previous Qual.', width: 150, renderEditCell: textEditor },
  { key: 'work_experience', name: 'Work Experience', width: 150, renderEditCell: textEditor },
  { key: 'location', name: 'Location', width: 150, renderEditCell: textEditor },
  { key: 'budget', name: 'Budget', width: 120, renderEditCell: textEditor },
  { 
    key: 'status', 
    name: 'Status', 
    width: 150, 
    renderEditCell: statusEditor,
    renderCell: (p) => (
      <span className="font-semibold text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
        {p.row.status?.toUpperCase().replace('_', ' ')}
      </span>
    )
  },
];

export default function SpreadsheetView({ leads, onUpdateLead, authFetch }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => subDays(new Date(), 1));
  
  // Track updates to push to backend
  const handleRowsChange = async (newRows, { indexes, column }) => {
    const rowIndex = indexes[0];
    const updatedRow = newRows[rowIndex];
    
    // Auto-save logic
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leads/${updatedRow.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [column.key]: updatedRow[column.key] })
      });
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      // Notify parent to update its state
      if (onUpdateLead) onUpdateLead(data.lead || data);
    } catch (err) {
      console.error('Failed to update lead:', err);
      // In a real app we'd show a toast here
    }
  };

  const isManager = user?.roles?.some(r => ['SUPERADMIN', 'COMPANY_ADMIN', 'MD', 'DIRECTOR', 'GENERAL_MANAGER'].includes(r));

  // Split into Management View vs Employee View
  const renderGrid = () => {
    if (isManager) {
      // Management View: All filtered leads grouped by Counsellor/Handler
      const grouped = leads.reduce((acc, lead) => {
        const handlerName = lead.current_handler ? (lead.current_handler.first_name + ' ' + lead.current_handler.last_name).trim() || lead.current_handler.email : 'Unassigned';
        if (!acc[handlerName]) acc[handlerName] = [];
        acc[handlerName].push(lead);
        return acc;
      }, {});

      return (
        <div className="flex flex-col gap-8 h-full overflow-y-auto w-full">
          <h2 className="text-xl font-bold px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded">Filtered Leads Overview</h2>
          {Object.entries(grouped).map(([counsellor, cLeads]) => (
            <div key={counsellor} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-indigo-600 px-2">{counsellor} ({cLeads.length})</h3>
              <div style={{ height: Math.min(cLeads.length * 35 + 40, 400) }} className="w-full">
                <DataGrid 
                  columns={columns} 
                  rows={cLeads} 
                  onRowsChange={handleRowsChange} 
                  className="custom-data-grid h-full"
                />
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p className="p-4 text-gray-500">No leads found for these filters.</p>}
        </div>
      );
    } else {
      // Employee View: Today's Assigned vs Other Filtered Leads
      const todaysAssigned = leads.filter(l => l.assigned_date && isToday(parseISO(l.assigned_date)));
      const otherLeads = leads.filter(l => !l.assigned_date || !isToday(parseISO(l.assigned_date)));

      return (
        <div className="flex flex-col gap-8 h-full overflow-y-auto w-full">
          {todaysAssigned.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              <h2 className="text-lg font-bold text-orange-600 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                🔥 Today's Assigned ({todaysAssigned.length})
              </h2>
              <div style={{ height: Math.max(todaysAssigned.length * 35 + 40, 200) }} className="w-full">
                <DataGrid 
                  columns={columns} 
                  rows={todaysAssigned} 
                  onRowsChange={handleRowsChange} 
                  className="custom-data-grid h-full"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded">
              Other Filtered Leads ({otherLeads.length})
            </h2>
            <div style={{ height: Math.max(otherLeads.length * 35 + 40, 200) }} className="w-full">
              <DataGrid 
                columns={columns} 
                rows={otherLeads} 
                onRowsChange={handleRowsChange} 
                className="custom-data-grid h-full"
              />
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex-1 relative flex flex-col p-4 overflow-hidden">
       {renderGrid()}
    </div>
  );
}
