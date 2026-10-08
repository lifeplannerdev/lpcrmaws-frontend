import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Settings, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2, Check, UserCheck, Edit, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [savingTrainer, setSavingTrainer] = useState(false);
  const canEdit = hasPermission('flag:admin') || hasPermission('flag:trainer') || user?.is_superuser;
  const [activeTab, setActiveTab] = useState('students');
  const [selectedGradeBatch, setSelectedGradeBatch] = useState(null);
  const [examMarksForm, setExamMarksForm] = useState({});
  const [savingMarks, setSavingMarks] = useState(false);

  const handleDeleteBatch = async () => {
    if (!batch) return;
    const studentWarning = students.length > 0 
      ? `\n\n⚠️ This batch currently has ${students.length} active student(s). Deleting it will unassign those students.`
      : '';
    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"?${studentWarning}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok && res.status !== 204) {
        let errData = {};
        try { errData = await res.json(); } catch (_) {}
        throw new Error(errData.detail || errData.message || `Failed to delete batch (Status ${res.status})`);
      }

      navigate('/flag/batches');
    } catch (err) {
      console.error('Error deleting batch:', err);
      alert(err.message || 'Failed to delete batch.');
      setDeleting(false);
    }
  };

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const [batchRes, studentsRes, trainersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/batches/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/students/?batch=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/trainers/`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);
      const batchData = await batchRes.json();
      const studentsData = await studentsRes.json();
      if (trainersRes && trainersRes.ok) {
        const trainersData = await trainersRes.json();
        setTrainers(trainersData.results !== undefined ? trainersData.results : (Array.isArray(trainersData) ? trainersData : []));
      }
      setBatch(batchData);
      setStudents(studentsData.results !== undefined ? studentsData.results : (Array.isArray(studentsData) ? studentsData : []));
      
      if (batchData.grade_batches && batchData.grade_batches.length > 0 && !selectedGradeBatch) {
        setSelectedGradeBatch(batchData.grade_batches[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBatchTrainer = async (trainerId) => {
    try {
      setSavingTrainer(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          trainer: trainerId ? Number(trainerId) : null
        })
      });
      if (res.ok) {
        await fetchBatch();
      } else {
        const error = await res.json();
        alert('Failed to assign trainer: ' + JSON.stringify(error));
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning trainer to batch');
    } finally {
      setSavingTrainer(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const handleSaveMarks = async (studentId, examType) => {
    try {
      const key = `${studentId}-${examType}`;
      const marksData = examMarksForm[key];
      if (!marksData || !marksData.achieved_marks || !marksData.result) {
        alert("Please fill all required fields: Achieved Marks, Max Marks and Result.");
        return;
      }
      setSavingMarks(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/exam-records/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student: studentId,
          grade_batch: selectedGradeBatch.id,
          exam_type: examType,
          max_marks: marksData.max_marks || 100,
          achieved_marks: marksData.achieved_marks,
          result: marksData.result,
          exam_date: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        alert('Marks saved successfully!');
      } else {
        const error = await res.json();
        alert(error.detail || 'Failed to save marks');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving marks');
    } finally {
      setSavingMarks(false);
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

  if (!batch) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{batch.name}</h1>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                  <Users size={16} /> Campus: {batch.campus_name} | Package: {batch.package_name}
                </p>
                <div className="text-gray-600 mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    <UserCheck size={16} className="text-indigo-600" /> Assigned Trainer:
                  </span>
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={batch.trainer || ''}
                        onChange={(e) => handleAssignBatchTrainer(e.target.value)}
                        disabled={savingTrainer}
                        className="text-xs bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-semibold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      >
                        <option value="">Unassigned (No Trainer)</option>
                        {trainers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name || t.username} {t.email ? `(${t.email})` : ''}
                          </option>
                        ))}
                      </select>
                      {savingTrainer && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900 text-sm">
                      {batch.trainer_name || 'Unassigned'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <>
                    <Link
                      to={`/flag/batches/${batch.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      <Edit size={16} />
                      Edit Batch
                    </Link>
                    <button
                      type="button"
                      onClick={handleDeleteBatch}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete Batch
                    </button>
                  </>
                )}
                <div className={`px-4 py-2 rounded-xl text-sm font-bold ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                  {batch.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('students')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>All Students</button>
            <button onClick={() => setActiveTab('exams')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Exams & Marks</button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {activeTab === 'students' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Students in Batch ({students.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-4 text-gray-500">{student.phone || 'N/A'}</td>
                          <td className="px-6 py-4">{student.status.toUpperCase()}</td>
                          <td className="px-6 py-4 text-right">
                            <Link to={`/flag/students/${student.id}`} className="text-indigo-600 font-semibold hover:text-indigo-800">Profile</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'exams' && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Grade Batch</label>
                  <select 
                    value={selectedGradeBatch?.id || ''} 
                    onChange={e => setSelectedGradeBatch(batch.grade_batches.find(gb => gb.id == e.target.value))}
                    className="w-full md:w-64 border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    {batch.grade_batches?.map(gb => (
                      <option key={gb.id} value={gb.id}>{gb.grade_code}</option>
                    ))}
                  </select>
                </div>

                {selectedGradeBatch && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Enter Marks for {selectedGradeBatch.grade_code}</h3>
                    <p className="text-sm text-gray-500 mb-6">Enter max marks, achieved marks, and the pass/fail result for model or grade exams.</p>
                    
                    <div className="space-y-8">
                      {students.map(student => (
                        <div key={student.id} className="border border-gray-100 rounded-xl p-4 bg-slate-50/50">
                          <h4 className="font-bold text-gray-900 mb-4">{student.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['model', 'grade'].map(examType => {
                              const key = `${student.id}-${examType}`;
                              const val = examMarksForm[key] || { max_marks: 100, achieved_marks: '', result: 'pass' };
                              return (
                                <div key={examType} className="bg-white p-4 rounded-lg border border-gray-200">
                                  <h5 className="font-semibold text-gray-700 mb-3 capitalize">{examType} Exam</h5>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500">Max Marks</label>
                                      <input type="number" value={val.max_marks} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, max_marks: e.target.value}})} className="w-full mt-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500">Achieved Marks</label>
                                      <input type="number" value={val.achieved_marks} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, achieved_marks: e.target.value}})} className="w-full mt-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500">Result (Pass/Fail)</label>
                                      <select value={val.result} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, result: e.target.value}})} className="w-full mt-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                                        <option value="pass">Pass</option>
                                        <option value="fail">Fail</option>
                                      </select>
                                    </div>
                                    <button 
                                      onClick={() => handleSaveMarks(student.id, examType)}
                                      disabled={savingMarks}
                                      className="w-full bg-indigo-600 text-white font-semibold py-1.5 rounded-md hover:bg-indigo-700 text-sm mt-2"
                                    >
                                      Save {examType} Marks
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
