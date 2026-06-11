import React, { useState, useEffect } from 'react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Calendar, BookOpen, Layers } from 'lucide-react';
import Alert from '../Components/common/Alert';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AcademicBatchesPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  
  const [batches, setBatches] = useState([]);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [message, setMessage] = useState(null);

  // Marks Management State
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedBatchMarks, setSelectedBatchMarks] = useState(null);
  const [examType, setExamType] = useState('MODEL');
  const [studentsInBatch, setStudentsInBatch] = useState([]);
  const [examResults, setExamResults] = useState({}); // { student_id: { id, score, remarks } }
  const [marksLoading, setMarksLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    academic_year: new Date().getFullYear().toString(),
    grade: '',
    admission_date: '',
    model_exam_date: '',
    final_exam_date: '',
    default_fee_template: '',
  });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      let token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/trainers/academic-batches/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBatches(data.results || data);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to fetch academic batches.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeTemplates = async () => {
    try {
      let token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/fees/templates/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeeTemplates(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchFeeTemplates();
  }, [accessToken]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditingBatch(null);
    setFormData({
      name: '',
      academic_year: new Date().getFullYear().toString(),
      grade: '',
      admission_date: '',
      model_exam_date: '',
      final_exam_date: '',
      default_fee_template: '',
    });
    setShowModal(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      academic_year: batch.academic_year,
      grade: batch.grade || '',
      admission_date: batch.admission_date || '',
      model_exam_date: batch.model_exam_date || '',
      final_exam_date: batch.final_exam_date || '',
      default_fee_template: batch.default_fee_template || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let token = accessToken || await refreshAccessToken();
      const url = editingBatch 
        ? `${API_BASE_URL}/trainers/academic-batches/${editingBatch.id}/` 
        : `${API_BASE_URL}/trainers/academic-batches/`;
      const method = editingBatch ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (!payload.default_fee_template) {
        payload.default_fee_template = null;
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save batch');
      
      setMessage({ type: 'success', text: `Batch successfully ${editingBatch ? 'updated' : 'created'}!` });
      setShowModal(false);
      fetchBatches();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save academic batch.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      let token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/trainers/academic-batches/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchBatches();
      setMessage({ type: 'success', text: 'Batch deleted.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to delete batch.' });
    }
  };

  // ----- Marks Management -----
  const openMarksModal = (batch) => {
    setSelectedBatchMarks(batch);
    setExamType('MODEL');
    setShowMarksModal(true);
    fetchMarksData(batch.id, 'MODEL');
  };

  const fetchMarksData = async (batchId, type) => {
    setMarksLoading(true);
    try {
      let token = accessToken || await refreshAccessToken();
      
      // Fetch students for this batch
      const studentsRes = await fetch(`${API_BASE_URL}/students/?academic_batch=${batchId}&page_size=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentsData = await studentsRes.json();
      const fetchedStudents = studentsData.results || studentsData;
      setStudentsInBatch(fetchedStudents);

      // Fetch exam results for this batch and exam type
      const resultsRes = await fetch(`${API_BASE_URL}/trainers/exam-results/?academic_batch_id=${batchId}&exam_type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resultsData = await resultsRes.json();
      
      const resultsMap = {};
      resultsData.forEach(r => {
        resultsMap[r.student] = { id: r.id, score: r.score, remarks: r.remarks || '' };
      });
      setExamResults(resultsMap);
      
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load students and marks data.' });
    } finally {
      setMarksLoading(false);
    }
  };

  const handleExamTypeChange = (e) => {
    const newType = e.target.value;
    setExamType(newType);
    if (selectedBatchMarks) {
      fetchMarksData(selectedBatchMarks.id, newType);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    setExamResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveMarks = async () => {
    try {
      setMarksLoading(true);
      let token = accessToken || await refreshAccessToken();
      
      const promises = studentsInBatch.map(async (student) => {
        const result = examResults[student.id];
        if (!result || !result.score) return; // Skip empty
        
        const payload = {
          student: student.id,
          academic_batch: selectedBatchMarks.id,
          exam_type: examType,
          score: result.score,
          remarks: result.remarks
        };

        if (result.id) {
          return fetch(`${API_BASE_URL}/trainers/exam-results/${result.id}/`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          return fetch(`${API_BASE_URL}/trainers/exam-results/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      });
      
      await Promise.all(promises);
      setMessage({ type: 'success', text: 'Marks saved successfully!' });
      setShowMarksModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save marks.' });
    } finally {
      setMarksLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Academic Batches</h1>
            <p className="text-gray-500 mt-1">Manage academic years, grades, and batches.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} /> Create Batch
          </button>
        </div>

        {message && <Alert type={message.type} message={message.text} className="mb-6" />}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading batches...</div>
        ) : (
          <div className="space-y-12">
            {Object.entries(
              batches.reduce((acc, batch) => {
                if (!acc[batch.academic_year]) acc[batch.academic_year] = {};
                if (!acc[batch.academic_year][batch.grade]) acc[batch.academic_year][batch.grade] = [];
                acc[batch.academic_year][batch.grade].push(batch);
                return acc;
              }, {})
            ).sort((a, b) => b[0].localeCompare(a[0])).map(([year, grades]) => (
              <div key={year} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="text-indigo-600" />
                    Academic Year {year}
                  </h2>
                </div>
                <div className="p-6 space-y-8">
                  {Object.entries(grades).sort((a, b) => a[0].localeCompare(b[0])).map(([grade, gradeBatches]) => (
                    <div key={grade}>
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Layers className="text-blue-500" />
                        {grade}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4 border-l-2 border-blue-100">
                        {gradeBatches.map(batch => (
                          <div key={batch.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow relative group">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-bold text-gray-900">{batch.name}</h4>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openMarksModal(batch)} className="text-emerald-500 hover:text-emerald-700 p-1 bg-emerald-50 rounded" title="Manage Marks"><BookOpen size={14} /></button>
                                <button onClick={() => openEditModal(batch)} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded" title="Edit"><Edit size={14} /></button>
                                <button onClick={() => handleDelete(batch.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" /> 
                                <span>Admissions: {batch.admission_date || 'TBD'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookOpen size={14} className="text-gray-400" /> 
                                <span>Model Exams: {batch.model_exam_date || 'TBD'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookOpen size={14} className="text-gray-400" /> 
                                <span>Final Exams: {batch.final_exam_date || 'TBD'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {batches.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No academic batches found.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">{editingBatch ? 'Edit Batch' : 'Create Batch'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 2024 Science A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <input type="text" name="academic_year" required value={formData.academic_year} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 2024-2025" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Level *</label>
                  <input type="text" name="grade" required value={formData.grade} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Grade 10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
                    <input type="date" name="admission_date" value={formData.admission_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model Exams Date</label>
                    <input type="date" name="model_exam_date" value={formData.model_exam_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Exams Date</label>
                    <input type="date" name="final_exam_date" value={formData.final_exam_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Fee Template</label>
                    <select 
                      name="default_fee_template" 
                      value={formData.default_fee_template || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- No Default Fee Template --</option>
                      {feeTemplates.filter(t => t.is_active).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.company})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Batch</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Marks Management Modal */}
        {showMarksModal && selectedBatchMarks && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Marks: {selectedBatchMarks.name}</h2>
                <select 
                  value={examType} 
                  onChange={handleExamTypeChange}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-medium"
                >
                  <option value="MODEL">Model Exam</option>
                  <option value="FINAL">Final Exam</option>
                </select>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2">
                {marksLoading ? (
                  <div className="text-center py-10 text-gray-500">Loading student data...</div>
                ) : studentsInBatch.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No students enrolled in this batch.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-3 font-semibold text-gray-600">Student Name</th>
                        <th className="py-3 font-semibold text-gray-600 w-32">Score</th>
                        <th className="py-3 font-semibold text-gray-600">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsInBatch.map(student => (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{student.name}</td>
                          <td className="py-3 pr-4">
                            <input 
                              type="number" 
                              step="0.01"
                              value={examResults[student.id]?.score || ''}
                              onChange={(e) => handleMarkChange(student.id, 'score', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Score"
                            />
                          </td>
                          <td className="py-3">
                            <input 
                              type="text" 
                              value={examResults[student.id]?.remarks || ''}
                              onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Optional remarks"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowMarksModal(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="button" onClick={saveMarks} disabled={marksLoading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2">
                  {marksLoading ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
