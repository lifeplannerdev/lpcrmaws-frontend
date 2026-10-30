import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  ShieldAlert,
  ShieldCheck,
  IndianRupee,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  Users,
  ExternalLink,
  Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function UserPenaltyWidget() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();

  // Determine if current user has permission to view all / tenant penalties
  const canViewAllPenalties = Boolean(
    user?.is_superuser ||
    hasPermission('penalties:read_any') ||
    hasPermission('penalties:read_tenant') ||
    hasPermission('penalties:edit_any') ||
    hasPermission('penalties:edit_tenant')
  );

  // Default month: Current month in 'YYYY-MM' format
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [viewScope, setViewScope] = useState('all'); // 'all' or 'my'
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Generate 14-month picker options (past 12 months + next 2 months)
  const monthOptions = useMemo(() => {
    const list = [];
    const today = new Date();
    // 2 months in future down to 12 months in past
    for (let i = -2; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  const getToken = useCallback(async () => {
    return accessToken || (await refreshAccessToken());
  }, [accessToken, refreshAccessToken]);

  // Client-side helper to check if a penalty falls into the selected month
  const matchesMonth = useCallback((p, monthKey) => {
    if (!monthKey || monthKey === 'all') return true;
    if (p.month === monthKey) return true;
    if (p.date && String(p.date).startsWith(monthKey)) return true;
    try {
      const [y, m] = monthKey.split('-').map(Number);
      const monthName = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' }).toLowerCase();
      if (p.month && p.month.toLowerCase().includes(monthName)) return true;
    } catch {
      // ignore parsing error
    }
    return false;
  }, []);

  const fetchPenalties = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      const isViewingMyOnly = !canViewAllPenalties || viewScope === 'my';

      if (isViewingMyOnly) {
        params.set('my_only', 'true');
      }

      if (selectedMonth && selectedMonth !== 'all') {
        params.set('month', selectedMonth);
      }

      const res = await axios.get(`${API_BASE_URL}/penalties/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rawData = res.data;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.results)
        ? rawData.results
        : [];

      // Filter list
      let filtered = list;

      if (isViewingMyOnly) {
        filtered = filtered.filter((p) => {
          if (!user?.id) return true;
          const pUserId = typeof p.user === 'object' ? p.user?.id : p.user;
          return !pUserId || pUserId === user.id || p.user_details?.id === user.id;
        });
      }

      if (selectedMonth && selectedMonth !== 'all') {
        filtered = filtered.filter((p) => matchesMonth(p, selectedMonth));
      }

      setPenalties(filtered);
    } catch (error) {
      console.error('Failed to load penalties:', error);
      setPenalties([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, canViewAllPenalties, viewScope, selectedMonth, user?.id, matchesMonth]);

  useEffect(() => {
    if (accessToken) {
      fetchPenalties();
    } else {
      setLoading(false);
    }
  }, [accessToken, fetchPenalties]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatMonthTitle = (monthStr) => {
    if (!monthStr || monthStr === 'all') return 'All Months';
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return monthStr;
  };

  const formatMonthBadge = (monthStr) => {
    if (!monthStr) return '';
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return monthStr;
  };

  // For regular employees: If not loading and no penalties exist, hide the widget completely
  if (!canViewAllPenalties && !loading && penalties.length === 0) {
    return null;
  }

  // Summary figures
  const totalAmount = penalties.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const uniqueStaffCount = new Set(
    penalties.map((p) => (typeof p.user === 'object' ? p.user?.id : p.user)).filter(Boolean)
  ).size;

  const displayedPenalties = expanded ? penalties : penalties.slice(0, 4);

  const isCurrentMonth = selectedMonth === currentMonthKey;
  const isViewingAll = canViewAllPenalties && viewScope === 'all';

  return (
    <div className="mb-6">
      <div className="bg-white rounded-2xl border border-red-200/90 shadow-sm p-5 flex flex-col transition-all duration-300 hover:shadow-md">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-red-500 to-rose-600 w-2 h-7 rounded-full inline-block"></span>
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-800 text-lg">
                  {isViewingAll ? 'Penalties Overview' : 'My Penalties'}
                </h3>
                {canViewAllPenalties && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    All Access
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* View Scope Toggle if privileged */}
            {canViewAllPenalties && (
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewScope('all')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    viewScope === 'all'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope('my')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    viewScope === 'my'
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Only Mine</span>
                </button>
              </div>
            )}

            {/* Month Navigator */}
            <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 pl-2 pr-5 py-1 cursor-pointer focus:outline-none appearance-none"
                >
                  <option value="all">All Months</option>
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick jump to current month if not selected */}
            {!isCurrentMonth && selectedMonth !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Current Month
              </button>
            )}

            {/* Total Deduction Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-sm shadow-xs">
              <span className="text-xs font-medium text-red-600">Total:</span>
              <span className="inline-flex items-center font-extrabold text-base text-red-700">
                <IndianRupee className="w-4 h-4 mr-0.5" />
                {totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Subheader / Month & Metrics Banner */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-50/70 via-rose-50/50 to-gray-50 border border-red-100 text-xs">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <Calendar className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              Showing penalties for{' '}
              <strong className="font-bold underline decoration-red-300">
                {formatMonthTitle(selectedMonth)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md font-semibold bg-white text-red-700 border border-red-200 shadow-2xs">
              {penalties.length} {penalties.length === 1 ? 'Penalty' : 'Penalties'}
            </span>
            {isViewingAll && uniqueStaffCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-white text-gray-700 border border-gray-200 shadow-2xs">
                {uniqueStaffCount} {uniqueStaffCount === 1 ? 'Employee' : 'Employees'} Affected
              </span>
            )}
            {canViewAllPenalties && (
              <Link
                to="/hr/penalties"
                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-800 hover:underline ml-1"
              >
                <span>HR Penalties</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
            <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
            <p className="text-sm font-medium">Loading penalties...</p>
          </div>
        ) : penalties.length === 0 ? (
          /* Empty State for selected month */
          <div className="py-8 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-2.5 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-sm mb-1">
              No Penalties Recorded for {formatMonthTitle(selectedMonth)}
            </h4>
            <p className="text-xs text-gray-500 max-w-md">
              {isViewingAll
                ? 'Great news! No disciplinary penalty deductions have been recorded for staff members during this month.'
                : 'You have no recorded penalties for this month.'}
            </p>
          </div>
        ) : (
          /* Penalties List */
          <div className="flex flex-col gap-3">
            {displayedPenalties.map((item) => {
              const itemUserId = typeof item.user === 'object' ? item.user?.id : item.user;
              const isCurrentUser = user?.id && itemUserId === user.id;
              const displayName =
                item.user_name ||
                item.user_details?.name ||
                item.user_details?.username ||
                (isCurrentUser ? 'You' : `Staff #${itemUserId || ''}`);

              const avatarInitial = displayName
                ? displayName.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'S'
                : 'S';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-red-100 bg-gradient-to-r from-red-50/30 via-white to-gray-50/50 hover:bg-red-50/50 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    {/* Top Row Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {/* Employee Name Tag (Prominent when viewing all staff) */}
                      {isViewingAll && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                          <span className="w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                            {avatarInitial}
                          </span>
                          <span>{displayName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-extrabold text-red-600 uppercase">
                              (You)
                            </span>
                          )}
                        </div>
                      )}

                      {item.month && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                          {formatMonthBadge(item.month)}
                        </span>
                      )}

                      {item.company && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                          {item.company}
                        </span>
                      )}

                      {item.source_report_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <FileText className="w-3 h-3" />
                          Report #{item.source_report_id}
                        </span>
                      )}

                      <div className="inline-flex items-center gap-1 text-xs text-gray-500 ml-auto sm:ml-0">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>

                    {/* Penalty Act / Reason */}
                    <p className="text-sm font-medium text-gray-800 break-words leading-snug">
                      {item.act || 'Disciplinary violation'}
                    </p>
                  </div>

                  {/* Penalty Amount */}
                  <div className="flex items-center justify-end sm:justify-center shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-sm bg-red-100 text-red-800 border border-red-200 shadow-2xs">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {Number(item.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expand / Collapse Button if > 4 penalties */}
        {penalties.length > 4 && (
          <div className="mt-3 pt-2 flex justify-center border-t border-gray-100">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 py-1 px-3 rounded-lg hover:bg-red-50 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View All ({penalties.length} Penalties)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
