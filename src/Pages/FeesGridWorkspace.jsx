import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function FeesGridWorkspace() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [data, setData] = useState([]);
  const [maxPayments, setMaxPayments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batch, setBatch] = useState('');
  const [status, setStatus] = useState('');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const getToken = async () => accessToken || await refreshAccessToken();

  const fetchGridData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (batch) queryParams.append('batch', batch);
      if (status) queryParams.append('status', status);

      const res = await fetch(`${API_BASE_URL}/fees/grid/?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch grid data');
      
      const json = await res.json();
      setData(json.data || []);
      setMaxPayments(json.max_payments || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGridData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (batch) queryParams.append('batch', batch);
      if (status) queryParams.append('status', status);

      const res = await fetch(`${API_BASE_URL}/fees/grid/export/?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to export data');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fees_Grid_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setIsExportModalOpen(false);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Helper to generate ordinals
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col h-[800px]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Spreadsheet View</h2>
          <p className="text-sm text-gray-500 mt-1">Read-only accounting grid mirroring the official Excel format.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchGridData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors border border-gray-200"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-colors"
          >
            <Download size={16} /> Export to Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-inner bg-slate-50/50 relative">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 absolute inset-0 bg-white/50 z-20">Loading spreadsheet data...</div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#4F81BD] text-white sticky top-0 z-10">
              {/* Row 1 Headers */}
              <tr>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">SL NO</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">HANDLED BY</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">DATE OF JOINING</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">NAME</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PH NO</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PARENT NAME</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PARENT NO</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">MAIL ID</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">QUALIFICATION</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">CAMPUS</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">MODE OF STUDY</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PREFERRED COUNTRY</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PREFERRED LEVEL</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PACKAGE CHOSEN</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">TOTAL FEE</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">SPECIAL DISCOUNT</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">PENDING</th>
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">REGISTRATION FEES</th>

                {/* Dynamic Payment Headers */}
                {Array.from({ length: maxPayments }).map((_, i) => (
                  <th key={`payment_header_${i}`} colSpan={3} className="px-4 py-2 border border-[#3e6899] text-center">
                    {getOrdinal(i + 1).toUpperCase()} PAYMENT
                  </th>
                ))}
                
                <th rowSpan={2} className="px-4 py-2 border border-[#3e6899] text-center">STATUS OF FEE</th>
              </tr>
              
              {/* Row 2 Headers (Subheaders for payments) */}
              <tr>
                {Array.from({ length: maxPayments }).map((_, i) => (
                  <React.Fragment key={`payment_sub_${i}`}>
                    <th className="px-4 py-2 border border-[#3e6899] text-center bg-[#4F81BD]">PAID AMOUNT</th>
                    <th className="px-4 py-2 border border-[#3e6899] text-center bg-[#4F81BD]">MODE OF PAYMENT</th>
                    <th className="px-4 py-2 border border-[#3e6899] text-center bg-[#4F81BD]">DATE</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-indigo-50/30">
                  <td className="px-4 py-2 border border-gray-200 text-center text-gray-500">{row.sl_no}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.handled_by}</td>
                  <td className="px-4 py-2 border border-gray-200 text-center">{row.date_of_joining}</td>
                  <td className="px-4 py-2 border border-gray-200 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.ph_no}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.parent_name}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.parent_no}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.mail_id}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.qualification}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.campus}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.mode_of_study}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.preferred_country}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.preferred_level}</td>
                  <td className="px-4 py-2 border border-gray-200">{row.package_chosen}</td>
                  <td className="px-4 py-2 border border-gray-200 text-right font-medium">{row.total_fee}</td>
                  <td className="px-4 py-2 border border-gray-200 text-right text-gray-500">{row.special_discount}</td>
                  <td className="px-4 py-2 border border-gray-200 text-right font-bold text-red-600">{row.pending}</td>
                  <td className="px-4 py-2 border border-gray-200 text-right">{row.registration_fees}</td>
                  
                  {Array.from({ length: maxPayments }).map((_, i) => {
                    const p = row.payments[i] || {};
                    return (
                      <React.Fragment key={`payment_val_${row.id}_${i}`}>
                        <td className="px-4 py-2 border border-gray-200 text-right font-medium text-green-700">{p.amount || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-center">{p.method || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-center text-gray-500">{p.date || '-'}</td>
                      </React.Fragment>
                    );
                  })}
                  
                  <td className="px-4 py-2 border border-gray-200 text-center font-bold">
                    <span className={`px-2 py-1 rounded-md text-xs ${
                      row.status_of_fee === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      row.status_of_fee === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                      row.status_of_fee === 'SETTLED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status_of_fee}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={18 + (maxPayments * 3) + 1} className="px-4 py-12 text-center text-gray-500 bg-white">
                    No data found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Export Spreadsheet</h3>
            
            <form onSubmit={handleExport} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date (Joining)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                <input
                  type="text"
                  placeholder="e.g. A1, B2 ONLINE"
                  value={batch}
                  onChange={e => setBatch(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fee Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="SETTLED">Settled</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Download size={18} /> Download Excel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
