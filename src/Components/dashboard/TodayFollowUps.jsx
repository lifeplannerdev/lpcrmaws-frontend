import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, Phone, MessageSquare,
  Mail, Users, AlertTriangle,
} from 'lucide-react';
import Card from '../common/Card';
import SectionHeader from '../common/SectionHeader';
import EmptyState from '../common/EmptyState';

const TYPE_ICON = {
  call:     Phone,
  whatsapp: MessageSquare,
  email:    Mail,
  meeting:  Users,
};

const TYPE_COLOR = {
  call:     'bg-green-100 text-green-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  email:    'bg-blue-100 text-blue-700',
  meeting:  'bg-purple-100 text-purple-700',
};

const STATUS_COLOR = {
  pending:        'bg-yellow-100 text-yellow-700',
  contacted:      'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
  rescheduled:    'bg-indigo-100 text-indigo-700',
};

const STATUS_LABEL = {
  pending:        'Pending',
  contacted:      'Contacted',
  not_interested: 'Not Interested',
  rescheduled:    'Rescheduled',
};

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

export default function TodayFollowUps({ followUps = [], onViewAll }) {
  const navigate = useNavigate();
  return (
    <Card className="h-full">
       <SectionHeader title="Today's Follow-Ups" onActionClick={onViewAll} />
      <div className="space-y-2">
        {followUps.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-ups today"
            description="Your follow-up schedule is clear for today!"
          />
        ) : (
          followUps.slice(0, 5).map((item, index) => {
            const TypeIcon  = TYPE_ICON[item.followup_type]  || Phone;
            const typeColor = TYPE_COLOR[item.followup_type] || 'bg-gray-100 text-gray-600';
            const statusColor = STATUS_COLOR[item.status]    || 'bg-gray-100 text-gray-600';
            const statusLabel = STATUS_LABEL[item.status]    || item.status;
            
            const displayName = item.name || item.lead_name || item.phone_number || item.lead_phone || 'Unknown';
            const displayPhone = item.phone_number || item.lead_phone || '';

            // Extract a clean snippet of notes without the audio recording tag
            let notesSnippet = '';
            if (item.notes) {
              const cleanNotes = item.notes.replace(/\[Audio Recording:\s*(https?:\/\/[^\]]+)\]/, '').trim();
              notesSnippet = cleanNotes.length > 50 ? cleanNotes.substring(0, 50) + '...' : cleanNotes;
            }

            return (
              <div
                key={item.id || index}
                onClick={() => {
                  if (item.lead) {
                    navigate(`/leads/${item.lead}`);
                  }
                }}
                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  item.lead ? 'cursor-pointer' : ''
                } ${
                  item.is_overdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {/* Type icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                  <TypeIcon className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                    {displayName} {item.lead_program && <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md ml-1">{item.lead_program}</span>}
                  </p>
                  {(displayName !== displayPhone && displayPhone) && (
                    <p className="text-xs text-gray-400 truncate">{displayPhone}</p>
                  )}
                  {notesSnippet && (
                    <p className="text-xs text-gray-500 truncate mt-0.5 mb-1 italic">"{notesSnippet}"</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.follow_up_time && (
                      <span className="text-xs text-gray-500 font-medium">
                        {formatTime(item.follow_up_time)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                      {statusLabel}
                    </span>
                    {item.is_overdue && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Type label */}
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${typeColor}`}>
                  {item.followup_type?.charAt(0).toUpperCase() + item.followup_type?.slice(1)}
                </span>
              </div>
            );
          })
        )}

        {followUps.length > 5 && (
          <button
            onClick={onViewAll}
            className="w-full mt-2 py-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-dashed border-emerald-200 transition-all"
          >
            +{followUps.length - 5} more follow-ups — View all
          </button>
        )}
      </div>
    </Card>
  );
}
