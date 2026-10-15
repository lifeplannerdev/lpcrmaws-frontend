import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  MessageSquare,
  Send,
  User,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  ListFilter,
  Check,
  Eye,
  Info
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RemindersPage({ embedded = false }) {
  const { user, accessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.is_superuser ||
      hasPermission('processing:reminders_admin')
    );
  }, [user, hasPermission]);

  // Main state
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter controls
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TODAY, PENDING_APPROVAL, IN_PROGRESS, COMPLETED, BACKDATED, OVERDUE
  const [adminViewScope, setAdminViewScope] = useState('ALL'); // ALL (all staff), MINE (only admin's own)
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [completionModalReminder, setCompletionModalReminder] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Rejection modal
  const [rejectModalReminder, setRejectModalReminder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNewDeadline, setRejectionNewDeadline] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Approval modal
  const [approveModalReminder, setApproveModalReminder] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Discussion / Details Drawer
  const [activeDiscussionReminder, setActiveDiscussionReminder] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: new Date().toISOString().split('T')[0],
    deadline: '',
    priority: 'MEDIUM',
    category: 'Processing',
    user: '',
    student: '',
    checklist: []
  });
  const [newChecklistText, setNewChecklistText] = useState('');

  const chatBottomRef = useRef(null);

  const authHeaders = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }), [accessToken]);

  // Initial load
  useEffect(() => {
    fetchReminders();
    fetchStats();
    fetchStudentsList();
    if (isAdmin) {
      fetchStaffList();
    }
  }, [isAdmin, adminViewScope, selectedStaff, selectedCategory, selectedPriority, activeTab]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/reminders/stats/`, authHeaders);
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/reminders/staff/`, authHeaders);
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/reminders/students/`, authHeaders);
      setStudentsList(res.data || []);
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const params = {};

      if (isAdmin && adminViewScope === 'MINE') {
        params.is_mine = 'true';
      } else if (isAdmin && selectedStaff) {
        params.user = selectedStaff;
      }

      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      // Tab mappings
      if (activeTab === 'TODAY') params.today = 'true';
      else if (activeTab === 'PENDING_APPROVAL') params.status = 'PENDING_APPROVAL';
      else if (activeTab === 'IN_PROGRESS') params.status = 'IN_PROGRESS';
      else if (activeTab === 'COMPLETED') params.status = 'COMPLETED';
      else if (activeTab === 'BACKDATED') params.backdated = 'true';
      else if (activeTab === 'OVERDUE') params.overdue = 'true';

      const res = await axios.get(`${API_BASE_URL}/reminders/`, {
        ...authHeaders,
        params
      });

      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setReminders(list);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReminders();
    fetchStats();
  };

  // Open Create Modal
  const handleOpenCreateModal = (reminderToEdit = null) => {
    if (reminderToEdit) {
      setEditingReminder(reminderToEdit);
      setFormData({
        title: reminderToEdit.title,
        description: reminderToEdit.description || '',
        reminder_date: reminderToEdit.reminder_date,
        deadline: reminderToEdit.deadline || '',
        priority: reminderToEdit.priority || 'MEDIUM',
        category: reminderToEdit.category || 'Processing',
        user: reminderToEdit.user || '',
        student: reminderToEdit.student || '',
        checklist: reminderToEdit.checklist || []
      });
    } else {
      setEditingReminder(null);
      setFormData({
        title: '',
        description: '',
        reminder_date: new Date().toISOString().split('T')[0],
        deadline: '',
        priority: 'MEDIUM',
        category: 'Processing',
        user: user?.id || '',
        student: '',
        checklist: []
      });
    }
    setNewChecklistText('');
    setShowCreateModal(true);
  };

  // Checklist item management inside form
  const handleAddChecklistItem = (e) => {
    e?.preventDefault();
    const text = newChecklistText.trim();
    if (!text) return;

    const newItem = {
      id: Date.now(),
      text,
      completed: false,
      completed_at: null
    };

    setFormData(prev => ({
      ...prev,
      checklist: [...prev.checklist, newItem]
    }));
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== id)
    }));
  };

  // Save Reminder (Create or Edit)
  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a reminder title');
      return;
    }
    if (!formData.reminder_date) {
      toast.error('Please select a reminder date');
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        reminder_date: formData.reminder_date,
        deadline: formData.deadline || null,
        priority: formData.priority,
        category: formData.category,
        student: formData.student ? Number(formData.student) : null,
        checklist: formData.checklist
      };

      if (isAdmin && formData.user) {
        payload.user = formData.user;
      }

      if (editingReminder) {
        await axios.patch(`${API_BASE_URL}/reminders/${editingReminder.id}/`, payload, authHeaders);
        toast.success('Reminder updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/reminders/`, payload, authHeaders);
        toast.success('Reminder created successfully');
      }

      setShowCreateModal(false);
      fetchReminders();
      fetchStats();
    } catch (err) {
      console.error('Error saving reminder:', err);
      toast.error(err.response?.data?.detail || 'Failed to save reminder');
    }
  };

  // Toggle checklist item directly on card
  const handleToggleChecklist = async (reminder, itemId, currentCompleted) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/reminders/${reminder.id}/checklist/toggle/`,
        {
          item_id: itemId,
          completed: !currentCompleted
        },
        authHeaders
      );

      // Optimistic state update in list
      setReminders(prev =>
        prev.map(r => {
          if (r.id === reminder.id) {
            return {
              ...r,
              checklist: res.data.checklist,
              status: res.data.status || r.status
            };
          }
          return r;
        })
      );

      // Update discussion view if open
      if (activeDiscussionReminder?.id === reminder.id) {
        setActiveDiscussionReminder(prev => ({
          ...prev,
          checklist: res.data.checklist,
          status: res.data.status || prev.status
        }));
        loadDiscussionUpdates(reminder.id);
      }
    } catch (err) {
      console.error('Error toggling checklist:', err);
      toast.error('Failed to update checklist item');
    }
  };

  // Submit Completion Workflow
  const handleOpenCompletionModal = (reminder) => {
    setCompletionModalReminder(reminder);
    setCompletionRemarks('');
    setShowCreateModal(false);
  };

  const handleConfirmCompletion = async (e) => {
    e.preventDefault();
    if (!completionRemarks.trim()) {
      toast.error('Completion remarks are mandatory to mark as complete.');
      return;
    }

    try {
      setSubmittingCompletion(true);
      const res = await axios.post(
        `${API_BASE_URL}/reminders/${completionModalReminder.id}/submit-completion/`,
        { completion_remarks: completionRemarks.trim() },
        authHeaders
      );

      toast.success(res.data.detail || 'Marked as complete!');
      setCompletionModalReminder(null);
      setCompletionRemarks('');
      fetchReminders();
      fetchStats();

      if (activeDiscussionReminder?.id === completionModalReminder.id) {
        setActiveDiscussionReminder(res.data.reminder);
        loadDiscussionUpdates(completionModalReminder.id);
      }
    } catch (err) {
      console.error('Error completing reminder:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit completion');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Admin Approve Workflow
  const handleOpenApproveModal = (reminder) => {
    setApproveModalReminder(reminder);
    setApprovalNotes('');
  };

  const handleConfirmApprove = async () => {
    try {
      setSubmittingApproval(true);
      const res = await axios.post(
        `${API_BASE_URL}/reminders/${approveModalReminder.id}/approve/`,
        { notes: approvalNotes.trim() },
        authHeaders
      );

      toast.success('Reminder completion approved!');
      setApproveModalReminder(null);
      fetchReminders();
      fetchStats();

      if (activeDiscussionReminder?.id === approveModalReminder.id) {
        setActiveDiscussionReminder(res.data.reminder);
        loadDiscussionUpdates(approveModalReminder.id);
      }
    } catch (err) {
      console.error('Error approving reminder:', err);
      toast.error(err.response?.data?.detail || 'Failed to approve reminder');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Admin Reject Workflow
  const handleOpenRejectModal = (reminder) => {
    setRejectModalReminder(reminder);
    setRejectionReason('');
    setRejectionNewDeadline('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please enter the reason or revision feedback.');
      return;
    }

    try {
      setSubmittingRejection(true);
      const payload = {
        reason: rejectionReason.trim(),
        ...(rejectionNewDeadline ? { new_deadline: rejectionNewDeadline } : {})
      };

      const res = await axios.post(
        `${API_BASE_URL}/reminders/${rejectModalReminder.id}/reject/`,
        payload,
        authHeaders
      );

      toast.success('Reminder completion rejected and reverted to In Progress.');
      setRejectModalReminder(null);
      fetchReminders();
      fetchStats();

      if (activeDiscussionReminder?.id === rejectModalReminder.id) {
        setActiveDiscussionReminder(res.data.reminder);
        loadDiscussionUpdates(rejectModalReminder.id);
      }
    } catch (err) {
      console.error('Error rejecting reminder:', err);
      toast.error(err.response?.data?.detail || 'Failed to reject reminder');
    } finally {
      setSubmittingRejection(false);
    }
  };

  // Delete Reminder
  const handleDeleteReminder = async (reminder) => {
    if (!window.confirm(`Are you sure you want to delete "${reminder.title}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/reminders/${reminder.id}/`, authHeaders);
      toast.success('Reminder deleted successfully');
      if (activeDiscussionReminder?.id === reminder.id) {
        setActiveDiscussionReminder(null);
      }
      fetchReminders();
      fetchStats();
    } catch (err) {
      console.error('Error deleting reminder:', err);
      toast.error('Failed to delete reminder');
    }
  };

  // Discussion & Updates Thread
  const handleOpenDiscussion = (reminder) => {
    setActiveDiscussionReminder(reminder);
    loadDiscussionUpdates(reminder.id);
  };

  const loadDiscussionUpdates = async (reminderId) => {
    try {
      setLoadingUpdates(true);
      const res = await axios.get(`${API_BASE_URL}/reminders/${reminderId}/updates/`, authHeaders);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setUpdates(list);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error loading updates:', err);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    try {
      setSubmittingUpdate(true);
      const res = await axios.post(
        `${API_BASE_URL}/reminders/${activeDiscussionReminder.id}/updates/`,
        { notes: newUpdateText.trim() },
        authHeaders
      );

      setUpdates(prev => [...prev, res.data]);
      setNewUpdateText('');
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error posting update:', err);
      toast.error('Failed to post remark');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Helper date chip presets
  const setQuickDate = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setFormData(prev => ({
      ...prev,
      reminder_date: target.toISOString().split('T')[0]
    }));
  };

  // Priority Styles
  const priorityColors = {
    URGENT: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
  };

  // Status Styles
  const statusColors = {
    PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusLabels = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    PENDING_APPROVAL: 'Pending Approval',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  // Filtered Reminders List (client search)
  const displayedReminders = useMemo(() => {
    return reminders.filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchUser = (r.user_name || '').toLowerCase().includes(q);
      const matchCategory = (r.category || '').toLowerCase().includes(q);
      return matchTitle || matchDesc || matchUser || matchCategory;
    });
  }, [reminders, searchQuery]);

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/60 to-indigo-50/40 pb-16"}>
      {!embedded && <Navbar />}

      <main className={embedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6"}>
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 shadow-xs">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reminders & Checklist</h1>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Control
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Track personal checklists, schedule backdated tasks, and submit work for verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh reminders"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Reminder</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div
              onClick={() => setActiveTab('ALL')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Active</div>
              <div className="text-2xl font-bold mt-1.5">{stats.total ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">Across all categories</div>
            </div>

            <div
              onClick={() => setActiveTab('TODAY')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'TODAY'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Due Today</div>
              <div className="text-2xl font-bold mt-1.5">{stats.today ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">Scheduled for today</div>
            </div>

            <div
              onClick={() => setActiveTab('PENDING_APPROVAL')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                activeTab === 'PENDING_APPROVAL'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                  : (stats.pending_approval > 0
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200/80 text-slate-800')
              }`}
            >
              {stats.pending_approval > 0 && activeTab !== 'PENDING_APPROVAL' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Pending Approval</div>
              <div className="text-2xl font-bold mt-1.5">{stats.pending_approval ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">
                {isAdmin ? 'Requires your approval' : 'Awaiting verification'}
              </div>
            </div>

            <div
              onClick={() => setActiveTab('BACKDATED')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'BACKDATED'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Backdated</div>
              <div className="text-2xl font-bold mt-1.5">{stats.backdated ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">Past date entries</div>
            </div>

            <div
              onClick={() => setActiveTab('OVERDUE')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'OVERDUE'
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                  : (stats.overdue > 0 ? 'bg-red-50/60 border-red-200 text-red-900' : 'bg-white border-slate-200/80 text-slate-800')
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Overdue</div>
              <div className="text-2xl font-bold mt-1.5">{stats.overdue ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">Passed deadline</div>
            </div>

            <div
              onClick={() => setActiveTab('COMPLETED')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-bold mt-1.5">{stats.completed ?? 0}</div>
              <div className="text-[11px] opacity-75 mt-1">Approved & closed</div>
            </div>
          </div>
        )}

        {/* Admin Scope Toggle & Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* View Scope Toggle for Admin */}
            {isAdmin ? (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => {
                    setAdminViewScope('ALL');
                    setSelectedStaff('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    adminViewScope === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All Staff Reminders
                </button>
                <button
                  onClick={() => {
                    setAdminViewScope('MINE');
                    setSelectedStaff('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    adminViewScope === 'MINE'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  My Own Reminders
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Personal Checklist & Reminders
              </div>
            )}

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'TODAY', label: "Today's" },
                { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'BACKDATED', label: 'Backdated' },
                { id: 'OVERDUE', label: 'Overdue' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Controls: Search, Staff Dropdown, Priority, Category */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, details, staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>

            {/* Staff Filter (Admin only) */}
            {isAdmin && adminViewScope === 'ALL' && (
              <div>
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                >
                  <option value="">Filter by Employee (Doc & Ops Staff)</option>
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({st.username}) {st.role_names?.length ? `• ${st.role_names.join(', ')}` : ''} - {st.location || st.company}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="ALL">All Categories</option>
                <option value="Processing">Processing</option>
                <option value="Documentation">Documentation</option>
                <option value="Admissions">Admissions</option>
                <option value="Accounts">Accounts</option>
                <option value="Follow-up">Follow-up</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reminders List Section */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading reminders and checklist...</p>
          </div>
        ) : displayedReminders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 border border-indigo-100">
              <CalendarClock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No reminders found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || activeTab !== 'ALL'
                ? 'Try adjusting your search criteria or switching filter tabs.'
                : 'Get started by creating your first reminder checklist.'}
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Reminder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedReminders.map(reminder => {
              const checklistItems = reminder.checklist || [];
              const totalChecks = checklistItems.length;
              const completedChecks = checklistItems.filter(i => i.completed).length;
              const progressPct = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
              const isOwner = Number(reminder.user) === Number(user?.id);
              const canApprove = isAdmin && reminder.status === 'PENDING_APPROVAL';

              return (
                <div
                  key={reminder.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    reminder.status === 'PENDING_APPROVAL'
                      ? 'border-amber-300 ring-2 ring-amber-400/20'
                      : reminder.is_overdue
                      ? 'border-red-200'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${priorityColors[reminder.priority] || priorityColors.MEDIUM}`}>
                          {reminder.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {reminder.category || 'General'}
                        </span>
                        {reminder.company && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                            {reminder.company}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[11px] border flex items-center gap-1 ${statusColors[reminder.status] || statusColors.PENDING}`}>
                        {statusLabels[reminder.status] || reminder.status}
                      </span>
                    </div>

                    {/* Prominent Card Last Updated Timestamp */}
                    <div className="flex items-center justify-between text-[11px] bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Updated: {new Date(reminder.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(reminder.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Linked Student Chip (if linked) */}
                    {reminder.student_name && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 font-medium">
                        <span className="text-xs">🎓</span>
                        <div className="truncate flex items-center gap-1">
                          <span className="font-semibold text-slate-800 truncate">{reminder.student_name}</span>
                          {reminder.student_phone && (
                            <span className="text-[11px] text-indigo-600 shrink-0">({reminder.student_phone})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Title & Briefing */}
                    <div className="space-y-1">
                      <h3
                        onClick={() => handleOpenDiscussion(reminder)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2"
                      >
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100 text-xs text-slate-600">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Briefing:</span>
                          <p className="line-clamp-2 leading-relaxed">
                            {reminder.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Assignee banner (especially relevant for admin) */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">
                          {reminder.user_name}
                          {isOwner && ' (You)'}
                        </span>
                      </div>

                      {/* Reminder date chip */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-[11px] font-semibold ${reminder.is_backdated ? 'text-violet-700' : 'text-slate-600'}`}>
                          {reminder.reminder_date}
                          {reminder.is_backdated && ' (Backdate)'}
                        </span>
                      </div>
                    </div>

                    {/* Optional Deadline notice */}
                    {reminder.deadline && (
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Deadline:
                        </span>
                        <span className={`font-semibold ${reminder.is_overdue ? 'text-red-600' : 'text-slate-700'}`}>
                          {reminder.deadline}
                          {reminder.is_overdue && ' (Overdue)'}
                        </span>
                      </div>
                    )}

                    {/* Interactive Checklist Preview */}
                    {totalChecks > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Checklist Progress</span>
                          <span className="text-[11px] text-slate-500 font-bold">
                            {completedChecks}/{totalChecks} ({progressPct}%)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* Interactive checklist sub-tasks */}
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {checklistItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleChecklist(reminder, item.id, item.completed)}
                              className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                            >
                              <button
                                type="button"
                                className="mt-0.5 text-indigo-600 focus:outline-none"
                              >
                                {item.completed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                )}
                              </button>
                              <span
                                className={`text-[11px] leading-tight ${
                                  item.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion Remarks Display (if submitted) */}
                    {reminder.completion_remarks && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-[11px] text-amber-800">
                          <Info className="w-3.5 h-3.5" />
                          Completion Remarks:
                        </div>
                        <p className="text-[11px] italic text-slate-700 leading-normal">
                          "{reminder.completion_remarks}"
                        </p>
                        {reminder.approved_by_name && (
                          <div className="text-[10px] text-emerald-700 font-semibold pt-1">
                            ✓ Approved by {reminder.approved_by_name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {/* Discussion button with count badge */}
                      <button
                        onClick={() => handleOpenDiscussion(reminder)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer font-medium"
                        title="Open Discussion & History"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Updates</span>
                        {reminder.updates_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {reminder.updates_count}
                          </span>
                        )}
                      </button>

                      {/* Edit button */}
                      {(isOwner || isAdmin) && reminder.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleOpenCreateModal(reminder)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Edit Reminder"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete button */}
                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => handleDeleteReminder(reminder)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Delete Reminder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Primary Action Button */}
                    <div className="flex items-center gap-1.5">
                      {canApprove ? (
                        <>
                          <button
                            onClick={() => handleOpenApproveModal(reminder)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(reminder)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                          >
                            <ThumbsDown className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : reminder.status !== 'COMPLETED' && (isOwner || isAdmin) ? (
                        <button
                          onClick={() => handleOpenCompletionModal(reminder)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Complete</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE / EDIT REMINDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Schedule personal reminders, backdates, and sub-task checklists.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveReminder} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify German A2 certification documents"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>

              {/* Briefing / Details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Briefing / Context Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefing notes, background, reference student details, or instructions..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                />
              </div>

              {/* Link Student (Processing Registry) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Link Student <span className="text-slate-400 font-normal lowercase">(optional - from processing registry)</span>
                </label>
                <select
                  value={formData.student}
                  onChange={e => setFormData({ ...formData, student: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">No student linked (General / Internal reminder)</option>
                  {studentsList.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.mobile_number ? `(${st.mobile_number})` : ''} {st.university ? `• ${st.university}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Deadline row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reminder Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Reminder Date <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 font-semibold">Supports Backdates</span>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.reminder_date}
                    onChange={e => setFormData({ ...formData, reminder_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  {/* Quick preset chips */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDate(-1)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                {/* Optional Deadline */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Target Deadline <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leaves open if no strict deadline applies.</p>
                </div>
              </div>

              {/* Priority, Category & User (for admin) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Processing">Processing</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Admissions">Admissions</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Assign Employee (Documentation & Operations)
                    </label>
                    <select
                      value={formData.user}
                      onChange={e => setFormData({ ...formData, user: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value={user?.id}>Assign to Self ({user?.username})</option>
                      {staffList.filter(s => s.id !== user?.id).map(st => (
                        <option key={st.id} value={st.id}>
                          {st.full_name} ({st.username}) {st.role_names?.length ? `• ${st.role_names.join(', ')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Checklist Builder */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Sub-tasks Checklist ({formData.checklist.length} items)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add checklist sub-task (e.g. Check apostille stamp)..."
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>

                {formData.checklist.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                    {formData.checklist.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 font-medium">{item.text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT COMPLETION MODAL (Mandatory Remarks) */}
      {completionModalReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mark as Completed</h3>
                  <p className="text-xs text-slate-500">Document the work accomplished before closing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletionModalReminder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCompletion} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-bold text-slate-800">{completionModalReminder.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Scheduled date: {completionModalReminder.reminder_date} • Assignee: {completionModalReminder.user_name}
                </div>
              </div>

              {/* Status info banner */}
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                isAdmin
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isAdmin ? (
                  <span>
                    <strong>Admin Auto-Approval:</strong> As an administrator, your reminder will be directly marked as <strong>Completed</strong> without pending approval.
                  </span>
                ) : (
                  <span>
                    <strong>Admin Verification:</strong> Once submitted, your reminder will transition to <strong>Pending Approval</strong> status for administrative review.
                  </span>
                )}
              </div>

              {/* Mandatory Completion Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Completion Remarks <span className="text-rose-500">* (Mandatory)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the work completed, reference document numbers, or actions taken..."
                  value={completionRemarks}
                  onChange={e => setCompletionRemarks(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCompletionModalReminder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCompletion}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingCompletion ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN APPROVE MODAL */}
      {approveModalReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Approve Completion</h3>
                  <p className="text-xs text-slate-500">Sign off and close this employee reminder</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalReminder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-900">{approveModalReminder.title}</div>
                <div className="text-slate-500">Submitted by: {approveModalReminder.user_name}</div>
                <div className="text-amber-800 italic pt-1">
                  Remarks: "{approveModalReminder.completion_remarks}"
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Approval Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified and approved."
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setApproveModalReminder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingApproval}
                  onClick={handleConfirmApprove}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingApproval ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN REJECT MODAL */}
      {rejectModalReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <ThumbsDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Request Revision / Reject</h3>
                  <p className="text-xs text-slate-500">Revert reminder to In Progress with feedback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalReminder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <div className="font-bold text-slate-900">{rejectModalReminder.title}</div>
                <div className="text-slate-500">Submitted by: {rejectModalReminder.user_name}</div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reason / Revision Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why completion cannot be approved and what the employee needs to fix..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Extended Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={rejectionNewDeadline}
                  onChange={e => setRejectionNewDeadline(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalReminder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRejection}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingRejection ? 'Reverting...' : 'Reject & Revert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCUSSION & UPDATES DRAWER */}
      {activeDiscussionReminder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col relative animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {activeDiscussionReminder.title}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Assignee: {activeDiscussionReminder.user_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDiscussionReminder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reminder Details Summary */}
            <div className="p-3.5 bg-slate-50/50 border-b border-slate-100 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-md border font-semibold ${statusColors[activeDiscussionReminder.status]}`}>
                  {statusLabels[activeDiscussionReminder.status]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Last Updated:</span>
                <span className="font-semibold text-slate-700">
                  {new Date(activeDiscussionReminder.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(activeDiscussionReminder.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {activeDiscussionReminder.student_name && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Linked Student:</span>
                  <span className="font-semibold text-indigo-700">
                    🎓 {activeDiscussionReminder.student_name} {activeDiscussionReminder.student_phone ? `(${activeDiscussionReminder.student_phone})` : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-700">{activeDiscussionReminder.reminder_date}</span>
              </div>
              {activeDiscussionReminder.deadline && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="font-semibold text-slate-700">{activeDiscussionReminder.deadline}</span>
                </div>
              )}
              {activeDiscussionReminder.description && (
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Briefing:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {activeDiscussionReminder.description}
                  </p>
                </div>
              )}
            </div>

            {/* Updates History Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingUpdates ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Loading conversation history...</span>
                </div>
              ) : updates.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No remarks posted yet. Start the conversation below.
                </div>
              ) : (
                updates.map(up => {
                  const isCurrentAuthor = Number(up.author) === Number(user?.id);
                  return (
                    <div
                      key={up.id}
                      className={`flex flex-col ${
                        up.is_system_event
                          ? 'items-center my-2'
                          : isCurrentAuthor
                          ? 'items-end'
                          : 'items-start'
                      }`}
                    >
                      {up.is_system_event ? (
                        <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium border border-slate-200/60 max-w-xs text-center">
                          {up.notes}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs space-y-1 shadow-xs ${
                            isCurrentAuthor
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200/80'
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-3 text-[10px] ${
                            isCurrentAuthor ? 'text-indigo-200' : 'text-slate-500 font-semibold'
                          }`}>
                            <span>{up.author_name}</span>
                            <span>{new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{up.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handlePostUpdate} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Post update, instruction, or reply..."
                value={newUpdateText}
                onChange={e => setNewUpdateText(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <button
                type="submit"
                disabled={submittingUpdate || !newUpdateText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
