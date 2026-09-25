import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, User, Flag, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KanbanBoard = ({ tasks, onDragEnd, canAssignTasks, currentUser }) => {
  const navigate = useNavigate();

  const columns = [
    { id: 'PENDING', title: 'Pending', color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-amber-100 border-amber-200 text-amber-700' },
    { id: 'PENDING_APPROVAL', title: 'Pending Approval', color: 'bg-purple-100 border-purple-200 text-purple-700' },
    { id: 'COMPLETED', title: 'Completed', color: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
    { id: 'OVERDUE', title: 'Overdue', color: 'bg-red-100 border-red-200 text-red-700' },
    { id: 'CANCELLED', title: 'Cancelled', color: 'bg-gray-100 border-gray-200 text-gray-600' },
  ];

  const getTasksByStatus = (status) => tasks.filter((task) => task.status === status);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'No deadline';

  const priorityColors = {
    URGENT: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4 h-full min-h-[600px] w-full snap-x snap-mandatory">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-80 bg-gray-50/50 rounded-2xl flex flex-col snap-start border border-gray-100">
              <div className={`p-4 rounded-t-2xl font-bold flex items-center justify-between border-b ${column.color}`}>
                <h3>{column.title}</h3>
                <span className="bg-white/80 px-2.5 py-0.5 rounded-full text-sm shadow-sm">
                  {columnTasks.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2 scale-105' : 'hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <h4 
                                className="font-bold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => navigate(`/tasks/${task.id}`)}
                              >
                                {task.title}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${priorityColors[task.priority]}`}>
                                {task.priority}
                              </span>
                            </div>
                            
                            <p className="text-gray-500 text-xs line-clamp-2 mb-3">
                              {task.description}
                            </p>

                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <User size={12} className="text-blue-500" />
                                <span className="font-medium truncate">To: {task.assigned_to_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <User size={12} className="text-purple-500" />
                                <span className="font-medium truncate">By: {task.assigned_by_name}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <Calendar size={12} className="text-rose-500" />
                                  <span>{formatDate(task.deadline)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default React.memo(KanbanBoard);
