import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, DollarSign } from 'lucide-react';
import Card from '../common/Card';
import SectionHeader from '../common/SectionHeader';
import EmptyState from '../common/EmptyState';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
      <Card className="h-[290px] flex flex-col" padding="p-4">
        <SectionHeader title="Document Alerts" actionText="View All" onActionClick={() => navigate('/hr/documents')} size="sm" />
        <div className="space-y-1.5 flex-1 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[290px] flex flex-col" padding="p-4">
      <SectionHeader
        title="Document Alerts"
        actionText="View All"
        onActionClick={() => navigate('/hr/documents')}
        size="sm"
      />

      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {sorted.length === 0 ? (
          <EmptyState
            icon={FileText}
            iconColor="text-emerald-500"
            bgColor="bg-emerald-50"
            title="All documents up to date"
            description="No expiries in the next 30 days"
            compact
          />
        ) : (
          <div className="space-y-1.5 overflow-hidden">
            {sorted.slice(0, 3).map(doc => (
              <DocRow
                key={doc.id}
                doc={doc}
                onMarkPaid={handleMarkPaid}
                markingPaid={markingPaid}
                getDaysLabel={getDaysLabel}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function DocRow({ doc, onMarkPaid, markingPaid, getDaysLabel }) {
  const isExpired = doc.status === 'expired';
  const isOverdue = doc.status === 'overdue';
  const needsAction = isExpired || isOverdue;

  return (
    <div className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all duration-200 ${
      isExpired ? 'bg-red-50/70 border-red-200' : isOverdue ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-gray-100'
    }`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{doc.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
          <span className="text-gray-500 truncate max-w-[90px]">{doc.company}</span>
          <span className="text-gray-300">·</span>
          <span className={`font-semibold ${isExpired ? 'text-red-600' : isOverdue ? 'text-amber-600' : 'text-gray-500'}`}>
            {getDaysLabel(doc)}
          </span>
        </div>
      </div>

      {needsAction && (
        <button
          onClick={(e) => onMarkPaid(doc.id, e)}
          disabled={markingPaid === doc.id}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
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
