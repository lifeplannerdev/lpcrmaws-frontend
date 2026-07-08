import {
  Users,
  UserCheck,
  ListTodo,
  FileText,
  GraduationCap,
  CalendarCheck,
  ShieldAlert,
  FolderClock,
  PhoneCall,
  CalendarClock,
  Monitor,
  IndianRupee,
  Key,
  Settings
} from "lucide-react";

export const masterNavigation = [
  { id: "overview", label: "Overview", icon: FileText, path: "/", requiredResource: "dashboard" },
  { id: "leads", label: "Leads", icon: Users, path: "/leads", requiredResource: "leads" },
  { id: "staff", label: "Staff", icon: UserCheck, path: "/staff", requiredResource: "staff" },
  { id: "myTasks", label: "My Tasks", icon: ListTodo, path: "/mytasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_own" },
  { id: "allTasks", label: "Tasks", icon: ListTodo, path: "/staff/tasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_all" },
  { id: "students", label: "Students", icon: GraduationCap, path: "/students", requiredResource: "students" },
  { id: "processingStudents", label: "Processing Students", icon: GraduationCap, path: "/processing-students", requiredResource: "processing_students" },
  { id: "fees", label: "Fees", icon: IndianRupee, path: "/fees", requiredResource: "fees" },
  { id: "markAttendance", label: "Mark Attendance", icon: CalendarCheck, path: "/attendance/mark", requiredResource: "attendance" },
  { id: "penalties", label: "Penalties", icon: ShieldAlert, path: "/hr/penalties", requiredResource: "penalties" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock, path: "/hr/attendance", requiredResource: "staff" },
  { id: "candidates", label: "Candidates", icon: Users, path: "/candidates", requiredResource: "candidates" },
  { id: "assets", label: "Assets", icon: Monitor, path: "/hr/assets", requiredResource: "assets" },
  { id: "myReports", label: "My Reports", icon: FileText, path: "/myreports", requiredResource: "reports", requiredSpecificPermission: "reports:read_own" },
  { id: "reports", label: "Staff Reports", icon: FileText, path: "/daily/reports", requiredResource: "reports", requiredSpecificPermission: "reports:read_all" },
  { id: "reportSettings", label: "Report Settings", icon: Settings, path: "/admin/reports/settings", requiredResource: "report_settings", requiredSpecificPermission: "report_settings:manage" },
  { id: "roles", label: "Role Management", icon: ShieldAlert, path: "/roles", requiredResource: "staff", requiredPermissions: ["staff:edit_any", "staff:edit_tenant"] },
  { id: "credentials", label: "Credentials Vault", icon: Key, path: "/credentials", requiredResource: "credentials" },
  { id: "call", label: "Voxbay", icon: PhoneCall, path: "/call-analytics", requiredResource: "voxbay" },
  { id: "feeds", label: "Feeds", icon: UserCheck, path: "/feeds" },
];

export const getFilteredMenu = (hasAnyPermission, hasPermission) => {
  if (typeof hasAnyPermission !== 'function') return [];
  return masterNavigation.filter((item) => {
    if (item.requiredResource && !hasAnyPermission(item.requiredResource)) return false;
    
    if (item.requiredSpecificPermission && typeof hasPermission === 'function') {
      if (!hasPermission(item.requiredSpecificPermission)) return false;
    }
    
    if (item.requiredPermissions && typeof hasPermission === 'function') {
      if (!item.requiredPermissions.some(perm => hasPermission(perm))) return false;
    }
    
    return true;
  });
};

// Fallback for legacy imports until fully removed
export const getMenuForRole = (role) => {
  console.warn("getMenuForRole is deprecated. Use getMenuForPermissions instead.");
  return [];
};
