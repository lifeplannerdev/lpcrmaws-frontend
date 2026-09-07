import React, { useState } from 'react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { Download, Upload, FileSpreadsheet, Filter, Calendar, Info, Layers, CheckCircle } from 'lucide-react';
import { allStatusOptions, sourceOptions } from '../Components/utils/leadConstants';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DATE_PRESETS = [
  { value: 'all_time', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DataExportPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('export'); // 'export' or 'import'

  // Filter State
  const [datePreset, setDatePreset] = useState('all_time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedCallType, setSelectedCallType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const toggleStatus = (val) => setSelectedStatuses(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  const toggleSource = (val) => setSelectedSources(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing your elaborate Excel report...');

    try {
      const params = new URLSearchParams();
      
      if (datePreset === 'custom' && startDate && endDate) {
        params.set('date_preset', 'custom');
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      } else if (datePreset !== 'custom') {
        params.set('date_preset', datePreset);
      }
      
      if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
      if (selectedSources.length) params.set('source', selectedSources.join(','));
      if (selectedCallType !== 'all') params.set('call_type', selectedCallType);

      const response = await fetch(`${API_BASE_URL}/leads/export/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) throw new Error('Failed to generate export file');

      // Trigger File Download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export data.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigneeList, setAssigneeList] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);

  React.useEffect(() => {
    if (activeTab === 'import' && assigneeList.length === 0) {
      fetch(`${API_BASE_URL}/leads/available-users/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => setAssigneeList(data))
        .catch(err => console.error('Failed to fetch available users:', err));
    }
  }, [activeTab, accessToken, assigneeList.length]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setPreviewResult(null);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading('Analyzing spreadsheet format and rows...');
    try {
      const res = await fetch(`${API_BASE_URL}/leads/bulk-upload/preview/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to preview file');
      }

      const data = await res.json();
      setPreviewResult(data);
      toast.success(`Found ${data.valid_count} valid leads ready for import!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to analyze file.', { id: toastId });
      setImportFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || !previewResult.valid_rows?.length) return;
    setIsConfirming(true);
    const toastId = toast.loading(`Importing ${previewResult.valid_rows.length} leads...`);

    try {
      const res = await fetch(`${API_BASE_URL}/leads/bulk-upload/confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          valid_rows: previewResult.valid_rows,
          assigned_to: selectedAssignee || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import leads');
      }

      const data = await res.json();
      setImportSuccess(data);
      setPreviewResult(null);
      setImportFile(null);
      toast.success(data.message || 'Leads imported successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to confirm import.', { id: toastId });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Data Center</h1>
            <p className="text-sm text-slate-500 mt-1">Export elaborative multi-sheet reports or import raw data to the CRM.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'export' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Download size={16} /> Export Reports
            </div>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'import' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={16} /> Import Data
            </div>
          </button>
        </div>

        {activeTab === 'export' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Date Filter Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" /> Date Range
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {DATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setDatePreset(p.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        datePreset === p.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500" />
                    </div>
                    <div className="text-slate-400 mt-5">to</div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Filters Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Filter size={16} className="text-indigo-500" /> Granular Filters
                </h3>
                
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Lead Status</p>
                  <div className="flex flex-wrap gap-2">
                    {allStatusOptions.map(s => (
                      <button
                        key={s.value}
                        onClick={() => toggleStatus(s.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          selectedStatuses.includes(s.value)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Lead Source</p>
                  <div className="flex flex-wrap gap-2">
                    {sourceOptions.map(s => (
                      <button
                        key={s.value}
                        onClick={() => toggleSource(s.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          selectedSources.includes(s.value)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Call Type (Voxbay)</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All Call Types' },
                      { value: 'incoming', label: 'Incoming Calls Only' },
                      { value: 'outgoing', label: 'Outgoing Calls Only' },
                    ].map(ct => (
                      <button
                        key={ct.value}
                        onClick={() => setSelectedCallType(ct.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          selectedCallType === ct.value
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
                
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gradient-to-b from-indigo-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl sticky top-24">
                <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                  <Layers size={20} className="text-indigo-400" /> Export Summary
                </h3>
                <p className="text-indigo-200 text-sm mb-6 opacity-80 leading-relaxed">
                  Your Excel report will contain multiple color-coded sheets organizing leads, complete follow-up trails, and remark histories.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-indigo-200">Date Range</span>
                    <span className="text-xs font-bold">{DATE_PRESETS.find(p => p.value === datePreset)?.label || 'Custom'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-indigo-200">Call Type</span>
                    <span className="text-xs font-bold capitalize">{selectedCallType === 'all' ? 'All Calls' : selectedCallType}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-indigo-200">Status Filters</span>
                    <span className="text-xs font-bold">{selectedStatuses.length ? `${selectedStatuses.length} selected` : 'All'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-indigo-200">Source Filters</span>
                    <span className="text-xs font-bold">{selectedSources.length ? `${selectedSources.length} selected` : 'All'}</span>
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isExporting || (datePreset === 'custom' && (!startDate || !endDate))}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  {isExporting ? 'Generating Excel...' : 'Export Excel Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="max-w-xl mx-auto text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
                  <Upload size={28} />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">Bulk Import Leads</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Select a CSV or Excel spreadsheet (.xlsx, .xls) to validate and bulk import new leads into the CRM.
                </p>

                <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
                  <Upload size={18} />
                  <span>{isUploading ? 'Analyzing File...' : 'Select File (.xlsx / .csv)'}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Info size={14} className="text-indigo-500" /> Need the standard column template? 
                  <a href="/leads_bulk_upload_template.xlsx" download className="text-indigo-600 font-bold hover:underline">
                    Download Template (.xlsx)
                  </a>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {previewResult && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Upload Validation Results</h3>
                    <p className="text-xs text-slate-500">Review rows before confirming lead ingestion.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg">
                      {previewResult.valid_count} Valid Leads Ready
                    </span>
                    {previewResult.failed_count > 0 && (
                      <span className="px-3 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-lg">
                        {previewResult.failed_count} Duplicate/Failed Rows
                      </span>
                    )}
                  </div>
                </div>

                {/* Valid rows preview table */}
                {previewResult.valid_rows?.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewResult.valid_rows.slice(0, 50).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-800">{r.name || '—'}</td>
                            <td className="px-3 py-2 font-mono">{r.phone}</td>
                            <td className="px-3 py-2">{r.email || '—'}</td>
                            <td className="px-3 py-2">{r.location || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Assignee & Confirm button */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assign Imported Leads To (Optional):</label>
                    <select
                      value={selectedAssignee}
                      onChange={e => setSelectedAssignee(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none"
                    >
                      <option value="">-- Leave Unassigned / Auto --</option>
                      {assigneeList.map(u => (
                        <option key={u.id} value={u.username}>
                          {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username} ({u.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isConfirming || previewResult.valid_count === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    {isConfirming ? 'Importing Leads...' : `Confirm & Ingest ${previewResult.valid_count} Leads`}
                  </button>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {importSuccess && (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle size={32} className="text-emerald-600 mx-auto" />
                <h3 className="text-lg font-black text-emerald-900">Import Completed Successfully!</h3>
                <p className="text-xs text-emerald-700">{importSuccess.message || 'All valid leads have been registered into the CRM database.'}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
