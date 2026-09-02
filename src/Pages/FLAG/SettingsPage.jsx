import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Settings, MapPin, GraduationCap, Package, AlertTriangle, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function SettingsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('grades'); // 'grades', 'campuses', 'packages', 'policies'
  const [data, setData] = useState({ grades: [], campuses: [], packages: [], policies: [] });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [modalEntity, setModalEntity] = useState('grades');
  const [modalId, setModalId] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Only FLAG Admin can view settings
  if (!hasPermission('flag:admin')) {
    return <Navigate to="/flag" />;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const [gradesRes, campusesRes, packagesRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/grades/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/campuses/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/packages/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/attendance-policies/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData({
        grades: await gradesRes.json().then(d => (d.results !== undefined ? d.results : (Array.isArray(d) ? d : []))),
        campuses: await campusesRes.json().then(d => (d.results !== undefined ? d.results : (Array.isArray(d) ? d : []))),
        packages: await packagesRes.json().then(d => (d.results !== undefined ? d.results : (Array.isArray(d) ? d : []))),
        policies: await policiesRes.json().then(d => (d.results !== undefined ? d.results : (Array.isArray(d) ? d : []))),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (mode, entity, item = null) => {
    setModalMode(mode);
    setModalEntity(entity);
    if (mode === 'edit' && item) {
      setModalId(item.id);
      setFormData({ ...item });
    } else {
      setModalId(null);
      // Initialize defaults based on entity
      if (entity === 'grades') setFormData({ name: '', code: '', order: '' });
      if (entity === 'campuses') setFormData({ name: '', code: '', city: '', address: '', phone: '' });
      if (entity === 'packages') setFormData({ name: '', starting_grade_id: '', ending_grade_id: '', description: '' });
      if (entity === 'policies') setFormData({ name: '', grace_absences: 0, fee_block_on_pending: true, description: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = accessToken || await refreshAccessToken();
      const endpointMap = {
        grades: 'grades',
        campuses: 'campuses',
        packages: 'packages',
        policies: 'attendance-policies'
      };
      const url = modalMode === 'edit' 
        ? `${API_BASE_URL}/students/${endpointMap[modalEntity]}/${modalId}/`
        : `${API_BASE_URL}/students/${endpointMap[modalEntity]}/`;

      // For packages, need to send starting_grade and ending_grade instead of _id if they are expected by backend,
      // but DRF serializers usually accept the foreign key ID if the field is defined as PrimaryKeyRelatedField,
      // or we might need to match the backend expectation. For simplicity, we just send formData.
      // Wait, let's remap for packages if needed:
      let payload = { ...formData };
      if (modalEntity === 'packages') {
        if (payload.starting_grade_id) payload.starting_grade = payload.starting_grade_id;
        if (payload.ending_grade_id) payload.ending_grade = payload.ending_grade_id;
      }
      if (modalEntity === 'grades') {
          payload.order_index = payload.order; // frontend used 'order', backend model uses 'order', but maybe serializer? Let's just send both.
      }

      const res = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        alert('Failed to save: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entity, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = accessToken || await refreshAccessToken();
      const endpointMap = { grades: 'grades', campuses: 'campuses', packages: 'packages', policies: 'attendance-policies' };
      const res = await fetch(`${API_BASE_URL}/students/${endpointMap[entity]}/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="text-indigo-600"/> Configurations</h1>
            <p className="text-gray-500 mt-1">Manage global settings for the FLAG application.</p>
          </div>

          <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('grades')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'grades' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Grades</button>
            <button onClick={() => setActiveTab('campuses')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'campuses' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Campuses</button>
            <button onClick={() => setActiveTab('packages')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'packages' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Academic Packages</button>
            <button onClick={() => setActiveTab('policies')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'policies' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Attendance Policies</button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'grades' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">German Grades</h3>
                      <button onClick={() => openModal('add', 'grades')} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.grades.map(grade => (
                        <div key={grade.id} className="p-4 border border-gray-200 rounded-xl flex justify-between items-center bg-gray-50/50">
                          <div>
                            <p className="font-bold text-gray-900">{grade.name}</p>
                            <p className="text-xs text-gray-500">Order: {grade.order_index}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openModal('edit', 'grades', grade)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete('grades', grade.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'campuses' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Campuses</h3>
                      <button onClick={() => openModal('add', 'campuses')} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.campuses.map(campus => (
                        <div key={campus.id} className="p-4 border border-gray-200 rounded-xl flex justify-between items-center bg-gray-50/50">
                          <div>
                            <p className="font-bold text-gray-900">{campus.name}</p>
                            <p className="text-xs text-gray-500">Code: {campus.code}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openModal('edit', 'campuses', campus)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete('campuses', campus.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'packages' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Academic Packages</h3>
                      <button onClick={() => openModal('add', 'packages')} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {data.packages.map(pkg => (
                        <div key={pkg.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900 text-lg">{pkg.name}</h4>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('edit', 'packages', pkg)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                              <button onClick={() => handleDelete('packages', pkg.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">{pkg.description || 'No description'}</p>
                          <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
                            Requires: {pkg.required_grades.map(g => g.name).join(', ') || 'None'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Attendance Policies</h3>
                      <button onClick={() => openModal('add', 'policies')} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {data.policies.map(policy => (
                        <div key={policy.id} className="p-5 border border-gray-200 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/50">
                          <div>
                            <h4 className="font-bold text-gray-900">{policy.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{policy.description}</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${policy.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {policy.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('edit', 'policies', policy)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                              <button onClick={() => handleDelete('policies', policy.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6 capitalize">
              {modalMode === 'add' ? 'Add' : 'Edit'} {modalEntity}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              {modalEntity === 'grades' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Code</label>
                    <input type="text" value={formData.code || ''} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Order</label>
                    <input type="number" value={formData.order || formData.order_index || ''} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                </>
              )}

              {modalEntity === 'campuses' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Code</label>
                    <input type="text" value={formData.code || ''} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                    <textarea value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" rows="3" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" />
                  </div>
                </>
              )}

              {modalEntity === 'packages' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Starting Grade</label>
                      <select value={formData.starting_grade_id || formData.starting_grade || ''} onChange={(e) => setFormData({...formData, starting_grade_id: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required>
                        <option value="">Select</option>
                        {data.grades.map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Ending Grade</label>
                      <select value={formData.ending_grade_id || formData.ending_grade || ''} onChange={(e) => setFormData({...formData, ending_grade_id: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required>
                        <option value="">Select</option>
                        {data.grades.map(g => <option key={g.id} value={g.id}>{g.code}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" rows="3" />
                  </div>
                </>
              )}

              {modalEntity === 'policies' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Policy Name</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Grace Absences</label>
                    <input type="number" value={formData.grace_absences || 0} onChange={(e) => setFormData({...formData, grace_absences: parseInt(e.target.value)})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" required />
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <input type="checkbox" id="fee_block" checked={formData.fee_block_on_pending ?? true} onChange={(e) => setFormData({...formData, fee_block_on_pending: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    <label htmlFor="fee_block" className="text-sm font-semibold text-gray-700">Block Fees on Pending Attendance</label>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border-gray-200 rounded-xl px-4 py-2 focus:ring-indigo-500" rows="3" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
