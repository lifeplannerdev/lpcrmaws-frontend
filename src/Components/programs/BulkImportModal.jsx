import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { X, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const normalizeHeaderKey = (rawKey) =>
  String(rawKey || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const PROGRAMS_HEADER_MAP = {
  SL_NO: 'sl_no',
  SLNO: 'sl_no',
  PROJECT: 'project',
  COUNTRY: 'country',
  ASSIGNEMNT: 'assignment', // Matches typo in source Google Sheet
  ASSIGNMENT: 'assignment',
  COMPLETED: 'completed',
  PRESENTATION: 'presentation',
  TRAINING_TO_TEAM: 'training_to_team',
};

const STUDENTS_HEADER_MAP = {
  SL_NO: 'sl_no',
  SLNO: 'sl_no',
  NAME: 'name',
  AGE: 'age',
  PHONE: 'phone',
  EMAIL_ADDRESS: 'email_address',
  EMAIL: 'email_address',
  PLACE: 'place',
  QUALIFICATION: 'qualification',
  PREFERRED_COUNTRY: 'preferred_country',
  PREFERRED_PROGRAM: 'preferred_program',
  INTAKE: 'intake',
  APS_STATUS: 'aps_status',
  IELTS_STATUS: 'ielts_status',
  GERMAN_STATUS: 'german_status',
};

const parseIntOrNull = (val) => {
  const cleaned = String(val ?? '').trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const mapImportedRows = (rawRows, mode) => {
  const headerMap = mode === 'programs' ? PROGRAMS_HEADER_MAP : STUDENTS_HEADER_MAP;
  const mapped = [];

  for (const row of rawRows) {
    const out = {};
    let hasContent = false;

    Object.entries(row || {}).forEach(([k, v]) => {
      const targetField = headerMap[normalizeHeaderKey(k)];
      if (!targetField) return;
      const strVal = String(v ?? '').trim();
      if (targetField === 'sl_no' || targetField === 'age') {
        out[targetField] = parseIntOrNull(strVal);
      } else {
        out[targetField] = strVal;
        if (strVal !== '') {
          hasContent = true;
        }
      }
    });

    if (hasContent) {
      mapped.push(out);
    }
  }

  return mapped;
};

const getStaffLabel = (staff) =>
  staff.full_name ||
  `${staff.first_name || ''} ${staff.last_name || ''}`.trim() ||
  staff.username ||
  `Staff #${staff.id}`;

const BulkImportModal = ({
  isOpen,
  onClose,
  mode, // 'programs' | 'students'
  endpointPrefix,
  staffList = [],
  accessToken,
  onImported,
}) => {
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [defaultAssignedTo, setDefaultAssignedTo] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isPrograms = mode === 'programs';
  const expectedHeaders = isPrograms
    ? ['SL.NO.', 'PROJECT', 'COUNTRY', 'ASSIGNMENT', 'COMPLETED', 'PRESENTATION', 'TRAINING TO TEAM']
    : [
        'SL NO',
        'NAME',
        'AGE',
        'PHONE',
        'EMAIL ADDRESS',
        'PLACE',
        'QUALIFICATION',
        'PREFERRED COUNTRY',
        'PREFERRED PROGRAM',
        'INTAKE',
        'APS STATUS',
        'IELTS STATUS',
        'GERMAN STATUS',
      ];

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setParsedRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError('The selected workbook has no sheets.');
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      const mapped = mapImportedRows(rawRows, mode);
      if (mapped.length === 0) {
        setParseError('No valid data rows matched the expected column headers.');
        return;
      }
      setParsedRows(mapped);
    } catch (err) {
      setParseError(err?.message || 'Unable to parse the selected spreadsheet.');
    }
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        rows: parsedRows,
        default_assigned_to: defaultAssignedTo ? Number(defaultAssignedTo) : null,
      };
      const res = await axios.post(`${API_BASE_URL}/${endpointPrefix}/bulk-import/`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success(`Imported ${res.data?.created_count ?? parsedRows.length} rows`);
      setFileName('');
      setParsedRows([]);
      setDefaultAssignedTo('');
      onImported?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.rows?.[0] || 'Import failed';
      toast.error(typeof detail === 'string' ? detail : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const previewKeys = isPrograms
    ? ['sl_no', 'project', 'country', 'assignment', 'completed', 'presentation', 'training_to_team']
    : ['sl_no', 'name', 'age', 'phone', 'email_address', 'place', 'preferred_country', 'preferred_program'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Import Spreadsheet">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Import {isPrograms ? 'Assigned Programs' : 'Assigned Students Database'} (.xlsx / .csv)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 max-h-[75vh] overflow-y-auto">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Recognized Headers: </span>
            {expectedHeaders.join(', ')}
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
            <Upload className="h-7 w-7 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-slate-800">
              {fileName || 'Click to choose an .xlsx or .csv file'}
            </span>
            <span className="mt-1 text-xs text-slate-500">First sheet will be parsed automatically</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div>
            <label htmlFor="bulk-import-assignee" className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
              Default Assigned Staff (Optional — Documentation / Operation)
            </label>
            <select
              id="bulk-import-assignee"
              value={defaultAssignedTo}
              onChange={(e) => setDefaultAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {getStaffLabel(staff)}
                </option>
              ))}
            </select>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Ready to import {parsedRows.length} rows (showing first 5)</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {previewKeys.map((k) => (
                        <th key={k} className="px-2.5 py-2 text-left font-semibold uppercase text-slate-700 whitespace-nowrap">
                          {k.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.slice(0, 5).map((r, idx) => (
                      <tr key={idx}>
                        {previewKeys.map((k) => (
                          <td key={k} className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                            {r[k] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {parsedRows.length > 0 ? `${parsedRows.length} Rows` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
