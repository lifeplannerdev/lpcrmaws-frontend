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
  BarChart2,
  Download
} from "lucide-react";

export const masterNavigation = [
  { id: "overview", label: "Overview", icon: FileText, path: "/", category: "overview", description: "Executive overview & quick stats" },
  
  // ── Sales & Telephony ──
  { id: "leads", label: "Leads", icon: Users, path: "/leads", requiredResource: "leads", category: "sales", description: "Leads pipeline, follow-ups & status" },
  { id: "call", label: "Voxbay", icon: PhoneCall, path: "/call-analytics", requiredResource: "voxbay", category: "sales", description: "Call records, agent analytics & logs" },
  { id: "voxbay_ai", label: "Voxbay AI", icon: PhoneCall, path: "/voxbay-ai", requiredPermissions: ["voxbay_ai:admin", "voxbay_ai:read_own"], category: "sales", description: "AI call summaries & sentiment analysis" },
  { id: "exportData", label: "Data Export & Import", icon: Download, path: "/export-data", requiredResource: "leads", category: "sales", description: "Bulk lead import/export operations" },

  // ── Academics & Students ──
  { id: "registry", label: "Student Registry", icon: GraduationCap, path: "/registry", requiredPermissions: ["students:registry_manage"], category: "academics", description: "Master student database & records" },
  { id: "academicBatches", label: "Academic Batches", icon: GraduationCap, path: "/academic-batches", requiredPermissions: ["students:batch_manage"], category: "academics", description: "Batch scheduling & trainer allocations" },
  { id: "processingStudents", label: "Processing Students", icon: GraduationCap, path: "/processing-students", requiredResource: "processing_students", category: "academics", description: "Admissions & processing workflow" },
  { id: "myStudents",        label: "My Students",        icon: GraduationCap, path: "/my-students",         requiredPermissions: ["attendance:mark"], category: "academics", description: "Trainer assigned students roster" },
  { id: "markAttendance",    label: "Mark Attendance",    icon: CalendarCheck, path: "/attendance/mark",    requiredPermissions: ["attendance:mark"], category: "academics", description: "Daily student roll-call" },
  { id: "attendanceReports", label: "Attendance Reports", icon: CalendarCheck, path: "/attendance/reports",  requiredPermissions: ["attendance:mark", "attendance:approvals"], category: "academics", description: "Student attendance statistics" },
  { id: "fees", label: "Fees", icon: IndianRupee, path: "/fees", requiredResource: "fees", category: "academics", description: "Fee collections, receipts & balances" },
  { id: "programs", label: "Programs", icon: BookOpen, path: "/programs", requiredResource: "programs", category: "academics", description: "Academic programs & courses" },

  // ── HR & Operations ──
  { id: "staff", label: "Staff", icon: UserCheck, path: "/staff", requiredResource: "staff", category: "hr", description: "Team directory, profiles & credentials" },
  { id: "candidates", label: "Candidates", icon: Users, path: "/candidates", requiredResource: "candidates", category: "hr", description: "Job applicants & hiring pipeline" },
  { id: "attendanceDocs", label: "Attendance Docs", icon: FolderClock, path: "/hr/attendance", requiredResource: "staff", category: "hr", description: "Staff monthly attendance & leave docs" },
  { id: "penalties", label: "Penalties", icon: ShieldAlert, path: "/hr/penalties", requiredResource: "penalties", category: "hr", description: "Staff disciplinary records & penalties" },
  { id: "assets", label: "Assets", icon: Monitor, path: "/hr/assets", requiredResource: "assets", category: "hr", description: "Company equipment, devices & resources" },

  // ── Tasks & Collaboration ──
  { id: "myTasks", label: "My Tasks", icon: ListTodo, path: "/mytasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_own", category: "tasks", description: "Personal assignments & to-dos" },
  { id: "allTasks", label: "Tasks", icon: ListTodo, path: "/staff/tasks", requiredResource: "tasks", requiredSpecificPermission: "tasks:read_all", category: "tasks", description: "Company-wide task board" },
  { id: "feeds", label: "Feeds", icon: UserCheck, path: "/feeds", category: "tasks", description: "Internal company feed & updates" },

  // ── Reports & Analytics ──
  { id: "reports", label: "Staff Reports", icon: FileText, path: "/daily/reports", requiredResource: "reports", requiredPermissions: ["reports:read_all", "reports:documentation", "reports:kochi", "reports:sales_all"], requiredRoles: ['ADM_MANAGER', 'ADM_COUNSELLOR', 'FLAG_COORDINATOR'], category: "reports", description: "Daily multi-department staff submissions" },
  { id: "myReports", label: "My Reports", icon: FileText, path: "/myreports", category: "reports", description: "Your daily submitted work reports" },
  { id: "staffAnalysis", label: "Staff Analysis", icon: BarChart2, path: "/staff-analysis", requiredPermissions: ["staff_analysis:admin"], category: "reports", description: "Staff performance & conversion metrics" },
  { id: "reportSettings", label: "Report Settings", icon: Settings, path: "/admin/reports/settings", requiredResource: "report_settings", requiredSpecificPermission: "report_settings:manage", requiredRoles: ['ADM_MANAGER'], category: "reports", description: "Report schedules & submission windows" },

  // ── FDS: FILMAATIC Dance Studio ──
  { id: "fds",           label: "FDS — Studio",     icon: Sparkles,      path: "/fds",          requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],  group: "fds", category: "divisions", description: "Dance studio overview & KPIs" },
  { id: "fdsEnquiry",    label: "FDS Enquiries",    icon: Users,         path: "/fds/enquiries", requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Studio leads & walk-in enquiries" },
  { id: "fdsTrial",      label: "FDS Trials",       icon: Star,          path: "/fds/trials",    requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Trial dance sessions & bookings" },
  { id: "fdsStudents",   label: "FDS Students",     icon: GraduationCap, path: "/fds/students",  requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Active dance students directory" },
  { id: "fdsBatches",    label: "FDS Batches",      icon: Music,         path: "/fds/batches",   requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Dance styles, schedules & batches" },
  { id: "fdsAttendance", label: "FDS Attendance",   icon: CalendarCheck, path: "/fds/attendance",requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Student class attendance" },
  { id: "fdsFees",       label: "FDS Fees",         icon: IndianRupee,   path: "/fds/fees",      requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],group: "fds", category: "divisions", description: "Studio fee payments & dues" },
  { id: "fdsFeePolicies",label: "FDS Fee Policies", icon: Settings,      path: "/fds/fee-policies",requiredPermissions: ["fds:admin","fds:admin_own","fds:view","fds_fees:view"],group: "fds", category: "divisions", description: "Pricing plans & payment policies" },
  { id: "fdsWeddings",   label: "FDS Weddings 💍",  icon: Heart,         path: "/fds/weddings",  requiredPermissions: ["fds:admin","fds:admin_own","fds:view"],                group: "fds", category: "divisions", description: "Wedding choreography packages" },

  // ── FLAG: German Language Training ──
  { id: "flag",          label: "FLAG Dashboard",   icon: FileText,      path: "/flag",          requiredPermissions: ["flag:admin","flag:trainer","flag:view","flag:fees"],  group: "flag", category: "divisions", description: "German academy overview & metrics" },
  { id: "flagBatches",   label: "FLAG Batches",     icon: BookOpen,      path: "/flag/batches",  requiredPermissions: ["flag:admin","flag:trainer","flag:view"],                group: "flag", category: "divisions", description: "Language levels (A1, A2, B1, B2)" },
  { id: "flagStudents",  label: "FLAG Students",    icon: Users,         path: "/flag/students", requiredPermissions: ["flag:admin","flag:trainer","flag:view"],                group: "flag", category: "divisions", description: "Enrolled language students" },
  { id: "flagAttendance",label: "FLAG Attendance",  icon: CalendarCheck, path: "/flag/attendance",requiredPermissions: ["flag:admin","flag:trainer"],                          group: "flag", category: "divisions", description: "Class session attendance" },
  { id: "flagSettings",  label: "FLAG Settings",    icon: Settings,      path: "/flag/settings", requiredPermissions: ["flag:admin"],                                         group: "flag", category: "divisions", description: "Academy parameters & configuration" },

  // ── System & Administration ──
  { id: "roles", label: "Role Management", icon: ShieldAlert, path: "/roles", requiredResource: "staff", requiredPermissions: ["staff:edit_any", "staff:edit_tenant"], category: "admin", description: "RBAC roles & permission matrix" },
  { id: "credentials", label: "Credentials Vault", icon: Key, path: "/credentials", requiredResource: "credentials", category: "admin", description: "Secure system credentials & tokens" },
];

export const CATEGORIES = [
  { id: "sales", label: "Sales", icon: Users, description: "Leads, calling analytics & pipelines" },
  { id: "academics", label: "Academics", icon: GraduationCap, description: "Students, batches, attendance & fees" },
  { id: "hr", label: "HR & Ops", icon: UserCheck, description: "Staff roster, recruitment & assets" },
  { id: "tasks", label: "Tasks", icon: ListTodo, description: "Personal & team task management" },
  { id: "reports", label: "Reports", icon: BarChart2, description: "Staff reports & performance analytics" },
  { id: "divisions", label: "Divisions", icon: Sparkles, description: "Specialized portals (FDS & FLAG)" },
  { id: "admin", label: "Admin", icon: Settings, description: "System roles, vault & settings" },
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

/**
 * Returns structured categorized navigation based on permitted items and user context
 */
export const getCategorizedMenu = (allowedItems, user) => {
  const isFds = user?.company === 'FDS';
  const overviewItem = allowedItems.find(item => item.id === 'overview' || item.category === 'overview');

  const categories = CATEGORIES.map(cat => {
    let catLabel = cat.label;
    if (cat.id === 'divisions' && isFds) {
      catLabel = 'FDS Studio';
    }

    const items = allowedItems.filter(item => {
      if (item.category === cat.id) return true;
      if (cat.id === 'divisions' && (item.group === 'fds' || item.group === 'flag')) return true;
      return false;
    });

    return {
      ...cat,
      label: catLabel,
      items
    };
  }).filter(cat => cat.items.length > 0);

  return {
    overviewItem,
    categories,
    allAllowedItems: allowedItems
  };
};

// Fallback for legacy imports until fully removed
export const getMenuForRole = (role) => {
  console.warn("getMenuForRole is deprecated. Use getMenuForPermissions instead.");
  return [];
};
