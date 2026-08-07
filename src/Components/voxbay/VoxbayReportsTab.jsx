import React, { useState, useEffect } from 'react';
import { Download, Calendar, User, FileText, AlertCircle, Loader2, Phone } from 'lucide-react';
import { format, subDays } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function VoxbayReportsTab({ accessToken }) {
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  
  const [dateRange, setDateRange] = useState('today'); // 'today', 'yesterday', 'custom'
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [callType, setCallType] = useState('all');
  
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch agents for the dropdown
    fetch(`${API_BASE}/voxbay/settings/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setAgents(data);
        setLoadingAgents(false);
      })
      .catch(() => setLoadingAgents(false));
  }, [accessToken]);

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    
    let start, end;
    if (dateRange === 'today') {
      start = format(new Date(), 'yyyy-MM-dd');
      end = start;
    } else if (dateRange === 'yesterday') {
      start = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      end = start;
    } else {
      start = customStart;
      end = customEnd;
    }

    try {
      let url = `${API_BASE}/voxbay/reports/export/?start_date=${start}&end_date=${end}`;
      if (selectedAgent !== 'all') {
         url += `&agent_id=${selectedAgent}`;
      }
      if (callType !== 'all') {
         url += `&call_type=${callType}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download report');
      }

      // Handle file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Try to get filename from content-disposition header if available, otherwise fallback
      const disposition = response.headers.get('content-disposition');
      let filename = `Voxbay_Report_${start}_to_${end}.xlsx`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileText className="text-emerald-500" size={20} />
            Generate Detailed Reports
          </h2>
          <p className="text-gray-500 text-xs mt-1">Export rich Excel files containing call logs matched with CRM Leads data.</p>
        </div>
      </div>

      <div className="p-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Agent Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <User size={16} className="text-gray-400" />
              Select Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full sm:w-96 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
            >
              <option value="all">All Agents</option>
              {!loadingAgents && agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            {loadingAgents && <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading agents...</p>}
          </div>

          {/* Call Type Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Phone size={16} className="text-gray-400" />
              Call Type
            </label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              className="w-full sm:w-96 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
            >
              <option value="all">All Calls</option>
              <option value="incoming">Incoming Calls Only</option>
              <option value="outgoing">Outgoing Calls Only</option>
            </select>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Calendar size={16} className="text-gray-400" />
              Date Range
            </label>
            
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {['today', 'yesterday', 'custom'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                    dateRange === range 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 w-full sm:w-96">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-gray-400 font-bold text-sm">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-gray-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download size={18} />
              Download Excel Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
