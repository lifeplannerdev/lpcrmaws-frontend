import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PhoneMissed, Check, Clock, UserPlus } from 'lucide-react';

function buildDateParams(dateRange) {
  const now = new Date(), from = new Date();
  if (dateRange === 'today')  from.setHours(0, 0, 0, 0);
  if (dateRange === '7days')  from.setDate(now.getDate() - 7);
  if (dateRange === '30days') from.setDate(now.getDate() - 30);
  if (dateRange === '90days') from.setDate(now.getDate() - 90);
  return { from: from.toISOString(), to: now.toISOString() };
}

export default function UniqueMissedCallsTable({ dateRange = 'today' }) {
  const { accessToken } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningUuid, setAssigningUuid] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState({});
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = buildDateParams(dateRange);
      const res = await fetch(`${API_BASE_URL}/voxbay/unassigned-missed/?from=${from}&to=${to}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch unassigned missed calls');
      const data = await res.json();
      setCalls(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/?limit=100`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.results || data);
      }
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [accessToken, dateRange]);

  useEffect(() => {
    fetchStaff();
  }, [accessToken]);

  const handleAssign = async (call_uuid) => {
    const agent_id = selectedAgents[call_uuid];
    if (!agent_id) return;
    setAssigningUuid(call_uuid);
    try {
      const res = await fetch(`${API_BASE_URL}/voxbay/unassigned-missed/${call_uuid}/assign/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agent_id })
      });
      if (!res.ok) throw new Error('Failed to assign');
      // Remove from list
      setCalls(calls.filter(c => c.call_uuid !== call_uuid));
      setSelectedAgents(prev => {
        const next = { ...prev };
        delete next[call_uuid];
        return next;
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigningUuid(null);
    }
  };

  const handleBulkAssign = async () => {
    const toAssign = Object.entries(selectedAgents).filter(([uuid, agentId]) => agentId);
    if (toAssign.length === 0) return;

    setIsBulkAssigning(true);
    let successCount = 0;
    try {
      for (const [call_uuid, agent_id] of toAssign) {
        const res = await fetch(`${API_BASE_URL}/voxbay/unassigned-missed/${call_uuid}/assign/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ agent_id })
        });
        if (res.ok) {
          successCount++;
        }
      }
      fetchCalls();
      setSelectedAgents({});
    } catch (err) {
      alert("Error during bulk assignment: " + err.message);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  if (loading) return <div className="p-5 text-center text-gray-500">Loading unique missed calls...</div>;
  if (error) return <div className="p-5 text-center text-red-500">{error}</div>;

  const hasSelections = Object.values(selectedAgents).filter(Boolean).length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50">
        <h3 className="text-sm font-black text-red-700 flex items-center gap-2">
          <PhoneMissed size={16} />
          Unique Missed Calls (Unassigned Queue)
          <span className="text-xs text-red-500 font-normal">({calls.length} calls)</span>
        </h3>
        {hasSelections && (
          <button
            onClick={handleBulkAssign}
            disabled={isBulkAssigning}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-bold disabled:opacity-50"
          >
            {isBulkAssigning ? 'Assigning...' : 'Assign Selected'}
          </button>
        )}
      </div>
      
      {calls.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No unique missed calls. Great job!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Caller Number</th>
                <th className="px-4 py-3 font-semibold">Missed Rings</th>
                <th className="px-4 py-3 font-semibold">Assign To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {calls.map((log) => (
                <tr key={log.call_uuid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 font-bold">
                    {log.caller_number}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    UUID: {log.call_uuid ? log.call_uuid.substring(0, 8) : 'N/A'}...
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select 
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-red-400"
                        onChange={(e) => setSelectedAgents({ ...selectedAgents, [log.call_uuid]: e.target.value })}
                        value={selectedAgents[log.call_uuid] || ''}
                      >
                        <option value="">Select Staff...</option>
                        {staffList.map(staff => (
                          <option key={staff.id} value={staff.id}>{staff.username} ({staff.email})</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handleAssign(log.call_uuid)}
                        disabled={!selectedAgents[log.call_uuid] || assigningUuid === log.call_uuid}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-bold disabled:opacity-50"
                      >
                        {assigningUuid === log.call_uuid ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

