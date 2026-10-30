import React from 'react';
import {
  Users, Flame, UserCheck, Target,
  CalendarClock, AlertTriangle, CheckSquare,
  Wallet, Clock, AlertCircle, TrendingUp,
  Briefcase, GraduationCap, UserPlus
} from 'lucide-react';
import MetricCard from '../common/MetricCard';

const formatINR = (val, compact = true) => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  const num = Number(val);
  if (compact) {
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)} k`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

export default function AdminStatsGrid({ stats = {} }) {
  // Safe extraction supporting unified aggregation payload, role gating and legacy mocks
  const hasAdminDash = Boolean(
    stats?.has_admin_dashboard ||
    stats?.user?.has_admin_dashboard ||
    stats?.metrics?.executive_financials ||
    stats?.executive_financials
  );

  const leads = stats?.metrics?.leads || stats?.lead_pipeline?.metrics || {};
  const totalLeads = leads.total ?? stats?.lead_pipeline?.total_leads ?? stats?.total_leads ?? null;
  const hotLeads = leads.hot ?? 0;
  const warmLeads = leads.warm ?? 0;
  const activePipeline = hotLeads + warmLeads;
  const convertedLeads = leads.converted ?? 0;
  const registeredLeads = leads.registered ?? 0;
  const totalWon = convertedLeads + registeredLeads;
  const conversionRate = leads.conversion_rate ?? stats?.lead_pipeline?.conversion_rate ?? (
    totalLeads > 0 && totalWon > 0 ? Number(((totalWon / totalLeads) * 100).toFixed(1)) : null
  );

  const followups = stats?.metrics?.followups || stats?.followup_stats || {};
  const followupsToday = followups.today_total ?? followups.today_pending ?? followups.due_today ?? null;
  const followupsOverdue = followups.overdue ?? null;

  const tasks = stats?.metrics?.tasks || stats?.task_stats || {};
  const tasksUrgent = tasks.urgent ?? null;
  const tasksOverdue = tasks.overdue ?? null;

  const financials = stats?.metrics?.executive_financials || stats?.executive_financials || stats?.role_sections?.executive_financials || null;
  const collectionsMonth = financials?.collections_this_month ?? null;
  const pendingReceivables = financials?.pending_receivables ?? financials?.total_outstanding_receivable ?? null;
  const overdueBalance = financials?.total_overdue_balance ?? null;
  const totalRevenue = financials?.total_revenue ?? null;

  const activeStaff = stats?.active_staff ?? null;
  const staffOnLeave = stats?.staff_on_leave ?? null;
  const totalStudents = stats?.total_students ?? null;

  const metrics = [];

  // ── Tier 1: Executive Financial Cards (Role-Gated: hasAdminDash && financials) ──
  if (hasAdminDash && financials) {
    if (collectionsMonth !== null) {
      metrics.push({
        title: "Collections (Month)",
        value: formatINR(collectionsMonth, true),
        tooltip: formatINR(collectionsMonth, false),
        subtitle: "Current month collections",
        icon: Wallet,
        gradient: "from-emerald-500 to-teal-600",
        hoverColor: "emerald"
      });
    }

    if (pendingReceivables !== null) {
      metrics.push({
        title: "Pending Receivables",
        value: formatINR(pendingReceivables, true),
        tooltip: formatINR(pendingReceivables, false),
        subtitle: "Outstanding fee balances",
        icon: Clock,
        gradient: "from-amber-500 to-orange-600",
        hoverColor: "amber"
      });
    }

    if (overdueBalance !== null) {
      metrics.push({
        title: "Overdue Balance",
        value: formatINR(overdueBalance, true),
        tooltip: formatINR(overdueBalance, false),
        subtitle: "Immediate collection required",
        icon: AlertCircle,
        gradient: "from-red-500 to-rose-600",
        hoverColor: "rose"
      });
    }

    if (totalRevenue !== null) {
      metrics.push({
        title: "Total Invoiced",
        value: formatINR(totalRevenue, true),
        tooltip: formatINR(totalRevenue, false),
        subtitle: "Fee ledger & converted leads",
        icon: TrendingUp,
        gradient: "from-indigo-500 to-blue-600",
        hoverColor: "indigo"
      });
    }
  }

  // ── Tier 2: Leads Pipeline & Conversion Cards ─────────────────────────────
  if (totalLeads !== null) {
    metrics.push({
      title: "Total Leads",
      value: totalLeads,
      change: stats.leads_change || 0,
      showTrend: Boolean(stats.leads_change),
      subtitle: "All registered prospects",
      icon: Users,
      gradient: "from-blue-500 to-cyan-600",
      hoverColor: "blue"
    });
  }

  if (conversionRate !== null) {
    metrics.push({
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      subtitle: "Won leads vs total",
      icon: Target,
      gradient: "from-purple-500 to-violet-600",
      hoverColor: "purple"
    });
  }

  if (activePipeline > 0 || (leads.hot !== undefined && leads.warm !== undefined)) {
    metrics.push({
      title: "Active Pipeline",
      value: activePipeline,
      subtitle: `Hot: ${hotLeads} · Warm: ${warmLeads}`,
      icon: Flame,
      gradient: "from-orange-500 to-amber-600",
      hoverColor: "orange"
    });
  }

  if (totalWon > 0 || leads.converted !== undefined) {
    metrics.push({
      title: "Converted / Won",
      value: totalWon,
      subtitle: `Converted: ${convertedLeads} · Reg: ${registeredLeads}`,
      icon: UserCheck,
      gradient: "from-teal-500 to-emerald-600",
      hoverColor: "teal"
    });
  }

  // ── Tier 3: Operational Follow-ups, Tasks & Staff ─────────────────────────
  if (followupsToday !== null) {
    metrics.push({
      title: "Today's Follow-Ups",
      value: followupsToday,
      subtitle: "Scheduled consultations",
      icon: CalendarClock,
      gradient: "from-sky-500 to-blue-600",
      hoverColor: "sky"
    });
  }

  if (followupsOverdue !== null) {
    metrics.push({
      title: "Overdue Follow-Ups",
      value: followupsOverdue,
      subtitle: followupsOverdue > 0 ? "Requires urgent contact" : "All follow-ups on track",
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-600",
      hoverColor: "rose"
    });
  }

  if (tasksUrgent !== null || tasksOverdue !== null) {
    const urgentCount = (tasksUrgent || 0) + (tasksOverdue || 0);
    metrics.push({
      title: "Urgent Tasks",
      value: urgentCount,
      subtitle: `Urgent: ${tasksUrgent || 0} · Overdue: ${tasksOverdue || 0}`,
      icon: CheckSquare,
      gradient: "from-amber-600 to-rose-600",
      hoverColor: "amber"
    });
  }

  if (activeStaff !== null) {
    metrics.push({
      title: "Active Staff",
      value: activeStaff,
      change: stats.staff_change || 0,
      showTrend: Boolean(stats.staff_change),
      subtitle: staffOnLeave !== null ? `${staffOnLeave} on leave` : "Team strength",
      icon: Briefcase,
      gradient: "from-emerald-500 to-green-600",
      hoverColor: "green"
    });
  }

  // Legacy fallback cards (if students or candidates exist and cards count < 12)
  if (totalStudents !== null && metrics.length < 12) {
    metrics.push({
      title: "Total Students",
      value: totalStudents,
      change: stats.students_change || 0,
      showTrend: Boolean(stats.students_change),
      subtitle: "Enrolled students",
      icon: GraduationCap,
      gradient: "from-purple-500 to-indigo-600",
      hoverColor: "purple"
    });
  }

  if (stats.pending_candidates !== null && stats.pending_candidates !== undefined && metrics.length < 12) {
    metrics.push({
      title: "Pending Candidates",
      value: stats.pending_candidates,
      change: 0,
      subtitle: "Hiring applications",
      icon: UserPlus,
      gradient: "from-pink-500 to-rose-600",
      hoverColor: "pink"
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <MetricCard key={metric.title || index} {...metric} />
      ))}
    </div>
  );
}