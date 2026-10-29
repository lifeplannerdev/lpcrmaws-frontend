import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoxbayCall } from '../../hooks/useVoxbayCall';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  X,
  Phone,
  MessageSquare,
  Mail,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
  Search,
  Filter,
  User,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react';

const TYPE_ICON = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: Users,
};

const TYPE_COLOR = {
  call: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  whatsapp: 'bg-green-50 text-green-700 border-green-200',
  email: 'bg-blue-50 text-blue-700 border-blue-200',
  meeting: 'bg-purple-50 text-purple-700 border-purple-200',
};

const PRIORITY_COLOR = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

export default function FollowUpBigModal({
  isOpen,
  onClose,
  data,
  soundEnabled,
  onToggleSound,
  desktopPermission,
  onRequestDesktopPermission,
  onStatusUpdate,
  onReschedule,
  onSnooze,
}) {
  const navigate = useNavigate();
  const { initiateCall } = useVoxbayCall();

  const [activeTab, setActiveTab] = useState('all'); // all, overdue, today, tomorrow, upcoming
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Reschedule inline modal state
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Grouped items
  const counts = data?.counts || {
    total_active: 0,
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0,
  };

  const overdueList = data?.overdue || [];
  const todayList = data?.today || [];
  const tomorrowList = data?.tomorrow || [];
  const upcomingList = data?.upcoming || [];

  // Combine list based on tab
  const tabItems = useMemo(() => {
    switch (activeTab) {
      case 'overdue':
        return overdueList;
      case 'today':
        return todayList;
      case 'tomorrow':
        return tomorrowList;
      case 'upcoming':
        return upcomingList;
      case 'all':
      default:
        return [...overdueList, ...todayList, ...tomorrowList, ...upcomingList];
    }
  }, [activeTab, overdueList, todayList, tomorrowList, upcomingList]);

  // Apply search & filters
  const filteredItems = useMemo(() => {
    return tabItems.filter((item) => {
      // Always exclude inactive staff members' follow-ups
      if (item.assigned_to && item.assigned_to.is_active === false) {
        return false;
      }

      const q = searchTerm.toLowerCase().trim();
      const name = (item.lead_name || item.name || item.processing_student_name || '').toLowerCase();
      const phone = (item.lead_phone || item.phone_number || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      const course = (item.lead_course || item.lead_program || '').toLowerCase();
      const counselor = (
        item.assigned_to
          ? `${item.assigned_to.first_name || ''} ${item.assigned_to.last_name || ''} ${item.assigned_to.username || ''}`
          : ''
      ).toLowerCase();

      const matchSearch =
        !q ||
        name.includes(q) ||
        phone.includes(q) ||
        notes.includes(q) ||
        course.includes(q) ||
        counselor.includes(q);

      const matchType = filterType === 'all' || item.followup_type === filterType;
      const matchPriority = filterPriority === 'all' || item.priority === filterPriority;

      return matchSearch && matchType && matchPriority;
    });
  }, [tabItems, searchTerm, filterType, filterPriority]);

  if (!isOpen) return null;

  const handleCall = (item) => {
    const phone = item.lead_phone || item.phone_number;
    if (!phone) {
      toast.error('No phone number available for this follow-up');
      return;
    }
    const leadId =
      item.lead || item.lead_id || (typeof item.lead === 'object' ? item.lead?.id : null);
    initiateCall(phone, {
      id: leadId,
      name: item.lead_name || item.name || item.processing_student_name || 'Lead',
      status: item.lead_status || 'COLD',
      priority: item.priority || 'MEDIUM',
      program: item.lead_program || '',
    });
  };

  const handleOpenLead = (item) => {
    const leadId =
      item.lead || item.lead_id || (typeof item.lead === 'object' ? item.lead?.id : null);
    if (leadId) {
      onClose();
      navigate(`/leads/view/${leadId}`);
    } else {
      toast('No lead detail link available', { icon: 'ℹ️' });
    }
  };

  const handleNavigateToFollowups = () => {
    onClose();
    navigate('/followups');
  };

  const openRescheduleModal = (item) => {
    setRescheduleItem(item);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setRescheduleDate(tomorrowStr);
    setRescheduleTime(item.follow_up_time || '10:00');
    setRescheduleNotes('');
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleItem || !rescheduleDate) {
      toast.error('Please pick a reschedule date');
      return;
    }
    setIsSubmittingReschedule(true);
    try {
      if (onReschedule) {
        await onReschedule(rescheduleItem, rescheduleDate, rescheduleTime, rescheduleNotes);
      }
      setRescheduleItem(null);
      toast.success('Follow-up successfully rescheduled!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reschedule follow-up');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-gray-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Centered Large Modal Container */}
      <div
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-6 sm:px-8 py-5 text-white flex items-start justify-between relative shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
              <CalendarClock className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Follow-Up Action Center & Pending Dues
                </h2>
                <span className="bg-white/25 text-white font-bold text-xs px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
                  {counts.total_active} Pending Action
                </span>
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1">
                Scheduled client calls, counseling dues, and meetings requiring immediate attention.
              </p>
            </div>
          </div>

          {/* Quick Header Utility Controls */}
          <div className="flex items-center gap-2">
            {/* Audio chime toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="opacity-60" />}
            </button>

            {/* Desktop Notification Request if not granted */}
            {desktopPermission === 'default' && onRequestDesktopPermission && (
              <button
                type="button"
                onClick={onRequestDesktopPermission}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/30 transition-all cursor-pointer"
                title="Enable Windows desktop notifications"
              >
                <Bell size={14} />
                <span>Enable Desktop Alerts</span>
              </button>
            )}

            {/* Explicit Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
              title="Close Dialog (X)"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Bar (Exact Document Registry Layout) */}
        <div className="bg-gray-50/80 border-b border-gray-100 px-6 sm:px-8 py-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            onClick={() => setActiveTab('overdue')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-red-50/80 border-red-300 ring-2 ring-red-400/20 shadow-xs'
                : 'bg-white border-amber-200/80 hover:bg-amber-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
                Overdue
              </span>
              <AlertTriangle size={14} className="text-rose-500" />
            </div>
            <p className="text-lg font-bold text-rose-700 mt-0.5">{counts.overdue}</p>
          </div>

          <div
            onClick={() => setActiveTab('today')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-white border-emerald-200/80 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                Due Today
              </span>
              <Clock size={14} className="text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{counts.today}</p>
          </div>

          <div
            onClick={() => setActiveTab('tomorrow')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'tomorrow'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20 shadow-xs'
                : 'bg-white border-blue-200/80 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                Tomorrow
              </span>
              <Calendar size={14} className="text-blue-500" />
            </div>
            <p className="text-lg font-bold text-blue-700 mt-0.5">{counts.tomorrow}</p>
          </div>

          <div
            onClick={() => setActiveTab('upcoming')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/20 shadow-xs'
                : 'bg-white border-purple-200/80 hover:bg-purple-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
                Upcoming
              </span>
              <Sparkles size={14} className="text-purple-500" />
            </div>
            <p className="text-lg font-bold text-purple-700 mt-0.5">{counts.upcoming}</p>
          </div>

          <div
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              activeTab === 'all'
                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/20 shadow-xs'
                : 'bg-white border-gray-200/80 hover:bg-gray-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Active
              </span>
              <CheckCircle size={14} className="text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{counts.total_active}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, phone, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium text-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Filter Pills */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({counts.total_active})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('overdue')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'overdue'
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-rose-700'
                }`}
              >
                Overdue ({counts.overdue})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'today'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                Today ({counts.today})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-purple-700'
                }`}
              >
                Upcoming ({counts.upcoming + counts.tomorrow})
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
        </div>

        {/* Scrollable Detailed Table Area (Exact Document Registry style) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-700">No Pending Follow-ups in this View</h4>
              <p className="text-xs text-gray-500 mt-1">
                {searchTerm
                  ? 'No follow-ups match your search criteria.'
                  : 'Great job! You have cleared your pending follow-ups for this category.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-600 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3.5 px-4">Lead / Contact</th>
                    <th className="py-3.5 px-3">Counselor</th>
                    <th className="py-3.5 px-3">Type & Priority</th>
                    <th className="py-3.5 px-4">Scheduled Date & Time</th>
                    <th className="py-3.5 px-4">Remarks / Notes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredItems.map((item) => {
                    const TypeIcon = TYPE_ICON[item.followup_type] || Phone;
                    const typeColor = TYPE_COLOR[item.followup_type] || 'bg-gray-100 text-gray-700 border-gray-200';
                    const priorityColor = PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.medium;
                    const displayName =
                      item.lead_name ||
                      item.name ||
                      item.processing_student_name ||
                      (typeof item.lead === 'object' ? item.lead?.name : '') ||
                      'Client';
                    const displayPhone =
                      item.lead_phone ||
                      item.phone_number ||
                      (typeof item.lead === 'object' ? item.lead?.phone : '') ||
                      '';
                    const counselorName = item.assigned_to
                      ? (item.assigned_to.first_name
                          ? `${item.assigned_to.first_name} ${item.assigned_to.last_name || ''}`.trim()
                          : item.assigned_to.username)
                      : 'Unassigned';

                    const isOverdue = item.is_overdue;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          isOverdue ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Lead / Contact Details */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span
                              onClick={() => handleOpenLead(item)}
                              className="hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {displayName}
                            </span>
                            {item.lead_status && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  item.lead_status === 'HOT'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : item.lead_status === 'WARM'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {item.lead_status}
                              </span>
                            )}
                          </div>
                          {displayPhone && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                              <span>{displayPhone}</span>
                            </div>
                          )}
                          {item.lead_course && (
                            <span className="text-[11px] text-gray-400 block truncate max-w-[180px]">
                              Course: {item.lead_course}
                            </span>
                          )}
                        </td>

                        {/* Counselor */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <User size={12} className="text-gray-500" />
                            {counselorName}
                          </span>
                        </td>

                        {/* Type & Priority */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${typeColor}`}
                            >
                              <TypeIcon size={11} />
                              {item.followup_type?.toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColor}`}
                            >
                              {item.priority?.toUpperCase()}
                            </span>
                          </div>
                        </td>

                        {/* Scheduled Date & Time */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                            <Calendar size={13} className="text-gray-400" />
                            <span>
                              {item.follow_up_date
                                ? new Date(item.follow_up_date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </div>
                          {item.follow_up_time && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                              <Clock size={12} className="text-orange-500" />
                              <span>{formatTime(item.follow_up_time)}</span>
                            </div>
                          )}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-1">
                              <AlertCircle size={10} />
                              Overdue
                            </span>
                          )}
                        </td>

                        {/* Remarks / Notes */}
                        <td className="py-3 px-4 text-xs text-gray-600 max-w-xs">
                          {item.notes ? (
                            <p className="line-clamp-2 italic bg-gray-50 px-2 py-1 rounded border border-gray-100 text-gray-700">
                              "{item.notes}"
                            </p>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Voxbay One-Click Direct Call */}
                            <button
                              type="button"
                              onClick={() => handleCall(item)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Instant Call via Voxbay"
                            >
                              <Phone size={12} />
                              <span>Call</span>
                            </button>

                            {/* Mark Contacted */}
                            <button
                              type="button"
                              onClick={() => onStatusUpdate && onStatusUpdate(item.id, 'contacted')}
                              className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Mark Contacted / Completed"
                            >
                              <CheckCircle size={12} />
                              <span className="hidden sm:inline">Done</span>
                            </button>

                            {/* Reschedule */}
                            <button
                              type="button"
                              onClick={() => openRescheduleModal(item)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reschedule Follow-up"
                            >
                              <Clock size={12} />
                            </button>

                            {/* Open Lead */}
                            <button
                              type="button"
                              onClick={() => handleOpenLead(item)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="View Lead Details"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer (Exact Document Registry Layout) */}
        <div className="bg-gray-50 border-t border-gray-200/80 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center sm:text-left">
            <span>Clicking </span>
            <strong className="text-gray-700">"Go to Follow-ups Page"</strong>
            <span> will take you to full calendar schedule, history & reassignment.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Snooze Button */}
            {onSnooze && (
              <button
                type="button"
                onClick={() => onSnooze(15)}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Snooze alerts for 15 minutes"
              >
                Snooze 15m
              </button>
            )}

            {/* Acknowledge & Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <X size={16} />
              <span>Acknowledge & Close</span>
            </button>

            {/* Primary Navigation Button */}
            <button
              type="button"
              onClick={handleNavigateToFollowups}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer"
            >
              <span>Go to Follow-ups Page</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Reschedule Inline Popover Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Reschedule Follow-Up</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rescheduleItem.lead_name || rescheduleItem.name || 'Client'}
                </p>
              </div>
              <button
                onClick={() => setRescheduleItem(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReschedule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">New Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client requested callback tomorrow afternoon..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
