import React, { useState, useEffect } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Combobox } from '../common/Combobox';

const columns = [
  { key: 'date', name: 'Date' },
  { key: 'serial_number', name: 'Serial Number' },
  { key: 'name', name: 'Name' },
  { key: 'phone', name: 'Phone Number' },
  { key: 'email', name: 'Email Address' },
  { key: 'interested_country', name: 'Interested Country' },
  { key: 'interested_course', name: 'Interested Course' },
  { key: 'previous_qualification', name: 'Previous Qual.' },
  { key: 'work_experience', name: 'Work Experience' },
  { key: 'location', name: 'Location' },
  { key: 'budget', name: 'Budget' },
  { key: 'status', name: 'Status of Interest' },
];

export default function BulkPasteModal({ isOpen, onClose, onSuccess, authFetch }) {
  const [rows, setRows] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setRows([]);
      setAssigneeId('');
      setError('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leads/available-users/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setAvailableUsers(data);
      } else {
        console.error('Expected array of users but got:', data);
        setAvailableUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setAvailableUsers([]);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('Text');
    
    if (!pastedData) return;

    // Split using \r?\n to cleanly remove hidden carriage returns from Excel
    const parsedRows = pastedData.split(/\r?\n/).filter(r => r.trim()).map((line, idx) => {
      const cols = line.split('\t');
      return {
        id: idx,
        date: cols[0] || '',
        serial_number: cols[1] || '',
        name: cols[2] || '',
        phone: cols[3] || '',
        email: cols[4] || '',
        interested_country: cols[5] || '',
        interested_course: cols[6] || '',
        previous_qualification: cols[7] || '',
        work_experience: cols[8] || '',
        location: cols[9] || '',
        budget: cols[10] || '',
        status: cols[11] || 'ENQUIRY',
      };
    });

    // Ensure they have a phone number at minimum
    const validRows = parsedRows.filter(r => r.phone && r.phone.trim() !== '');
    if (validRows.length !== parsedRows.length) {
      setError(`Ignored ${parsedRows.length - validRows.length} rows missing phone numbers.`);
    }

    setRows(validRows);
  };

  const handleSubmit = async () => {
    if (!assigneeId) {
      setError('Please select an assignee.');
      return;
    }
    if (rows.length === 0) {
      setError('Please paste some data first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/leads/bulk-paste/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee_id: assigneeId,
          leads: rows
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to submit leads.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit leads.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'ADMIN': 'General Manager',
      'OPS': 'Operations Manager',
      'ADM_MANAGER': 'Admission Manager',
      'ADM_COUNSELLOR': 'Admission Counsellor',
      'ADM_EXEC': 'Admission Executive',
      'CM': 'Center Manager',
      'BDM': 'Business Development Manager',
      'FOE': 'FOE Cum TC',
    };
    return roleMap[role] || role;
  };

  // The backend already filters availableUsers to only those with assignable roles
  const staffOptions = availableUsers.map(staff => ({
    id: staff.id,
    label: `${staff.first_name || staff.last_name ? (staff.first_name + ' ' + staff.last_name).trim() : staff.username || staff.email} - ${getRoleDisplayName(staff.role)}`,
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            Bulk Paste Leads
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-auto flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-64 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select Assignee</option>
              {staffOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click in the box below and press <strong>Ctrl+V</strong> to paste from Excel. Ensure columns match the headers exactly.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div 
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative min-h-[400px] outline-none focus-within:ring-2 focus-within:ring-indigo-500"
            tabIndex={0}
            onPaste={handlePaste}
          >
            <DataGrid
              columns={columns}
              rows={rows}
              className="h-full w-full custom-data-grid"
              style={{ height: '100%', minHeight: '400px' }}
            />
            {rows.length === 0 && (
              <div className="absolute inset-0 top-[40px] flex items-center justify-center bg-white/50 dark:bg-gray-900/50 pointer-events-none">
                <div className="text-center">
                  <span className="inline-block text-gray-600 dark:text-gray-300 font-medium bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    Click anywhere inside this grid and press <strong>Ctrl+V</strong> to paste data
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || rows.length === 0 || !assigneeId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Processing...' : 'Save & Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
