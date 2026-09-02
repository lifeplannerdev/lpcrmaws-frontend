import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, Award, CheckCircle, XCircle, AlertTriangle, BookOpen, Clock, Loader2, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentProfilePage() {
  const { id } = useParams();
  const { accessToken, refreshAccessToken } = useAuth();
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'exams', 'fees'

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const [studentRes, historyRes, examsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/students/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/student-history/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/exams/?student=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const studentData = await studentRes.json();
      const historyData = await historyRes.json();
      const examsData = await examsRes.json();

      setStudent(studentData);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setExams(Array.isArray(examsData) ? examsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

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

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center text-gray-500">
          Student not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-6 md:px-10 pb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-12 md:-mt-16 gap-6">
                <div className="flex items-end gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                    <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center">
                      <User size={48} className="text-indigo-400" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{student.name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5"><Phone size={16} /> {student.phone || 'No phone'}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={16} /> {student.campus_name || 'No campus'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mb-2 w-full md:w-auto">
                  {student.has_pending_fees ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl border border-red-200">
                      <AlertTriangle size={18} /> Fee Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200">
                      <CheckCircle size={18} /> Fee Clear
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl border ${student.status === 'active' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {student.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('current')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'current' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Current Status</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Batch History</button>
            <button onClick={() => setActiveTab('exams')} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-slate-50'}`}>Exams & Marks</button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            
            {activeTab === 'current' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="text-indigo-500" /> Academic Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Current Grade</span>
                      <span className="font-semibold text-gray-900">{student.current_grade || 'None'}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Current Batch</span>
                      <span className="font-semibold text-gray-900">{student.batch_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Package</span>
                      <span className="font-semibold text-gray-900">{student.package_name || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="text-indigo-500" /> Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Joined On</span>
                      <span className="font-semibold text-gray-900">{new Date(student.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-gray-100">
                      <span className="text-gray-500">Last Updated</span>
                      <span className="font-semibold text-gray-900">{new Date(student.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Batch & Promotion History</h3>
                </div>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm">No history records found.</p>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8">
                    {history.map((h, i) => (
                      <div key={h.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${h.is_demotion ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          {h.batch_name} 
                          {h.is_demotion ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">Demoted</span>
                          ) : (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">Enrolled</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">From {new Date(h.joined_date).toLocaleDateString()} {h.left_date ? `to ${new Date(h.left_date).toLocaleDateString()}` : '(Current)'}</p>
                        {h.reason && <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">{h.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'exams' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Exam Records</h3>
                  <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">Add Exam Record</button>
                </div>
                {exams.length === 0 ? (
                  <p className="text-gray-500 text-sm">No exam records found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map(ex => (
                      <div key={ex.id} className="p-5 rounded-2xl border border-gray-200 hover:border-indigo-300 transition-colors bg-gray-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="inline-block px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase">{ex.exam_type}</span>
                          <span className={`inline-flex items-center gap-1 font-bold text-sm ${ex.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                            {ex.is_passed ? <><CheckCircle size={16}/> Passed</> : <><XCircle size={16}/> Failed</>}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{ex.grade_name} Exam</h4>
                        <p className="text-sm text-gray-500 mb-4">Date: {new Date(ex.exam_date).toLocaleDateString()}</p>
                        
                        <div className="flex gap-4 border-t border-gray-100 pt-3">
                          <div>
                            <p className="text-xs text-gray-500">Marks</p>
                            <p className="font-bold text-gray-900">{ex.marks_obtained} / {ex.total_marks}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
