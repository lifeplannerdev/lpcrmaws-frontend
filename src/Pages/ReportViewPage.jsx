import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { usePermissions } from '../context/PermissionsContext';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Download, 
  Clock,
  Tag,
  XCircle,
  MessageSquare,
  CheckCircle,
  Paperclip,
  FileSpreadsheet,
  File,
  Image,
  Eye
} from 'lucide-react';

export default function ReportViewPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canApproveReports = hasPermission('reports:edit_any') || hasPermission('reports:edit_tenant') || hasPermission('reports:approve_any');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchReport = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/reports/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      alert('Failed to load report details');
      navigate('/daily/reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id, accessToken]);

  const openReviewModal = (action) => {
    setReviewAction(action);
    setReviewComment('');
    setReviewModal(true);
  };

  const handleReviewReport = async () => {
    if (!accessToken) return;
    if (reviewAction === 'rejected' && !reviewComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setActionLoading(true);
    try {
      await axios.patch(
        `${API_BASE}/admin/reports/${id}/review/`,
        { status: reviewAction, review_comment: reviewComment },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      alert(`Report ${reviewAction} successfully!`);
      setReviewModal(false);
      fetchReport();
    } catch (err) {
      console.error('Failed to review report:', err);
      alert('Failed to review report');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Helper: get icon based on filename ──────────────────────────────────
  const getFileIcon = (filename) => {
    if (!filename) return <FileText className="w-6 h-6 text-blue-600" />;
    const name = filename.toLowerCase();
    if (name.match(/\.(xlsx|xls)$/)) return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
    if (name.includes('.pdf'))        return <File className="w-6 h-6 text-red-600" />;
    if (name.match(/\.(doc|docx)$/))  return <FileText className="w-6 h-6 text-blue-600" />;
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return <Image className="w-6 h-6 text-purple-600" />;
    return <FileText className="w-6 h-6 text-gray-600" />;
  };

  // ✅ FIXED: Download file using direct URL
  const downloadFile = (attachment) => {
    if (!attachment?.view_url) {
      alert('File URL is not available.');
      return;
    }
    
    // For direct download, we can use an anchor tag with the download attribute
    // If it's a cross-origin URL (like S3), the download attribute might just navigate,
    // but the browser handles it fine (and S3 presigned URLs often have content-disposition set)
    const link = document.createElement('a');
    link.href = attachment.view_url;
    link.target = '_blank'; // Fallback for cross-origin downloads
    link.download = attachment.original_filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ FIXED: View attachment by opening its URL directly
  const viewAttachment = (attachment) => {
    if (!attachment?.view_url) {
      alert('File URL is not available.');
      return;
    }
    
    // Determine file type
    const filename = (attachment.original_filename || '').toLowerCase();
    const isDoc = filename.match(/\.(doc|docx)$/);
    
    if (isDoc) {
      // For Word docs, standard behavior is to download
      downloadFile(attachment);
    } else {
      // For PDF, images, Excel, just open directly in new tab
      window.open(attachment.view_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading report details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Report not found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (report.status === 'approved') {
      return (
        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-2 border border-green-200">
          <CheckCircle size={16} /> Approved
        </span>
      );
    } else if (report.status === 'rejected') {
      return (
        <span className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-2 border border-red-200">
          <XCircle size={16} /> Rejected
        </span>
      );
    } else {
      return (
        <span className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-2 border border-yellow-200">
          <Clock size={16} /> Pending Review
        </span>
      );
    }
  };

  const hasAttachments = report.attachments?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/daily/reports')}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-6 transition-colors duration-200 font-medium"
        >
          <ArrowLeft size={20} />
          <span>Back to Reports</span>
        </button>

        {/* Report Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-md">
                <FileText className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{report.heading}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="font-medium">{report.report_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User size={16} className="text-indigo-500" />
                    <span className="font-medium">{report.user_name || report.name || 'N/A'}</span>
                  </div>
                  {hasAttachments && (
                    <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                      <Paperclip size={16} />
                      <span>{report.attachments.length} file{report.attachments.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge()}
              {report.agenda_late_by && (
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-200 whitespace-nowrap">
                  Late Agenda ({report.agenda_late_by})
                </span>
              )}
              {report.report_late_by && (
                <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 whitespace-nowrap">
                  Late Report ({report.report_late_by})
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-wrap">
            {hasAttachments && (
              <button
                onClick={() => viewAttachment(report.attachments[0])}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Eye size={18} />
                View Attachment{report.attachments.length > 1 ? `s (${report.attachments.length})` : ''}
              </button>
            )}

            {report.status === 'pending' && canApproveReports && (
              <>
                <button
                  onClick={() => openReviewModal('approved')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={18} />
                  Approve Report
                </button>
                <button
                  onClick={() => openReviewModal('rejected')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={18} />
                  Reject Report
                </button>
              </>
            )}
          </div>
        </div>

        {/* Agenda Content */}
        {report.next_day_agenda && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-amber-600" />
              Agenda Content
            </h2>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {report.next_day_agenda}
              </p>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            Report Content
          </h2>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {report.report_text || 'No content provided'}
            </p>
          </div>
        </div>

        {/* Report Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Tag size={20} className="text-indigo-600" />
            Report Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <FileText size={16} /> Report Name
              </label>
              <p className="text-gray-900 font-medium">{report.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Tag size={16} /> Report Heading
              </label>
              <p className="text-gray-900 font-medium">{report.heading || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <User size={16} /> Submitted By
              </label>
              <p className="text-gray-900 font-medium">{report.user_name || report.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Calendar size={16} /> Report Date
              </label>
              <p className="text-gray-900 font-medium">{report.report_date}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Clock size={16} /> Created At
              </label>
              <p className="text-gray-900 font-medium">
                {new Date(report.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Download size={16} /> Attachments
              </label>
              <p className="text-gray-900 font-medium">
                {hasAttachments ? (
                  <button
                    onClick={() => viewAttachment(report.attachments[0])}
                    className="text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    {report.attachments.length} file{report.attachments.length > 1 ? 's' : ''} attached
                  </button>
                ) : 'No files attached'}
              </p>
            </div>
          </div>
        </div>

        {/* All Attachments Section */}
        {hasAttachments && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip size={20} className="text-indigo-600" />
              Attachments ({report.attachments.length})
            </h2>
            <div className="space-y-3">
              {report.attachments.map((attachment, index) => (
                <div
                  key={attachment.id || index}
                  className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(attachment.original_filename)}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {attachment.original_filename || `Attachment ${index + 1}`}
                      </p>
                      {attachment.uploaded_at && (
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(attachment.uploaded_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => viewAttachment(attachment)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm transition-colors"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => downloadFile(attachment)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm transition-colors"
                      title={`Download ${attachment.original_filename || 'file'}`}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Comment */}
        {(report.status === 'approved' || report.status === 'rejected') && report.review_comment && (
          <div className={`rounded-2xl shadow-lg border p-6 ${
            report.status === 'approved'
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className={report.status === 'approved' ? 'text-green-600' : 'text-red-600'} />
              Review Comment
            </h2>
            <div className="bg-white rounded-xl p-4 mb-3">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{report.review_comment}</p>
            </div>
            {report.reviewed_by_name && (
              <p className="text-sm text-gray-700 font-medium">Reviewed by: {report.reviewed_by_name}</p>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {reviewAction === 'approved' ? 'Approve Report' : 'Reject Report'}
            </h3>
            <p className="text-gray-600 mb-4">
              {reviewAction === 'approved'
                ? 'Are you sure you want to approve this report? You can add an optional comment below.'
                : 'Please provide a reason for rejecting this report.'}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Comment {reviewAction === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewAction === 'approved' ? 'Add your comment (optional)...' : 'Please explain why you are rejecting this report...'}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReviewModal(false)}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleReviewReport}
                className={`px-5 py-2.5 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  reviewAction === 'approved'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg'
                }`}
                disabled={actionLoading || (reviewAction === 'rejected' && !reviewComment.trim())}
              >
                {actionLoading ? 'Processing...' : reviewAction === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}