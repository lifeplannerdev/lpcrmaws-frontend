import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Users, ArrowUpCircle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BatchManagementPage = () => {
  const [batches, setBatches] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [demotedAssignments, setDemotedAssignments] = useState({}); // { studentId: { gradeId, batchId } }
  
  const [loading, setLoading] = useState(true);
  const { accessToken, refreshAccessToken } = useAuth();

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
        <button className="btn-primary flex items-center gap-2">
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
              <button className="btn-secondary" onClick={() => setSelectedBatch(null)}>Close</button>
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
    </div>
  );
};

export default BatchManagementPage;
