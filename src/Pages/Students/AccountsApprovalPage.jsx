import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AccountsApprovalPage = () => {
  const [pendingAttendances, setPendingAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { accessToken, refreshAccessToken } = useAuth();

  const fetchPending = useCallback(async () => {
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/api/students/attendances/?approval_status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAttendances(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleRegularize = async (id) => {
    setProcessing(id);
    try {
      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      await axios.post(`${API_BASE_URL}/api/students/attendances/${id}/regularize/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAttendances(prev => prev.filter(a => a.id !== id));
      alert('Attendance regularized successfully.');
    } catch (err) {
      alert('Failed to regularize attendance.');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Accounts Regularization</h1>
          <p className="text-gray-500 mt-2">Approve attendance for students with pending fee dues under Strict policies.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pending attendances...</div>
      ) : pendingAttendances.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {pendingAttendances.map(record => (
            <div key={record.id} className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 border-yellow-400">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{record.student_name}</h3>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Date: <span className="font-semibold text-gray-700">{record.date}</span></span>
                    <span>Status Marked: <span className="font-semibold text-gray-700">{record.status}</span></span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={() => handleRegularize(record.id)}
                  disabled={processing === record.id}
                  className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} /> {processing === record.id ? 'Processing...' : 'Regularize'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
          <ShieldCheck size={48} className="text-green-500 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-gray-800">All clear!</h2>
          <p className="text-gray-500 mt-2">There are no pending attendances requiring regularization.</p>
        </div>
      )}
    </div>
  );
};

export default AccountsApprovalPage;
