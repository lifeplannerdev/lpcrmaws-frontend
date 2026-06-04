import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Calendar, Mail, Phone,
  Users, CheckCircle, XCircle, Clock,
  Star, Filter, AlertCircle, UserCheck,
} from 'lucide-react';

import Navbar from '../Components/layouts/Navbar';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

const STATUS_BADGE = {
  applied:     'bg-blue-100 text-blue-700 border-blue-200',
  interviewed: 'bg-amber-100 text-amber-700 border-amber-200',
  selected:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:    'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS = {
  applied:     <Clock        className="text-blue-500"    size={20} />,
  interviewed: <AlertCircle  className="text-amber-500"  size={20} />,
  selected:    <CheckCircle  className="text-emerald-500" size={20} />,
  rejected:    <XCircle      className="text-red-500"    size={20} />,
};

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function RatingStars({ rating }) {
  if (!rating) return <span className="text-gray-400 text-xs">No rating</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <Star
          key={i}
          size={11}
          className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating}/10</span>
    </span>
  );
}

export default function CandidatesPage() {
  const navigate  = useNavigate();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [candidates, setCandidates] = useState([]);
  const [count,      setCount]      = useState(0);
  const [stats,      setStats]      = useState(null);

  const [page,    setPage]    = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const canManage = hasPermission('candidates:edit_any') || hasPermission('candidates:edit_tenant') || hasPermission('candidates:edit_own');

  // ── Stat card config ───────────────────────────────────────────────────────
  const statsData = stats ? [
    {
      label: 'Total',
      value: stats.total ?? 0,
      icon:  Users,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      label: 'Applied',
      value: stats.applied ?? 0,
      icon:  Clock,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
    },
    {
      label: 'Interviewed',
      value: stats.interviewed ?? 0,
      icon:  UserCheck,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    },
    {
      label: 'Selected',
      value: stats.selected ?? 0,
      icon:  CheckCircle,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
  ] : [];

  // ── Auth helper ────────────────────────────────────────────────────────────
  const getToken = useCallback(async () => {
    const token = accessToken || await refreshAccessToken();
    if (!token) throw new Error('Authentication required');
    return token;
  }, [accessToken, refreshAccessToken]);

  // ── Fetch stats (derived from the list response) ───────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      const res   = await fetch(`${API_BASE_URL}/candidates/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const all  = data.results ?? [];
      setStats({
        total:       data.count ?? all.length,
        applied:     all.filter(c => c.status === 'applied').length,
        interviewed: all.filter(c => c.status === 'interviewed').length,
        selected:    all.filter(c => c.status === 'selected').length,
      });
    } catch {
      setStats({ total: 0, applied: 0, interviewed: 0, selected: 0 });
    }
  }, [API_BASE_URL, getToken]);

  // ── Fetch paginated + filtered list ───────────────────────────────────────
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token  = await getToken();
      const params = new URLSearchParams({ page });
      if (companyFilter)            params.set('company', companyFilter);
      if (searchTerm)               params.set('search', searchTerm);
      if (filterStatus !== 'all')   params.set('status', filterStatus);

      const res = await fetch(`${API_BASE_URL}/candidates/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch candidates');

      const data = await res.json();
      setCandidates(data.results ?? []);
      setCount(data.count ?? 0);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, getToken, page, searchTerm, filterStatus, companyFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, companyFilter]);

  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, [fetchCandidates, fetchStats]);

  const formatDate = d =>
    d
      ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto" />
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto absolute top-0 left-1/2 -translate-x-1/2" />
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading candidates…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Error Loading Candidates</h3>
            <p className="text-slate-600 text-center mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Candidates
              </h1>
              <p className="text-gray-600 text-lg">Track and manage your hiring pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              <CompanySwitcher activeCompany={companyFilter} onChange={setCompanyFilter} />
              {canManage && (
                <button
                  onClick={() => navigate('/candidates/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Candidate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase mb-3">
                        {stat.label}
                      </p>
                      <h3 className="text-5xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {stat.value}
                      </h3>
                    </div>
                    <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Filter & Search</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or position…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 bg-white"
            >
              <option value="all">All Status</option>
              <option value="applied">Applied</option>
              <option value="interviewed">Interviewed</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Candidate list */}
        {candidates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-blue-600" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              {count === 0
                ? 'Add your first candidate to start building the pipeline'
                : 'Try adjusting your search or status filter'}
            </p>
            {count === 0 && canManage && (
              <button
                onClick={() => navigate('/candidates/new')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus size={20} />
                Add First Candidate
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map(candidate => (
              <div
                key={candidate.id}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">

                  {/* Left: avatar + info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                      {initials(candidate.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + status badge */}
                      <div className="flex items-start gap-3 mb-2 flex-wrap">
                        <h3
                          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                          onClick={() => navigate(`/candidates/${candidate.id}`)}
                        >
                          {candidate.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[candidate.status]}`}>
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </span>
                      </div>

                      {/* Position */}
                      <p className="text-gray-600 text-sm font-medium mb-3">{candidate.position_applied}</p>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-blue-600" />
                          <span>{candidate.email}</span>
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="text-indigo-600" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.interview_date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-rose-600" />
                            <span className="font-medium">Interview:</span>
                            <span className="font-semibold text-gray-700">{formatDate(candidate.interview_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <RatingStars rating={candidate.rating} />
                        </div>
                      </div>

                      {/* Notes preview */}
                      {candidate.notes && (
                        <p className="text-gray-500 text-xs mt-3 line-clamp-1 italic">
                          {candidate.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:flex-col lg:items-stretch lg:min-w-[160px]">
                    <button
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                      className="flex-1 lg:flex-none px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 text-sm font-semibold border border-blue-200 hover:border-blue-300 hover:shadow-md"
                    >
                      View Details
                    </button>
                    {canManage && (
                      <button
                        onClick={() => navigate(`/candidates/edit/${candidate.id}`)}
                        className="flex-1 lg:flex-none px-4 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 text-sm font-semibold border border-indigo-200 hover:border-indigo-300 hover:shadow-md"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(hasNext || hasPrev) && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                hasPrev
                  ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              Previous
            </button>
            <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg">
              Page {page}
            </div>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                hasNext
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              Next
            </button>
          </div>
        )}

        {/* Result count */}
        {candidates.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-md">
              <span className="text-sm font-medium text-gray-600">
                Showing{' '}
                <span className="font-bold text-blue-600">{candidates.length}</span> of{' '}
                <span className="font-bold text-blue-600">{count}</span> candidates
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
