import React, { useState } from 'react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { Download, Upload, FileSpreadsheet, Filter, Calendar, Info, Layers } from 'lucide-react';
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

      const response = await fetch(`${API_BASE_URL}/leads/export/excel/?${params.toString()}`, {
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
          <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full mb-4">
              <Upload size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Bulk Import Leads</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
              Upload a CSV or Excel file to bulk import leads into the CRM. Ensure your columns match the required format.
            </p>
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
              Select File to Import
            </button>
            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Info size={16} /> Need a template? <a href="#" className="text-indigo-600 font-bold hover:underline">Download Sample CSV</a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
