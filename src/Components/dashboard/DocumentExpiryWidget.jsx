import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, Clock, RefreshCw, DollarSign, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const STATUS_CONFIG = {
  expired: { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-100',   label: 'Expired' },
  overdue: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', label: 'Overdue' },
  active:  { bg: 'bg-gray-50',  text: 'text-gray-600',  border: 'border-gray-100',  label: 'Due Soon' },
};

export default function DocumentExpiryWidget() {
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [markingPaid, setMarkingPaid] = useState(null);

  const fetchWithAuth = async (url, options = {}) => {
    let token = accessToken;
    const doFetch = (t) => fetch(url, {
      ...options,
      headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json', ...options.headers },
    });
    let res = await doFetch(token);
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (!token) return null;
      res = await doFetch(token);
    }
    return res.ok ? (res.status === 204 ? null : res.json()) : null;
  };

  const fetchExpiring = async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/documents/expiring/`);
      setDocuments(data?.results || data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (accessToken) fetchExpiring();
  }, [accessToken]);

  const handleMarkPaid = async (id, e) => {
    e.stopPropagation();
    setMarkingPaid(id);
    try {
      await fetchWithAuth(`${API_BASE_URL}/documents/${id}/mark_paid/`, { method: 'POST' });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch { /* silent */ }
    finally { setMarkingPaid(null); }
  };

  const getDaysLabel = (doc) => {
    const days = doc.days_remaining;
    if (days === null || days === undefined) return '';
    if (days < 0)  return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today!';
    return `${days}d left`;
  };

  const expired = documents.filter(d => d.status === 'expired');
  const overdue = documents.filter(d => d.status === 'overdue');
  const rest    = documents.filter(d => !['expired','overdue'].includes(d.status));

  const sorted = [...expired, ...overdue, ...rest];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded mb-2" />)}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center min-h-[160px]">
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-gray-800">All documents up to date</p>
        <p className="text-xs text-gray-400 mt-1">No expiries in the next 30 days</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">Document Alerts</span>
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-amber-500 rounded-full">
            {sorted.length}
          </span>
        </div>
        <button
          onClick={() => navigate('/hr/documents')}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition-colors"
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section: Expired */}
      {expired.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 px-1">Expired</p>
          {expired.map(doc => <DocRow key={doc.id} doc={doc} onMarkPaid={handleMarkPaid} markingPaid={markingPaid} getDaysLabel={getDaysLabel} />)}
        </div>
      )}

      {/* Section: Overdue */}
      {overdue.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5 px-1">Overdue (expiring within 30 days)</p>
          {overdue.map(doc => <DocRow key={doc.id} doc={doc} onMarkPaid={handleMarkPaid} markingPaid={markingPaid} getDaysLabel={getDaysLabel} />)}
        </div>
      )}

      {/* Section: Due soon */}
      {rest.length > 0 && (
        <div className="px-3 pt-2 pb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Due Soon</p>
          {rest.map(doc => <DocRow key={doc.id} doc={doc} onMarkPaid={handleMarkPaid} markingPaid={markingPaid} getDaysLabel={getDaysLabel} />)}
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onMarkPaid, markingPaid, getDaysLabel }) {
  const isExpired = doc.status === 'expired';
  const isOverdue = doc.status === 'overdue';
  const needsAction = isExpired || isOverdue;

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2.5 mb-1 rounded-lg border transition-colors ${
      isExpired ? 'bg-red-50 border-red-100' : isOverdue ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
    }`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-500">{doc.company}</span>
          <span className="text-gray-300">·</span>
          <span className={`text-xs font-semibold ${isExpired ? 'text-red-600' : isOverdue ? 'text-amber-600' : 'text-gray-500'}`}>
            {getDaysLabel(doc)}
          </span>
        </div>
      </div>

      {needsAction && (
        <button
          onClick={(e) => onMarkPaid(doc.id, e)}
          disabled={markingPaid === doc.id}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          {markingPaid === doc.id
            ? <RefreshCw className="w-3 h-3 animate-spin" />
            : <DollarSign className="w-3 h-3" />}
          Paid
        </button>
      )}
    </div>
  );
}
