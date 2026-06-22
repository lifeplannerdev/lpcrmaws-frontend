import React, { useState } from 'react';
import { CalendarClock, MessageSquare, Send, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LeadQuickActions({ leadId, authFetch, onActionComplete }) {
  const [actionType, setActionType] = useState(null); // 'remark' or 'followup'
  const [actionLoading, setActionLoading] = useState(false);
  
  const [remarkText, setRemarkText] = useState('');
  
  const [followupType, setFollowupType] = useState('CALL');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setActionLoading(true);
    try {
      const leadRes = await authFetch(`${API_BASE_URL}/leads/${leadId}/`);
      if (!leadRes.ok) throw new Error('Failed to fetch lead');
      const leadData = await leadRes.json();
      
      const newRemarks = leadData.remarks 
        ? `${leadData.remarks}\n\n[${new Date().toLocaleString()}] ${remarkText}`
        : remarkText;

      const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: newRemarks })
      });
      if (!res.ok) throw new Error('Failed to add remark');

      setRemarkText('');
      setActionType(null);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      alert('Failed to add remark');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleFollowup = async () => {
    if (!followupDate || !followupTime) return;
    setActionLoading(true);
    try {
      const dateTime = new Date(`${followupDate}T${followupTime}`).toISOString();
      const payload = {
        lead: leadId,
        follow_up_type: followupType,
        follow_up_date: dateTime,
        follow_up_status: 'PENDING'
      };

      const res = await authFetch(`${API_BASE_URL}/followups/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to schedule followup');
      
      setFollowupDate('');
      setFollowupTime('');
      setFollowupType('CALL');
      setActionType(null);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      alert('Failed to schedule follow-up');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full mt-3">
      <div className="flex gap-2">
        <button 
          onClick={() => setActionType(actionType === 'remark' ? null : 'remark')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold rounded-lg border transition-colors ${actionType === 'remark' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
        >
          <MessageSquare size={16} /> Remark
        </button>
        <button 
          onClick={() => setActionType(actionType === 'followup' ? null : 'followup')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold rounded-lg border transition-colors ${actionType === 'followup' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
        >
          <CalendarClock size={16} /> Follow-up
        </button>
      </div>

      {actionType === 'remark' && (
        <div className="mt-3 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 animate-in slide-in-from-top-2">
          <textarea
            className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 mb-2"
            rows="3"
            placeholder="Type your remark here..."
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
          />
          <div className="flex justify-end">
            <button 
              onClick={handleAddRemark}
              disabled={actionLoading || !remarkText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Remark
            </button>
          </div>
        </div>
      )}

      {actionType === 'followup' && (
        <div className="mt-3 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 space-y-3 animate-in slide-in-from-top-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
            <select 
              className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
              value={followupType}
              onChange={(e) => setFollowupType(e.target.value)}
            >
              <option value="CALL">Call</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Meeting</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
              <input 
                type="date"
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Time</label>
              <input 
                type="time"
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2"
                value={followupTime}
                onChange={(e) => setFollowupTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button 
              onClick={handleScheduleFollowup}
              disabled={actionLoading || !followupDate || !followupTime}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
              Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
