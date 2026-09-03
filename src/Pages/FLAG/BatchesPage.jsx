import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { BookOpen, Search, Plus, Filter, Users, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function BatchesPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const canEdit = hasPermission('flag:admin') || hasPermission('flag:trainer');
  const isTrainerOnly = (hasPermission('flag:trainer') || user?.role_names?.includes('TRAINER')) && !hasPermission('flag:admin') && !user?.is_superuser;

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const token = accessToken || await refreshAccessToken();
      const res = await fetch(`${API_BASE_URL}/students/batches/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBatches((data.results !== undefined ? data.results : (Array.isArray(data) ? data : [])));
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.campus_name && b.campus_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Academic Batches</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and track all German training batches</p>
              {isTrainerOnly && (
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg mt-1.5">
                  My Assigned Batches
                </span>
              )}
            </div>
            {canEdit && (
              <Link 
                to="/flag/batches/new"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Create Batch
              </Link>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search batches by name or campus..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Filter size={18} /> Filters
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No batches found</h3>
                <p className="text-sm text-gray-500 mt-1">Adjust your search or create a new batch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBatches.map(batch => (
                  <div 
                    key={batch.id} 
                    onClick={() => navigate(`/flag/batches/${batch.id}`)}
                    className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 
                            batch.status === 'closed' ? 'bg-gray-100 text-gray-800' : 
                            'bg-blue-100 text-blue-800'}`}
                        >
                          {batch.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        {batch.grade_progress}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{batch.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{batch.campus_name} • {batch.mode}</p>
                    
                    <div className="mt-auto space-y-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        {batch.student_count} Active Students
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                        Trainer: {batch.trainer_name || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
