import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { FiUsers, FiAward, FiArrowUpCircle, FiAlertCircle } from 'react-ui-icons'; // Assuming some icon library or I'll just use lucide-react if present. Let's use lucide-react.

import { Users, Award, ArrowUpCircle, AlertCircle } from 'lucide-react';

const BatchManagementPage = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches/');
      setBatches(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteBatch = async (batchId) => {
    try {
      const res = await api.post(`/students/batches/${batchId}/promote/`);
      alert(res.data.message);
      fetchBatches();
      setSelectedBatch(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to promote batch');
    }
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

      {selectedBatch && (
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
                onClick={() => handlePromoteBatch(selectedBatch.id)}
              >
                <ArrowUpCircle size={20} /> Promote Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagementPage;
