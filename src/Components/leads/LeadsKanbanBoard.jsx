import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, User, Flag, Mail, Phone, PhoneCall, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveCall } from '../../context/LiveCallContext';

const LeadsKanbanBoard = ({ leads, onDragEnd, onLeadClick, statusColors }) => {
  const { openLiveCall } = useLiveCall();
  const columns = [
    { id: 'enquiry', title: 'Enquiry', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'contacted', title: 'Contacted', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { id: 'qualified', title: 'Qualified', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'converted', title: 'Converted', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'registered', title: 'Registered', color: 'bg-teal-50 border-teal-200 text-teal-700' },
    { id: 'lost', title: 'Lost', color: 'bg-red-50 border-red-200 text-red-700' },
  ];

  const getLeadsByStatus = (status) => leads.filter((lead) => lead.status === status);

  const priorityStyles = {
    HIGH: 'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 h-full min-h-[700px] w-full snap-x snap-mandatory">
        {columns.map((column) => {
          const columnLeads = getLeadsByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-[340px] bg-gray-50/70 rounded-2xl flex flex-col snap-start border border-gray-100 shadow-sm">
              <div className={`p-4 rounded-t-2xl font-bold flex items-center justify-between border-b ${column.color}`}>
                <h3 className="text-sm uppercase tracking-wider">{column.title}</h3>
                <span className="bg-white/80 px-2.5 py-0.5 rounded-full text-xs shadow-sm font-semibold">
                  {columnLeads.length}
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
                    {columnLeads.map((lead, index) => (
                      <Draggable key={lead.id.toString()} draggableId={lead.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onLeadClick ? onLeadClick(lead) : null}
                            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all ${
                              snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500 rotate-2 scale-105 z-50' : 'hover:shadow-md cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div>
                                <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                  {lead.name}
                                </h4>
                                <p className="text-xs text-blue-600 font-semibold mt-0.5">{lead.interest || lead.program || 'No Program'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${priorityStyles[lead.priority] || priorityStyles.LOW}`}>
                                {lead.priority || 'LOW'}
                              </span>
                            </div>

                            <div className="space-y-1.5 mt-3">
                              {/* Phone & Live Call Option */}
                              <div className="flex items-center justify-between gap-1 text-xs text-gray-600">
                                <div className="flex items-center gap-2 truncate">
                                  <div className="w-5 h-5 bg-green-50 rounded flex items-center justify-center flex-shrink-0">
                                    <Phone size={12} className="text-green-600" />
                                  </div>
                                  <span className="font-medium truncate">{lead.phone}</span>
                                </div>
                                {lead.phone && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLiveCall(lead);
                                    }}
                                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                                    title="Open Live Call Modal"
                                  >
                                    <PhoneCall size={12} />
                                  </button>
                                )}
                              </div>
                              
                              {/* Source */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                  {lead.source}
                                </span>
                                
                                {/* Assignee Avatar Initial */}
                                {lead.assigned_to ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold" title={`${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`}>
                                      {lead.assigned_to.first_name?.[0] || 'U'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                                )}
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

export default React.memo(LeadsKanbanBoard);
