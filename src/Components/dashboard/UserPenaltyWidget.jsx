import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, IndianRupee, Calendar, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function UserPenaltyWidget() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const getToken = useCallback(async () => {
    return accessToken || (await refreshAccessToken());
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchMyPenalties = async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (isMounted) setLoading(false);
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/penalties/?my_only=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const rawData = res.data;
        const list = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.results)
          ? rawData.results
          : [];

        // Extra client-side filter to strictly guarantee user only sees their own
        const myPenalties = list.filter((p) => {
          if (!user?.id) return true;
          const pUserId = typeof p.user === 'object' ? p.user?.id : p.user;
          return !pUserId || pUserId === user.id || p.user_details?.id === user.id;
        });

        if (isMounted) {
          setPenalties(myPenalties);
        }
      } catch (error) {
        console.error('Failed to load penalties:', error);
        if (isMounted) setPenalties([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (accessToken) {
      fetchMyPenalties();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [accessToken, getToken, user?.id]);

  // If loading or no penalties exist for this user, hide section completely
  if (loading || !penalties || penalties.length === 0) {
    return null;
  }

  const totalAmount = penalties.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return monthStr;
  };

  const displayedPenalties = expanded ? penalties : penalties.slice(0, 3);

  return (
    <div className="mb-6">
      <div className="bg-white rounded-2xl border border-red-200/90 shadow-sm p-5 flex flex-col transition-all duration-300 hover:shadow-md">
        {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-to-r from-red-500 to-rose-600 w-2 h-6 rounded-full inline-block"></span>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-gray-800 text-lg">My Penalties</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            {penalties.length} {penalties.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-sm shadow-xs">
            <span className="text-xs font-medium text-red-600">Total Deduction:</span>
            <span className="inline-flex items-center font-extrabold text-base text-red-700">
              <IndianRupee className="w-4 h-4 mr-0.5" />
              {totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Disciplinary Notice Strip */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50/70 border border-red-100 flex items-center gap-2.5 text-xs text-red-700">
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span>
          You have active penalties recorded on your profile. These deductions apply according to company policy.
        </span>
      </div>

      {/* Penalties List */}
      <div className="flex flex-col gap-3">
        {displayedPenalties.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-red-100 bg-gradient-to-r from-red-50/30 via-white to-gray-50/50 hover:bg-red-50/50 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {item.month && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                    {formatMonth(item.month)}
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

              <p className="text-sm font-medium text-gray-800 break-words leading-snug">
                {item.act || 'Disciplinary violation'}
              </p>
            </div>

            <div className="flex items-center justify-end sm:justify-center shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-sm bg-red-100 text-red-800 border border-red-200 shadow-2xs">
                <IndianRupee className="w-3.5 h-3.5" />
                {Number(item.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Expand / Collapse Button if > 3 penalties */}
      {penalties.length > 3 && (
        <div className="mt-3 pt-2 flex justify-center border-t border-gray-100">
          <button
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
