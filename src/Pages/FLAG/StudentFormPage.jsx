import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentFormPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lookups
  const [campuses, setCampuses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [batches, setBatches] = useState([]);

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
    mode_of_study: 'offline',
    status: 'active',
    joined_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const token = accessToken || await refreshAccessToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [cRes, pRes, bRes] = await Promise.all([
          fetch(`${API_BASE_URL}/students/campuses/`, { headers }),
          fetch(`${API_BASE_URL}/students/packages/`, { headers }),
          fetch(`${API_BASE_URL}/students/batches/`, { headers })
        ]);
        
        setCampuses(await cRes.json());
        setPackages(await pRes.json());
        setBatches(await bRes.json());
      } catch (err) {
        console.error("Failed to fetch lookups", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLookups();
  }, [accessToken, refreshAccessToken]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = accessToken || await refreshAccessToken();
      const payload = { ...formData };
      
      // Convert empties to null for FKs
      if (!payload.batch) delete payload.batch;

      const res = await fetch(`${API_BASE_URL}/students/students/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/flag/students/${data.id}`);
      } else {
        const err = await res.json();
        alert('Failed to register student: ' + JSON.stringify(err));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving student.');
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
            <Link to="/flag/students" className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft /></Link>
            <h1 className="text-2xl font-bold text-gray-900">Register New Student</h1>
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
              </div>

              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">Academic Information</h3>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode of Study</label>
                  <select name="mode_of_study" value={formData.mode_of_study} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Register Student
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
