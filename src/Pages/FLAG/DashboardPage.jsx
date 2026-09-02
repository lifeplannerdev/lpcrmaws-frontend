import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, Clock, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DashboardPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBatches: 0,
    pendingAttendances: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = accessToken || await refreshAccessToken();
      const [studentsRes, batchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/students/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const students = await studentsRes.json();
      const batches = await batchesRes.json();
      
      setStats({
        totalStudents: Array.isArray(students) ? students.length : 0,
        activeBatches: Array.isArray(batches) ? batches.length : 0,
        pendingAttendances: 0, 
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FLAG Hub</h1>
              <p className="text-sm text-gray-500 mt-1">German Language Training Management</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/flag/students" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Total Students</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Users className="text-indigo-600" size={24} />
                    </div>
                  </div>
                </Link>

                <Link to="/flag/batches" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Active Batches</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.activeBatches}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <BookOpen className="text-emerald-600" size={24} />
                    </div>
                  </div>
                </Link>

                <Link to="/fees" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Fees Module</p>
                      <h3 className="text-xl font-bold text-gray-900 mt-2">Manage Dues</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <AlertTriangle className="text-orange-600" size={24} />
                    </div>
                  </div>
                </Link>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/flag/students" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-semibold text-sm">
                    Manage Students
                  </Link>
                  <Link to="/flag/batches" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-semibold text-sm">
                    Manage Batches
                  </Link>
                  <Link to="/flag/settings" className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-semibold text-sm">
                    Configurations
                  </Link>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
