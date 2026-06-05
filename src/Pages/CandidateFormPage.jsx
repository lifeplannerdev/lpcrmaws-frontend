import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Mail, Phone, Briefcase, Building,
  Calendar, FileText, Star, AlertCircle, CheckCircle, Upload, X
} from 'lucide-react';

import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

const STATUS_OPTIONS = [
  { value: 'applied',     label: 'Applied',     color: 'text-blue-600' },
  { value: 'interviewed', label: 'Interviewed', color: 'text-amber-600' },
  { value: 'selected',    label: 'Selected',    color: 'text-emerald-600' },
  { value: 'rejected',    label: 'Rejected',    color: 'text-red-600' },
];

function FieldWrapper({ label, icon: Icon, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Icon size={15} className="text-indigo-500" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  position_applied: '',
  company: 'LP',
  status: 'applied',
  interview_date: '',
  rating: '',
  notes: '',
  resume: null,
};

export default function CandidateFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const canEdit = hasPermission('candidates:edit_any') || hasPermission('candidates:edit_tenant') || hasPermission('candidates:edit_own');

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [toast, setToast] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [existingResumeUrl, setExistingResumeUrl] = useState('');

  const getToken = useCallback(async () => {
    const token = accessToken || await refreshAccessToken();
    if (!token) throw new Error('Authentication required');
    return token;
  }, [accessToken, refreshAccessToken]);

  // Fetch existing candidate when editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/candidates/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch candidate');
        const data = await res.json();
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          position_applied: data.position_applied || '',
          company: data.company || 'LP',
          status: data.status || 'applied',
          interview_date: data.interview_date
            ? new Date(data.interview_date).toISOString().slice(0, 16)
            : '',
          rating: data.rating ?? '',
          notes: data.notes || '',
          resume: null,
        });
        if (data.resume_url) setExistingResumeUrl(data.resume_url);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, API_BASE_URL, getToken]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(prev => ({ ...prev, resume: file }));
    setResumeFileName(file.name);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.position_applied.trim()) errs.position_applied = 'Position is required';
    if (form.rating && (isNaN(form.rating) || form.rating < 1 || form.rating > 10))
      errs.rating = 'Rating must be between 1 and 10';

    if (!isEdit && !form.resume) errs.resume = 'Resume is required';
    return errs;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setSaving(true);
      const token = await getToken();

      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'resume') {
          if (val) formData.append('resume', val);
        } else if (val !== '' && val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });

      const url = isEdit
        ? `${API_BASE_URL}/candidates/${id}/`
        : `${API_BASE_URL}/candidates/`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        const firstErr = Object.values(errData)[0];
        throw new Error(Array.isArray(firstErr) ? firstErr[0] : String(firstErr));
      }

      showToast(isEdit ? 'Candidate updated successfully!' : 'Candidate added successfully!');
      setTimeout(() => navigate('/candidates'), 1200);
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
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

  // ── Fetch Error ──────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center mb-2">Failed to load</h3>
            <p className="text-gray-600 text-center mb-6">{fetchError}</p>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
            : <AlertCircle size={20} className="text-red-500 flex-shrink-0" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-5 text-sm font-medium"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {isEdit ? 'Edit Candidate' : 'Add Candidate'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isEdit ? 'Update candidate information' : 'Fill in the details to add a new candidate'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal Info Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
              <FieldWrapper label="Company Applying For" icon={Building} required>
                <select
                  value={form.company}
                  onChange={e => handleChange('company', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white transition-all"
                >
                  <option value="LP">LP Group</option>
                  <option value="FLAG">FLAG</option>
                </select>
              </FieldWrapper>

              <FieldWrapper label="Full Name" icon={User} required error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="e.g. Arjun Menon"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
              </FieldWrapper>

              <FieldWrapper label="Email Address" icon={Mail} required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="arjun@example.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
              </FieldWrapper>

              <FieldWrapper label="Phone Number" icon={Phone} error={errors.phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                />
              </FieldWrapper>

              <FieldWrapper label="Position Applied" icon={Briefcase} required error={errors.position_applied}>
                <input
                  type="text"
                  value={form.position_applied}
                  onChange={e => handleChange('position_applied', e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 ${
                    errors.position_applied ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
              </FieldWrapper>
            </div>
          </div>

          {/* Status & Rating Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5">Status & Evaluation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <FieldWrapper label="Application Status" icon={CheckCircle} required>
                <select
                  value={form.status}
                  onChange={e => handleChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white transition-all"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper label="Rating (1–10)" icon={Star} error={errors.rating}>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.rating}
                    onChange={e => handleChange('rating', e.target.value)}
                    placeholder="e.g. 8"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 ${
                      errors.rating ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {form.rating && !errors.rating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${i < Number(form.rating) ? 'bg-amber-400' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </FieldWrapper>

              <FieldWrapper label="Interview Date & Time" icon={Calendar}>
                <input
                  type="datetime-local"
                  value={form.interview_date}
                  onChange={e => handleChange('interview_date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                />
              </FieldWrapper>

            </div>
          </div>

          {/* Notes & Resume Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5">Additional Details</h2>
            <div className="space-y-5">

              <FieldWrapper label="Notes" icon={FileText}>
                <textarea
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Any additional notes about the candidate…"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 resize-none"
                />
              </FieldWrapper>

              <FieldWrapper label="Resume" icon={Upload} required={!isEdit} error={errors.resume}>
                <div className="relative">
                  <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    resumeFileName
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                    <Upload size={18} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 flex-1 truncate">
                      {resumeFileName || (existingResumeUrl ? 'Replace existing resume' : 'Click to upload resume (PDF, DOC)')}
                    </span>
                    {resumeFileName && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setResumeFileName(''); setForm(prev => ({ ...prev, resume: null })); }}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
                  </label>
                  {existingResumeUrl && !resumeFileName && (
                    <a
                      href={existingResumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText size={12} /> View current resume
                    </a>
                  )}
                </div>
              </FieldWrapper>

            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl font-semibold text-gray-600 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 min-w-[140px] justify-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isEdit ? 'Saving…' : 'Adding…'}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isEdit ? 'Save Changes' : 'Add Candidate'}
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </main>
    </div>
  );
}
