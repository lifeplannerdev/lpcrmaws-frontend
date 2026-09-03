import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { usePermissions } from './context/PermissionsContext';
import Login from './Pages/Login.jsx';
import DashboardOverview from './Pages/DashboardOverview.jsx';
import LeadsPage from './Pages/LeadsPage.jsx';
import AddLeadPage from './Pages/AddLeadPage.jsx';
import EditLeadPage from './Pages/EditLeadPage.jsx';
import LeadDetailPage from './Pages/LeadDetailPage.jsx';
import StaffPage from './Pages/StaffPage.jsx';
import StaffDetailsPage from './Pages/StaffDetailsPage.jsx';
import AddStaffPage from './Pages/AddStaffPage.jsx';
import EditStaffPage from './Pages/EditStaffPage.jsx';
import TasksPage from './Pages/TasksPage.jsx';
import MyTasksPage from './Pages/MyTasksPage.jsx';
import TaskCreationPage from './Pages/TaskCreationPage.jsx';
import TaskViewPage from "./Pages/TaskViewPage.jsx";
import EditTaskPage from "./Pages/EditTaskPage.jsx";
import ReportsPage from './Pages/ReportsPage.jsx';
import ReportViewPage from "./Pages/ReportViewPage.jsx";

import MyReportsPage from "./Pages/MyReportsPage.jsx";
import ReportTimingSettingsPage from "./Pages/ReportTimingSettingsPage.jsx";


import AttendanceDocumentsPage from "./Pages/AttendanceDocumentsPage.jsx";
import PenaltyManagementPage from "./Pages/PenaltyManagementPage.jsx";
import CallAnalyticsPage from "./Pages/CallAnalyticsPage.jsx";
import ChatPage from "./Pages/ChatPage.jsx";
import AllFollowUpsPage from './Pages/AllFollowUpsPage';
import CandidatesPage from "./Pages/CandidatesPage";
import CandidateDetailPage from "./Pages/CandidateDetailPage";
import CandidateFormPage from "./Pages/CandidateFormPage";
import AssetManagementPage from "./Pages/AssetManagementPage.jsx";
import FeesManagementPage from "./Pages/FeesManagementPage.jsx";
import RoleManagementPage from "./Pages/RoleManagementPage.jsx";
import CredentialsVault from "./Pages/CredentialsVault.jsx";
import ProcessingStudentsPage from "./Pages/ProcessingStudentsPage.jsx";
import FeedsPage from "./Pages/FeedsPage.jsx";
import ProgramsPage from "./Pages/ProgramsPage.jsx";
import VoxbayAIPage from "./Pages/VoxbayAIPage.jsx";
import FdsDashboard from './Pages/FDS/FdsDashboard.jsx';
import FdsEnquiryPage from './Pages/FDS/FdsEnquiryPage.jsx';
import FdsTrialPage from './Pages/FDS/FdsTrialPage.jsx';
import FdsStudentRegistryPage from './Pages/FDS/FdsStudentRegistryPage.jsx';
import FdsBatchManagementPage from './Pages/FDS/FdsBatchManagementPage.jsx';
import FdsAttendancePage from './Pages/FDS/FdsAttendancePage.jsx';
import FdsFeesPage from './Pages/FDS/FdsFeesPage.jsx';
import FdsWeddingGroupsPage from './Pages/FDS/FdsWeddingGroupsPage.jsx';
import FdsFeePoliciesPage from './Pages/FDS/FdsFeePoliciesPage.jsx';
import LiveCallModal from './Components/voxbay/LiveCallModal.jsx';

// ── FLAG: German Language Training ──
import FlagDashboard from './Pages/FLAG/DashboardPage.jsx';
import FlagBatchesPage from './Pages/FLAG/BatchesPage.jsx';
import FlagBatchFormPage from './Pages/FLAG/BatchFormPage.jsx';
import FlagBatchDetailPage from './Pages/FLAG/BatchDetailPage.jsx';
import FlagStudentsPage from './Pages/FLAG/StudentsPage.jsx';
import FlagStudentFormPage from './Pages/FLAG/StudentFormPage.jsx';
import FlagStudentProfilePage from './Pages/FLAG/StudentProfilePage.jsx';
import FlagAttendancePage from './Pages/FLAG/AttendancePage.jsx';
import FlagSettingsPage from './Pages/FLAG/SettingsPage.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PermissionRoute = ({ children, resources = [], permissions = [], roles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  let allowed = false;
  if (resources.length === 0 && permissions.length === 0 && roles.length === 0) {
    allowed = true;
  } else {
    const resourceAllowed = resources.some(res => hasAnyPermission(res));
    const permissionAllowed = permissions.some(perm => hasPermission(perm));
    const roleAllowed = user?.role_names?.some(r => roles.includes(r));
    allowed = resourceAllowed || permissionAllowed || roleAllowed;
  }
  
  return allowed ? children : <Navigate to="/" replace />;
};

