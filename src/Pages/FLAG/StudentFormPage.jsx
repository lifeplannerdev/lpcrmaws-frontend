import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Loader2, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lookups
  const [campuses, setCampuses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Form State
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
    joined_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = accessToken || await refreshAccessToken();
        const headers = { Authorization: `Bearer ${token}` };
        
        const fetchPromises = [
          fetch(`${API_BASE_URL}/students/campuses/`, { headers }),
          fetch(`${API_BASE_URL}/students/packages/`, { headers }),
          fetch(`${API_BASE_URL}/students/batches/`, { headers }),
          fetch(`${API_BASE_URL}/students/trainers/`, { headers })
        ];

        if (isEdit) {
          fetchPromises.push(fetch(`${API_BASE_URL}/students/students/${id}/`, { headers }));
        }

        const responses = await Promise.all(fetchPromises);
        const [cData, pData, bData, tData, sData] = await Promise.all(
          responses.map(r => r.json())
        );
        
        setCampuses(cData.results !== undefined ? cData.results : (Array.isArray(cData) ? cData : []));
        setPackages(pData.results !== undefined ? pData.results : (Array.isArray(pData) ? pData : []));
        setBatches(bData.results !== undefined ? bData.results : (Array.isArray(bData) ? bData : []));
        setTrainers(tData.results !== undefined ? tData.results : (Array.isArray(tData) ? tData : []));

        if (isEdit && sData) {
          setFormData({
            name: sData.name || '',
            phone: sData.phone || '',
            email: sData.email || '',
            parent_name: sData.parent_name || '',
            parent_phone: sData.parent_phone || '',
            campus: sData.campus || '',
            academic_package: sData.academic_package || '',
            batch: sData.batch || '',
            trainer: sData.trainer || '',
            mode_of_study: sData.mode_of_study || 'offline',
            status: sData.status || 'active',
            joined_date: sData.joined_date ? sData.joined_date.split('T')[0] : '',
            notes: sData.notes || ''
          });
        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [id, isEdit, accessToken, refreshAccessToken]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
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

      const url = isEdit 
        ? `${API_BASE_URL}/students/students/${id}/` 
        : `${API_BASE_URL}/students/students/`;

      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/flag/students/${data.id || id}`);
      } else {
        const err = await res.json();
        alert(`Failed to ${isEdit ? 'update' : 'register'} student: ` + JSON.stringify(err));
      }
    } catch (err) {
      console.error(err);
      alert(`Error ${isEdit ? 'updating' : 'saving'} student.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="flex items-center gap-4 mb-6">
            <Link to={isEdit ? `/flag/students/${id}` : "/flag/students"} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft /></Link>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Student' : 'Register New Student'}</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="+1234567890" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent / Guardian Name</label>
                  <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Parent's Name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent / Guardian Phone</label>
                  <input type="text" name="parent_phone" value={formData.parent_phone} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Parent's Phone" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">Academic & Assignment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Campus *</label>
                  <select required name="campus" value={formData.campus} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Campus...</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Package *</label>
                  <select required name="academic_package" value={formData.academic_package} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Package...</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch (Optional)</label>
                  <select name="batch" value={formData.batch} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">No Batch Assigned</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Trainer</label>
                  <div className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-gray-700 font-medium text-sm">
                    {(() => {
                      const selBatch = batches.find(b => String(b.id) === String(formData.batch));
                      return selBatch ? (selBatch.trainer_name || 'Unassigned on Batch') : 'No Batch Selected';
                    })()}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Trainer is assigned directly at the batch level.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode of Study</label>
                  <select name="mode_of_study" value={formData.mode_of_study} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                {isEdit && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                      <option value="active">Active</option>
                      <option value="demoted">Demoted - Awaiting Reassignment</option>
                      <option value="on_hold">On Hold</option>
                      <option value="exited">Exited</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Joined Date</label>
                  <input type="date" name="joined_date" value={formData.joined_date} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea rows="2" name="notes" value={formData.notes} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Additional notes..." />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isEdit ? 'Save Changes' : 'Register Student'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
