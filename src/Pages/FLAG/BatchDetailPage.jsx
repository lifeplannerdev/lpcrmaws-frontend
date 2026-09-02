import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Users, Settings, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2, Check } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function BatchDetailPage() {
  const { id } = useParams();
  const { accessToken, refreshAccessToken } = useAuth();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'promote', 'demote'
  const [promotionLoading, setPromotionLoading] = useState(false);

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const [batchRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/batches/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/students/?batch=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const batchData = await batchRes.json();
      const studentsData = await studentsRes.json();
      setBatch(batchData);
      setStudents((studentsData.results !== undefined ? studentsData.results : (Array.isArray(studentsData) ? studentsData : [])));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const handlePromoteBatch = async () => {
    if (!window.confirm("Are you sure you want to promote this batch to the next grade? All passing students will be promoted. Demoted students will be removed from this batch.")) return;
    
    try {
      setPromotionLoading(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/promotions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ batch: id })
      });
      if (res.ok) {
        alert('Promotion successful!');
        fetchBatch();
      } else {
        const error = await res.json();
        alert(error.detail || 'Failed to promote batch');
      }
    } catch (err) {
      console.error(err);
      alert('Error promoting batch');
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleDemoteStudent = async (studentId, reason) => {
    try {
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/demotions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student: studentId,
          from_batch: id,
          reason: reason
        })
      });
      if (res.ok) {
        alert('Student successfully demoted and removed from batch.');
        fetchBatch();
      } else {
        const error = await res.json();
        alert(error.detail || 'Failed to demote student');
      }
    } catch (err) {
      console.error(err);
      alert('Error demoting student');
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
                <p className="text-gray-500 mt-2 flex items-center gap-2">
                  <BookOpen size={16} /> Grade Progress: <span className="font-semibold text-indigo-600">{batch.grade_progress}</span>
                </p>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                  <Users size={16} /> Campus: {batch.campus_name}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-sm font-bold ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                {batch.status.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('students')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Students List</button>
            <button onClick={() => setActiveTab('promote')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'promote' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Promotion Engine</button>
            <button onClick={() => setActiveTab('demote')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'demote' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Demotion Actions</button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {activeTab === 'students' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Active Students ({students.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Fee Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-4 text-gray-500">{student.phone || 'N/A'}</td>
                          <td className="px-6 py-4">
                            {student.fee_status === 'NO_ACCOUNT' ? (
                              <span className="text-gray-600 font-semibold bg-gray-50 px-2 py-1 rounded-md text-xs border border-gray-200">No Account</span>
                            ) : student.fee_status === 'OVERDUE' ? (
                              <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-md text-xs border border-red-100">Overdue</span>
                            ) : student.fee_status === 'SETTLED' ? (
                              <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md text-xs border border-green-100">Settled</span>
                            ) : (
                              <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">{student.fee_status}</span>
                            )}
                          </td>
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

            {activeTab === 'promote' && (
              <div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><ArrowUpCircle /> Promote Entire Batch</h3>
                    <p className="text-indigo-700 mt-2 text-sm max-w-xl">
                      This will promote all students in this batch who have passed the required exams to the next grade.
                      Demoted students or those who failed will be removed from this batch and moved to the holding area.
                    </p>
                  </div>
                  <button 
                    onClick={handlePromoteBatch}
                    disabled={promotionLoading}
                    className="flex-shrink-0 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    {promotionLoading && <Loader2 size={18} className="animate-spin" />}
                    Execute Promotion
                  </button>
                </div>
                
                <h4 className="font-bold text-gray-900 mb-4">Promotion Preview</h4>
                <p className="text-sm text-gray-500 mb-6">Review the current pass/fail status of students in this batch.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map(student => (
                    <div key={student.id} className="p-4 rounded-2xl border border-gray-200 bg-white">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-900">{student.name}</span>
                        <span className="inline-flex px-2 py-1 bg-green-50 text-green-700 font-bold text-xs rounded border border-green-100"><Check size={14} className="mr-1"/> Eligible</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Assuming passing grades (placeholder)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'demote' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Individual Demotions</h3>
                <p className="text-sm text-gray-500 mb-6">Demote students individually due to poor performance or attendance. They will be removed from this batch.</p>
                <div className="grid grid-cols-1 gap-4">
                  {students.map(student => (
                    <div key={student.id} className="p-5 rounded-2xl border border-red-100 bg-red-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900">{student.name}</h4>
                        <p className="text-sm text-gray-500">{student.phone}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const reason = prompt(`Enter reason for demoting ${student.name}:`);
                          if (reason) handleDemoteStudent(student.id, reason);
                        }}
                        className="bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
                      >
                        <ArrowDownCircle size={16} /> Demote Student
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
