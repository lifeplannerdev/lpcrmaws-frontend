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
  Monitor
} from "lucide-react";

export const masterNavigation = [
  { id: "overview",       label: "Overview",        icon: FileText,      path: "/",               requiredPermission: "view_overview" },
  { id: "leads",          label: "Leads",           icon: Users,         path: "/leads",          requiredPermission: "view_leads" },
  { id: "staff",          label: "Staff",           icon: UserCheck,     path: "/staff",          requiredPermission: "view_staff" },
  { id: "myTasks",        label: "My Tasks",        icon: ListTodo,      path: "/mytasks",        requiredPermission: "view_my_tasks" },
  { id: "allTasks",       label: "Tasks",           icon: ListTodo,      path: "/staff/tasks",    requiredPermission: "view_all_tasks" },
  { id: "students",       label: "Students",        icon: GraduationCap, path: "/students",       requiredPermission: "view_students" },
  { id: "markAttendance", label: "Mark Attendance", icon: CalendarCheck, path: "/attendance/mark",requiredPermission: "mark_attendance" },
  { id: "penalties",      label: "Penalties",       icon: ShieldAlert,   path: "/hr/penalties",   requiredPermission: "view_penalties" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock,   path: "/hr/attendance",  requiredPermission: "view_attendance_docs" },
  { id: "candidates",     label: "Candidates",      icon: Users,         path: "/candidates",     requiredPermission: "view_candidates" },
  { id: "assets",         label: "Assets",          icon: Monitor,       path: "/hr/assets",      requiredPermission: "view_asset" },
  { id: "myReports",      label: "My Reports",      icon: FileText,      path: "/myreports",      requiredPermission: "view_my_reports" },
  { id: "reports",        label: "Staff Reports",   icon: FileText,      path: "/daily/reports",  requiredPermission: "view_staff_reports" },
  { id: "call",           label: "Voxbay",          icon: PhoneCall,     path: "/call-analytics", requiredPermission: "view_voxbay" },
];

export const getMenuForPermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return masterNavigation.filter((item) => permissions.includes(item.requiredPermission));
};

// Fallback for legacy imports until fully removed
export const getMenuForRole = (role) => {
  console.warn("getMenuForRole is deprecated. Use getMenuForPermissions instead.");
  return [];
};
