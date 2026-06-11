import React from 'react';
import { Users, UserCheck, GraduationCap, UserMinus, UserPlus } from 'lucide-react';
import MetricCard from '../common/MetricCard';

export default function AdminStatsGrid({ stats }) {
  const metrics = [];

  if (stats.total_leads !== null) {
    metrics.push({
      title: "Total Leads",
      value: stats.total_leads,
      change: stats.leads_change,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      hoverColor: "blue"
    });
  }

  if (stats.active_staff !== null) {
    metrics.push({
      title: "Active Staff",
      value: stats.active_staff,
      change: stats.staff_change,
      icon: UserCheck,
      gradient: "from-green-500 to-emerald-600",
      hoverColor: "green"
    });
  }

  if (stats.total_students !== null) {
    metrics.push({
      title: "Total Students",
      value: stats.total_students,
      change: stats.students_change,
      icon: GraduationCap,
      gradient: "from-purple-500 to-indigo-600",
      hoverColor: "purple"
    });
  }

  if (stats.staff_on_leave !== null) {
    metrics.push({
      title: "Staff On Leave",
      value: stats.staff_on_leave,
      change: 0,
      icon: UserMinus,
      gradient: "from-orange-500 to-amber-600",
      hoverColor: "orange"
    });
  }

  if (stats.pending_candidates !== null) {
    metrics.push({
      title: "Pending Candidates",
      value: stats.pending_candidates,
      change: 0,
      icon: UserPlus,
      gradient: "from-pink-500 to-rose-600",
      hoverColor: "pink"
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} showTrend />
      ))}
    </div>
  );
}