import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { 
  AlertTriangle, 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  IndianRupee, 
  ExternalLink, 
  FileText, 
  AlertCircle,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const STATUS_CONFIG = {
  active:  { label: 'Active',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  paid:    { label: 'Paid',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  overdue: { label: 'Overdue', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  expired: { label: 'Expired', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

export default function DocumentExpiryNotifier() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('dismissed_doc_expiry_modal');
    if (isDismissed) return;

    const checkExpiringDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/documents/expiring/?company=all`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const docs = Array.isArray(data) ? data : (data.results || []);
          
          if (docs.length > 0) {
            const sortedDocs = [...docs].sort((a, b) => {
              const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
              const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
              return dateA - dateB;
            });
            setDocuments(sortedDocs);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to check expiring documents", err);
      }
    };
    
    checkExpiringDocuments();
  }, [isAuthenticated, accessToken]);

  const handleClose = () => {
    sessionStorage.setItem('dismissed_doc_expiry_modal', 'true');
    setIsOpen(false);
  };

  const handleNavigateToRegistry = () => {
    handleClose();
    navigate('/hr/documents');
  };

  if (!isOpen || documents.length === 0) return null;

  // Calculate totals
  const totalAmount = documents.reduce((sum, doc) => {
    const amt = parseFloat(doc.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const overdueDocs = documents.filter(d => d.status === 'overdue' || (d.days_remaining !== null && d.days_remaining < 0));
  const expiringDocs = documents.filter(d => !overdueDocs.includes(d));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-gray-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Centered Large Modal Container */}
      <div 
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent closing on accidental container click
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 px-6 sm:px-8 py-5 text-white flex items-start justify-between relative shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Critical Document & License Expiry Alert</h2>
                <span className="bg-white/25 text-white font-bold text-xs px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
                  {documents.length} Requiring Action
                </span>
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1">
                The following company licenses, utility bills, and agreements are overdue or expiring soon.
              </p>
            </div>
          </div>

          {/* Explicit X Button */}
          <button 
            type="button"
            onClick={handleClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            title="Close Alert (X)"
          >
            <X size={24} />
          </button>
        </div>

        {/* Quick KPI Stat Bar */}
        <div className="bg-gray-50/80 border-b border-gray-100 px-6 sm:px-8 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Documents</span>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{documents.length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Overdue</span>
            <p className="text-lg font-bold text-amber-700 mt-0.5">{overdueDocs.length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Expiring Soon</span>
            <p className="text-lg font-bold text-blue-700 mt-0.5">{expiringDocs.length}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Amount Due</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
        </div>

        {/* Scrollable Detailed Table Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100/80 text-gray-600 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3.5 px-4">Document & Type</th>
                  <th className="py-3.5 px-3">Company</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-3">Countdown</th>
                  <th className="py-3.5 px-4">Next Renewal</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {documents.map((doc) => {
                  const days = doc.days_remaining;
                  const isOverdue = doc.status === 'overdue' || (days !== null && days < 0);
                  const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                  const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.active;

                  return (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-amber-50/40 transition-colors ${isOverdue ? 'bg-amber-50/20' : ''}`}
                    >
                      {/* Document Name & Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <FileText size={16} className="text-indigo-600 flex-shrink-0" />
                          <span>{doc.title}</span>
                        </div>
                        {doc.document_type && (
                          <span className="text-xs text-gray-500 block pl-6">
                            Type: {doc.document_type}
                          </span>
                        )}
                        {doc.description && (
                          <p className="text-[11px] text-gray-400 pl-6 mt-0.5 line-clamp-1 italic">
                            {doc.description}
                          </p>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <Building2 size={12} className="text-gray-500" />
                          {doc.company || 'LP'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{doc.expiry_date || '—'}</span>
                        </div>
                      </td>

                      {/* Countdown */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {days === null || days === undefined ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : days < 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            <AlertCircle size={12} />
                            {Math.abs(days)}d Overdue
                          </span>
                        ) : days === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md animate-pulse">
                            Expires Today!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Clock size={12} />
                            {days}d left
                          </span>
                        )}
                      </td>

                      {/* Next Renewal */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                        {doc.next_renewal_date ? (
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400 font-mono">⟳</span> {doc.next_renewal_date}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {doc.amount ? (
                          <span className="font-bold text-gray-900 text-sm">
                            ₹{Number(doc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes notification if any notes exist */}
          {documents.some(d => d.notes) && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <strong className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle size={14} /> Remarks & Notes:
              </strong>
              <ul className="list-disc pl-5 space-y-0.5 text-amber-800/90">
                {documents.filter(d => d.notes).map(d => (
                  <li key={d.id}>
                    <span className="font-semibold">{d.title} ({d.company}):</span> {d.notes}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200/80 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center sm:text-left">
            <span>Clicking </span>
            <strong className="text-gray-700">"Go to Document Registry"</strong> 
            <span> will take you to renew, pay, or manage these documents.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <X size={16} />
              <span>Acknowledge & Close</span>
            </button>

            <button
              type="button"
              onClick={handleNavigateToRegistry}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
            >
              <span>Go to Document Registry</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
