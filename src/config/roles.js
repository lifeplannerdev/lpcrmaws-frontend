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
  Key
} from "lucide-react";

export const masterNavigation = [
  { id: "overview",       label: "Overview",        icon: FileText,      path: "/",               requiredResource: "dashboard" },
  { id: "leads",          label: "Leads",           icon: Users,         path: "/leads",          requiredResource: "leads" },
  { id: "staff",          label: "Staff",           icon: UserCheck,     path: "/staff",          requiredResource: "staff" },
  { id: "myTasks",        label: "My Tasks",        icon: ListTodo,      path: "/mytasks",        requiredResource: "tasks" },
  { id: "allTasks",       label: "Tasks",           icon: ListTodo,      path: "/staff/tasks",    requiredResource: "tasks" },
  { id: "students",       label: "Students",        icon: GraduationCap, path: "/students",       requiredResource: "students" },
  { id: "fees",           label: "Fees",             icon: IndianRupee,    path: "/fees",           requiredResource: "fees" },
  { id: "markAttendance", label: "Mark Attendance", icon: CalendarCheck, path: "/attendance/mark",requiredResource: "attendance" },
  { id: "penalties",      label: "Penalties",       icon: ShieldAlert,   path: "/hr/penalties",   requiredResource: "penalties" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock,   path: "/hr/attendance",  requiredResource: "attendance" },
  { id: "candidates",     label: "Candidates",      icon: Users,         path: "/candidates",     requiredResource: "candidates" },
  { id: "assets",         label: "Assets",          icon: Monitor,       path: "/hr/assets",      requiredResource: "assets" },
  { id: "myReports",      label: "My Reports",      icon: FileText,      path: "/myreports",      requiredResource: "reports" },
  { id: "reports",        label: "Staff Reports",   icon: FileText,      path: "/daily/reports",  requiredResource: "reports" },
  { id: "roles",          label: "Role Management", icon: ShieldAlert,   path: "/roles",          requiredResource: "staff" },
  { id: "credentials",    label: "Credentials Vault", icon: Key,         path: "/credentials",    requiredResource: "credentials" },
  { id: "call",           label: "Voxbay",          icon: PhoneCall,     path: "/call-analytics", requiredResource: "voxbay" },
];

export const getFilteredMenu = (hasAnyPermission) => {
  if (typeof hasAnyPermission !== 'function') return [];
  return masterNavigation.filter((item) => hasAnyPermission(item.requiredResource));
};

// Fallback for legacy imports until fully removed
export const getMenuForRole = (role) => {
  console.warn("getMenuForRole is deprecated. Use getMenuForPermissions instead.");
  return [];
};
