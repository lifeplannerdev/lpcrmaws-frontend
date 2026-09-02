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
                      <button className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.grades.map(grade => (
                        <div key={grade.id} className="p-4 border border-gray-200 rounded-xl flex justify-between items-center bg-gray-50/50">
                          <div>
                            <p className="font-bold text-gray-900">{grade.name}</p>
                            <p className="text-xs text-gray-500">Order: {grade.order_index}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
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
                      <button className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.campuses.map(campus => (
                        <div key={campus.id} className="p-4 border border-gray-200 rounded-xl flex justify-between items-center bg-gray-50/50">
                          <div>
                            <p className="font-bold text-gray-900">{campus.name}</p>
                            <p className="text-xs text-gray-500">Code: {campus.code}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
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
                      <button className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {data.packages.map(pkg => (
                        <div key={pkg.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900 text-lg">{pkg.name}</h4>
                            <div className="flex gap-2">
                              <button className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                              <button className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
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
                      <button className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Plus size={16}/> Add</button>
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
                              <button className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                              <button className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
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
    </div>
  );
}
