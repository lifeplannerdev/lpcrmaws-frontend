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
    <Card className="h-[290px] flex flex-col" padding="p-4">
      <SectionHeader title="Today's Follow-Ups" onActionClick={onViewAll} size="sm" />
      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {followUps.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-ups today"
            description="Your follow-up schedule is clear for today!"
            compact
          />
        ) : (
          <div className="space-y-1.5 overflow-hidden">
            {followUps.slice(0, 3).map((item, index) => {
              const TypeIcon  = TYPE_ICON[item.followup_type]  || Phone;
              const typeColor = TYPE_COLOR[item.followup_type] || 'bg-gray-100 text-gray-600';
              const statusColor = STATUS_COLOR[item.status]    || 'bg-gray-100 text-gray-600';
              const statusLabel = STATUS_LABEL[item.status]    || item.status;
              
              const displayName = item.name || item.lead_name || item.phone_number || item.lead_phone || 'Unknown';
              const displayPhone = item.phone_number || item.lead_phone || '';

              return (
                <div
                  key={item.id || index}
                  onClick={() => {
                    if (item.lead) navigate(`/leads/${item.lead}`);
                  }}
                  className={`group flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 ${
                    item.lead ? 'cursor-pointer' : ''
                  } ${
                    item.is_overdue
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-white border-gray-100 hover:bg-slate-50 hover:border-emerald-200'
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                    <TypeIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                        {displayName}
                        {item.lead_program && (
                          <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded ml-1">
                            {item.lead_program}
                          </span>
                        )}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5 text-[11px] text-gray-500">
                      <span className="truncate">
                        {displayPhone || (item.follow_up_time ? formatTime(item.follow_up_time) : 'Follow-up')}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.follow_up_time && displayPhone && (
                          <span className="text-[10px] text-gray-400">
                            {formatTime(item.follow_up_time)}
                          </span>
                        )}
                        {item.is_overdue && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-semibold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Type label */}
                  <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${typeColor}`}>
                    {item.followup_type?.charAt(0).toUpperCase() + item.followup_type?.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
