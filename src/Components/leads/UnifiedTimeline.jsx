import React, { useState, useEffect } from 'react';
import { Clock, Activity, Users, CalendarClock, MessageSquare, FileText, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UnifiedTimeline = ({ authFetch }) => {
  const { id: leadId } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-h-[800px] overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 sticky top-0 bg-white z-10 py-2">
        <Clock size={20} className="text-indigo-600" />
        Unified Timeline
      </h3>

      <div className="relative border-l-2 border-gray-100 ml-4 space-y-6 pb-4">
        {events.map((event, index) => renderEvent(event, index))}
      </div>
    </div>
  );
};

export default React.memo(UnifiedTimeline);
