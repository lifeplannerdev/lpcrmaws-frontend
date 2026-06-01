import React from 'react';
import { Check, Clock, Play } from 'lucide-react';

export default function CustomerJourney({ lead }) {
  if (!lead) return null;

  // Define steps
  const steps = [
    {
      id: 'created',
      label: 'Lead Created',
      description: lead.source || 'Manual Entry',
      active: true,
      completed: true,
    },
    {
      id: 'assigned',
      label: 'Assigned',
      description: lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : 'Pending',
      active: !!lead.assigned_to,
      completed: !!lead.assigned_to,
    },
    {
      id: 'contacted',
      label: 'Contacted',
      description: lead.status !== 'ENQUIRY' ? lead.status : 'Pending',
      active: lead.status !== 'ENQUIRY',
      completed: lead.status !== 'ENQUIRY',
    },
    {
      id: 'converted',
      label: 'Converted',
      description: lead.status === 'CONVERTED' ? 'Successfully Enrolled' : (lead.status === 'LOST' ? 'Lost' : 'Pending'),
      active: lead.status === 'CONVERTED' || lead.status === 'LOST',
      completed: lead.status === 'CONVERTED',
      failed: lead.status === 'LOST'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Journey</h3>
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(steps.filter(s => s.completed).length / (steps.length)) * 100}%` }}
        />
        <div className="relative z-10 flex justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-3 transition-colors ${
                  step.completed ? 'bg-indigo-600 text-white' : 
                  step.failed ? 'bg-red-500 text-white' : 
                  step.active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.completed ? <Check size={18} /> : (step.active ? <Play size={18} /> : <Clock size={18} />)}
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${step.active || step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-[120px] mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
