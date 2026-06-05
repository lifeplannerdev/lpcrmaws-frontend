import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  CalendarClock, Phone, MessageSquare, Mail, Users,
  Plus, Edit, Trash2, CheckCircle, AlertTriangle, Clock,
  X, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';

/**
 * LeadFollowUps
 * ─────────────
 * Drop this into your lead detail page's right column (or below the main card).
 *
 * Props:
 *   lead        – the full lead object (needs lead.id, lead.phone)
 *   authFetch   – your authenticated fetch helper from LeadsPage / useAuth
 *   apiBase     – import.meta.env.VITE_API_BASE_URL
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TYPE_META = {
  call:      { label: 'Call',      Icon: Phone,         bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200'  },
  whatsapp:  { label: 'WhatsApp',  Icon: MessageSquare, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200'},
  email:     { label: 'Email',     Icon: Mail,          bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'   },
  meeting:   { label: 'Meeting',   Icon: Users,         bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200' },
};

const STATUS_META = {
  pending:        { label: 'Pending',        dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50'  },
  contacted:      { label: 'Contacted',      dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'   },
  not_interested: { label: 'Not Interested', dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50'     },
  rescheduled:    { label: 'Rescheduled',    dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50'  },
};

const PRIORITY_CLS = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

// ── Inline Form ───────────────────────────────────────────────────────────────

const InlineForm = ({ lead, onSave, onCancel, initial }) => {
  const [form, setForm] = useState({
    phone_number:  initial?.phone_number  || lead?.phone || '',
    name:          initial?.name          || lead?.name  || '',
    follow_up_date:initial?.follow_up_date|| '',
    follow_up_time:initial?.follow_up_time|| '',
    followup_type: initial?.followup_type || 'call',
    priority:      initial?.priority      || 'medium',
    status:        initial?.status        || 'pending',
    notes:         initial?.notes         || '',
    lead:          lead?.id               || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.follow_up_date) { setError('Date is required'); return; }
    setError(''); setSaving(true);
    try { await onSave(form); }
    catch (e) { setError('Save failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-sm font-medium text-gray-800 bg-white';
  const selectCls = inputCls + ' appearance-none cursor-pointer';

  return (
    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 space-y-4">
      <p className="text-sm font-bold text-indigo-800">{initial ? 'Edit Follow-Up' : 'New Follow-Up'}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Date *</label>
          <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Time</label>
          <input type="time" value={form.follow_up_time} onChange={e => set('follow_up_time', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
          <select value={form.followup_type} onChange={e => set('followup_type', e.target.value)} className={selectCls}>
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} className={selectCls}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {initial && (
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="not_interested">Not Interested</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          className={inputCls + ' resize-none'} placeholder="Optional notes…" />
      </div>

      {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-white transition-all">
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// ── Item row ──────────────────────────────────────────────────────────────────

const FollowUpItem = ({ item, onEdit, onDelete, onStatusChange, canEdit }) => {
  const type     = TYPE_META[item.followup_type]  || TYPE_META.call;
  const status   = STATUS_META[item.status]        || STATUS_META.pending;
  const TypeIcon = type.Icon;

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${
      item.is_overdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white hover:border-indigo-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${type.bg} rounded-lg flex items-center justify-center border ${type.border} shrink-0`}>
            <TypeIcon size={15} className={type.text} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">
                {formatDate(item.follow_up_date)}
                {item.follow_up_time && (
                  <span className="text-gray-500 font-normal ml-1">· {formatTime(item.follow_up_time)}</span>
                )}
              </span>
              {item.is_overdue && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle size={10} />
                  Overdue
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CLS[item.priority] || 'bg-gray-100 text-gray-600'}`}>
                {item.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              <button onClick={() => onEdit(item)}
                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Edit">
                <Edit size={14} />
              </button>
              <button onClick={() => onDelete(item.id)}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Delete">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {item.notes && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 mb-2 line-clamp-2">
          {item.notes}
        </p>
      )}

      {item.status === 'pending' && canEdit && (
        <div className="flex gap-2">
          <button onClick={() => onStatusChange(item.id, 'contacted')}
            className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-200 transition-all flex items-center justify-center gap-1">
            <CheckCircle size={12} />
            Contacted
          </button>
          <button onClick={() => onStatusChange(item.id, 'rescheduled')}
            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-all flex items-center justify-center gap-1">
            <Clock size={12} />
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const LeadFollowUps = ({ lead, authFetch }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = usePermissions();
  const canEditLead = hasPermission('leads:edit_any') || hasPermission('leads:edit_tenant') || hasPermission('leads:edit_own');

  const load = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/followups/?lead=${lead.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [lead?.id, authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    const method = editItem ? 'PUT' : 'POST';
    const url    = editItem
      ? `${API_BASE_URL}/followups/${editItem.id}/`
      : `${API_BASE_URL}/followups/`;
    const res = await authFetch(url, { method, body: JSON.stringify(formData) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(JSON.stringify(err));
    }
    const saved = await res.json();
    if (editItem) setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
    else           setItems(prev => [saved, ...prev]);
    setShowForm(false);
    setEditItem(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up?')) return;
    const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, { method: 'DELETE' });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await authFetch(`${API_BASE_URL}/followups/${id}/`, {
      method: 'PUT', body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const saved = await res.json();
      setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
    }
  };

  const pending = items.filter(i => i.status === 'pending').length;
  const overdue = items.filter(i => i.is_overdue).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
        <button onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-3 group flex-1 text-left">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <CalendarClock className="text-white" size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Follow-Ups</h3>
            <p className="text-xs text-gray-500">
              {items.length} total · {pending} pending{overdue > 0 ? ` · ${overdue} overdue` : ''}
            </p>
          </div>
          <div className="ml-auto mr-2 text-gray-400 group-hover:text-indigo-600 transition-colors">
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </button>
        {canEditLead && (
          <button
            onClick={() => { setEditItem(null); setShowForm(s => !s); setCollapsed(false); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all">
            {showForm && !editItem ? <X size={14} /> : <Plus size={14} />}
            {showForm && !editItem ? 'Cancel' : 'Add'}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {/* Create / edit form */}
          {(showForm || editItem) && (
            <InlineForm
              lead={lead}
              initial={editItem}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditItem(null); }}
            />
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse rounded-xl border-2 border-gray-100 p-4 space-y-2">
                  <div className="flex gap-3"><div className="w-8 h-8 bg-gray-200 rounded-lg" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-1/2" /><div className="h-2.5 bg-gray-100 rounded w-1/3" /></div></div>
                  <div className="h-8 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : items.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarClock className="text-gray-400" size={24} />
              </div>
              <p className="text-sm font-semibold text-gray-500">No follow-ups yet</p>
              <button onClick={() => setShowForm(true)}
                className="mt-3 text-indigo-600 text-sm font-bold hover:underline">
                + Schedule one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <FollowUpItem
                  key={item.id}
                  item={item}
                  onEdit={(i) => { setEditItem(i); setShowForm(false); }}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  canEdit={canEditLead}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadFollowUps;
