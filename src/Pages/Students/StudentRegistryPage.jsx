import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Edit2, Search, Plus, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const StudentRegistryPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { accessToken, refreshAccessToken } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [grades, setGrades] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({
    name: '', mobile_number: '', email: '', package_id: '', batch_id: '', fee_template_id: '', fee_attendance_policy: 'STRICT', trainer_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchStudents = useCallback(async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const [res, pkgRes, batchRes, feeRes, gradeRes, staffRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/students/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/packages/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/fees/catalog/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/grades/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/accounts/staff/?limit=1000`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStudents(res.data.results || res.data);
      setPackages(pkgRes.data.results || pkgRes.data);
      setBatches(batchRes.data.results || batchRes.data);
      setFeeTemplates(feeRes.data.results || feeRes.data);
      setGrades(gradeRes.data.results || gradeRes.data);
      setStaffList(staffRes.data.results || staffRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      
      const payload = { ...formData };
      if (payload.package_id) payload.package = payload.package_id;
      if (payload.batch_id) payload.batch = payload.batch_id;
      if (payload.fee_template_id) payload.fee_template = payload.fee_template_id;
      if (payload.trainer_id) payload.trainer = payload.trainer_id;
      delete payload.package_id;
      delete payload.batch_id;
      delete payload.fee_template_id;
      delete payload.trainer_id;

      if (isEditing && editingId) {
        await axios.patch(`${API_BASE_URL}/students/students/${editingId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/students/students/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowAddModal(false);
      setFormData({ name: '', mobile_number: '', email: '', package_id: '', batch_id: '', fee_template_id: '', fee_attendance_policy: 'STRICT', trainer_id: '' });
      setIsEditing(false);
      setEditingId(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert('Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (student) => {
    setIsEditing(true);
    setEditingId(student.id);
    setFormData({
      name: student.name || '',
      mobile_number: student.mobile_number || '',
      email: student.email || '',
      package_id: student.package || student.package_detail?.id || '',
      batch_id: student.batch || student.batch_detail?.id || '',
      trainer_id: student.trainer || '',
      fee_template_id: '',
      fee_attendance_policy: student.fee_attendance_policy || 'STRICT'
    });
    setShowAddModal(true);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      await axios.delete(`${API_BASE_URL}/students/students/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete student.');
    }
  };

  const [packageForm, setPackageForm] = useState({ name: '', starting_grade_id: '', ending_grade_id: '' });
  const [batchForm, setBatchForm] = useState({ name: '', starting_grade_id: '', current_grade_id: '', start_date: '', target_end_date: '', schedule: '' });

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      const payload = { ...packageForm };
      if (payload.starting_grade_id) payload.starting_grade = payload.starting_grade_id;
      if (payload.ending_grade_id) payload.ending_grade = payload.ending_grade_id;
      delete payload.starting_grade_id;
      delete payload.ending_grade_id;

      const res = await axios.post(`${API_BASE_URL}/students/packages/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages([...packages, res.data]);
      setFormData({...formData, package_id: res.data.id});
      setShowAddPackageModal(false);
      setPackageForm({ name: '', starting_grade_id: '', ending_grade_id: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to save package.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      const payload = { ...batchForm };
      if (payload.starting_grade_id) payload.starting_grade = payload.starting_grade_id;
      if (payload.current_grade_id) payload.current_grade = payload.current_grade_id;
      if (!payload.start_date) delete payload.start_date;
      if (!payload.target_end_date) delete payload.target_end_date;
      delete payload.starting_grade_id;
      delete payload.current_grade_id;

      const res = await axios.post(`${API_BASE_URL}/students/batches/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches([...batches, res.data]);
      setFormData({...formData, batch_id: res.data.id});
      setShowAddBatchModal(false);
      setBatchForm({ name: '', starting_grade_id: '', current_grade_id: '', start_date: '', target_end_date: '', schedule: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to save batch.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Student Registry (FLAG)</h1>
          <p className="text-gray-500 mt-2">Accounts team: Add students, manage packages, and define fee policies.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => {
          setIsEditing(false);
          setEditingId(null);
          setFormData({ name: '', mobile_number: '', email: '', package_id: '', batch_id: '', fee_template_id: '', fee_attendance_policy: 'STRICT', trainer_id: '' });
          setShowAddModal(true);
        }}>
          <UserPlus size={20} /> Add Student
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Package</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Batch</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Fee Policy</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{student.name}</td>
                  <td className="px-6 py-4">{student.package_detail?.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">{student.batch_detail?.name || 'Unassigned Batch'}</div>
                    {student.trainer_name && <div className="text-xs text-gray-500 mt-1">Trainer: {student.trainer_name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${student.fee_attendance_policy === 'STRICT' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {student.fee_attendance_policy}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleEditClick(student)} className="text-brand-600 hover:text-brand-800"><Edit2 size={18}/></button>
                    <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl overflow-hidden rounded-2xl">
            <form onSubmit={handleSaveStudent} className="flex flex-col h-full">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Student' : 'Add New Student'}</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name *</label>
                    <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input type="email" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.mobile_number} onChange={e => setFormData({...formData, mobile_number: e.target.value})} />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {!isEditing && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Plan Template</label>
                      <select className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.fee_template_id} onChange={e => setFormData({...formData, fee_template_id: e.target.value})}>
                        <option value="">-- Select Fee Plan --</option>
                        {feeTemplates.map(t => <option key={t.id} value={t.id}>{t.name} (₹{t.total_amount})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Academic Package</label>
                      <button type="button" onClick={() => setShowAddPackageModal(true)} className="text-brand-600 hover:text-brand-800 p-1 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <select className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.package_id} onChange={e => setFormData({...formData, package_id: e.target.value})}>
                      <option value="">-- Select Package --</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Assign Batch</label>
                      <button type="button" onClick={() => setShowAddBatchModal(true)} className="text-brand-600 hover:text-brand-800 p-1 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <select className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.batch_id} onChange={e => setFormData({...formData, batch_id: e.target.value})}>
                      <option value="">-- Select Batch --</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.current_grade_detail?.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Assign Trainer</label>
                    </div>
                    <select className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={formData.trainer_id} onChange={e => setFormData({...formData, trainer_id: e.target.value})}>
                      <option value="">-- Select Trainer --</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Fee Attendance Policy</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="policy" value="STRICT" checked={formData.fee_attendance_policy === 'STRICT'} onChange={e => setFormData({...formData, fee_attendance_policy: e.target.value})} className="text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm font-medium text-gray-800">Strict (Flags due on Attendance)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="policy" value="LENIENT" checked={formData.fee_attendance_policy === 'LENIENT'} onChange={e => setFormData({...formData, fee_attendance_policy: e.target.value})} className="text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm font-medium text-gray-800">Lenient</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (isEditing ? 'Update Student' : 'Save Student')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg overflow-hidden rounded-2xl">
            <form onSubmit={handleSavePackage} className="flex flex-col h-full">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                <h2 className="text-2xl font-bold text-gray-900">Add Academic Package</h2>
                <button type="button" onClick={() => setShowAddPackageModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-8 space-y-6 bg-white overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Package Name *</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} placeholder="e.g., A1 to B2 Package" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Grade *</label>
                    <select required className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={packageForm.starting_grade_id} onChange={e => setPackageForm({...packageForm, starting_grade_id: e.target.value})}>
                      <option value="">-- Select --</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ending Grade *</label>
                    <select required className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={packageForm.ending_grade_id} onChange={e => setPackageForm({...packageForm, ending_grade_id: e.target.value})}>
                      <option value="">-- Select --</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowAddPackageModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Package'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg overflow-hidden rounded-2xl">
            <form onSubmit={handleSaveBatch} className="flex flex-col h-full">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50">
                <h2 className="text-2xl font-bold text-gray-900">Add Academic Batch</h2>
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Name *</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={batchForm.name} onChange={e => setBatchForm({...batchForm, name: e.target.value})} placeholder="e.g., A1 Morning Sept" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Grade *</label>
                    <select required className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={batchForm.starting_grade_id} onChange={e => setBatchForm({...batchForm, starting_grade_id: e.target.value, current_grade_id: e.target.value})}>
                      <option value="">-- Select --</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Grade *</label>
                    <select required className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={batchForm.current_grade_id} onChange={e => setBatchForm({...batchForm, current_grade_id: e.target.value})}>
                      <option value="">-- Select --</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                    <input type="date" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={batchForm.start_date} onChange={e => setBatchForm({...batchForm, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none" value={batchForm.schedule} onChange={e => setBatchForm({...batchForm, schedule: e.target.value})} placeholder="e.g., Morning" />
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistryPage;
