import React from 'react';
import {
  Mail, Phone, MapPin, Calendar, Edit, Trash2,
  ExternalLink, UserCheck, Users, History, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';
import { useVoxbayCall } from '../../hooks/useVoxbayCall';

const LeadsTable = ({ leads, statusColors, onDeleteLead, activeLeadId, selectedLeads = [], setSelectedLeads = () => {} }) => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { initiateCall, callingNumber } = useVoxbayCall();

  const allowHistory = hasPermission('leads:view_any') || hasPermission('calls:view_any');
  const allowEdit = hasPermission('leads:edit_any') || hasPermission('leads:edit_tenant') || hasPermission('leads:edit_own');
  const allowDelete = hasPermission('leads:delete_any') || hasPermission('leads:delete_tenant');

  const handleCallHistory = (id) =>
    navigate(`/leads/${id}`, { state: { scrollTo: 'call-history' } });

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const toggleSelectLead = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedLeads(prev => [...prev, id]);
    } else {
      setSelectedLeads(prev => prev.filter(lId => lId !== id));
    }
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-500">Try adjusting your filters or add a new lead to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-4 text-left w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={leads.length > 0 && selectedLeads.length === leads.length}
                  onChange={toggleSelectAll}
                />
              </th>
              {[
                { label: 'Lead Info', className: 'min-w-[220px] w-1/4' },
                { label: 'Contact', className: 'min-w-[250px] w-1/4' },
                { label: 'Status', className: 'min-w-[130px]' },
                { label: 'Source', className: 'min-w-[130px]' },
                { label: 'Priority', className: 'min-w-[130px]' },
                { label: 'Assignment', className: 'min-w-[180px]' },
                { label: 'Date', className: 'min-w-[120px]' },
                { label: 'Actions', className: 'min-w-[100px] text-right' }
              ].map(h => (
                <th key={h.label} className={`px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${h.className}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead, index) => (
              <tr key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className={`group cursor-pointer transition-all duration-200 ${
                  activeLeadId && activeLeadId.toString() === lead.id.toString()
                    ? 'bg-blue-50/80 border-l-4 border-blue-500 shadow-inner'
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-l-4 border-transparent'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-5 align-top" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={(e) => toggleSelectLead(e, lead.id)}
                  />
                </td>
                {/* Lead Info */}
                <td className="px-4 py-5 align-top">
                  <p className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors line-clamp-2">{lead.name}</p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1 truncate">
                    <ExternalLink size={12} className="opacity-50 flex-shrink-0" />
                    <span className="truncate">{lead.interest || lead.program || 'No program'}</span>
                  </p>
                </td>

                {/* Contact */}
                <td className="px-4 py-5 align-top">
                  <div className="space-y-2">
                    {/* Email */}
                    <a
                      href={lead.email && lead.email !== 'No email provided' ? `mailto:${lead.email}` : undefined}
                      className={`flex items-center gap-2 text-sm text-gray-700 group/email ${lead.email && lead.email !== 'No email provided' ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                      title={lead.email && lead.email !== 'No email provided' ? `Compose email to ${lead.email}` : ''}
                    >
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/email:bg-blue-200 transition-colors">
                        <Mail size={14} className="text-blue-600" />
                      </div>
                      <span className="font-medium group-hover/email:underline truncate">{lead.email}</span>
                    </a>

                    {/* Phone */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); initiateCall(lead.phone); }}
                        disabled={callingNumber === lead.phone}
                        className="group/phone flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 transition-colors disabled:opacity-50"
                        title="Click to Call"
                      >
                        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/phone:bg-green-200 transition-colors">
                          {callingNumber === lead.phone ? <Loader2 size={14} className="animate-spin text-green-700" /> : <Phone size={14} className="text-green-600 group-hover/phone:text-green-800" />}
                        </div>
                        <span className="font-medium group-hover/phone:underline">{lead.phone}</span>
                      </button>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin size={14} className="text-purple-600" />
                      </div>
                      <span className="font-medium truncate" title={lead.location}>{lead.location}</span>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-5 align-top">
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm whitespace-nowrap ${statusColors[lead.status]}`}>
                    {lead.status.replace('_', ' ')}
                  </span>
                </td>

                {/* Source */}
                <td className="px-4 py-5 align-top">
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap">{lead.source}</span>
                </td>

                {/* Priority */}
                <td className="px-4 py-5 align-top">
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm whitespace-nowrap ${
                    lead.priority === 'HIGH'   ? 'bg-red-100 text-red-700' :
                    lead.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                 'bg-gray-100 text-gray-700'
                  }`}>
                    {lead.priority}
                  </span>
                </td>

                {/* Assignment */}
                <td className="px-4 py-5 align-top">
                  <div className="space-y-2">
                    {lead.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UserCheck size={14} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-gray-400">Primary</p>
                          <p className="text-sm font-semibold text-gray-800 truncate" title={`${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`}>
                            {lead.assigned_to.first_name} {lead.assigned_to.last_name}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {lead.sub_assigned_to ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users size={14} className="text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-gray-400">Sub</p>
                          <p className="text-sm font-medium text-gray-900 truncate" title={`${lead.sub_assigned_to.first_name} ${lead.sub_assigned_to.last_name}`}>
                            {lead.sub_assigned_to.first_name} {lead.sub_assigned_to.last_name}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {!lead.assigned_to && !lead.sub_assigned_to && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                          <UserCheck size={14} className="text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-400 italic">Unassigned</span>
                      </div>
                    )}
                    {lead.current_handler && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <UserCheck size={12} />
                        Handler: {lead.current_handler.first_name}
                      </span>
                    )}
                    {lead.assignment_source && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.assignment_source.includes('Admin') ? 'bg-blue-100 text-blue-700' :
                          lead.assignment_source.includes('Missed') ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.assignment_source}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-5 align-top">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar size={14} className="text-orange-600" />
                    </div>
                    <span className="whitespace-nowrap">{lead.date}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-5 align-top">
                  <div className="flex items-center justify-end gap-1.5">

                    {/* Quick Call */}
                    <button
                      onClick={(e) => { e.stopPropagation(); initiateCall(lead.phone); }}
                      disabled={callingNumber === lead.phone}
                      className="group/btn p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Click to Call (Voxbay)"
                    >
                      {callingNumber === lead.phone ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Phone size={16} className="group-hover/btn:rotate-12 transition-transform" />
                      )}
                    </button>

                    {/* Call History — permitted roles only */}
                    {allowHistory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCallHistory(lead.id); }}
                        className="group/btn p-2 text-purple-600 hover:bg-purple-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110"
                        title="Call history"
                      >
                        <History size={16} className="group-hover/btn:rotate-12 transition-transform" />
                      </button>
                    )}

                    {/* Edit */}
                    {allowEdit && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/leads/edit/${lead.id}`); }}
                        className="group/btn p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110" title="Edit lead">
                        <Edit size={16} className="group-hover/btn:rotate-12 transition-transform" />
                      </button>
                    )}

                    {/* Delete */}
                    {allowDelete && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}
                        className="group/btn p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110" title="Delete lead">
                        <Trash2 size={16} className="group-hover/btn:rotate-12 transition-transform" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable;
