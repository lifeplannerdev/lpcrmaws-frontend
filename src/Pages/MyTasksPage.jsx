import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Calendar, User, Flag,
  CheckCircle, Circle, AlertCircle,
  ListTodo, Loader, CheckCheck,
  AlertTriangle, XCircle, Filter, LayoutGrid, List
} from 'lucide-react';

import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import KanbanBoard from '../Components/KanbanBoard';
import { downloadCSV, downloadPDF } from '../utils/exportUtils';
import CompanySwitcher from '../Components/common/CompanySwitcher';


export default function MyTasksPage() {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [tasks, setTasks]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [count, setCount]   = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'

  const [page, setPage]         = useState(1);
  const [hasNext, setHasNext]   = useState(false);
  const [hasPrev, setHasPrev]   = useState(false);

  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [filterPriority,  setFilterPriority]  = useState('all');
  const [filterDate,      setFilterDate]      = useState('all');
  const [filterSpecificDate, setFilterSpecificDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // FIX: any role in TASK_ASSIGNERS can see the Create button, not just ADMIN
  const canAssignTasks = hasPermission('tasks:edit_any') || hasPermission('tasks:edit_tenant') || hasPermission('tasks:edit_own');

  // ── Stat card config ───────────────────────────────────────────────────────
  const statsData = stats ? [
    {
      label: 'Total Tasks',
      value: stats.total || 0,
      icon: ListTodo,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      label: 'In Progress',
      value: stats.in_progress || 0,
      icon: Loader,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
    },
    {
      label: 'Completed',
      value: stats.completed || 0,
      icon: CheckCheck,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
    {
      label: 'Overdue',
      value: stats.overdue || 0,
      icon: AlertTriangle,
      color: 'bg-gradient-to-br from-red-500 to-red-600',
    },
  ] : [];

  const priorityColors = {
    URGENT: 'bg-red-100 text-red-700 border-red-200',
    HIGH:   'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  const statusIcons = {
    PENDING:     <Circle        className="text-slate-400"  size={20} />,
    IN_PROGRESS: <AlertCircle  className="text-amber-500"  size={20} />,
    COMPLETED:   <CheckCircle  className="text-emerald-500" size={20} />,
    OVERDUE:     <AlertTriangle className="text-red-500"    size={20} />,
    CANCELLED:   <XCircle      className="text-slate-500"  size={20} />,
  };

  const statusColors = {
    PENDING:     'bg-slate-100 text-slate-700 border-slate-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
    COMPLETED:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    OVERDUE:     'bg-red-100 text-red-700 border-red-200',
    CANCELLED:   'bg-slate-100 text-slate-600 border-slate-200',
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const getToken = useCallback(async () => {
    const token = accessToken || await refreshAccessToken();
    if (!token) throw new Error('Authentication required');
    return token;
  }, [accessToken, refreshAccessToken]);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
      if (selectedYear && selectedYear !== 'all') params.set('year', selectedYear);
      if (user?.id) params.set('user', user.id);
      
      const url = `${API_BASE_URL}/tasks/stats/?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch task stats');
      setStats(await res.json());
    } catch (err) {
      console.error('Stats error:', err);
      setStats({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 });
    }
  }, [API_BASE_URL, getToken, companyFilter, selectedMonth, selectedYear]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();

      // FIX: pass filters as query params → server filters across ALL pages
      const params = new URLSearchParams({ page });
      if (user?.id)                             params.set('user', user.id);
      if (companyFilter)                        params.set('company', companyFilter);
      if (searchTerm)                           params.set('search',   searchTerm);
      if (filterStatus   && filterStatus   !== 'all') params.set('status',   filterStatus);
      if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority);
      
      if (filterDate && filterDate !== 'all') {
        if (filterDate === 'custom' && filterSpecificDate) {
          params.set('date_filter', filterSpecificDate);
        } else if (filterDate !== 'custom') {
          params.set('date_filter', filterDate);
        }
      }
      
      if (selectedMonth && selectedMonth !== 'all') params.set('month', selectedMonth);
      if (selectedYear && selectedYear !== 'all') params.set('year', selectedYear);

      const res = await fetch(`${API_BASE_URL}/tasks/?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');

      const data = await res.json();
      setTasks(data.results || []);
      setCount(data.count   || 0);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, getToken, page, searchTerm, filterStatus, filterPriority, filterDate, filterSpecificDate, companyFilter, selectedMonth, selectedYear]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterPriority, filterDate, filterSpecificDate, companyFilter, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    // Optimistically update the UI
    const originalTasks = [...tasks];
    const taskIndex = tasks.findIndex(t => t.id.toString() === draggableId);
    if (taskIndex === -1) return;
    
    const newTasks = [...tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], status: newStatus };
    setTasks(newTasks);

    try {
      const token = await getToken();
      // Assume the backend uses PATCH or PUT on /tasks/:id/ to update status
      const formData = new FormData();
      formData.append('status', newStatus);
      // We might need a full PUT, or if PATCH is supported we use PATCH. 
      // The current backend PUT requires all fields, so let's send a full body.
      const taskToUpdate = newTasks[taskIndex];
      
      const res = await fetch(`${API_BASE_URL}/tasks/${taskToUpdate.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...taskToUpdate,
          status: newStatus,
          // Extract just IDs if needed. We might need to map assigned_to/assigned_by if the backend requires IDs.
          // DRF usually accepts the ID for relations in PUT when using ModelSerializer.
          assigned_to: taskToUpdate.assigned_to,
          assigned_by: taskToUpdate.assigned_by,
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update task status');
      }
      // Re-fetch stats after successful update
      fetchStats();
    } catch (err) {
      console.error(err);
      // Revert on error
      setTasks(originalTasks);
      // Maybe show a toast error here
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'No deadline';

  const handleExportCSV = () => {
    const data = tasks.map(t => ({
      ID: t.id,
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      'Assigned To': t.assigned_to_name,
      'Assigned By': t.assigned_by_name,
      Deadline: formatDate(t.deadline),
      Description: t.description
    }));
    downloadCSV(data, 'tasks_export.csv');
  };

  const handleExportPDF = () => {
    const el = document.getElementById('tasks-exportable-view');
    if (el) downloadPDF(el, 'tasks_export.pdf');
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto" />
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto absolute top-0 left-1/2 -translate-x-1/2" />
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Error Loading Tasks</h3>
            <p className="text-slate-600 text-center mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                My Tasks
              </h1>
              <p className="text-gray-600 text-lg">Organize and track all your tasks efficiently</p>
            </div>

            {/* FIX: visible to all TASK_ASSIGNERS, not just ADMIN */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                PDF
              </button>
              {canAssignTasks && (
                <button
                  onClick={() => navigate('/tasks/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create New Task
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Company Switcher */}
        <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, idx) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={idx}
                  className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase mb-3">{stat.label}</p>
                      <h3 className="text-5xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {stat.value}
                      </h3>
                    </div>
                    <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters — values sent to server, not filtered client-side */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Filter & Search</h2>
            </div>
            
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={18} />
                List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={18} />
                Kanban
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
            >
              <option value="all">All Priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Date filter */}
            <div className="flex gap-2">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="custom">Specific Date</option>
              </select>
              
              {filterDate === 'custom' && (
                <input 
                  type="date"
                  value={filterSpecificDate}
                  onChange={(e) => setFilterSpecificDate(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
                />
              )}
            </div>

            {/* Month filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>

            {/* Year filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
            >
              <option value="all">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="text-blue-600" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              {count === 0
                ? "Get started by creating your first task to organise your work"
                : "Try adjusting your search criteria or filters"}
            </p>
            {count === 0 && canAssignTasks && (
              <button
                onClick={() => navigate('/tasks/new')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus size={20} />
                Create Your First Task
              </button>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          <div id="tasks-exportable-view">
            <KanbanBoard 
              tasks={tasks} 
              onDragEnd={onDragEnd} 
              canAssignTasks={canAssignTasks} 
              currentUser={user} 
            />
          </div>
        ) : (
          <div id="tasks-exportable-view" className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">

                  {/* Task info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1 w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {statusIcons[task.status]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3 flex-wrap">
                        <h3
                          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          {task.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={14} className="text-blue-600" />
                          <span className="font-medium">To:</span>
                          <span className="text-gray-700 font-semibold">{task.assigned_to_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={14} className="text-purple-600" />
                          <span className="font-medium">By:</span>
                          <span className="text-gray-700 font-semibold">{task.assigned_by_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} className="text-rose-600" />
                          <span className="font-medium">Due:</span>
                          <span className="text-gray-700 font-semibold">{formatDate(task.deadline)}</span>
                        </div>

                        {task.is_overdue && task.overdue_days > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full border border-red-200">
                            <AlertTriangle size={14} className="text-red-600" />
                            <span className="font-bold text-red-700 text-xs">{task.overdue_days} days overdue</span>
                          </div>
                        )}
                        {!task.is_overdue && task.days_until_deadline > 0 && task.days_until_deadline <= 3 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full border border-amber-200">
                            <Flag size={14} className="text-amber-600" />
                            <span className="font-bold text-amber-700 text-xs">{task.days_until_deadline} days left</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:flex-col lg:items-stretch lg:min-w-[160px]">
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="flex-1 lg:flex-none px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 text-sm font-semibold border border-blue-200 hover:border-blue-300 hover:shadow-md"
                    >
                      View Details
                    </button>

                    {/* FIX: Edit visible to any task assigner who created it, not just ADMIN */}
                    {canAssignTasks && task.assigned_by === user?.id && (
                      <button
                        onClick={() => navigate(`/tasks/edit/${task.id}`)}
                        className="flex-1 lg:flex-none px-4 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 text-sm font-semibold border border-indigo-200 hover:border-indigo-300 hover:shadow-md"
                      >
                        Edit Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(hasNext || hasPrev) && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!hasPrev}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                hasPrev
                  ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              Previous
            </button>
            <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg">
              Page {page}
            </div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasNext}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                hasNext
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              Next
            </button>
          </div>
        )}

        {/* Result count */}
        {tasks.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-md">
              <span className="text-sm font-medium text-gray-600">
                Showing{' '}
                <span className="font-bold text-blue-600">{tasks.length}</span> of{' '}
                <span className="font-bold text-blue-600">{count}</span> tasks
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
