import React, { useState, useRef } from 'react';
import { Plus, Sparkles, Upload, X, CheckCircle, AlertCircle, FileSpreadsheet, Loader2, Info, Download } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../context/PermissionsContext';
import BulkPasteModal from './BulkPasteModal';

const TEMPLATE_URL = '/leads_bulk_upload_template.xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ─────────────────────────────────────────────────────────────
   Inline helper: coloured pill
───────────────────────────────────────────────────────────── */
const Pill = ({ children, color = 'blue' }) => {
  const palettes = {
    blue:   'bg-blue-100   text-blue-700',
    green:  'bg-green-100  text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    gray:   'bg-gray-100   text-gray-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${palettes[color]}`}>
      {children}
    </span>
  );
};


const BulkUploadModal = ({ onClose, authFetch }) => {
  const fileInputRef = useRef(null);
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError]         = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/leads/available-users/`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [authFetch]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected || null);
    setPreviewResult(null);
    setFinalResult(null);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setPreviewResult(null); setFinalResult(null); setError(''); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setPreviewResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch(`${API_BASE_URL}/leads/bulk-upload/preview/`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed. Please try again.'); return; }
      setPreviewResult(data);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewResult || !previewResult.valid_rows?.length || !selectedUser) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE_URL}/leads/bulk-upload/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: previewResult.valid_rows,
          assigned_to: selectedUser
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Assignment failed. Please try again.'); return; }
      setFinalResult(data);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFile(null); setPreviewResult(null); setFinalResult(null); setError(''); setSelectedUser('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">

        {/* ── Header ── */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bulk Upload Leads</h2>
              <p className="text-indigo-100 text-sm">Upload an Excel file to import and assign multiple leads</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {!previewResult && !finalResult && (
            <>
              {/* ── Column reference card ── */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-indigo-50 border-b border-gray-200 px-4 py-3">
                  <p className="text-indigo-800 text-xs font-bold uppercase tracking-wider mb-2">
                    Template Columns
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['name', 'phone', 'email', 'location'].map(col => (
                      <Pill key={col} color="blue">{col}</Pill>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border-t border-blue-100 px-4 py-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-xs text-blue-700">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    <span>
                      The system accepts a headerless Excel file or a standard one. Ensure the first 4 columns are Name, Phone, Email, Location.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-blue-700">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>phone</strong> — digits only, minimum 10 digits. Must be unique.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-blue-700">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    <span>Max file size: <strong>5 MB</strong>. Accepted formats: <strong>.xlsx, .xls</strong></span>
                  </div>
                </div>
              </div>

              {/* ── Drop zone ── */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet size={24} className="text-indigo-600" />
                    </div>
                    <p className="font-bold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="text-xs text-red-500 hover:text-red-700 underline mt-1"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Upload size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Drop your Excel file here</p>
                      <p className="text-sm">or click to browse (.xlsx, .xls)</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Preview Result ── */}
          {previewResult && !finalResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Data Preview</h3>
                <button onClick={reset} className="text-sm text-indigo-600 hover:underline">Upload a different file</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-green-700">{previewResult.valid_count}</span>
                  <span className="text-sm font-medium text-green-600">Valid Leads Ready</span>
                </div>
                <div className={`border rounded-xl p-4 flex flex-col items-center justify-center ${
                  previewResult.failed_count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className={`text-3xl font-extrabold ${previewResult.failed_count > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    {previewResult.failed_count}
                  </span>
                  <span className={`text-sm font-medium ${previewResult.failed_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    Failed/Duplicate Rows
                  </span>
                </div>
              </div>

              {previewResult.failed_rows?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle size={16}/> Failed Rows (will be skipped):</p>
                  <ul className="space-y-1.5">
                    {previewResult.failed_rows.map((r, i) => (
                      <li key={i} className="text-xs text-red-700 bg-white px-3 py-2 rounded-lg border border-red-100">
                        <strong>Row {r.row}:</strong> {r.error} {r.data?.name ? `(${r.data.name})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewResult.valid_rows?.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col h-64">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Valid Leads Preview</p>
                  </div>
                  <div className="overflow-auto flex-1 bg-white">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-gray-700">Name</th>
                          <th className="px-4 py-2 font-semibold text-gray-700">Phone</th>
                          <th className="px-4 py-2 font-semibold text-gray-700">Email</th>
                          <th className="px-4 py-2 font-semibold text-gray-700">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewResult.valid_rows.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">{r.name || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{r.phone}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{r.email || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{r.location || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assignee Selection */}
              {previewResult.valid_rows?.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-indigo-900 mb-2">Select Assignee for {previewResult.valid_count} Leads</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-white border border-indigo-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                  >
                    <option value="">-- Choose Assignee --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.username}>{u.first_name} {u.last_name} ({u.username})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Final Result ── */}
          {finalResult && (
            <div className="space-y-4 text-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Upload & Assignment Complete!</h3>
              <p className="text-gray-600">
                Successfully created and assigned <strong className="text-indigo-600">{finalResult.success_count}</strong> leads to <strong className="text-indigo-600">{selectedUser}</strong>.
              </p>
            </div>
          )}

        </div>

        {/* ── Fixed Footer Actions ── */}
        <div className="shrink-0 bg-white border-t border-gray-100 p-6 flex items-center justify-end rounded-b-3xl z-10">
          {!previewResult && !finalResult ? (
            <div className="flex gap-3 w-full">
              <button onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  !file || uploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing Preview…</>
                ) : (
                  <><Upload size={18} /> Preview Leads</>
                )}
              </button>
            </div>
          ) : previewResult && !finalResult ? (
             <div className="flex gap-3 w-full">
              <button onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedUser || submitting || previewResult.valid_count === 0}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  !selectedUser || submitting || previewResult.valid_count === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                ) : (
                  <><CheckCircle size={18} /> Confirm & Assign</>
                )}
              </button>
            </div>
          ) : (
            <button onClick={() => { onClose(); window.location.reload(); }}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   LeadsPageHeader  (unchanged except it opens the fixed modal)
───────────────────────────────────────────────────────────── */
const LeadsPageHeader = () => {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);

  const authFetch = async (url, options = {}, retry = true) => {
    if (!accessToken) throw new Error('No access token');
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401 && retry) {
      const tok = await refreshAccessToken();
      if (!tok) throw new Error('Session expired');
      return authFetch(url, options, false);
    }
    return res;
  };

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Leads Management
              </h1>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <p className="text-gray-600 text-lg font-medium">
              Manage and track all your leads with powerful insights
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Can perform="leads:create">
              <button
                onClick={() => setShowPasteModal(true)}
                className="group relative bg-white border-2 border-green-300 hover:border-green-500 text-green-600 hover:text-green-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <FileSpreadsheet size={18} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                <span>Bulk Paste</span>
              </button>
            </Can>

            <Can perform="leads:create">
              <button
                onClick={() => setShowBulkModal(true)}
                className="group relative bg-white border-2 border-indigo-300 hover:border-indigo-500 text-indigo-600 hover:text-indigo-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform duration-300" />
                <span>Bulk Upload</span>
              </button>
            </Can>

            <Can perform="leads:create">
              <button
                onClick={() => navigate('/addnewlead')}
                className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Plus size={20} className="relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                <span className="relative z-10">Add New Lead</span>
                <Sparkles size={16} className="relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />
              </button>
            </Can>
          </div>
        </div>
      </div>

      {showBulkModal && (
        <BulkUploadModal onClose={() => setShowBulkModal(false)} authFetch={authFetch} />
      )}
      
      {showPasteModal && (
        <BulkPasteModal 
          isOpen={showPasteModal} 
          onClose={() => setShowPasteModal(false)} 
          authFetch={authFetch}
          onSuccess={() => {
            setShowPasteModal(false);
            window.location.reload();
          }} 
        />
      )}
    </>
  );
};

export default LeadsPageHeader;
