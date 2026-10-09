import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Settings, 
  ArrowUpCircle, 
  AlertTriangle, 
  Loader2, 
  Check, 
  UserCheck, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Award, 
  CheckSquare, 
  Square,
  Sparkles,
  ArrowRight
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'exams'
  const [selectedGradeBatch, setSelectedGradeBatch] = useState(null);
  const [examMarksForm, setExamMarksForm] = useState({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Batch Level Promotion State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [promotionPreviewData, setPromotionPreviewData] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [promotingBatch, setPromotingBatch] = useState(false);

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
      
      if (batchData.grade_batches && batchData.grade_batches.length > 0) {
        setSelectedGradeBatch(prev => {
          if (prev) {
            const updated = batchData.grade_batches.find(gb => gb.id === prev.id);
            if (updated) return updated;
          }
          return batchData.grade_batches[0];
        });
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
        fetchBatch();
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

  // ── Batch Promotion Logic ────────────────────────────────────
  const fetchPromotionPreview = async (fromGbId = null) => {
    try {
      setLoadingPreview(true);
      const token = accessToken || await refreshAccessToken();
      const targetFromId = fromGbId || selectedGradeBatch?.id;
      const url = targetFromId 
        ? `${API_BASE_URL}/students/batches/${id}/promotion_preview/?from_grade_batch_id=${targetFromId}`
        : `${API_BASE_URL}/students/batches/${id}/promotion_preview/`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPromotionPreviewData(data);
        // Pre-select all students who are eligible (passed + package allows it)
        const eligibleIds = (data.students || [])
          .filter(s => s.can_promote)
          .map(s => s.id);
        setSelectedStudentIds(eligibleIds);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to load promotion preview');
        setShowPromoteModal(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error loading promotion preview');
      setShowPromoteModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenPromoteModal = () => {
    setShowPromoteModal(true);
    fetchPromotionPreview(selectedGradeBatch?.id);
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(sid => sid !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleAllEligible = () => {
    if (!promotionPreviewData) return;
    const eligibleIds = promotionPreviewData.students
      .filter(s => s.can_promote)
      .map(s => s.id);
    if (selectedStudentIds.length === eligibleIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleIds);
    }
  };

  const handleConfirmPromotion = async () => {
    if (selectedStudentIds.length === 0) {
      alert("No students selected for promotion.");
      return;
    }
    if (!window.confirm(`Are you sure you want to promote ${selectedStudentIds.length} student(s) to ${promotionPreviewData.to_grade}?`)) {
      return;
    }

    try {
      setPromotingBatch(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/${id}/promote_students/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          to_grade_batch_id: promotionPreviewData.to_grade_batch_id,
          student_ids: selectedStudentIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Promotion completed successfully!');
        setShowPromoteModal(false);
        await fetchBatch();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to promote students');
      }
    } catch (e) {
      console.error(e);
      alert('Error promoting batch students');
    } finally {
      setPromotingBatch(false);
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

  // Filter students based on currently selected Grade Batch box
  const currentGradeStudents = students.filter(s => 
    selectedGradeBatch ? (s.grade_batch_id === selectedGradeBatch.id || s.grade_batch === selectedGradeBatch.id) : true
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Batch Title Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{batch.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {batch.status.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
                  <Users size={16} /> Campus: <strong className="text-gray-700">{batch.campus_name}</strong> | Package: <strong className="text-gray-700">{batch.package_name}</strong> | Mode: <strong className="text-gray-700 capitalize">{batch.mode}</strong>
                </p>

                <div className="text-gray-600 mt-3 flex flex-wrap items-center gap-2">
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

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenPromoteModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ArrowUpCircle size={18} />
                      <span>Promote Batch Level</span>
                    </button>

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
              </div>
            </div>
          </div>

          {/* ── VISUAL GRADE BATCH PROGRESSION BOXES ── */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={20} />
                  Grade Batches & Level Progression
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click on any grade box below to view its students, enter marks, or promote passing students to the next level.
                </p>
              </div>

              {selectedGradeBatch && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Currently Selected:</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200">
                    Grade {selectedGradeBatch.grade_code}
                  </span>
                </div>
              )}
            </div>

            {/* The Grade Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {batch.grade_batches?.map((gb, idx) => {
                const isSelected = selectedGradeBatch?.id === gb.id;
                const studentCount = students.filter(s => s.grade_batch_id === gb.id || s.grade_batch === gb.id).length;
                const hasStudents = studentCount > 0;

                return (
                  <div
                    key={gb.id}
                    onClick={() => setSelectedGradeBatch(gb)}
                    className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 select-none ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50/50 border-indigo-600 shadow-lg ring-2 ring-indigo-500/20 scale-[1.02]'
                        : hasStudents
                        ? 'bg-white border-purple-200 hover:border-indigo-400 hover:shadow-md'
                        : 'bg-gray-50/70 border-gray-200 hover:border-gray-300 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Grade Code + Student Count */}
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-black ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {gb.grade_code}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        hasStudents ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {studentCount} {studentCount === 1 ? 'student' : 'students'}
                      </span>
                    </div>

                    {/* Grade Name */}
                    <p className="text-xs text-gray-500 font-semibold mt-2 truncate">
                      {gb.grade_name || `Level ${gb.grade_code}`}
                    </p>

                    {/* Bottom Indicator */}
                    <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between text-[11px]">
                      <span className={`font-bold flex items-center gap-1.5 ${
                        isSelected ? 'text-indigo-600' : hasStudents ? 'text-purple-600' : 'text-gray-400'
                      }`}>
                        {isSelected ? '● Active View' : hasStudents ? 'In Session' : 'No Students'}
                      </span>
                      <span className="text-gray-400 font-medium">Stage {idx + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── TABS FOR STUDENTS & EXAMS ── */}
          <div className="flex space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button 
              onClick={() => setActiveTab('students')} 
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              Students at {selectedGradeBatch ? `Grade ${selectedGradeBatch.grade_code}` : 'Level'} ({currentGradeStudents.length})
            </button>
            <button 
              onClick={() => setActiveTab('exams')} 
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'
              }`}
            >
              Exams & Marks Entry ({selectedGradeBatch ? selectedGradeBatch.grade_code : 'Select Grade'})
            </button>
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {/* Active Students in Selected Grade Batch */}
            {activeTab === 'students' && (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Students in {selectedGradeBatch ? `Grade ${selectedGradeBatch.grade_code}` : 'Batch'} ({currentGradeStudents.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Showing students currently attending this specific level in {batch.name}.
                    </p>
                  </div>

                  {canEdit && currentGradeStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenPromoteModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition shadow-2xs"
                    >
                      <ArrowUpCircle size={15} />
                      Promote These Students to Next Level
                    </button>
                  )}
                </div>

                {currentGradeStudents.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No students currently enrolled in this grade box ({selectedGradeBatch?.grade_code}).</p>
                    <p className="text-gray-400 text-xs mt-1">Students will appear here once promoted into this level or assigned to it.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4">Contact</th>
                          <th className="px-6 py-4">Personal Package</th>
                          <th className="px-6 py-4">Current Level</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentGradeStudents.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                            <td className="px-6 py-4 text-gray-500 text-xs">{student.phone || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-700">{student.package_name || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs">
                                {selectedGradeBatch?.grade_code || student.current_grade || 'A1'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {student.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link to={`/flag/students/${student.id}`} className="text-indigo-600 font-bold hover:text-indigo-800 text-xs">
                                View Profile →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Exams & Marks Entry Tab */}
            {activeTab === 'exams' && (
              <div>
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Enter Marks for Grade {selectedGradeBatch?.grade_code}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Record student exam results. Students with a <span className="text-green-600 font-bold">PASS</span> result will be eligible to advance when promoting the batch.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-600">Grade Level:</label>
                    <select 
                      value={selectedGradeBatch?.id || ''} 
                      onChange={e => setSelectedGradeBatch(batch.grade_batches.find(gb => gb.id == e.target.value))}
                      className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {batch.grade_batches?.map(gb => (
                        <option key={gb.id} value={gb.id}>{gb.grade_code} - {gb.grade_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedGradeBatch && (
                  <div>
                    {currentGradeStudents.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-sm">No students currently in {selectedGradeBatch.grade_code} to grade.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentGradeStudents.map(student => (
                          <div key={student.id} className="border border-gray-200 rounded-2xl p-5 bg-slate-50/50 shadow-2xs">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-gray-900 text-base">{student.name}</h4>
                              <span className="text-xs text-gray-500">Package: {student.package_name}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {['model', 'grade'].map(examType => {
                                const key = `${student.id}-${examType}`;
                                const val = examMarksForm[key] || { max_marks: 100, achieved_marks: '', result: 'pass' };
                                return (
                                  <div key={examType} className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                                    <h5 className="font-bold text-gray-800 mb-3 capitalize text-xs tracking-wider flex items-center justify-between">
                                      <span>{examType} Exam</span>
                                      <span className="text-[10px] text-gray-400 font-normal uppercase">{selectedGradeBatch.grade_code}</span>
                                    </h5>
                                    <div className="space-y-2.5">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[11px] font-semibold text-gray-500">Max Marks</label>
                                          <input type="number" value={val.max_marks} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, max_marks: e.target.value}})} className="w-full mt-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium" />
                                        </div>
                                        <div>
                                          <label className="text-[11px] font-semibold text-gray-500">Achieved</label>
                                          <input type="number" value={val.achieved_marks} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, achieved_marks: e.target.value}})} placeholder="Score" className="w-full mt-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700" />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-500">Result (Pass / Fail)</label>
                                        <select value={val.result} onChange={e => setExamMarksForm({...examMarksForm, [key]: {...val, result: e.target.value}})} className={`w-full mt-1 border rounded-lg px-2.5 py-1.5 text-xs font-bold ${val.result === 'pass' ? 'text-green-700 bg-green-50 border-green-300' : 'text-red-700 bg-red-50 border-red-300'}`}>
                                          <option value="pass">PASS (Eligible for Promotion)</option>
                                          <option value="fail">FAIL (Will Stay Back)</option>
                                        </select>
                                      </div>
                                      <button 
                                        onClick={() => handleSaveMarks(student.id, examType)}
                                        disabled={savingMarks}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs transition mt-2 shadow-2xs"
                                      >
                                        Save {examType} Exam Marks
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── BATCH LEVEL PROMOTION MODAL ── */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 sm:px-8 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ArrowUpCircle size={22} />
                  Promote Batch to Next Level
                </h3>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  Batch: <strong>{batch.name}</strong> • The system checked all student exam results and fee packages.
                </p>
              </div>

              <button 
                onClick={() => setShowPromoteModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Content */}
            {loadingPreview ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-sm font-semibold">Evaluating student exam marks and package limits...</span>
              </div>
            ) : !promotionPreviewData ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No promotion levels available for this batch.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Level Transition Pill Bar */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Advancement:</span>
                    <div className="flex items-center gap-2 font-black text-lg text-purple-900">
                      <span className="px-3 py-1 bg-white rounded-xl shadow-2xs border border-purple-200">{promotionPreviewData.from_grade}</span>
                      <ArrowRight size={18} className="text-purple-600" />
                      <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl shadow-2xs">{promotionPreviewData.to_grade}</span>
                    </div>
                  </div>

                  {promotionPreviewData.available_levels?.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-semibold">Switch Level:</span>
                      <select 
                        value={promotionPreviewData.from_grade_batch_id}
                        onChange={(e) => fetchPromotionPreview(e.target.value)}
                        className="text-xs border border-purple-300 rounded-lg px-2.5 py-1.5 font-bold bg-white text-purple-900"
                      >
                        {promotionPreviewData.available_levels.map(lvl => (
                          <option key={lvl.from_id} value={lvl.from_id}>
                            {lvl.from_grade} → {lvl.to_grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section 1: Students Eligible for Promotion */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600" />
                      <h4 className="font-bold text-gray-900 text-sm">
                        Ready to Promote ({promotionPreviewData.eligible_count || 0})
                      </h4>
                      <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                        Passed Exam & Package Covered
                      </span>
                    </div>

                    {promotionPreviewData.students?.some(s => s.can_promote) && (
                      <button
                        type="button"
                        onClick={handleToggleAllEligible}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        {selectedStudentIds.length === promotionPreviewData.eligible_count ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {promotionPreviewData.eligible_count === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-xl text-gray-500 text-xs border border-gray-100">
                      No students are currently eligible for promotion at this level. Make sure exams are recorded with a "PASS" result.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {promotionPreviewData.students.filter(s => s.can_promote).map(student => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => handleToggleStudent(student.id)}
                            className="flex items-center justify-between p-3.5 hover:bg-green-50/40 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isChecked ? (
                                <CheckSquare size={18} className="text-indigo-600 flex-shrink-0" />
                              ) : (
                                <Square size={18} className="text-gray-300 flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                <p className="text-[11px] text-gray-500">Package: {student.package_name}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                                {student.reason}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-0.5">Moving to Grade {student.target_grade}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Students Remaining Behind */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle size={18} className="text-red-600" />
                    <h4 className="font-bold text-gray-900 text-sm">
                      Remaining Behind ({promotionPreviewData.ineligible_count || 0})
                    </h4>
                    <span className="text-[11px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                      Exam Not Passed or Package Limit
                    </span>
                  </div>

                  {promotionPreviewData.ineligible_count === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 text-xs">
                      All students in this level are eligible for promotion!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        {promotionPreviewData.students.filter(s => !s.can_promote).map(student => (
                          <div key={student.id} className="flex items-center justify-between p-3.5 bg-gray-50/50">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                              <p className="text-[11px] text-gray-500">Package: {student.package_name}</p>
                            </div>

                            <div className="text-right">
                              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                {student.reason}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-0.5">Stays back in Grade {student.current_grade}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-700 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Note:</strong> These students will remain in their current grade. If you need to reassign them to another academic batch or grade, you can demote/reassign them directly from their individual student profiles.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200/60 transition text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPromotion}
                disabled={promotingBatch || selectedStudentIds.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 transition flex items-center gap-2"
              >
                {promotingBatch && <Loader2 size={16} className="animate-spin" />}
                <span>
                  Confirm & Promote {selectedStudentIds.length} Student{selectedStudentIds.length === 1 ? '' : 's'} to {promotionPreviewData?.to_grade}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
