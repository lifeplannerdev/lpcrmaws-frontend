import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import Pagination from '../Components/common/Pagination';
import { Calendar, FileText, Download, FolderOpen, TrendingUp, Clock, CheckCircle, Eye, AlertCircle, XCircle, Paperclip } from 'lucide-react';
import { downloadCSV, downloadPDF } from '../utils/exportUtils';

const ReportRow = React.memo(({ report, isLate, getStatusBadge, navigate, downloadFile }) => {
  return (
    <tr className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${isLate ? 'bg-red-50/50' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${isLate ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} rounded-lg flex items-center justify-center shadow-md`}>
            <FileText className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{report.name}</span>
            <div className="flex flex-col items-start gap-1 mt-1">
              {report.agenda_late_by && <span className="text-[10px] text-yellow-700 font-bold bg-yellow-100 px-2 py-0.5 rounded-md border border-yellow-200">Late Agenda ({report.agenda_late_by})</span>}
              {report.report_late_by && <span className="text-[10px] text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-md border border-red-200">Late Report ({report.report_late_by})</span>}
              {isLate && !report.agenda_late_by && !report.report_late_by && <span className="text-[10px] text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-md border border-red-200">Late Submission</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-700 font-medium">{report.report_heading || report.agenda_heading || 'Daily Report'}</span>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-700">{report.user_name || 'N/A'}</td>
      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
        <div>{report.report_date}</div>
        <div className="text-[10px] text-gray-400 mt-1 font-normal">
          {report.agenda_submitted_at && (
            <div>Agenda: {new Date(report.agenda_submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          )}
          {report.report_submitted_at && (
            <div>Report: {new Date(report.report_submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          )}
        </div>
        {report.status !== 'missing' && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-md text-xs font-semibold text-gray-600 w-max">
            Progress: {report.completion_percentage}%
          </div>
        )}
      </td>
      <td className="px-6 py-4">{getStatusBadge(report)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {/* View Report Details */}
          {report.status !== 'missing' && (
            <button
              onClick={() => navigate(`/reports/view/${report.id}`)}
              className="p-2.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
              title="View Report Details"
            >
              View
            </button>
          )}

          {/* Download Attachments */}
          {report.status !== 'missing' && report.attachments?.length > 0 && (
            <button
              onClick={() => downloadFile(report.attachments[0])}
              className="p-2.5 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
              title={`Download ${report.attachments[0].original_filename || 'attachment'}`}
            >
              <div className="flex items-center gap-1">
                <Download size={18} />
                {report.attachments.length > 1 && (
                  <span className="text-xs font-bold bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {report.attachments.length}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export default function ReportsPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState('this-month');
  const [recentReports, setRecentReports] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [companyFilter, setCompanyFilter] = useState(user?.company || 'LP');
  
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLateness, setSelectedLateness] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);

  const PAGE_SIZE = 50;
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchStats = async () => {
    if (!accessToken) return;
    try {
      const params = {};
      if (companyFilter) params.company = companyFilter;
      if (selectedEmployee && selectedEmployee !== 'all') params.user = selectedEmployee;
      if (selectedDate && selectedDate !== 'all') params.date = selectedDate;
      if (searchTerm) params.search = searchTerm;
      
      const res = await axios.get(`${API_BASE}/admin/reports/stats/`, {
        params,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStatsData(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchEmployees = async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API_BASE}/staffs/?is_active=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEmployees(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchReports = async (pageNumber = 1) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = { page: pageNumber, page_size: PAGE_SIZE };
      if (companyFilter) params.company = companyFilter;
      if (selectedEmployee && selectedEmployee !== 'all') params.user = selectedEmployee;
      if (selectedDate && selectedDate !== 'all') params.date = selectedDate;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedLateness && selectedLateness !== 'all') params.lateness = selectedLateness;
      if (searchTerm) params.search = searchTerm;
      if (selectedLateness === 'missing') {
        const res = await axios.get(`${API_BASE}/admin/reports/missing/`, {
          params,
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const dummyReports = (res.data || []).map(u => ({
           id: `missing-${u.id}`,
           user_name: u.name,
           name: u.name,
           report_heading: 'Did Not Submit',
           status: 'missing',
           report_date: selectedDate && selectedDate !== 'all' ? selectedDate : new Date().toISOString().split('T')[0],
           completion_percentage: 0,
           attachments: []
        }));
        setRecentReports(dummyReports);
        setTotalCount(dummyReports.length);
        setTotalPages(1);
      } else {
        const res = await axios.get(`${API_BASE}/admin/reports/`, {
          params,
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        setRecentReports(res.data.results || []);
        setTotalCount(res.data.count || 0);
        setTotalPages(Math.ceil((res.data.count || 0) / PAGE_SIZE));
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [accessToken]);

  useEffect(() => {
    fetchStats();
  }, [accessToken, companyFilter, selectedEmployee, selectedDate, searchTerm]);

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [companyFilter, selectedEmployee, selectedDate, selectedStatus, selectedLateness, searchTerm]);

  useEffect(() => {
    if (page !== 1) {
      fetchReports(page);
    }
  }, [accessToken, page]);


  // ── Download via Django proxy ─────────────────────────────────────────────
  // Django fetches from Cloudinary server-side and responds with
  // Content-Disposition: attachment; filename="original_name.pdf"
  const downloadFile = useCallback(async (attachment) => {
    if (!attachment?.id) return;
    try {
      const response = await fetch(
        `${API_BASE}/reports/attachments/${attachment.id}/download/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename = attachment.original_filename || 'download';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  }, [accessToken, API_BASE]);

  const getStatusBadge = useCallback((report) => {
    const status = report.status?.toLowerCase();
    if (status === 'approved') {
      return (
        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200 inline-flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    } else if (status === 'rejected') {
      return (
        <span className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 inline-flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    } else if (status === 'missing') {
      return (
        <span className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 px-3 py-1.5 rounded-full text-xs font-bold border border-red-300 inline-flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Missing
        </span>
      );
    } else {
      return (
        <span className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-200 inline-flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    }
  }, []);

  const isLateReport = (report) => {
    return report.is_report_late || report.is_agenda_late;
  };

  const handleExportCSV = () => {
    const data = recentReports.map(r => ({
      ID: r.id,
      'Report Name': r.name,
      'Report Heading': r.report_heading || '',
      'Agenda Heading': r.agenda_heading || '',
      'Progress': `${r.completion_percentage}%`,
      'Submitted By': r.user_name || 'N/A',
      Date: r.report_date,
      Status: r.status,
      Late: isLateReport(r) ? 'Yes' : 'No'
    }));
    downloadCSV(data, 'reports_export.csv');
  };

  const handleExportPDF = () => {
    const el = document.getElementById('reports-exportable-view');
    if (el) downloadPDF(el, 'reports_export.pdf');
  };

  const stats = [
    { label: 'Total Reports', value: statsData?.total || 0, color: 'from-blue-500 to-blue-600', icon: FolderOpen },
    { label: 'This Month', value: statsData?.this_month || 0, color: 'from-purple-500 to-indigo-600', icon: TrendingUp },
    { label: 'Approved', value: statsData?.approved || 0, color: 'from-emerald-500 to-green-600', icon: CheckCircle },
    { label: 'Pending', value: statsData?.pending || 0, color: 'from-amber-500 to-orange-600', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Reports & Analytics
              </h1>
              <p className="text-gray-600 text-lg">Review and manage all submitted reports</p>
            </div>
            <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">{stat.label}</p>
                    </div>
                    <h3 className="text-5xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">
                      {stat.value.toLocaleString()}
                    </h3>
                  </div>
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Reports</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              >
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              >
                PDF
              </button>
              <button
                onClick={() => { fetchReports(page); fetchStats(); }}
                className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 hover:underline transition-colors"
              >
                Refresh →
              </button>
            </div>
          </div>
          
          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-end">
            <div className="relative w-full">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Search</label>
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-500 font-medium">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name || emp.username || emp.first_name || `Employee #${emp.id}`}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-500 font-medium">Filter by Date</label>
              <input
                type="date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              />
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs text-gray-500 font-medium">Lateness</label>
              <select
                value={selectedLateness}
                onChange={(e) => setSelectedLateness(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="all">All Reports</option>
                <option value="late_agenda">Late Agenda</option>
                <option value="late_report">Late Report</option>
                <option value="incomplete">Incomplete</option>
                <option value="on_time">100% On Time</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>

          <div id="reports-exportable-view" className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-indigo-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Report Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Heading</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submitted By</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-gray-500 text-sm font-medium">Loading reports...</p>
                      </div>
                    </td>
                  </tr>
                ) : recentReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">No reports found</p>
                        <p className="text-gray-400 text-xs mt-1">Reports will appear here once submitted</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentReports.map((report) => (
                    <ReportRow 
                      key={report.id} 
                      report={report} 
                      isLate={isLateReport(report)} 
                      getStatusBadge={getStatusBadge}
                      navigate={navigate}
                      downloadFile={downloadFile}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {recentReports.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </main>
    </div>
  );
}