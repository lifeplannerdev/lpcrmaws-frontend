import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useUserChannel } from '../../hooks/useUserChannel';
import { useVoxbayCall } from '../../hooks/useVoxbayCall';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  X,
  Phone,
  Clock,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import FollowUpBigModal from './FollowUpBigModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Web Audio API Synthesized Chime for Follow-Ups (Dual-tone Harmonic)
function playFollowUpChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First Tone: F5 (698.46 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second Tone: C6 (1046.50 Hz) - slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Autoplay restrictions or unsupported
  }
}

export default function GlobalFollowUpNotifier() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const navigate = useNavigate();
  const { initiateCall } = useVoxbayCall();

  const [alertsData, setAlertsData] = useState(null);
  const [isBigModalOpen, setIsBigModalOpen] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [floatingIndex, setFloatingIndex] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('lp_followups_sound_enabled') !== 'false';
  });

  const [desktopPermission, setDesktopPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const titleIntervalRef = useRef(null);
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'LifePlanner CRM');
  const lastAlertedIdsRef = useRef(new Set());

  // Determine if user has follow-up access (Counselors, Sales, Telecallers, Admins)
  const canAccessFollowups =
    hasAnyPermission('leads') ||
    hasPermission('staff_analysis:admin') ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.team === 'Sales' ||
    user?.role_names?.some((r) =>
      ['COUNSELOR', 'TELECALLER', 'SALES', 'ADMISSION'].includes(r.toUpperCase())
    );

  // Request native Windows notification permission
  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setDesktopPermission(perm);
        if (perm === 'granted') {
          new Notification('LifePlanner CRM Follow-Up Alerts Enabled', {
            body: 'You will now receive native Windows desktop alerts for scheduled client calls and pending follow-ups.',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.error('Failed to request desktop notification permission', e);
      }
    }
  };

  // Trigger Windows Desktop Notification
  const triggerWindowsNotification = useCallback(
    (item) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        const name =
          item.lead_name ||
          item.name ||
          item.processing_student_name ||
          (typeof item.lead === 'object' ? item.lead?.name : '') ||
          'Client';
        const phone = item.lead_phone || item.phone_number || '';
        const urgency = item.is_overdue
          ? '⚠️ OVERDUE FOLLOW-UP'
          : '⏰ SCHEDULED FOLLOW-UP DUE';

        const n = new Notification(`${urgency}: ${name}`, {
          body: `Call scheduled for ${item.follow_up_time || 'today'}. Contact: ${phone} | ${item.notes || ''}`,
          icon: '/favicon.ico',
          tag: `followup-${item.id}`,
          requireInteraction: item.is_overdue,
        });

        n.onclick = () => {
          window.focus();
          navigate('/followups');
          n.close();
        };
      } catch (e) {
        console.error('Error firing desktop notification', e);
      }
    },
    [navigate]
  );

  // Tab Title Pulsing
  const startTabTitleAlert = useCallback((alertCount) => {
    if (typeof document === 'undefined') return;
    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    originalTitleRef.current = document.title.replace(/^⏰\s*\(\d+\)\s*Follow-Up Due!\s*\|\s*/, '');

    let flag = false;
    titleIntervalRef.current = setInterval(() => {
      flag = !flag;
      document.title = flag
        ? `⏰ (${alertCount}) Follow-Up Due! | ${originalTitleRef.current}`
        : originalTitleRef.current;
    }, 1200);
  }, []);

  const stopTabTitleAlert = useCallback(() => {
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current || 'LifePlanner CRM';
    }
  }, []);

  // Fetch active alerts from backend
  const checkFollowUpAlerts = useCallback(
    async (isUserTriggered = false) => {
      if (!isAuthenticated || !accessToken || !canAccessFollowups) return;

      // Check snooze
      const snoozeUntil = localStorage.getItem('lp_followups_snooze_until');
      const isSnoozed = snoozeUntil && Date.now() < Number(snoozeUntil);

      try {
        const res = await fetch(`${API_BASE_URL}/followups/alerts/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) return;
        const data = await res.json();
        setAlertsData(data);

        const totalActive = data.counts?.total_active || 0;
        const overdueCount = data.counts?.overdue || 0;
        const todayCount = data.counts?.today || 0;

        // Check login session dismissal for Big Modal
        const currentSession = sessionStorage.getItem('login_session_id');
        const dismissedSession = sessionStorage.getItem('dismissed_followup_session');
        const isDismissedForSession =
          (currentSession && dismissedSession === currentSession) ||
          (!currentSession && sessionStorage.getItem('dismissed_followup_modal'));

        // Open Big Modal on login if not dismissed and active items exist
        if (!isDismissedForSession && totalActive > 0 && !isSnoozed) {
          setIsBigModalOpen(true);
        }

        // Floating Widget: show if there are overdue or imminent items, big modal is not open, and not snoozed
        const imminentItems = data.imminent || [];
        if (!isBigModalOpen && (overdueCount > 0 || imminentItems.length > 0) && !isSnoozed) {
          setIsFloatingOpen(true);

          // Check if newly discovered to notify externally
          const newAlerts = imminentItems.filter((i) => !lastAlertedIdsRef.current.has(i.id));
          if (newAlerts.length > 0 || isUserTriggered) {
            const primaryAlert = newAlerts[0] || imminentItems[0] || data.overdue?.[0];

            if (soundEnabled && primaryAlert) {
              playFollowUpChime();
            }

            if (primaryAlert) {
              triggerWindowsNotification(primaryAlert);
            }

            if (document.hidden) {
              startTabTitleAlert(overdueCount + todayCount);
            }

            imminentItems.forEach((i) => lastAlertedIdsRef.current.add(i.id));
          }
        } else if (overdueCount === 0 && imminentItems.length === 0) {
          setIsFloatingOpen(false);
          stopTabTitleAlert();
        }
      } catch (err) {
        console.error('[GlobalFollowUpNotifier] Check failed', err);
      }
    },
    [
      isAuthenticated,
      accessToken,
      canAccessFollowups,
      isBigModalOpen,
      soundEnabled,
      triggerWindowsNotification,
      startTabTitleAlert,
      stopTabTitleAlert,
    ]
  );

  // Initial load & periodic polling (every 3 minutes)
  useEffect(() => {
    if (!isAuthenticated || !canAccessFollowups) return;

    // Check after short delay for app boot
    const initTimer = setTimeout(() => {
      checkFollowUpAlerts();
    }, 2000);

    // Periodic check every 3 minutes (180,000ms)
    const intervalTimer = setInterval(() => {
      checkFollowUpAlerts();
    }, 180000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
      stopTabTitleAlert();
    };
  }, [isAuthenticated, canAccessFollowups, checkFollowUpAlerts, stopTabTitleAlert]);

  // Clear title pulse when window is focused
  useEffect(() => {
    const handleFocus = () => {
      stopTabTitleAlert();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [stopTabTitleAlert]);

  // Real-time Pusher listener
  useUserChannel({
    onLeadAssigned: () => checkFollowUpAlerts(true),
    onCallEnded: () => checkFollowUpAlerts(true),
  });

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('lp_followups_sound_enabled', String(next));
    if (next) playFollowUpChime();
  };

  // Snooze handler
  const handleSnooze = (minutes = 15) => {
    const snoozeTime = Date.now() + minutes * 60 * 1000;
    localStorage.setItem('lp_followups_snooze_until', String(snoozeTime));
    setIsFloatingOpen(false);
    setIsBigModalOpen(false);
    stopTabTitleAlert();
    toast.success(`Follow-up alerts snoozed for ${minutes} minutes`);
  };

  // Close Big Modal (sets session dismissal)
  const handleCloseBigModal = () => {
    const currentSession = sessionStorage.getItem('login_session_id') || 'dismissed';
    sessionStorage.setItem('dismissed_followup_session', currentSession);
    sessionStorage.setItem('dismissed_followup_modal', 'true');
    setIsBigModalOpen(false);
    stopTabTitleAlert();
  };

  // Status update handler (e.g. mark contacted)
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/followups/${id}/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Follow-up marked as ${newStatus}!`);
        checkFollowUpAlerts(true);
      } else {
        toast.error('Failed to update follow-up status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating status');
    }
  };

  // Reschedule handler
  const handleReschedule = async (item, newDate, newTime, newNotes) => {
    try {
      const rescheduleNotice = `[${new Date().toLocaleDateString('en-IN')}] Rescheduled to ${newDate} ${newTime || ''}: ${newNotes || ''}`.trim();
      const updatedNotes = item.notes ? `${item.notes}\n${rescheduleNotice}` : rescheduleNotice;

      // 1. Mark existing follow-up as completed
      await fetch(`${API_BASE_URL}/followups/${item.id}/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          notes: updatedNotes,
        }),
      });

      // 2. Create new follow-up for the new date
      const leadId =
        item.lead || item.lead_id || (typeof item.lead === 'object' ? item.lead?.id : null);
      await fetch(`${API_BASE_URL}/followups/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: leadId,
          phone_number: item.phone_number || item.lead_phone || '',
          follow_up_date: newDate,
          follow_up_time: newTime || null,
          followup_type: item.followup_type || 'call',
          priority: item.priority || 'medium',
          status: 'pending',
          notes: newNotes ? `[Rescheduled] ${newNotes}` : 'Rescheduled follow-up',
        }),
      });

      checkFollowUpAlerts(true);
    } catch (err) {
      console.error('Error in reschedule', err);
      throw err;
    }
  };

  // Floating Alert Card item
  const floatingItems = alertsData?.imminent || alertsData?.overdue || [];
  const currentFloating = floatingItems[floatingIndex] || floatingItems[0];

  return (
    <>
      {/* 1. Large Document Registry-Style Centered Login Modal */}
      <FollowUpBigModal
        isOpen={isBigModalOpen}
        onClose={handleCloseBigModal}
        data={alertsData}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        desktopPermission={desktopPermission}
        onRequestDesktopPermission={requestDesktopPermission}
        onStatusUpdate={handleStatusUpdate}
        onReschedule={handleReschedule}
        onSnooze={handleSnooze}
      />

      {/* 2. Floating Bottom-Right Reminder Alert Card (Processing Reminder System Style) */}
      {isFloatingOpen && currentFloating && !isBigModalOpen && (
        <div className="fixed bottom-5 right-5 z-[9990] max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <div
            className={`bg-white/95 backdrop-blur-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
              currentFloating.is_overdue
                ? 'border-red-300 ring-2 ring-red-400/20'
                : 'border-amber-300 ring-2 ring-amber-400/20'
            }`}
          >
            {/* Top Bar */}
            <div
              className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
                currentFloating.is_overdue
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-amber-500 text-white border-amber-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="uppercase tracking-wider text-[11px]">
                  {currentFloating.is_overdue
                    ? '⚠️ Overdue Follow-Up Call'
                    : '⏰ Scheduled Follow-Up Due'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Audio chime toggle */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className="p-1 rounded-md hover:bg-white/20 transition-colors text-white"
                  title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>

                {/* Dismiss */}
                <button
                  type="button"
                  onClick={() => setIsFloatingOpen(false)}
                  className="p-1 rounded-md hover:bg-white/20 transition-colors text-white"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4
                    onClick={() => {
                      setIsFloatingOpen(false);
                      setIsBigModalOpen(true);
                    }}
                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer leading-snug line-clamp-1"
                  >
                    {currentFloating.lead_name ||
                      currentFloating.name ||
                      currentFloating.processing_student_name ||
                      'Client Call'}
                  </h4>
                  {(currentFloating.lead_phone || currentFloating.phone_number) && (
                    <span className="text-gray-500 font-mono text-xs block">
                      {currentFloating.lead_phone || currentFloating.phone_number}
                    </span>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 border ${
                    currentFloating.priority === 'high'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {currentFloating.priority || 'Medium'}
                </span>
              </div>

              {currentFloating.notes && (
                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                  "{currentFloating.notes}"
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Due:{' '}
                    <strong
                      className={
                        currentFloating.is_overdue ? 'text-red-600 font-bold' : 'text-slate-800'
                      }
                    >
                      {currentFloating.follow_up_time || 'Today'}
                    </strong>
                  </span>
                </div>
                <span>
                  {currentFloating.assigned_to
                    ? currentFloating.assigned_to.first_name ||
                      currentFloating.assigned_to.username
                    : ''}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
              {/* Pagination if multiple alerts */}
              <div className="flex items-center gap-1">
                {floatingItems.length > 1 ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <button
                      type="button"
                      onClick={() =>
                        setFloatingIndex((prev) =>
                          prev > 0 ? prev - 1 : floatingItems.length - 1
                        )
                      }
                      className="p-1 hover:bg-white rounded border border-slate-200 transition-colors"
                      title="Previous alert"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span>
                      {floatingIndex + 1}/{floatingItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFloatingIndex((prev) =>
                          prev < floatingItems.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="p-1 hover:bg-white rounded border border-slate-200 transition-colors"
                      title="Next alert"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">1 Due Call</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSnooze(15)}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-800 hover:bg-white border border-slate-200 rounded-lg text-xs font-medium transition-all"
                  title="Snooze for 15 minutes"
                >
                  Snooze
                </button>

                {/* Direct Call Button */}
                {(currentFloating.lead_phone || currentFloating.phone_number) && (
                  <button
                    type="button"
                    onClick={() => {
                      const phone = currentFloating.lead_phone || currentFloating.phone_number;
                      initiateCall(phone, {
                        id: currentFloating.lead || currentFloating.lead_id,
                        name:
                          currentFloating.lead_name ||
                          currentFloating.name ||
                          currentFloating.processing_student_name ||
                          'Client',
                        status: currentFloating.lead_status || 'COLD',
                        priority: currentFloating.priority || 'MEDIUM',
                        program: currentFloating.lead_program || '',
                      });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </button>
                )}

                {/* View All in Big Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFloatingOpen(false);
                    setIsBigModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
