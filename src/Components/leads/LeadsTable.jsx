import React from 'react';
import {
  Mail, Phone, MapPin, Calendar, Edit, Trash2,
  ExternalLink, UserCheck, Users, History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';

const LeadsTable = ({ leads, statusColors, onDeleteLead }) => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const allowHistory = hasPermission('leads:view_any') || hasPermission('calls:view_any');

  const handleCallHistory = (id) =>
    navigate(`/leads/${id}`, { state: { scrollTo: 'call-history' } });

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
              {['Lead Info', 'Contact', 'Status', 'Source', 'Priority', 'Assignment', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead, index) => (
              <tr key={lead.id}
                className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Lead Info */}
                <td className="px-6 py-5">
                  <p className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors">{lead.name}</p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <ExternalLink size={12} className="opacity-50" />
                    {lead.interest || lead.program || 'No program'}
                  </p>
                </td>

                {/* Contact */}
                <td className="px-6 py-5">
                  <div className="space-y-2">
                    {/* Email */}
                    <a
                      href={lead.email && lead.email !== 'No email provided' ? `mailto:${lead.email}` : undefined}
                      className={`flex items-center gap-2 text-sm text-gray-700 group/email ${lead.email && lead.email !== 'No email provided' ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                      title={lead.email && lead.email !== 'No email provided' ? `Compose email to ${lead.email}` : ''}
                    >
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center group-hover/email:bg-blue-200 transition-colors">
                        <Mail size={14} className="text-blue-600" />
                      </div>
                      <span className="font-medium group-hover/email:underline">{lead.email}</span>
                    </a>

                    {/* Phone */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                        <Phone size={14} className="text-green-600" />
                      </div>
                      <span className="font-medium">{lead.phone}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin size={14} className="text-purple-600" />
                      </div>
                      <span className="font-medium">{lead.location}</span>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-5">
                  <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${statusColors[lead.status]}`}>
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                </td>

                {/* Source */}
                <td className="px-6 py-5">
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">{lead.source}</span>
                </td>

                {/* Priority */}
                <td className="px-6 py-5">
                  <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                    lead.priority === 'HIGH'   ? 'bg-red-100 text-red-700' :
                    lead.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                 'bg-gray-100 text-gray-700'
                  }`}>
                    {lead.priority}
                  </span>
                </td>

                {/* Assignment */}
                <td className="px-6 py-5">
                  <div className="space-y-2">
                    {lead.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <UserCheck size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Primary</p>
                          <p className="text-sm font-medium text-gray-900">
                            {lead.assigned_to.first_name} {lead.assigned_to.last_name}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {lead.sub_assigned_to ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users size={14} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sub</p>
                          <p className="text-sm font-medium text-gray-900">
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
                  </div>
                </td>

                {/* Date */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar size={14} className="text-orange-600" />
                    </div>
                    {lead.date}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5">

                    {/* Call History — permitted roles only */}
                    {allowHistory && (
                      <button
                        onClick={() => handleCallHistory(lead.id)}
                        className="group/btn p-2.5 text-purple-600 hover:bg-purple-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110"
                        title="Call history"
                      >
                        <History size={18} className="group-hover/btn:rotate-12 transition-transform" />
                      </button>
                    )}

                    {/* Edit */}
                    <button onClick={() => navigate(`/leads/edit/${lead.id}`)}
                      className="group/btn p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110" title="Edit lead">
                      <Edit size={18} className="group-hover/btn:rotate-12 transition-transform" />
                    </button>

                    {/* Delete */}
                    <button onClick={() => onDeleteLead(lead.id)}
                      className="group/btn p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-110" title="Delete lead">
                      <Trash2 size={18} className="group-hover/btn:rotate-12 transition-transform" />
                    </button>
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
