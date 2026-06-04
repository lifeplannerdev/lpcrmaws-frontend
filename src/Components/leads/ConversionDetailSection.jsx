import React, { useState, useEffect } from 'react';
import { GraduationCap, Save, Edit2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CONVERSION_ROLES = ['ADMIN', 'OPS', 'CM', 'CEO', 'BUSINESS_HEAD'];

export default function ConversionDetailSection({ lead }) {
  const { accessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const [detail,  setDetail]  = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [form,    setForm]    = useState({});

  const canEdit = hasPermission('leads:edit_any') || hasPermission('leads:edit_tenant');

  // ── Fetch existing conversion detail
  useEffect(() => {
    if (lead?.status !== 'CONVERTED') return;

    fetch(`${API_BASE_URL}/leads/${lead.id}/conversion/`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => {
        if (r.status === 204) return null;
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => {
        setDetail(data);
        setForm(data || {});
      })
      .catch(() => setError('Failed to load conversion details'))
      .finally(() => setLoading(false));
  }, [lead?.id, accessToken]);

  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const method = detail ? 'PATCH' : 'POST';
      const res = await fetch(`${API_BASE_URL}/leads/${lead.id}/conversion/`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }

      const data = await res.json();
      setDetail(data);
      setForm(data);
      setEditing(false);
    } catch (err) {
      setError('Failed to save. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  // ── Don't render for non-converted leads
  if (lead?.status !== 'CONVERTED') return null;

  if (loading) {
    return (
      <div className="animate-pulse h-40 bg-gray-100 rounded-2xl mt-6" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 mt-6">

      {/* ── Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">Conversion Details</h3>
          {!detail && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
              Not filled yet
            </span>
          )}
          {detail && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              Filled
            </span>
          )}
        </div>

        {canEdit ? (
          <button
            onClick={() => { setEditing(e => !e); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {editing ? 'Cancel' : detail ? 'Edit' : 'Fill Details'}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Lock className="w-3.5 h-3.5" />
            View only
          </span>
        )}
      </div>

      {/* ── Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Edit Form */}
      {editing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Text / date / number fields */}
          {[
            { label: 'Course',         key: 'course',       type: 'text',   required: true  },
            { label: 'Batch Name',     key: 'batch_name',   type: 'text',   required: false },
            { label: 'Batch Timing',   key: 'batch_timing', type: 'text',   required: false },
            { label: 'Joining Date',   key: 'joining_date', type: 'date',   required: false },
            { label: 'Total Fees (₹)', key: 'total_fees',   type: 'number', required: false },
            { label: 'Amount Paid (₹)',key: 'amount_paid',  type: 'number', required: false },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type}
                value={form[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          ))}

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Payment Status
            </label>
            <select
              value={form.payment_status || 'PENDING'}
              onChange={e => handleChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Meeting Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Notes</label>
            <textarea
              rows={3}
              value={form.meeting_notes || ''}
              onChange={e => handleChange('meeting_notes', e.target.value)}
              placeholder="Notes from consultation/meeting..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
            />
          </div>

          {/* Payment Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Notes</label>
            <textarea
              rows={2}
              value={form.payment_notes || ''}
              onChange={e => handleChange('payment_notes', e.target.value)}
              placeholder="Payment breakdown, due dates, etc..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition"
            />
          </div>

          {/* Save Button */}
          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Conversion Details'}
            </button>
          </div>
        </div>
      )}

      {/* ── View Mode */}
      {!editing && detail && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Course',          value: detail.course },
            { label: 'Batch Name',      value: detail.batch_name },
            { label: 'Batch Timing',    value: detail.batch_timing },
            { label: 'Joining Date',    value: detail.joining_date },
            { label: 'Total Fees',      value: detail.total_fees   ? `₹${detail.total_fees}`   : null },
            { label: 'Amount Paid',     value: detail.amount_paid  ? `₹${detail.amount_paid}`  : null },
            { label: 'Payment Status',  value: detail.payment_status },
            { label: 'Last Updated By', value: detail.updated_by ? `${detail.updated_by.first_name} ${detail.updated_by.last_name}`.trim() : null },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
            </div>
          ))}

          {detail.meeting_notes && (
            <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Meeting Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.meeting_notes}</p>
            </div>
          )}

          {detail.payment_notes && (
            <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Payment Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.payment_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (no details yet, not editing) */}
      {!editing && !detail && (
        <div className="text-center py-10">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No conversion details filled yet</p>
          {canEdit && (
            <p className="text-xs text-gray-400 mt-1">
              Click <span className="font-semibold">"Fill Details"</span> above to add
            </p>
          )}
        </div>
      )}
    </div>
  );
}
