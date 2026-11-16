import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, History, Clock, ArrowRight, User, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ACTION_BADGES = {
  CREATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATED: 'bg-blue-100 text-blue-800 border-blue-200',
  ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
  IMPORTED: 'bg-amber-100 text-amber-800 border-amber-200',
};

const formatTimestamp = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChangeTimelineDrawer = ({ isOpen, onClose, endpointPrefix, row, title, accessToken }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !row?.id || !endpointPrefix) return undefined;

    let cancelled = false;
    const fetchTimeline = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_BASE_URL}/${endpointPrefix}/${row.id}/timeline/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!cancelled) {
          setLogs(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'Failed to load change timeline');
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTimeline();
    return () => {
      cancelled = true;
    };
  }, [isOpen, row?.id, endpointPrefix, accessToken]);

  if (!isOpen || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="Change Timeline">
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 text-indigo-700">
              <History className="h-5 w-5 shrink-0" />
              <h2 className="text-base font-semibold text-slate-900 truncate">Change Timeline</h2>
            </div>
            <p className="mt-1 text-xs text-slate-600 truncate">
              {title || row.project || row.name || `Row #${row.sl_no ?? row.id}`}
            </p>
            {row.assigned_to_name && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                Assigned To: <span className="font-medium text-slate-700">{row.assigned_to_name}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close timeline"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
              <span className="text-sm">Loading change history...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Clock className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">No changes recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">Edits and assignments on this row will appear here.</p>
            </div>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2.5 space-y-5">
              {logs.map((entry) => {
                const badgeClass = ACTION_BADGES[entry.action] || 'bg-slate-100 text-slate-700 border-slate-200';
                const fieldDisplay = entry.field_label || entry.field_name;
                return (
                  <li key={entry.id} className="ml-5">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100" />
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                          {entry.action}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatTimestamp(entry.created_at)}</span>
                      </div>

                      {fieldDisplay && (
                        <div className="mt-2 text-xs font-semibold text-slate-800">
                          {fieldDisplay}
                        </div>
                      )}

                      {(entry.old_value || entry.new_value) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded bg-white px-2 py-0.5 text-slate-600 border border-slate-200 line-through decoration-slate-400">
                            {entry.old_value || 'Empty'}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-800 border border-indigo-200">
                            {entry.new_value || 'Empty'}
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <User className="h-3 w-3" />
                        <span>{entry.changed_by_name || 'System'}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeTimelineDrawer;
