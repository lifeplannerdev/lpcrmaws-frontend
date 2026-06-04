import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Mail, Phone, Briefcase,
  Calendar, FileText, Star, AlertCircle, CheckCircle,
  XCircle, Clock, UserCheck, Download, ExternalLink,
} from 'lucide-react';

import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

const STATUS_CONFIG = {
  applied: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-500',
    bar: 'from-blue-400 to-blue-600',
    label: 'Applied',
  },
  interviewed: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    bar: 'from-amber-400 to-amber-600',
    label: 'Interviewed',
  },
  selected: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bar: 'from-emerald-400 to-emerald-600',
    label: 'Selected',
  },
  rejected: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    bar: 'from-red-400 to-red-600',
    label: 'Rejected',
  },
};

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function InfoRow({ icon: Icon, label, value, link }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {link ? (
          <a href={link} className="text-blue-600 hover:underline font-medium text-sm break-all">{value}</a>
        ) : (
          <p className="text-gray-800 font-medium text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}

function DeleteModal({ name, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-red-100 animate-fade-in">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete Candidate</h3>
        <p className="text-slate-500 text-center mb-6 text-sm">
          Are you sure you want to delete <span className="font-bold text-slate-700">{name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const canManage = hasPermission('candidates:edit_any') || hasPermission('candidates:edit_tenant') || hasPermission('candidates:edit_own');

  const getToken = useCallback(async () => {
    const token = accessToken || await refreshAccessToken();
    if (!token) throw new Error('Authentication required');
    return token;
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/candidates/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Candidate not found');
        const data = await res.json();
        setCandidate(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, API_BASE_URL, getToken]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/candidates/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Candidate deleted successfully');
      setTimeout(() => navigate('/candidates'), 1200);
    } catch (err) {
      showToast(err.message, 'error');
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto" />
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto absolute top-0 left-1/2 -translate-x-1/2" />
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading candidate…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Candidate Not Found</h3>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[candidate.status] || STATUS_CONFIG.applied;
  const StatusIcon = statusCfg.icon;

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          name={candidate.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={20} className="text-emerald-500" />
            : <AlertCircle size={20} className="text-red-500" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Back to Candidates
        </button>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
          {/* Gradient top bar */}
          <div className={`h-2 bg-gradient-to-r ${statusCfg.bar}`} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">

              {/* Avatar + name */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl flex-shrink-0">
                  {initials(candidate.name)}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{candidate.name}</h1>
                  <p className="text-gray-500 font-medium mt-1">{candidate.position_applied}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusIcon size={16} className={statusCfg.iconColor} />
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.badge}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/candidates/edit/${id}`)}
                    className="flex items-center gap-2 px-5 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl border border-indigo-200 hover:border-indigo-300 transition-all font-semibold text-sm hover:shadow-md"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 hover:border-red-300 transition-all font-semibold text-sm hover:shadow-md"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* Rating bar */}
            {candidate.rating && (
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-amber-500 fill-amber-400" />
                    <span className="text-sm font-bold text-gray-700">Candidate Rating</span>
                  </div>
                  <span className="text-2xl font-extrabold text-amber-600">{candidate.rating}<span className="text-sm text-gray-400 font-normal">/10</span></span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${(candidate.rating / 10) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < candidate.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Contact & Details */}
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5">Contact Information</h2>
              <div className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={candidate.email} link={`mailto:${candidate.email}`} />
                <InfoRow icon={Phone} label="Phone" value={candidate.phone} link={candidate.phone ? `tel:${candidate.phone}` : null} />
                <InfoRow icon={Briefcase} label="Position Applied" value={candidate.position_applied} />
                {candidate.interview_date && (
                  <InfoRow icon={Calendar} label="Interview Date" value={formatDate(candidate.interview_date)} />
                )}
              </div>
            </div>

            {/* Notes */}
            {candidate.notes && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
                    <FileText size={16} className="text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Notes</h2>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Pipeline stage */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Pipeline Stage</h2>
              <div className="space-y-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = candidate.status === key;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive ? `${cfg.badge} border font-bold` : 'text-gray-400'
                      }`}
                    >
                      <Icon size={15} className={isActive ? cfg.iconColor : 'text-gray-300'} />
                      <span className="text-sm">{cfg.label}</span>
                      {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-current" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resume */}
            {candidate.resume_url && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Resume</h2>
                <div className="flex flex-col gap-2">
                  <a
                    href={candidate.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
                  >
                    <ExternalLink size={16} /> View Resume
                  </a>
                  <a
                    href={candidate.resume_url}
                    download
                    className="flex items-center gap-2 px-4 py-3 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-xl font-semibold text-sm hover:shadow-md transition-all"
                  >
                    <Download size={16} /> Download
                  </a>
                </div>
              </div>
            )}

            {/* Quick actions (non-manage users still see view) */}
            {canManage && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/candidates/edit/${id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 rounded-xl font-semibold text-sm transition-all"
                  >
                    <Edit2 size={16} /> Edit Candidate
                  </button>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-xl font-semibold text-sm transition-all"
                  >
                    <Trash2 size={16} /> Delete Candidate
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
