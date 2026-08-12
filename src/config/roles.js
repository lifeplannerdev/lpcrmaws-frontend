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
  Settings,
  BookOpen
} from "lucide-react";

export const masterNavigation = [
  { id: "overview", label: "Overview", icon: FileText, path: "/" },
  { id: "leads", label: "Leads", icon: Users, path: "/leads", requiredResource: "leads" },
  { id: "staff", label: "Staff", icon: UserCheck, path: "/staff", requiredResource: "staff" },
  { id: "myTasks", label: "My Tasks", icon: ListTodo, path: "/mytasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_own" },
  { id: "allTasks", label: "Tasks", icon: ListTodo, path: "/staff/tasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_all" },
  { id: "registry", label: "Student Registry", icon: GraduationCap, path: "/registry", requiredPermissions: ["students:registry_manage"] },
  { id: "academicBatches", label: "Academic Batches", icon: GraduationCap, path: "/academic-batches", requiredPermissions: ["students:batch_manage"] },
  { id: "processingStudents", label: "Processing Students", icon: GraduationCap, path: "/processing-students", requiredResource: "processing_students" },
  { id: "fees", label: "Fees", icon: IndianRupee, path: "/fees", requiredResource: "fees" },
  { id: "markAttendance", label: "Mark Attendance", icon: CalendarCheck, path: "/attendance/mark", requiredPermissions: ["attendance:mark"] },
  { id: "myStudents", label: "My Students", icon: GraduationCap, path: "/my-students", requiredPermissions: ["attendance:mark"] },
  { id: "penalties", label: "Penalties", icon: ShieldAlert, path: "/hr/penalties", requiredResource: "penalties" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock, path: "/hr/attendance", requiredResource: "staff" },
  { id: "candidates", label: "Candidates", icon: Users, path: "/candidates", requiredResource: "candidates" },
  { id: "assets", label: "Assets", icon: Monitor, path: "/hr/assets", requiredResource: "assets" },
  { id: "myReports", label: "My Reports", icon: FileText, path: "/myreports" },
  { id: "reports", label: "Staff Reports", icon: FileText, path: "/daily/reports", requiredResource: "reports", requiredSpecificPermission: "reports:read_all", requiredRoles: ['ADM_MANAGER', 'ADM_COUNSELLOR', 'FLAG_COORDINATOR'] },
  { id: "reportSettings", label: "Report Settings", icon: Settings, path: "/admin/reports/settings", requiredResource: "report_settings", requiredSpecificPermission: "report_settings:manage", requiredRoles: ['ADM_MANAGER'] },
  { id: "roles", label: "Role Management", icon: ShieldAlert, path: "/roles", requiredResource: "staff", requiredPermissions: ["staff:edit_any", "staff:edit_tenant"] },
  { id: "credentials", label: "Credentials Vault", icon: Key, path: "/credentials", requiredResource: "credentials" },
  { id: "call", label: "Voxbay", icon: PhoneCall, path: "/call-analytics", requiredResource: "voxbay" },
  { id: "voxbay_ai", label: "Voxbay AI", icon: PhoneCall, path: "/voxbay-ai", requiredPermissions: ["voxbay_ai:admin"] },
  { id: "feeds", label: "Feeds", icon: UserCheck, path: "/feeds" },
  { id: "programs", label: "Programs", icon: BookOpen, path: "/programs", requiredResource: "programs" },
];

export const getFilteredMenu = (hasAnyPermission, hasPermission, user) => {
  if (typeof hasAnyPermission !== 'function') return [];
  return masterNavigation.filter((item) => {
    let allowed = true;
    
    // Default to true, and we verify if there's any restriction
    if (item.requiredResource && !hasAnyPermission(item.requiredResource)) allowed = false;
    
    if (allowed && item.requiredSpecificPermission && typeof hasPermission === 'function') {
      if (!hasPermission(item.requiredSpecificPermission)) allowed = false;
    }
    
    if (allowed && item.requiredPermissions && typeof hasPermission === 'function') {
      if (!item.requiredPermissions.some(perm => hasPermission(perm))) allowed = false;
    }
    
    // If the item provides an alternative way to grant access via roles, override previous denials
    if (item.requiredRoles && user && user.role_names) {
       const hasRole = item.requiredRoles.some(role => user.role_names.includes(role));
       if (hasRole) allowed = true;
    }
    
    return allowed;
  });
};

// Fallback for legacy imports until fully removed
export const getMenuForRole = (role) => {
  console.warn("getMenuForRole is deprecated. Use getMenuForPermissions instead.");
  return [];
};
