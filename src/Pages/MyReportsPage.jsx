import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../Components/layouts/Navbar';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import { 
  FileText, Plus, Send, X, Calendar, User, Clock,
  CheckCircle2, XCircle, AlertCircle, Download, Eye,
  Search, Loader2, Edit, FileSpreadsheet, Paperclip
} from 'lucide-react';
import SpreadsheetView from '../Components/leads/SpreadsheetView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Excel-only validation constants ──────────────────────────────────────────
const ALLOWED_EXCEL_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_EXCEL_EXT = /\.(xls|xlsx)$/i;

const getLocalYYYYMMDD = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SalesDailyAgendaGrid = ({ formData, setFormData, authFetch }) => {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const isToday = formData.report_date === getLocalYYYYMMDD();
    if (formData.report_text && formData.report_text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(formData.report_text);
        if (isToday) {
          fetchFresh(parsed);
        } else {
          setLeads(parsed);
        }
      } catch (e) {
        fetchFresh();
      }
    } else {
      fetchFresh();
    }
  }, []);

  const fetchFresh = async (existingLeads = null) => {
    try {
      const data = await authFetch(`${API_BASE_URL}/leads/?daily_agenda=true&page_size=200`);
      let fetchedLeads = [];
      if (data.results && Array.isArray(data.results)) {
        fetchedLeads = data.results;
      } else if (data.results && data.results.leads) {
        fetchedLeads = data.results.leads;
      } else if (Array.isArray(data)) {
        fetchedLeads = data;
      } else if (data && data.leads) {
        fetchedLeads = data.leads;
      }
      
      if (existingLeads && Array.isArray(existingLeads)) {
        const parsedMap = new Map(existingLeads.map(l => [l.id, l]));
        const merged = fetchedLeads.map(freshLead => {
          if (parsedMap.has(freshLead.id)) {
            return { ...freshLead, ...parsedMap.get(freshLead.id) };
          }
          return freshLead;
        });
        const freshIds = new Set(fetchedLeads.map(l => l.id));
        existingLeads.forEach(p => {
          if (!freshIds.has(p.id)) {
            merged.push(p);
          }
        });
        fetchedLeads = merged;
      }
      
      setLeads(fetchedLeads);
      // Initialize report_text with current fetched leads
      setFormData(prev => ({ ...prev, report_text: JSON.stringify(fetchedLeads) }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeadsChange = (updatedLeads) => {
    setFormData(prev => ({
      ...prev,
      report_text: JSON.stringify(updatedLeads)
    }));
  };

  return (
    <div className="h-96 w-full mt-3 rounded-lg overflow-hidden border border-emerald-200">
      <SpreadsheetView leads={leads} authFetch={authFetch} isReportMode={true} onLeadsChange={handleLeadsChange} />
    </div>
  );
};

const FormFields = ({ formData, handleInputChange, errors, user, setFormData, authFetch }) => {
  const isSales = user?.role_names?.some(r => ['ADM_COUNSELLOR', 'ADM_MANAGER'].includes(r));

  const completionPercentage = (() => {
    let score = 0;
    if (formData.next_day_agenda) score += 50;
    if (formData.report_text) score += 50;
    return score;
  })();

  return (
  <div className="space-y-5">
    {/* Read-only Name and Date */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
        <div className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 font-medium truncate">
          {user?.name || user?.username || formData.name}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Date & Time</label>
        <div className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 font-medium truncate">
          {new Date().toLocaleString()}
        </div>
      </div>
    </div>

    {/* Progress Bar */}
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-700">Daily Completion Progress</span>
        <span className="text-sm font-bold text-indigo-600">{completionPercentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
      </div>
    </div>

    {/* Morning Agenda */}
    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
      <h3 className="font-bold text-indigo-900 mb-3">Morning Agenda (50%)</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-indigo-800 mb-1">Agenda Heading</label>
          <input
            type="text" name="agenda_heading" value={formData.agenda_heading || ''}
            onChange={handleInputChange} placeholder="Brief heading for your agenda"
            className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-indigo-800 mb-1">Agenda Details</label>
          <textarea
            name="next_day_agenda" value={formData.next_day_agenda || ''}
            onChange={handleInputChange} rows={3}
            placeholder="Plan for the day..."
            className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    {/* Evening Report */}
    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
      <h3 className="font-bold text-emerald-900 mb-3">Evening Report (+50%)</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-emerald-800 mb-1">Report Heading</label>
          <input
            type="text" name="report_heading" value={formData.report_heading || ''}
            onChange={handleInputChange} placeholder="Brief heading for your report"
            className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {isSales ? (
          <div>
            <label className="block text-xs font-semibold text-emerald-800 mb-1">Daily Leads Snapshot</label>
            <SalesDailyAgendaGrid formData={formData} setFormData={setFormData} authFetch={authFetch} />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-emerald-800 mb-1">Report Details</label>
            <textarea
              name="report_text" value={formData.report_text || ''}
              onChange={handleInputChange} rows={4}
              placeholder="Describe your daily activities..."
              className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  </div>
)};

const FileUploadSection = ({ label = 'Attach Excel File (Optional)', formData, errors, handleFileChange, removeFile, getFileIcon }) => (
  <div className="mt-5">
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <input
      type="file" onChange={handleFileChange} multiple
      accept=".xls,.xlsx"
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
    <p className="mt-1 text-xs text-gray-500">Max 10MB per file. Excel files only (.xls, .xlsx)</p>
    {errors.attached_files && <p className="mt-1 text-sm text-red-500">{errors.attached_files}</p>}
    {formData.attached_files.length > 0 && (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">
          {label === 'Attach Excel File (Optional)' ? 'Selected' : 'New'} Files ({formData.attached_files.length}):
        </p>
        {formData.attached_files.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getFileIcon(file.name)}
              <span className="text-sm text-gray-700 truncate">{file.name}</span>
              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button type="button" onClick={() => removeFile(index)} className="p-1 hover:bg-red-100 rounded transition-colors">
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function MyReportsPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReport, setEditingReport] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('');
  
  const [formData, setFormData] = useState({
    name: user?.name || user?.username || '',
    report_heading: '',
    report_text: '',
    agenda_heading: '',
    report_date: new Date().toISOString().split('T')[0],
    next_day_agenda: '',
    attached_files: []
  });
  
  const [errors, setErrors] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  const userName = user?.name || user?.username || 'User';

  // ── Helper: download via Django proxy ────────────────────────────────────
  const downloadFile = async (attachment) => {
    if (!attachment?.id) return;
    const filename = attachment.original_filename || 'download';
    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/attachments/${attachment.id}/download/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
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
  };

  // ── Helper: view attachment — Excel files always download ─────────────────
  const viewAttachment = async (attachment) => {
    if (!attachment?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/attachments/${attachment.id}/download/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.original_filename || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('View failed:', err);
      alert('Failed to open file. Please try again.');
    }
  };

  const getFileIcon = (fileUrl) => {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  };

  const getFileName = (file) => {
    if (file instanceof File) return file.name;
    if (typeof file === 'string') return file.split('/').pop().split('?')[0];
    return 'Unknown file';
  };

  const fetchWithAuth = async (url, options = {}) => {
    try {
      let token = accessToken;
      const response = await fetch(url, {
        ...options,
        headers: { 'Authorization': `Bearer ${token}`, ...options.headers },
      });

      if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) throw new Error('Unable to refresh token');
        const retryResponse = await fetch(url, {
          ...options,
          headers: { 'Authorization': `Bearer ${token}`, ...options.headers },
        });
        if (!retryResponse.ok) throw new Error(`HTTP error! status: ${retryResponse.status}`);
        return await retryResponse.json();
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const data = await fetchWithAuth(`${API_BASE_URL}/reports/my/?${params}`);
      setReports(data.results || data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchReports();
  }, [accessToken, companyFilter]);

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── Excel-only file validation ────────────────────────────────────────────
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = [];
    const fileErrors = [];

    files.forEach((file) => {
      const nameOk = ALLOWED_EXCEL_EXT.test(file.name);
      const typeOk = ALLOWED_EXCEL_TYPES.includes(file.type);

      if (!nameOk && !typeOk) {
        fileErrors.push(`"${file.name}" is not allowed. Only Excel files (.xls, .xlsx) are accepted.`);
      } else if (file.size > 10 * 1024 * 1024) {
        fileErrors.push(`"${file.name}" is too large (max 10MB).`);
      } else {
        validFiles.push(file);
      }
    });

    if (fileErrors.length > 0) {
      setErrors(prev => ({ ...prev, attached_files: fileErrors.join(' ') }));
      return;
    }

    setFormData(prev => ({ ...prev, attached_files: [...prev.attached_files, ...validFiles] }));
    setErrors(prev => ({ ...prev, attached_files: '' }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attached_files: prev.attached_files.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => ({
    name: user?.name || user?.username || '',
    report_heading: '',
    report_text: '',
    agenda_heading: '',
    report_date: new Date().toISOString().split('T')[0],
    next_day_agenda: '',
    attached_files: []
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim())        newErrors.name = 'Name is required';
    if (!formData.report_text?.trim() && !formData.next_day_agenda?.trim()) {
      newErrors.submit = 'You must submit either an agenda or a report.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildFormData = () => {
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('report_date', formData.report_date);
    if (formData.report_heading) submitData.append('report_heading', formData.report_heading);
    if (formData.report_text) submitData.append('report_text', formData.report_text);
    if (formData.agenda_heading) submitData.append('agenda_heading', formData.agenda_heading);
    if (formData.next_day_agenda) submitData.append('next_day_agenda', formData.next_day_agenda);
    formData.attached_files.forEach((file) => submitData.append('attached_files', file));
    return submitData;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/reports/create/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: buildFormData(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create report');
      }

      setShowCreateModal(false);
      setFormData(resetForm());
      setErrors({});
      fetchReports();
    } catch (err) {
      console.error('Error creating report:', err);
      setErrors({ submit: err.message || 'Failed to create report' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (report) => {
    if (report.status !== 'pending') {
      alert('Only pending reports can be edited');
      return;
    }
    setEditingReport(report);
    setFormData({
      name: report.name,
      report_heading: report.report_heading || '',
      report_text: report.report_text || '',
      agenda_heading: report.agenda_heading || '',
      report_date: report.report_date,
      next_day_agenda: report.next_day_agenda || '',
      attached_files: []
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/reports/${editingReport.id}/edit/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: buildFormData(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update report');
      }

      setShowEditModal(false);
      setEditingReport(null);
      setFormData(resetForm());
      setErrors({});
      fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      setErrors({ submit: err.message || 'Failed to update report' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
            <AlertCircle className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const isLate = (report) => {
    return report.is_report_late || report.is_agenda_late;
  };

  const renderReportSummary = (text) => {
    if (!text) return '';
    if (text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return `Sales Daily Leads Snapshot (${parsed.length} leads)`;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    return text;
  };

  const filteredReports = reports.filter(report => {
    const matchesFilter = filter === 'all' || report.status?.toLowerCase() === filter;
    const matchesSearch =
      report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.report_heading || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.agenda_heading || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Reports
              </h1>
              <p className="text-gray-600 text-lg">Submit and track your daily work reports</p>
            </div>
            <div className="flex items-center gap-4">
              <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <Plus className="w-5 h-5" /> New Report
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text" placeholder="Search reports by name or heading..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status} onClick={() => setFilter(status)}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    filter === status ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading reports...</p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filter !== 'all' ? 'Try adjusting your filters or search term' : 'Get started by creating your first daily report'}
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" /> Create First Report
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {report.report_heading || report.agenda_heading || 'Daily Report'}
                      </h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">{renderReportSummary(report.report_text) || report.next_day_agenda}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5"><User className="w-4 h-4" /><span>{report.name}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /><span>{formatDate(report.report_date)}</span></div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold">
                        Progress: {report.completion_percentage}%
                      </div>
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>Submitted {formatDate(report.created_at)}</span></div>
                      {report.agenda_late_by && (
                        <div className="flex items-center gap-1 text-yellow-700 font-semibold px-2 py-0.5 bg-yellow-100 rounded-full text-xs border border-yellow-200">
                          <AlertCircle size={12} /> Late Agenda ({report.agenda_late_by})
                        </div>
                      )}
                      {report.report_late_by && (
                        <div className="flex items-center gap-1 text-red-700 font-semibold px-2 py-0.5 bg-red-100 rounded-full text-xs border border-red-200">
                          <AlertCircle size={12} /> Late Report ({report.report_late_by})
                        </div>
                      )}
                      {isLate(report) && !report.agenda_late_by && !report.report_late_by && (
                        <div className="flex items-center gap-1 text-red-600 font-semibold px-2 py-0.5 bg-red-100 rounded-full text-xs border border-red-200">
                          <AlertCircle size={12} /> Late Entry
                        </div>
                      )}
                      {report.attachments?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                          <Paperclip className="w-4 h-4" />
                          <span>{report.attachments.length} Attachment{report.attachments.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {report.status === 'pending' && report.report_date === getLocalYYYYMMDD() && (
                      <button onClick={() => handleEdit(report)} className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors" title="Edit report">
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => setSelectedReport(report)} className="p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-colors" title="View details">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Create Modal ─────────────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900">Create New Report</h2>
                <button onClick={() => { setShowCreateModal(false); setErrors({}); setFormData(resetForm()); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {errors.submit && <div className="mb-6 p4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>}
                <FormFields formData={formData} handleInputChange={handleInputChange} errors={errors} user={user} setFormData={setFormData} authFetch={fetchWithAuth} />
                <FileUploadSection 
                  formData={formData} 
                  errors={errors} 
                  handleFileChange={handleFileChange} 
                  removeFile={removeFile} 
                  getFileIcon={getFileIcon}
                />
                <div className="mt-8 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setShowCreateModal(false); setErrors({}); setFormData(resetForm()); }} disabled={submitting} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting...</> : <><Send className="w-5 h-5" />Submit Report</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Modal ───────────────────────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900">Edit Report</h2>
                <button onClick={() => { setShowEditModal(false); setEditingReport(null); setErrors({}); setFormData(resetForm()); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {errors.submit && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>}
                <FormFields formData={formData} handleInputChange={handleInputChange} errors={errors} user={user} setFormData={setFormData} authFetch={fetchWithAuth} />

                {editingReport?.attachments?.length > 0 && (
                  <div className="mt-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Attachments</label>
                    <div className="space-y-2">
                      {editingReport.attachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                          {getFileIcon(attachment.original_filename)}
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {attachment.original_filename || getFileName(attachment.view_url)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewAttachment(attachment)}
                              className="text-indigo-600 hover:text-indigo-700"
                              title="Download"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadFile(attachment)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Existing attachments cannot be removed. You can only add new files.</p>
                  </div>
                )}

                <FileUploadSection 
                  label="Add New Excel File (Optional)" 
                  formData={formData} 
                  errors={errors} 
                  handleFileChange={handleFileChange} 
                  removeFile={removeFile} 
                  getFileIcon={getFileIcon}
                />

                <div className="mt-8 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingReport(null); setErrors({}); setFormData(resetForm()); }} disabled={submitting} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleUpdate} disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Updating...</> : <><Edit className="w-5 h-5" />Update Report</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── View Modal ───────────────────────────────────────────────────── */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
                <button onClick={() => setSelectedReport(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedReport.report_heading || selectedReport.agenda_heading || 'Daily Report'}</h3>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-gray-600"><User className="w-5 h-5" /><span className="font-medium">{selectedReport.name}</span></div>
                    <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-5 h-5" /><span>{formatDate(selectedReport.report_date)}</span></div>
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold"><Clock className="w-5 h-5" /><span>Progress: {selectedReport.completion_percentage}%</span></div>
                    {selectedReport.agenda_late_by && (
                      <div className="flex items-center gap-2 text-yellow-700 font-semibold bg-yellow-50 px-3 py-1 rounded-full w-max border border-yellow-200"><AlertCircle className="w-4 h-4" /><span>Late Agenda: {selectedReport.agenda_late_by}</span></div>
                    )}
                    {selectedReport.report_late_by && (
                      <div className="flex items-center gap-2 text-red-700 font-semibold bg-red-50 px-3 py-1 rounded-full w-max border border-red-200"><AlertCircle className="w-4 h-4" /><span>Late Report: {selectedReport.report_late_by}</span></div>
                    )}
                  </div>
                </div>

                {selectedReport.next_day_agenda && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-6 mb-6">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-3">{selectedReport.agenda_heading || "Morning Agenda"}</h4>
                    <p className="text-indigo-800 whitespace-pre-wrap leading-relaxed">{selectedReport.next_day_agenda}</p>
                  </div>
                )}

                {selectedReport.report_text && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 mb-6">
                    <h4 className="text-sm font-semibold text-emerald-900 mb-3">{selectedReport.report_heading || "Evening Report"}</h4>
                    {selectedReport.report_text.trim().startsWith('[') ? (
                       <div className="h-[400px] w-full rounded-lg overflow-hidden border border-emerald-200 bg-white">
                          <SpreadsheetView leads={JSON.parse(selectedReport.report_text)} isReportMode={true} authFetch={()=>{}} />
                       </div>
                    ) : (
                       <p className="text-emerald-800 whitespace-pre-wrap leading-relaxed">{selectedReport.report_text}</p>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {selectedReport.attachments?.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Attachments ({selectedReport.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedReport.attachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(attachment.original_filename)}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {attachment.original_filename || getFileName(attachment.view_url)}
                              </p>
                              {attachment.uploaded_at && (
                                <p className="text-xs text-gray-500">Uploaded {formatDate(attachment.uploaded_at)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => viewAttachment(attachment)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2 transition-colors"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button
                              onClick={() => downloadFile(attachment)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 transition-colors"
                            >
                              <Download className="w-4 h-4" /> Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.review_comment && (
                  <div className={`rounded-lg p-4 ${selectedReport.status === 'rejected' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Review Comment</h4>
                    <p className="text-gray-700">{selectedReport.review_comment}</p>
                    {selectedReport.reviewed_by_name && (
                      <p className="text-sm text-gray-500 mt-2">Reviewed by: {selectedReport.reviewed_by_name}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
