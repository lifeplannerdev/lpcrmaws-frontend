import React, { useState, useEffect } from 'react';
import { Clock, Activity, Users, CalendarClock, MessageSquare, FileText, Loader2, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UnifiedTimeline = ({ authFetch, leadIdOverride, isSidePanel }) => {
  const params = useParams();
  const leadId = leadIdOverride || params.id;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline Actions
  const [actionType, setActionType] = useState(null); // 'remark' or 'followup'
  const [actionLoading, setActionLoading] = useState(false);
  
  const [remarkText, setRemarkText] = useState('');
  
  const [followupType, setFollowupType] = useState('CALL');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/unified-timeline/`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.timeline || []);
        }
      } catch (err) {
        console.error('Failed to load unified timeline:', err);
      } finally {
        setLoading(false);
      }
    };
    if (leadId && authFetch) fetchTimeline();
  }, [leadId, authFetch]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderEvent = (event, index) => {
    let title, description, meta, color, bg, Icon;

    if (event.type === 'processing_update') {
      title = `Processing Status: ${event.status?.replace('_', ' ')}`;
      description = event.notes;
      meta = event.user;
      color = 'text-purple-600';
      bg = 'bg-purple-100';
      Icon = Activity;
    } else if (event.type === 'remark_history') {
      title = `Remarks Updated`;
      description = event.new_remarks;
      meta = event.user;
      color = 'text-green-600';
      bg = 'bg-green-100';
      Icon = MessageSquare;
    } else if (event.type === 'assignment') {
      title = `Lead Assigned (${event.assignment_type})`;
      description = `Assigned to ${event.assigned_to || 'System'} by ${event.assigned_by || 'System'}`;
      meta = event.notes;
      color = 'text-indigo-600';
      bg = 'bg-indigo-100';
      Icon = Users;
    } else if (event.type === 'followup_scheduled') {
      title = `Follow-Up Scheduled (${event.followup_type})`;
      description = `Status: ${event.status}`;
      meta = event.user;
      color = 'text-blue-600';
      bg = 'bg-blue-100';
      Icon = CalendarClock;
    } else if (event.type === 'followup_status_change') {
      title = `Follow-Up Status Changed`;
      description = `${event.old_status} → ${event.new_status}`;
      meta = event.notes || event.user;
      color = 'text-orange-600';
      bg = 'bg-orange-100';
      Icon = Clock;
    } else {
      return null;
    }

    return (
      <div key={index} className="relative pl-6">
        <div className={`absolute -left-3.5 top-1.5 w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${bg} ${color}`}>
          <Icon size={12} />
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
            <h4 className="font-bold text-gray-900">{title}</h4>
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm whitespace-nowrap">
              {formatDate(event.timestamp)}
            </span>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{description}</p>
          )}
          
          {meta && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white inline-flex px-2 py-1 rounded-md border border-gray-100">
              <FileText size={12} />
              {meta}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center py-12">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Loading timeline...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No timeline events available</p>
      </div>
    );
  }

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setActionLoading(true);
    try {
      // Fetch current remarks to append
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

      // Optimistic update
      const newEvent = {
        type: 'remark_history',
        new_remarks: newRemarks,
        timestamp: new Date().toISOString(),
        user: 'You (Optimistic)'
      };
      setEvents(prev => [newEvent, ...prev]);
      setRemarkText('');
      setActionType(null);
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
      
      // Optimistic update
      const newEvent = {
        type: 'followup_scheduled',
        followup_type: followupType,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        user: 'You (Optimistic)'
      };
      setEvents(prev => [newEvent, ...prev]);
      setFollowupDate('');
      setFollowupTime('');
      setFollowupType('CALL');
      setActionType(null);
    } catch (err) {
      alert('Failed to schedule follow-up');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${isSidePanel ? 'max-h-full' : 'max-h-[800px]'} overflow-y-auto`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 sticky top-0 bg-white z-10 py-2 border-b border-gray-100 pb-4">
        <Clock size={20} className="text-indigo-600" />
        Unified Timeline
      </h3>

      {/* Inline Action Toggles */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setActionType(actionType === 'remark' ? null : 'remark')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${actionType === 'remark' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
        >
          + Add Remark
        </button>
        <button 
          onClick={() => setActionType(actionType === 'followup' ? null : 'followup')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${actionType === 'followup' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
        >
          + Schedule Follow-up
        </button>
      </div>

      {/* Action Forms */}
      {actionType === 'remark' && (
        <div className="mb-6 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
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
        <div className="mb-6 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-3">
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

      <div className="relative border-l-2 border-gray-100 ml-4 space-y-6 pb-4">
        {events.map((event, index) => renderEvent(event, index))}
      </div>
    </div>
  );
};

export default React.memo(UnifiedTimeline);
