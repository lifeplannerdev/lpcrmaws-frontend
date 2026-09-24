import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Card from '../common/Card';
import SectionHeader from '../common/SectionHeader';
import EmptyState from '../common/EmptyState';
import Badge from '../common/Badge';

export default function UpcomingTasks({ tasks = [], formatTaskTime, getPriorityColor, onViewAll }) {
  const getPriorityVariant = (priority) => {
    const variantMap = { 'HIGH': 'high', 'MEDIUM': 'medium', 'LOW': 'low' };
    return variantMap[priority?.toUpperCase()] || 'default';
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card className="h-[290px] flex flex-col" padding="p-4">
      <SectionHeader
        title="Pending Tasks"
        onActionClick={onViewAll}
        size="sm"
      />

      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending tasks"
            description="You're all caught up! Great job!"
            compact
          />
        ) : (
          <div className="space-y-1.5 overflow-hidden">
            {tasks.slice(0, 3).map((task, index) => {
              const overdue = isOverdue(task.due_date || task.deadline);
              return (
                <div
                  key={task.id || index}
                  className={`group relative flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 border ${
                    overdue
                      ? 'bg-red-50/70 border-red-200 hover:border-red-300'
                      : 'bg-white border-gray-100 hover:bg-slate-50 hover:border-blue-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed || task.status === 'COMPLETED'}
                    onChange={() => {}}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-xs font-semibold ${overdue ? 'text-red-900' : 'text-gray-900'} truncate group-hover:text-blue-700 transition-colors`}>
                        {task.title || task.name || 'Untitled Task'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.priority && (
                          <Badge variant={getPriorityVariant(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="high" size="sm" className="flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center text-[11px] mt-0.5 ${overdue ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
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
