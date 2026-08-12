import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Users, ArrowUpCircle, AlertCircle, CheckCircle, XCircle, Edit2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BatchManagementPage = () => {
  const [batches, setBatches] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [demotedAssignments, setDemotedAssignments] = useState({}); // { studentId: { gradeId, batchId } }
  
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({ name: '', current_grade: '' });
  const [creatingBatch, setCreatingBatch] = useState(false);
  
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editBatchForm, setEditBatchForm] = useState({ id: '', name: '', status: '' });
  const [editingBatch, setEditingBatch] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const { accessToken, refreshAccessToken } = useAuth();

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      await axios.post(`${API_BASE_URL}/students/batches/`, newBatchForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Batch created successfully!');
      setShowCreateBatchModal(false);
      setNewBatchForm({ name: '', current_grade: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleEditBatch = async (e) => {
    e.preventDefault();
    setEditingBatch(true);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      await axios.patch(`${API_BASE_URL}/students/batches/${editBatchForm.id}/`, {
        name: editBatchForm.name,
        status: editBatchForm.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Batch updated successfully!');
      setShowEditBatchModal(false);
      setSelectedBatch(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to update batch');
    } finally {
      setEditingBatch(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const [bRes, gRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/students/grades/`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBatches(bRes.data.results || bRes.data);
      setGrades(gRes.data.results || gRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreviewPromote = async (batchId) => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/students/batches/${batchId}/preview_promote/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewData(res.data);
      setDemotedAssignments({});
      setShowPreviewModal(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate preview');
    }
  };

  const handleConfirmPromote = async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const formattedAssignments = {};
      Object.entries(demotedAssignments).forEach(([sId, data]) => {
         if (data.batchId) formattedAssignments[sId] = data.batchId;
      });

      const res = await axios.post(`${API_BASE_URL}/students/batches/${selectedBatch.id}/promote/`, {
        demoted_assignments: formattedAssignments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(res.data.message || 'Successfully promoted');
      setShowPreviewModal(false);
      setSelectedBatch(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to promote batch');
    }
  };

  const updateDemotedAssignment = (studentId, field, value) => {
    setDemotedAssignments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        // Reset batch if grade changes
        ...(field === 'gradeId' ? { batchId: '' } : {})
      }
    }));
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading batches...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Academic Batches</h1>
          <p className="text-gray-500 mt-2">Manage student batches, enter marks, and process promotions.</p>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowCreateBatchModal(true)}
        >
          <Users size={20} /> New Batch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(batch => (
          <div 
            key={batch.id} 
            className="glass-card p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 border-t-4 border-t-brand-500"
            onClick={() => setSelectedBatch(batch)}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">{batch.name}</h3>
              <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold">
                {batch.current_grade_detail?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Users size={16} />
              <span>{batch.student_count} Active Students</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
              <span>Status: <span className="text-green-600 font-medium">{batch.status}</span></span>
            </div>
          </div>
        ))}
      </div>

      {selectedBatch && !showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedBatch.name} Details</h2>
              <button onClick={() => setSelectedBatch(null)} className="text-gray-400 hover:text-gray-800">✕</button>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex gap-3 mb-6">
              <AlertCircle className="shrink-0" />
              <p className="text-sm">
                Ensure all students have exam marks entered before promoting this batch to the next grade.
              </p>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button className="btn-secondary text-gray-500" onClick={() => setSelectedBatch(null)}>Close</button>
              <div className="flex-1"></div>
              <button 
                className="btn-secondary flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => { setEditBatchForm({ id: selectedBatch.id, name: selectedBatch.name, status: selectedBatch.status }); setShowEditBatchModal(true); }}
              >
                <Edit2 size={20} /> Edit Batch
              </button>
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={() => handlePreviewPromote(selectedBatch.id)}
              >
                <ArrowUpCircle size={20} /> Promote Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl p-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Promotion Preview</h2>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-800">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {/* Passed Students Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="text-emerald-500" size={20} />
                  Promoting to {previewData.next_grade.name} ({previewData.passed_students.length})
                </h3>
                {previewData.passed_students.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No students passed.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previewData.passed_students.map(s => (
                      <div key={s.id} className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-100">
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Failed Students Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <XCircle className="text-red-500" size={20} />
                  Demoting / Repeating ({previewData.failed_students.length})
                </h3>
                {previewData.failed_students.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No students failed.</p>
                ) : (
                  <div className="space-y-4">
                    {previewData.failed_students.map(s => {
                      const assignment = demotedAssignments[s.id] || { gradeId: '', batchId: '' };
                      const gradeBatches = batches.filter(b => b.current_grade === parseInt(assignment.gradeId));

                      return (
                        <div key={s.id} className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="font-semibold text-gray-800">{s.name}</div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                              value={assignment.gradeId}
                              onChange={e => updateDemotedAssignment(s.id, 'gradeId', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="">Select Grade...</option>
                              {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>

                            <select
                              value={assignment.batchId}
                              onChange={e => updateDemotedAssignment(s.id, 'batchId', e.target.value)}
                              disabled={!assignment.gradeId}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Batch...</option>
                              {gradeBatches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 shrink-0">
              <button className="btn-secondary" onClick={() => setShowPreviewModal(false)}>Cancel</button>
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={handleConfirmPromote}
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl relative">
            <button onClick={() => setShowCreateBatchModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
              <XCircle size={16} />
            </button>
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              <Users className="text-indigo-500" /> Create New Batch
            </h3>
            <form onSubmit={handleCreateBatch} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Batch Name</label>
                <input
                  type="text"
                  required
                  value={newBatchForm.name}
                  onChange={e => setNewBatchForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-800"
                  placeholder="e.g. FLAG_KTM-99"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Starting Grade</label>
                <select
                  required
                  value={newBatchForm.current_grade}
                  onChange={e => setNewBatchForm(p => ({ ...p, current_grade: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-800"
                >
                  <option value="">Select Grade...</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creatingBatch}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 mt-2"
              >
                {creatingBatch ? 'Creating...' : 'Create Batch'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditBatchModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl relative">
            <button onClick={() => setShowEditBatchModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
              <XCircle size={16} />
            </button>
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              <Edit2 className="text-indigo-500" /> Edit Batch
            </h3>
            <form onSubmit={handleEditBatch} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Batch Name</label>
                <input
                  type="text"
                  required
                  value={editBatchForm.name}
                  onChange={e => setEditBatchForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Status</label>
                <select
                  required
                  value={editBatchForm.status}
                  onChange={e => setEditBatchForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-gray-800"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={editingBatch}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 mt-2"
              >
                {editingBatch ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BatchManagementPage;
