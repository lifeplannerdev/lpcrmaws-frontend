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
import StudentRegistryPage from "./Pages/Students/StudentRegistryPage.jsx";
import BatchManagementPage from "./Pages/Students/BatchManagementPage.jsx";
import BatchAttendancePage from "./Pages/Students/BatchAttendancePage.jsx";
import AccountsApprovalPage from "./Pages/Students/AccountsApprovalPage.jsx";

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
  return (
    <Router>
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

        <Route path="/daily/reports" element={<PermissionRoute resources={['reports']} permissions={['reports:read_all']} roles={['ADM_MANAGER', 'ADM_COUNSELLOR', 'FLAG_COORDINATOR']}><ReportsPage /></PermissionRoute>} />
        <Route path="/admin/reports/settings" element={<PermissionRoute resources={['reports']} permissions={['report_settings:manage']} roles={['ADM_MANAGER']}><ReportTimingSettingsPage /></PermissionRoute>} />
        <Route path="/reports/view/:id" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
        <Route path="/myreports/" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />

        <Route path="/processing-students" element={<PermissionRoute resources={['processing_students']}><ProcessingStudentsPage /></PermissionRoute>} />
        
        {/* New Students Module */}
        {/* Accounts Pages */}
        <Route path="/registry" element={<PermissionRoute permissions={['students:registry_manage']}><StudentRegistryPage /></PermissionRoute>} />
        <Route path="/attendance/approvals" element={<PermissionRoute permissions={['attendance:approvals']}><AccountsApprovalPage /></PermissionRoute>} />
        
        {/* Trainer Pages */}
        <Route path="/academic-batches" element={<PermissionRoute permissions={['students:batch_manage']}><BatchManagementPage /></PermissionRoute>} />
        <Route path="/attendance/mark" element={<PermissionRoute permissions={['attendance:mark']}><BatchAttendancePage /></PermissionRoute>} />

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
        <Route path="/voxbay-ai" element={<PermissionRoute permissions={['voxbay_ai:admin']}><VoxbayAIPage /></PermissionRoute>} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}