export default function App() {
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (user?.company === 'FDS') {
      document.body.classList.add('fds-theme-global');
    } else {
      document.body.classList.remove('fds-theme-global');
    }
  }, [user]);

  return (
    <Router>
      {isAuthenticated && <LiveCallModal />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />
        <Route path="/feeds" element={<ProtectedRoute><FeedsPage /></ProtectedRoute>} />

        <Route path="/leads" element={<PermissionRoute resources={['leads']}><LeadsPage /></PermissionRoute>} />
        <Route path="/leads/:leadId" element={<PermissionRoute resources={['leads']}><LeadsPage /></PermissionRoute>} />
        <Route path="/leads/edit/:id" element={<PermissionRoute resources={['leads']}><EditLeadPage /></PermissionRoute>} />
        <Route path="/addnewlead" element={<PermissionRoute resources={['leads']}><AddLeadPage /></PermissionRoute>} />
        <Route path="/leads/view/:id" element={<PermissionRoute resources={['leads']}><LeadDetailPage /></PermissionRoute>} />
        <Route path="/followups"element={<PermissionRoute resources={['leads']}><AllFollowUpsPage /></PermissionRoute>} />


        <Route path="/staff" element={<PermissionRoute resources={['staff']}><StaffPage /></PermissionRoute>} />
        <Route path="/staff/view/:id" element={<PermissionRoute resources={['staff']}><StaffDetailsPage /></PermissionRoute>} />
        <Route path="/staff/create" element={<PermissionRoute permissions={['staff:edit_any', 'staff:edit_tenant']}><AddStaffPage /></PermissionRoute>} />
        <Route path="/staff/edit/:id" element={<PermissionRoute permissions={['staff:edit_any', 'staff:edit_tenant']}><EditStaffPage /></PermissionRoute>} />

        <Route path="/staff/tasks" element={<PermissionRoute resources={['tasks']}><TasksPage /></PermissionRoute>} />
        <Route path="/mytasks" element={<PermissionRoute resources={['tasks']}><MyTasksPage /></PermissionRoute>} />
        <Route path="/tasks/new" element={<PermissionRoute resources={['tasks']}><TaskCreationPage /></PermissionRoute>} />
        <Route path="/tasks/:id" element={<PermissionRoute resources={['tasks']}><TaskViewPage /></PermissionRoute>} />
        <Route path="/tasks/edit/:id" element={<PermissionRoute resources={['tasks']}><EditTaskPage /></PermissionRoute>} />

        <Route path="/daily/reports" element={<PermissionRoute resources={['reports']} permissions={['reports:read_all', 'reports:documentation', 'reports:kochi']} roles={['ADM_MANAGER', 'ADM_COUNSELLOR', 'FLAG_COORDINATOR']}><ReportsPage /></PermissionRoute>} />
        <Route path="/admin/reports/settings" element={<PermissionRoute resources={['reports']} permissions={['report_settings:manage']} roles={['ADM_MANAGER']}><ReportTimingSettingsPage /></PermissionRoute>} />
        <Route path="/reports/view/:id" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
        <Route path="/myreports/" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />

        <Route path="/processing-students" element={<PermissionRoute resources={['processing_students']}><ProcessingStudentsPage /></PermissionRoute>} />
        


        <Route path="/hr/attendance" element={<PermissionRoute resources={['staff']}><AttendanceDocumentsPage /></PermissionRoute>} />
        <Route path="/hr/penalties" element={<PermissionRoute resources={['penalties']}><PenaltyManagementPage /></PermissionRoute>} />
        <Route path="/candidates" element={<PermissionRoute resources={['candidates']}><CandidatesPage /></PermissionRoute>} />
        <Route path="/candidates/new" element={<PermissionRoute resources={['candidates']}><CandidateFormPage /></PermissionRoute>} />
        <Route path="/candidates/edit/:id" element={<PermissionRoute resources={['candidates']}><CandidateFormPage /></PermissionRoute>} />
        <Route path="/candidates/:id" element={<PermissionRoute resources={['candidates']}><CandidateDetailPage /></PermissionRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        
        <Route path="/call-analytics" element={<PermissionRoute resources={['voxbay']}><CallAnalyticsPage /></PermissionRoute>} />
        <Route path="/hr/assets" element={<PermissionRoute resources={['assets']}><AssetManagementPage /></PermissionRoute>} />
        <Route path="/fees" element={<PermissionRoute resources={['fees']}><FeesManagementPage /></PermissionRoute>} />
        <Route path="/roles" element={<PermissionRoute permissions={['staff:edit_any', 'staff:edit_tenant']}><RoleManagementPage /></PermissionRoute>} />
        <Route path="/credentials" element={<PermissionRoute resources={['credentials']}><CredentialsVault /></PermissionRoute>} />
        <Route path="/programs" element={<PermissionRoute permissions={['programs:view', 'programs:manage']}><ProgramsPage /></PermissionRoute>} />
        <Route path="/voxbay-ai" element={<PermissionRoute permissions={['voxbay_ai:admin', 'voxbay_ai:read_own']}><VoxbayAIPage /></PermissionRoute>} />

        {/* ── FDS: FILMAATIC Dance Studio ── */}
        <Route path="/fds" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view','fds_fees:view']}><FdsDashboard /></PermissionRoute>} />
        <Route path="/fds/enquiries" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsEnquiryPage /></PermissionRoute>} />
        <Route path="/fds/trials" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsTrialPage /></PermissionRoute>} />
        <Route path="/fds/students" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsStudentRegistryPage /></PermissionRoute>} />
        <Route path="/fds/batches" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsBatchManagementPage /></PermissionRoute>} />
        <Route path="/fds/attendance" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsAttendancePage /></PermissionRoute>} />
        <Route path="/fds/fees" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view','fds_fees:view']}><FdsFeesPage /></PermissionRoute>} />
        <Route path="/fds/fee-policies" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view','fds_fees:view']}><FdsFeePoliciesPage /></PermissionRoute>} />
        <Route path="/fds/weddings" element={<PermissionRoute permissions={['fds:admin','fds:admin_own','fds:view']}><FdsWeddingGroupsPage /></PermissionRoute>} />

        {/* ── FLAG: German Language Training ── */}
        <Route path="/flag" element={<PermissionRoute permissions={['flag:admin','flag:trainer','flag:view','flag:fees']}><FlagDashboard /></PermissionRoute>} />
        <Route path="/flag/batches" element={<PermissionRoute permissions={['flag:admin','flag:trainer','flag:view']}><FlagBatchesPage /></PermissionRoute>} />
        <Route path="/flag/batches/new" element={<PermissionRoute permissions={['flag:admin','flag:trainer']}><FlagBatchFormPage /></PermissionRoute>} />
        <Route path="/flag/batches/:id/edit" element={<PermissionRoute permissions={['flag:admin','flag:trainer']}><FlagBatchFormPage /></PermissionRoute>} />
        <Route path="/flag/batches/:id" element={<PermissionRoute permissions={['flag:admin','flag:trainer','flag:view']}><FlagBatchDetailPage /></PermissionRoute>} />
        <Route path="/flag/students" element={<PermissionRoute permissions={['flag:admin','flag:trainer','flag:view']}><FlagStudentsPage /></PermissionRoute>} />
        <Route path="/flag/students/new" element={<PermissionRoute permissions={['flag:admin']}><FlagStudentFormPage /></PermissionRoute>} />
        <Route path="/flag/students/:id/edit" element={<PermissionRoute permissions={['flag:admin','flag:trainer']}><FlagStudentFormPage /></PermissionRoute>} />
        <Route path="/flag/students/:id" element={<PermissionRoute permissions={['flag:admin','flag:trainer','flag:view']}><FlagStudentProfilePage /></PermissionRoute>} />
        <Route path="/flag/attendance" element={<PermissionRoute permissions={['flag:admin','flag:trainer']}><FlagAttendancePage /></PermissionRoute>} />
        <Route path="/flag/settings" element={<PermissionRoute permissions={['flag:admin']}><FlagSettingsPage /></PermissionRoute>} />

        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}
