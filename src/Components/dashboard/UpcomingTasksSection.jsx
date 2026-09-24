import React from 'react';
import { Clock, CalendarClock } from 'lucide-react';
import Card from '../common/Card';
import SectionHeader from '../common/SectionHeader';
import EmptyState from '../common/EmptyState';
import Badge from '../common/Badge';

export default function UpcomingTasksSection({ tasks = [], formatTaskTime, getPriorityColor, onViewAll }) {
  const getPriorityVariant = (priority) => {
    const variantMap = { 'HIGH': 'high', 'MEDIUM': 'medium', 'LOW': 'low' };
    return variantMap[priority?.toUpperCase()] || 'default';
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const diffTime = new Date(dueDate) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="h-[290px] flex flex-col" padding="p-4">
      <SectionHeader
        title="Upcoming Tasks"
        onActionClick={onViewAll}
        size="sm"
      />

      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming tasks"
            description="Your schedule is clear ahead!"
            compact
          />
        ) : (
          <div className="space-y-1.5 overflow-hidden">
            {tasks.slice(0, 3).map((task, index) => {
              const daysUntil = getDaysUntilDue(task.due_date || task.deadline);
              const isSoon = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;

              return (
                <div
                  key={task.id || index}
                  className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-white border border-gray-100 hover:bg-slate-50 hover:border-purple-200 transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={task.completed || task.status === 'COMPLETED'}
                    onChange={() => {}}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                        {task.title || task.name || 'Untitled Task'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.priority && (
                          <Badge variant={getPriorityVariant(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                        )}
                        {isSoon && (
                          <Badge variant="medium" size="sm" className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            SOON
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-[11px] text-gray-500 mt-0.5">
                      <CalendarClock className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatTaskTime(task.due_date || task.deadline)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
