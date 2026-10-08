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
  const [academicBatches, setAcademicBatches] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [packages, setPackages] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    campus: '',
    academic_package: '',
    batch: '',
    grade_batch: '',
    status: 'active',
    joined_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = accessToken || await refreshAccessToken();
        const headers = { Authorization: `Bearer ${token}` };
        
        const fetchPromises = [
          fetch(`${API_BASE_URL}/students/batches/`, { headers }),
          fetch(`${API_BASE_URL}/students/campuses/`, { headers }),
          fetch(`${API_BASE_URL}/students/packages/`, { headers })
        ];

        if (isEdit) {
          fetchPromises.push(fetch(`${API_BASE_URL}/students/students/${id}/`, { headers }));
        }

        const responses = await Promise.all(fetchPromises);
        const [bData, cData, pData, sData] = await Promise.all(
          responses.map(r => r ? r.json() : null)
        );
        
        setAcademicBatches(bData.results !== undefined ? bData.results : (Array.isArray(bData) ? bData : []));
        setCampuses(cData.results !== undefined ? cData.results : (Array.isArray(cData) ? cData : []));
        setPackages(pData.results !== undefined ? pData.results : (Array.isArray(pData) ? pData : []));

        if (isEdit && sData) {
          setFormData({
            name: sData.name || '',
            phone: sData.phone || '',
            email: sData.email || '',
            campus: sData.campus || '',
            academic_package: sData.academic_package || '',
            batch: sData.batch || '',
            grade_batch: sData.grade_batch || '',
            status: sData.status || 'active',
            joined_date: sData.joined_date ? sData.joined_date.split('T')[0] : ''
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
    const { name, value } = e.target;
    let updates = { [name]: value };

    // Reset grade batch when academic batch changes
    if (name === 'batch') {
      updates.grade_batch = '';
    }

    setFormData(prev => ({ ...prev, ...updates }));
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
        batch: formData.batch ? Number(formData.batch) : null,
        grade_batch: formData.grade_batch ? Number(formData.grade_batch) : null,
        status: formData.status,
        joined_date: formData.joined_date || undefined
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

  const selectedBatch = academicBatches.find(b => String(b.id) === String(formData.batch));

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
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">Academic Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Batch *</label>
                  <select required name="batch" value={formData.batch} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Academic Batch...</option>
                    {academicBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Batch</label>
                  <select name="grade_batch" value={formData.grade_batch} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" disabled={!selectedBatch}>
                    <option value="">Select Grade Batch...</option>
                    {selectedBatch?.grade_batches?.map(gb => <option key={gb.id} value={gb.id}>{gb.grade_code}</option>)}
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
