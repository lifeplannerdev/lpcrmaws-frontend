import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid, renderTextEditor as textEditor } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { format, isToday, parseISO, isSameDay, subDays } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../context/PermissionsContext';

const STATUS_OPTIONS = [
  'ENQUIRY', 'JOB_ENQUIRY', 'CONTACTED', 'QUALIFIED', 'NOT_INTERESTED',
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



function NameEditor({ row, column, onRowChange, onClose }) {
  const [value, setValue] = useState(row[column.key] || '');
  const [suggestions, setSuggestions] = useState([]);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (value && value.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/leads/?search=${encodeURIComponent(value)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            let fetchedSuggestions = [];
            if (data && data.results && Array.isArray(data.results.leads)) {
              fetchedSuggestions = data.results.leads;
            } else if (data && Array.isArray(data.results)) {
              fetchedSuggestions = data.results;
            } else if (Array.isArray(data)) {
              fetchedSuggestions = data;
            }
            setSuggestions(fetchedSuggestions);
          }
        } catch (e) { console.error(e); }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [value, accessToken]);

  const listId = `name-suggestions-${row.id}`;

  return (
    <div className="w-full h-full">
      <input
        autoFocus
        list={listId}
        className="w-full h-full border-none outline-none px-2 bg-transparent"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          setValue(val);
          onRowChange({ ...row, [column.key]: val });
          const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
          const match = safeSuggestions.find(s => s.name === val);
          if (match) {
            onRowChange({ 
              ...row, 
              ...match, 
              agenda_type: 'Follow-up', 
              isNew: false 
            }, true);
            setSuggestions([]);
          }
        }}
        onBlur={() => {
          if (row.isNew) {
            onRowChange({ ...row, [column.key]: value, agenda_type: 'Fresh' }, true);
          } else {
            onRowChange({ ...row, [column.key]: value }, true);
          }
        }}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map(s => (
            <option key={s.id} value={s.name}>
              {s.phone ? `(${s.phone})` : ''}
            </option>
          ))}
        </datalist>
      )}
    </div>
  );
}

const columns = [
  { key: 'agenda_type', name: 'Type', width: 100, renderCell: (p) => (
    <span className={`font-semibold text-xs px-2 py-1 rounded ${p.row.agenda_type === 'Follow-up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
      {p.row.agenda_type || 'Fresh'}
    </span>
  )},
  { key: 'created_at', name: 'Date', width: 120, renderCell: (p) => p.row.created_at ? format(parseISO(p.row.created_at), 'dd/MM/yyyy') : '' },
  { key: 'id', name: 'Serial Number', width: 80 },
  { key: 'name', name: 'Name', width: 150, renderEditCell: NameEditor },
  { key: 'phone', name: 'Phone Number', width: 150, renderEditCell: textEditor },
  { key: 'email', name: 'Email Address', width: 200, renderEditCell: textEditor },
  { key: 'interested_country', name: 'Interested Country', width: 150, renderEditCell: textEditor },
  { key: 'interested_course', name: 'Interested Course', width: 200, renderEditCell: textEditor },
  { key: 'previous_qualification', name: 'Previous Qual.', width: 150, renderEditCell: textEditor },
  { key: 'work_experience', name: 'Work Experience', width: 150, renderEditCell: textEditor },
  { key: 'location', name: 'Location', width: 150, renderEditCell: textEditor },
  { key: 'budget', name: 'Budget', width: 120, renderEditCell: textEditor },
  { key: 'remarks', name: 'Remarks', width: 200, renderEditCell: textEditor },
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
    setLocalLeads(prev => {
      const tempRows = prev.filter(l => String(l.id).startsWith('temp-'));
      const incoming = [...(leads || [])];
      // Sort incoming leads newest first chronologically
      incoming.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      const incomingIds = new Set(incoming.map(l => l.id));
      const uniqueTempRows = tempRows.filter(l => !incomingIds.has(l.id));
      return [...uniqueTempRows, ...incoming];
    });
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
    const oldRow = localLeads[rowIndex];
    const updatedRow = newRows[rowIndex];
    
    // Detect if an existing lead was just selected from the NameEditor (isNew flips from true to false)
    const justLinkedExistingLead = oldRow.isNew && !updatedRow.isNew && updatedRow.id && !String(updatedRow.id).startsWith('temp-');

    // Update local state immediately
    setLocalLeads(newRows);

    // If an existing lead was selected, auto-create a Follow-up for today so it stays in the Daily Agenda
    if (justLinkedExistingLead && !isReportMode) {
      try {
        const followupPayload = {
          lead: updatedRow.id,
          follow_up_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          followup_type: 'call',
          phone_number: updatedRow.phone || 'N/A',
          name: updatedRow.name || ''
        };
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/followups/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followupPayload)
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('Failed to auto-create follow-up:', res.status, errText);
        } else {
          // Notify parent so the linked lead is added to the main leads array and doesn't disappear on re-renders
          if (onUpdateLead) onUpdateLead(updatedRow);
        }
      } catch (err) {
        console.error('Failed to auto-create follow-up:', err);
      }
      return; // Skip normal PATCH because we only linked the lead, not modified its core data
    }

    if (updatedRow.isNew && !isReportMode) {
        // If it's a new row in LeadsPage, maybe wait for a manual save button?
        // Or if we want to save immediately when they edit:
        if (updatedRow.phone && updatedRow.name) {
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

  const isManager = user?.role_names?.some(r => ['SUPERADMIN', 'COMPANY_ADMIN', 'MD', 'DIRECTOR', 'GENERAL_MANAGER'].includes(r));

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
            {isReportMode ? (
              <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                  <h2 className="text-lg font-bold text-indigo-600">
                    Daily Agenda Leads ({localLeads.length})
                  </h2>
                  <button onClick={handleAddRow} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition">
                    + Add Row
                  </button>
              </div>
            ) : (
              <div className="flex items-center justify-end px-4 py-2">
                <Can perform="leads:create">
                  <button onClick={handleAddRow} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition">
                    + Add Row
                  </button>
                </Can>
              </div>
            )}
            <div className="rounded-lg border shadow-sm bg-white overflow-hidden" style={{ minHeight: '300px', height: '600px' }}>
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
