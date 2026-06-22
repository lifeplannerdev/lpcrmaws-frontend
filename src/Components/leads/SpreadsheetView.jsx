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

function PhoneEditor({ row, column, onRowChange, onClose }) {
  const [value, setValue] = useState(row[column.key] || '');
  const [suggestions, setSuggestions] = useState([]);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (value && value.length >= 4) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/leads/?search=${value}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.results || []);
          }
        } catch (e) { console.error(e); }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [value, accessToken]);

  const handleSelect = (lead) => {
    onRowChange({ 
      ...row, 
      ...lead, 
      agenda_type: 'Follow-up', // Default explicitly to follow up if selected
      isNew: true // Keep it marked as new so we know to save it
    }, true);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-center">
      <input
        autoFocus
        className="w-full h-full border-none outline-none px-2 bg-transparent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setTimeout(() => onRowChange({ ...row, [column.key]: value }, true), 200);
        }}
      />
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 w-64 bg-white border shadow-xl z-50 max-h-48 overflow-y-auto rounded-b-md">
          {suggestions.map(s => (
            <div 
              key={s.id} 
              className="p-2 border-b cursor-pointer hover:bg-indigo-50"
              onMouseDown={() => handleSelect(s)}
            >
              <div className="font-semibold text-sm">{s.name || 'No Name'}</div>
              <div className="text-xs text-gray-500">{s.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const columns = [
  { key: 'agenda_type', name: 'Type', width: 100, renderEditCell: textEditor, renderCell: (p) => (
    <span className={`font-semibold text-xs px-2 py-1 rounded ${p.row.agenda_type === 'Follow-up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
      {p.row.agenda_type || 'Fresh'}
    </span>
  )},
  { key: 'created_at', name: 'Date', width: 120, renderCell: (p) => p.row.created_at ? format(parseISO(p.row.created_at), 'dd/MM/yyyy') : '' },
  { key: 'id', name: 'Serial Number', width: 80 },
  { key: 'name', name: 'Name', width: 150, renderEditCell: textEditor },
  { key: 'phone', name: 'Phone Number', width: 150, renderEditCell: PhoneEditor },
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

export default function SpreadsheetView({ leads, onUpdateLead, authFetch, isReportMode = false, onLeadsChange }) {
  const { user } = useAuth();
  const [localLeads, setLocalLeads] = useState(leads || []);

  useEffect(() => {
    setLocalLeads(leads || []);
  }, [leads]);

  // Push updates upwards if in report mode
  useEffect(() => {
    if (isReportMode && onLeadsChange) {
      onLeadsChange(localLeads);
    }
  }, [localLeads, isReportMode]);
  
  // Track updates to push to backend
  const handleRowsChange = async (newRows, { indexes, column }) => {
    const rowIndex = indexes[0];
    const updatedRow = newRows[rowIndex];
    
    // Update local state immediately
    setLocalLeads(newRows);

    if (updatedRow.isNew && !isReportMode) {
        // If it's a new row in LeadsPage, maybe wait for a manual save button?
        // Or if we want to save immediately when they edit:
        if (updatedRow.phone && updatedRow.name && column.key !== 'phone') {
            try {
                // If it has an ID, it means it was auto-filled from an existing lead, we should just update it
                if (updatedRow.id && !String(updatedRow.id).startsWith('temp-')) {
                     const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leads/${updatedRow.id}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [column.key]: updatedRow[column.key] })
                     });
                     if (response.ok) {
                         const data = await response.json();
                         if (onUpdateLead) onUpdateLead(data.lead || data);
                     }
                } else {
                     // Create new lead
                     const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leads/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedRow)
                     });
                     if (response.ok) {
                         const data = await response.json();
                         setLocalLeads(prev => prev.map((l, i) => i === rowIndex ? data.lead || data : l));
                         if (onUpdateLead) onUpdateLead(data.lead || data);
                     }
                }
            } catch(err) { console.error(err); }
        }
        return;
    }

    if (isReportMode) return; // In report mode, we don't auto-save to backend, we just update localLeads

    // Auto-save logic for existing leads
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
    }
  };

  const handleAddRow = () => {
    const newRow = {
      id: `temp-${Date.now()}`,
      agenda_type: 'Follow-up',
      name: '',
      phone: '',
      email: '',
      status: 'ENQUIRY',
      isNew: true
    };
    setLocalLeads([newRow, ...localLeads]);
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
      // If it's report mode, we might just show everything in one list or keep it split
      const todaysAssigned = localLeads.filter(l => l.agenda_type === 'Fresh' || (l.assigned_date && isToday(parseISO(l.assigned_date))));
      const otherLeads = localLeads.filter(l => l.agenda_type === 'Follow-up' || (!l.assigned_date || !isToday(parseISO(l.assigned_date))));

      return (
        <div className="flex flex-col gap-8 h-full overflow-y-auto w-full pb-20">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                <h2 className="text-lg font-bold text-indigo-600">
                  Daily Agenda Leads ({localLeads.length})
                </h2>
                <button onClick={handleAddRow} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition">
                  + Add Row
                </button>
            </div>
            <div style={{ height: Math.max(localLeads.length * 35 + 40, 400) }} className="w-full">
              <DataGrid 
                columns={columns} 
                rows={localLeads} 
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
