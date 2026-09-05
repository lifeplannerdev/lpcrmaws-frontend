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
  BookOpen,
  Sparkles,
  Music,
  Star,
  Heart,
  BarChart2
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
  { id: "markAttendance",    label: "Mark Attendance",    icon: CalendarCheck, path: "/attendance/mark",    requiredPermissions: ["attendance:mark"] },
  { id: "attendanceReports", label: "Attendance Reports", icon: CalendarCheck, path: "/attendance/reports",  requiredPermissions: ["attendance:mark", "attendance:approvals"] },
  { id: "myStudents",        label: "My Students",        icon: GraduationCap, path: "/my-students",         requiredPermissions: ["attendance:mark"] },
  { id: "penalties", label: "Penalties", icon: ShieldAlert, path: "/hr/penalties", requiredResource: "penalties" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock, path: "/hr/attendance", requiredResource: "staff" },
  { id: "candidates", label: "Candidates", icon: Users, path: "/candidates", requiredResource: "candidates" },
  { id: "assets", label: "Assets", icon: Monitor, path: "/hr/assets", requiredResource: "assets" },
  { id: "myReports", label: "My Reports", icon: FileText, path: "/myreports" },
  { id: "reports", label: "Staff Reports", icon: FileText, path: "/daily/reports", requiredResource: "reports", requiredPermissions: ["reports:read_all", "reports:documentation", "reports:kochi", "reports:sales_all"], requiredRoles: ['ADM_MANAGER', 'ADM_COUNSELLOR', 'FLAG_COORDINATOR'] },
  { id: "reportSettings", label: "Report Settings", icon: Settings, path: "/admin/reports/settings", requiredResource: "report_settings", requiredSpecificPermission: "report_settings:manage", requiredRoles: ['ADM_MANAGER'] },
  { id: "roles", label: "Role Management", icon: ShieldAlert, path: "/roles", requiredResource: "staff", requiredPermissions: ["staff:edit_any", "staff:edit_tenant"] },
  { id: "credentials", label: "Credentials Vault", icon: Key, path: "/credentials", requiredResource: "credentials" },
  { id: "call", label: "Voxbay", icon: PhoneCall, path: "/call-analytics", requiredResource: "voxbay" },
  { id: "voxbay_ai", label: "Voxbay AI", icon: PhoneCall, path: "/voxbay-ai", requiredPermissions: ["voxbay_ai:admin", "voxbay_ai:read_own"] },
  { id: "staffAnalysis", label: "Staff Analysis", icon: BarChart2, path: "/staff-analysis", requiredPermissions: ["staff_analysis:admin"] },
  { id: "feeds", label: "Feeds", icon: UserCheck, path: "/feeds" },
  { id: "programs", label: "Programs", icon: BookOpen, path: "/programs", requiredResource: "programs" },

  // ── FDS: FILMAATIC Dance Studio ──
  { id: "fds",           label: "FDS — Studio",     icon: Sparkles,      path: "/fds",          requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],  group: "fds" },
  { id: "fdsEnquiry",    label: "FDS Enquiries",    icon: Users,         path: "/fds/enquiries", requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },
  { id: "fdsTrial",      label: "FDS Trials",       icon: Star,          path: "/fds/trials",    requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },
  { id: "fdsStudents",   label: "FDS Students",     icon: GraduationCap, path: "/fds/students",  requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },
  { id: "fdsBatches",    label: "FDS Batches",      icon: Music,         path: "/fds/batches",   requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },
  { id: "fdsAttendance", label: "FDS Attendance",   icon: CalendarCheck, path: "/fds/attendance",requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },
  { id: "fdsFees",       label: "FDS Fees",         icon: IndianRupee,   path: "/fds/fees",      requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],group: "fds" },
  { id: "fdsFeePolicies",label: "FDS Fee Policies", icon: Settings,      path: "/fds/fee-policies",requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],group: "fds" },
  { id: "fdsWeddings",   label: "FDS Weddings 💍",  icon: Heart,         path: "/fds/weddings",  requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds" },

  // ── FLAG: German Language Training ──
  { id: "flag",          label: "FLAG Dashboard",   icon: FileText,      path: "/flag",          requiredPermissions: ["flag:admin","flag:trainer","flag:view","flag:fees"],  group: "flag" },
  { id: "flagBatches",   label: "FLAG Batches",     icon: BookOpen,      path: "/flag/batches",  requiredPermissions: ["flag:admin","flag:trainer","flag:view"],                group: "flag" },
  { id: "flagStudents",  label: "FLAG Students",    icon: Users,         path: "/flag/students", requiredPermissions: ["flag:admin","flag:trainer","flag:view"],                group: "flag" },
  { id: "flagAttendance",label: "FLAG Attendance",  icon: CalendarCheck, path: "/flag/attendance",requiredPermissions: ["flag:admin","flag:trainer"],                          group: "flag" },
  { id: "flagSettings",  label: "FLAG Settings",    icon: Settings,      path: "/flag/settings", requiredPermissions: ["flag:admin"],                                         group: "flag" },
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
