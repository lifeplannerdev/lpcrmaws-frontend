import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Save, Loader2, User, Phone, Mail, BookOpen, GraduationCap, School, Calendar, FileText } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function EditStudentModal({ student, isOpen, onClose, onSuccess }) {
  const { accessToken, refreshAccessToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Lookups
  const [campuses, setCampuses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    parent_name: '',
    parent_phone: '',
    campus: '',
    academic_package: '',
    batch: '',
    trainer: '',
    mode_of_study: 'offline',
    status: 'active',
    joined_date: '',
    notes: ''
  });

  // Fetch Lookups
  useEffect(() => {
    if (!isOpen) return;

    const fetchLookups = async () => {
      try {
        setLoadingLookups(true);
        const token = accessToken || await refreshAccessToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [cRes, pRes, bRes, tRes] = await Promise.all([
          fetch(`${API_BASE_URL}/students/campuses/`, { headers }),
          fetch(`${API_BASE_URL}/students/packages/`, { headers }),
          fetch(`${API_BASE_URL}/students/batches/`, { headers }),
          fetch(`${API_BASE_URL}/students/trainers/`, { headers })
        ]);

        const [cData, pData, bData, tData] = await Promise.all([
          cRes.json(),
          pRes.json(),
          bRes.json(),
          tRes.json()
        ]);

        setCampuses(cData.results !== undefined ? cData.results : (Array.isArray(cData) ? cData : []));
        setPackages(pData.results !== undefined ? pData.results : (Array.isArray(pData) ? pData : []));
        setBatches(bData.results !== undefined ? bData.results : (Array.isArray(bData) ? bData : []));
        setTrainers(tData.results !== undefined ? tData.results : (Array.isArray(tData) ? tData : []));
      } catch (err) {
        console.error('Failed to load lookups for edit modal', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [isOpen, accessToken, refreshAccessToken]);

  // Populate form state when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        phone: student.phone || '',
        email: student.email || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        campus: student.campus || '',
        academic_package: student.academic_package || '',
        batch: student.batch || '',
        trainer: student.trainer || '',
        mode_of_study: student.mode_of_study || 'offline',
        status: student.status || 'active',
        joined_date: student.joined_date ? student.joined_date.split('T')[0] : '',
        notes: student.notes || ''
      });
      setErrorMessage('');
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const token = accessToken || await refreshAccessToken();
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        campus: formData.campus ? Number(formData.campus) : null,
        academic_package: formData.academic_package ? Number(formData.academic_package) : null,
        batch: formData.batch ? Number(formData.batch) : null,
        trainer: formData.trainer ? Number(formData.trainer) : null,
        mode_of_study: formData.mode_of_study,
        status: formData.status,
        joined_date: formData.joined_date || undefined,
        notes: formData.notes
      };

      const res = await fetch(`${API_BASE_URL}/students/students/${student.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        const errData = await res.json();
        const errString = typeof errData === 'object' ? Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ') : 'Failed to update student';
        setErrorMessage(errString);
      }
    } catch (err) {
      console.error('Error saving student edits', err);
      setErrorMessage('Network error while updating student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Student Details</h2>
              <p className="text-xs text-gray-500">Update academic placement, personal info, and assign a trainer</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        {loadingLookups ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-sm text-gray-500 font-medium">Loading details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                {errorMessage}
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <User size={16} className="text-indigo-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="Student Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="+91..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    name="parent_name"
                    value={formData.parent_name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="Parent's Name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parent / Guardian Phone</label>
                  <input
                    type="text"
                    name="parent_phone"
                    value={formData.parent_phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="Parent's Contact"
                  />
                </div>
              </div>
            </div>

            {/* Academic & Trainer Assignment */}
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-600" />
                Academic & Trainer Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Campus *</label>
                  <select
                    required
                    name="campus"
                    value={formData.campus}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">Select Campus...</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Package *</label>
                  <select
                    required
                    name="academic_package"
                    value={formData.academic_package}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">Select Package...</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Batch (Optional)</label>
                  <select
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  >
                    <option value="">No Batch Assigned</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Batch Trainer</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Batch Level</span>
                  </label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3.5 py-2 text-sm text-gray-700 font-medium">
                    {(() => {
                      const selBatch = batches.find(b => String(b.id) === String(formData.batch));
                      return selBatch ? (selBatch.trainer_name || 'Unassigned on Batch') : 'No Batch Selected';
                    })()}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Trainers are assigned directly at the batch level.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode of Study</label>
                  <select
                    name="mode_of_study"
                    value={formData.mode_of_study}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  >
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enrollment Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="demoted">Demoted - Awaiting Reassignment</option>
                    <option value="on_hold">On Hold</option>
                    <option value="exited">Exited</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Joined Date</label>
                  <input
                    type="date"
                    name="joined_date"
                    value={formData.joined_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows="2"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    placeholder="Additional notes about student..."
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
