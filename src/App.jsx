import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
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
import StudentsPage from './Pages/StudentsPage.jsx';
import StudentEditPage from "./Pages/StudentEditPage.jsx";
import StudentViewPage from "./Pages/StudentViewPage.jsx";
import AddStudentPage from "./Pages/AddStudentPage.jsx";
import AcademicBatchesPage from "./Pages/AcademicBatchesPage.jsx";
import MyReportsPage from "./Pages/MyReportsPage.jsx";
import AttendanceMarkingPage from './Pages/AttendanceMarkingPage';
import StudentAttendanceRecordsPage from './Pages/StudentAttendanceRecordsPage';
import AttendanceDocumentsPage from "./Pages/AttendanceDocumentsPage.jsx";
import PenaltyManagementPage from "./Pages/PenaltyManagementPage.jsx";
import CallAnalyticsPage from "./Pages/CallAnalyticsPage.jsx";
import ChatPage from "./Pages/ChatPage.jsx";
import AllFollowUpsPage from './Pages/AllFollowUpsPage';
import CandidatesPage from "./Pages/CandidatesPage";
import CandidateDetailPage from "./Pages/CandidateDetailPage";
import CandidateFormPage from "./Pages/CandidateFormPage";
import AssetManagementPage from "./Pages/AssetManagementPage.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />

        <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
        <Route path="/leads/edit/:id" element={<ProtectedRoute><EditLeadPage /></ProtectedRoute>} />
        <Route path="/addnewlead" element={<ProtectedRoute><AddLeadPage /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute><LeadDetailPage /></ProtectedRoute>} />
        <Route path="/followups"element={<ProtectedRoute><AllFollowUpsPage /></ProtectedRoute>} />


        <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
        <Route path="/staff/view/:id" element={<ProtectedRoute><StaffDetailsPage /></ProtectedRoute>} />
        <Route path="/staff/create" element={<ProtectedRoute><AddStaffPage /></ProtectedRoute>} />
        <Route path="/staff/edit/:id" element={<ProtectedRoute><EditStaffPage /></ProtectedRoute>} />

        <Route path="/staff/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/mytasks" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreationPage /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><TaskViewPage /></ProtectedRoute>} />
        <Route path="/tasks/edit/:id" element={<ProtectedRoute><EditTaskPage /></ProtectedRoute>} />

        <Route path="/daily/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/reports/view/:id" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
        <Route path="/myreports/" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />

        <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
        <Route path="/students/add" element={<ProtectedRoute><AddStudentPage /></ProtectedRoute>} />
        <Route path="/students/view/:id" element={<ProtectedRoute><StudentViewPage /></ProtectedRoute>} />
        <Route path="/students/edit/:id" element={<ProtectedRoute><StudentEditPage /></ProtectedRoute>} />
        <Route path="/academic-batches" element={<ProtectedRoute><AcademicBatchesPage /></ProtectedRoute>} />
        <Route path="/attendance/mark" element={<ProtectedRoute><AttendanceMarkingPage /></ProtectedRoute>} />
        <Route path="/students/:studentId/attendance" element={<ProtectedRoute><StudentAttendanceRecordsPage /></ProtectedRoute>} />

        <Route path="/hr/attendance" element={<ProtectedRoute><AttendanceDocumentsPage /></ProtectedRoute>} />
        <Route path="/hr/penalties" element={<ProtectedRoute><PenaltyManagementPage /></ProtectedRoute>} />
        <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
        <Route path="/candidates/new" element={<ProtectedRoute><CandidateFormPage /></ProtectedRoute>} />
        <Route path="/candidates/edit/:id" element={<ProtectedRoute><CandidateFormPage /></ProtectedRoute>} />
        <Route path="/candidates/:id" element={<ProtectedRoute><CandidateDetailPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        
        <Route path="/call-analytics" element={<ProtectedRoute><CallAnalyticsPage /></ProtectedRoute>} />
        <Route path="/hr/assets" element={<ProtectedRoute><AssetManagementPage /></ProtectedRoute>} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}
