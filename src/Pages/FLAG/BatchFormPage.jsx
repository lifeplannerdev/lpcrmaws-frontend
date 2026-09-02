import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function BatchFormPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lookups
  const [campuses, setCampuses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [grades, setGrades] = useState([]);
  const [policies, setPolicies] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    campus: '',
    package: '',
    starting_grade: '',
    current_grade: '',
    mode: 'offline',
    status: 'active',
    schedule: '',
    start_date: '',
    attendance_policy: '',
    notes: ''
  });

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const token = accessToken || await refreshAccessToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [cRes, pRes, gRes, polRes] = await Promise.all([
          fetch(`${API_BASE_URL}/students/campuses/`, { headers }),
          fetch(`${API_BASE_URL}/students/packages/`, { headers }),
          fetch(`${API_BASE_URL}/students/grades/`, { headers }),
          fetch(`${API_BASE_URL}/students/attendance-policies/`, { headers })
        ]);
        
        setCampuses(await cRes.json());
        setPackages(await pRes.json());
        setGrades(await gRes.json());
        setPolicies(await polRes.json());
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
      
      // Convert empties to null for FKs if optional
      if (!payload.attendance_policy) delete payload.attendance_policy;
      if (!payload.start_date) delete payload.start_date;

      const res = await fetch(`${API_BASE_URL}/students/batches/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/flag/batches/${data.id}`);
      } else {
        const err = await res.json();
        alert('Failed to create batch: ' + JSON.stringify(err));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving batch.');
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
            <Link to="/flag/batches" className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft /></Link>
            <h1 className="text-2xl font-bold text-gray-900">Create New Batch</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Name *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. BATCH-A1-2026" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Campus *</label>
                  <select required name="campus" value={formData.campus} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Campus...</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Package *</label>
                  <select required name="package" value={formData.package} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Package...</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Grade *</label>
                  <select required name="starting_grade" value={formData.starting_grade} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Starting Grade...</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Grade *</label>
                  <select required name="current_grade" value={formData.current_grade} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Current Grade...</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                  <select name="mode" value={formData.mode} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule (Days/Times)</label>
                  <input type="text" name="schedule" value={formData.schedule} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Mon-Wed-Fri 10AM" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance Policy</label>
                  <select name="attendance_policy" value={formData.attendance_policy} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="">None (Use Default)</option>
                    {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Create Batch
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
