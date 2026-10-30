import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import DashboardHeader from '../Components/dashboard/DashboardHeader';
import AdminStatsGrid from '../Components/dashboard/AdminStatsGrid';
import UserQuickActions from '../Components/dashboard/UserQuickActions';
import UpcomingTasks from '../Components/dashboard/UpcomingTasks';
import UpcomingTasksSection from '../Components/dashboard/UpcomingTasksSection';
import TodayFollowUps from '../Components/dashboard/TodayFollowUps';
import ErrorAlert from '../Components/dashboard/ErrorAlert';
import LoadingSpinner from '../Components/dashboard/LoadingSpinner';
import RecentActivities from '../Components/dashboard/RecentActivities';
import LiveLeadsBoard from '../Components/dashboard/LiveLeadsBoard';
import FeedsWidget from '../Components/dashboard/FeedsWidget';
import UserPenaltyWidget from '../Components/dashboard/UserPenaltyWidget';
import DocumentExpiryWidget from '../Components/dashboard/DocumentExpiryWidget';
import { formatTaskTime, getPriorityColor } from '../Components/utils/dashboardHelpers';
import { LayoutDashboard, Activity } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const TABS = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'activities', label: 'Activities',  icon: Activity },
];

export default function DashboardOverview() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState({
    total_leads: null, active_staff: null, total_students: null,
    staff_on_leave: null, pending_candidates: null,
    leads_change: 0, staff_change: 0, students_change: 0,
    metrics: null, lead_pipeline: null, followup_stats: null, task_stats: null,
    executive_financials: null, has_admin_dashboard: false, user_role: '',
  });

  const [_activities,     setActivities]      = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [upcomingTasks,   setUpcomingTasks]   = useState([]);
  const [todayFollowUps,  setTodayFollowUps]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  const userRole = user?.role_names?.length ? user.role_names.join(', ') : 'User';
  const userName = user?.name || user?.username || 'User';
  
  // Dynamic RBAC check: admin:dashboard is the primary determinant for admin dashboard and executive widgets
  const isAdmin  = hasPermission('admin:dashboard');

  const fetchWithAuth = async (url, options = {}) => {
    let token = accessToken;
    const makeRequest = (authToken) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          ...options.headers,
        },
      });
    let response = await makeRequest(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (!token) throw new Error('Unable to refresh token');
      response = await makeRequest(token);
    }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  };

  const fetchData = async (endpoint, setter, errorMsg) => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}${endpoint}`);
      setter(data.results || data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(errorMsg);
    }
  };

  const hasFetched = useRef(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      setLoading(true);
      setError(null);

      const fetchPromises = [
        fetchData('/activities/',        setActivities,     'Failed to load recent activities'),
        fetchData('/tasks/pending/',     setTasks,          'Failed to load pending tasks'),
        fetchData('/upcoming/',          setUpcomingTasks,  'Failed to load upcoming tasks'),
        fetchData('/followups/today/',   setTodayFollowUps, 'Failed to load today\'s follow-ups'),
      ];

      if (isAdmin) {
        fetchPromises.push(
          (async () => {
            let data = null;
            try {
              data = await fetchWithAuth(`${API_BASE_URL}/dashboard/stats/`);
            } catch (err) {
              console.warn('Primary endpoint /dashboard/stats/ unavailable, falling back to /stats/:', err);
              try {
                data = await fetchWithAuth(`${API_BASE_URL}/stats/`);
              } catch (fallbackErr) {
                console.error('Failed to load dashboard statistics from fallback /stats/:', fallbackErr);
                setError('Failed to load dashboard statistics');
                return;
              }
            }

            if (data) {
              setStats({
                total_leads: data.total_leads ?? data.metrics?.leads?.total ?? data.lead_pipeline?.total_leads ?? null,
                active_staff: data.active_staff ?? null,
                total_students: data.total_students ?? null,
                staff_on_leave: data.staff_on_leave ?? null,
                pending_candidates: data.pending_candidates ?? null,
                leads_change: data.leads_change || 0,
                staff_change: data.staff_change || 0,
                students_change: data.students_change || 0,
                metrics: data.metrics || null,
                lead_pipeline: data.lead_pipeline || null,
                followup_stats: data.followup_stats || null,
                task_stats: data.task_stats || null,
                executive_financials: data.metrics?.executive_financials || data.role_sections?.executive_financials || data.executive_financials || null,
                has_admin_dashboard: data.has_admin_dashboard ?? true,
                user_role: data.user_role || '',
              });
            }
          })()
        );
      }

      await Promise.all(fetchPromises);
      setLoading(false);
    };

    if (accessToken) loadDashboardData();
  }, [accessToken, isAdmin]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <main className="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-10 2xl:px-12 py-6 space-y-6">
        <DashboardHeader userName={userName} userRole={userRole} isAdmin={isAdmin} />
        <ErrorAlert message={error} />

        {isAdmin ? (
          <>
            <AdminStatsGrid stats={stats} />
            <div className="mt-6 mb-6">
              <FeedsWidget />
            </div>
            <UserPenaltyWidget />
            <LiveLeadsBoard />
          </>
        ) : (
          <>
            <UserQuickActions
              tasksCount={tasks.length}
              upcomingCount={upcomingTasks.length}
              followUpsCount={todayFollowUps.length}
            />
            <div className="mt-6 mb-6">
              <FeedsWidget />
            </div>
            <UserPenaltyWidget />
          </>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {activeTab === 'overview' && (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${hasPermission('license:admin') ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-5`}>
            <UpcomingTasks
              tasks={tasks}
              formatTaskTime={formatTaskTime}
              getPriorityColor={getPriorityColor}
              onViewAll={() => navigate('/staff/tasks')}
            />
            <UpcomingTasksSection
              tasks={upcomingTasks}
              formatTaskTime={formatTaskTime}
              getPriorityColor={getPriorityColor}
              onViewAll={() => navigate('/staff/tasks')}
            />
            <TodayFollowUps
              followUps={todayFollowUps}
              onViewAll={() => navigate('/followups')}
            />
            {hasPermission('license:admin') && (
              <DocumentExpiryWidget />
            )}
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <RecentActivities />
          </div>
        )}
      </main>
    </div>
  );
}

