import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useUserChannel } from '../../hooks/useUserChannel';
import {
  Bell,
  X,
  Clock,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import ReminderNotificationSettingsModal from './ReminderNotificationSettingsModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Web Audio API Synthesized Chime (no external audio files needed)
function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: A5 (880 Hz) - slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio autoplay restrictions or unsupported
  }
}

export default function GlobalReminderNotifier() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const [alertsData, setAlertsData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('lp_reminders_sound_enabled') !== 'false';
  });
  const [desktopPermission, setDesktopPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [configuringReminder, setConfiguringReminder] = useState(null);

  const titleIntervalRef = useRef(null);
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'LifePlanner CRM');
  const lastAlertedIdsRef = useRef(new Set());

  const canAccessReminders = 
    hasPermission('processing:reminders_admin') || 
    hasPermission('processing:reminders_users') ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  // Request native Windows / browser notification permission
  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setDesktopPermission(perm);
        if (perm === 'granted') {
          new Notification('LifePlanner CRM Reminders Enabled', {
            body: 'You will now receive native Windows desktop alerts for critical deadlines.',
            icon: '/favicon.ico'
          });
        }
      } catch (e) {
        console.error('Failed to request desktop notification permission', e);
      }
    }
  };

  // Trigger Windows Desktop Notification
  const triggerWindowsNotification = useCallback((alert) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const urgency = alert.is_overdue 
        ? '⚠️ OVERDUE DEADLINE' 
        : alert.is_today 
        ? '⏰ DUE TODAY' 
        : alert.is_pending_approval
        ? '📋 APPROVAL REQUIRED'
        : 'REMINDER ALERT';

      const n = new Notification(`${urgency}: ${alert.title}`, {
        body: alert.description 
          ? `${alert.description} (Due: ${alert.effective_deadline})` 
          : `Scheduled deadline: ${alert.effective_deadline}`,
        icon: '/favicon.ico',
        tag: `reminder-${alert.id}`,
        requireInteraction: alert.is_overdue // stays on Windows until clicked if overdue
      });

      n.onclick = () => {
        window.focus();
        navigate('/reminders');
        n.close();
      };
    } catch (e) {
      console.error('Error firing desktop notification', e);
    }
  }, [navigate]);

  // Tab Title Pulsing when tab is in background
  const startTabTitleAlert = useCallback((alertCount) => {
    if (typeof document === 'undefined') return;
    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    originalTitleRef.current = document.title.replace(/^⏰\s*\(\d+\)\s*Reminder Due!\s*\|\s*/, '');

    let flag = false;
    titleIntervalRef.current = setInterval(() => {
      flag = !flag;
      document.title = flag 
        ? `⏰ (${alertCount}) Reminder Due! | ${originalTitleRef.current}` 
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
  const checkReminderAlerts = useCallback(async (isUserTriggered = false) => {
    if (!isAuthenticated || !accessToken || !canAccessReminders) return;

    // Check if currently snoozed
    const snoozeUntil = localStorage.getItem('lp_reminders_snooze_until');
    if (snoozeUntil && Date.now() < Number(snoozeUntil) && !isUserTriggered) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/reminders/alerts/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) return;
      const data = await res.json();
      setAlertsData(data);

      if (data.total_alerts > 0) {
        setIsOpen(true);

        // Check if there are newly discovered alerts to notify externally
        const newAlerts = data.alerts.filter(a => !lastAlertedIdsRef.current.has(a.id));
        if (newAlerts.length > 0 || isUserTriggered) {
          const primaryAlert = newAlerts[0] || data.alerts[0];

          // Play audio chime if enabled globally AND enabled on primary alert
          if (soundEnabled && primaryAlert?.enable_sound !== false) {
            playReminderChime();
          }

          // Trigger Windows desktop notifications if enabled on primary alert
          if (primaryAlert && primaryAlert.enable_desktop !== false) {
            triggerWindowsNotification(primaryAlert);
          }

          // Start tab title pulse if document is hidden/background
          if (document.hidden) {
            startTabTitleAlert(data.total_alerts);
          }

          // Record alerted IDs
          data.alerts.forEach(a => lastAlertedIdsRef.current.add(a.id));
        }
      } else {
        setIsOpen(false);
        stopTabTitleAlert();
      }
    } catch (err) {
      console.error('[GlobalReminderNotifier] Check failed', err);
    }
  }, [isAuthenticated, accessToken, canAccessReminders, soundEnabled, triggerWindowsNotification, startTabTitleAlert, stopTabTitleAlert]);

  // Initial load & periodic interval (checks every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated || !canAccessReminders) return;

    // Initial check after short delay to let app boot
    const initTimer = setTimeout(() => {
      checkReminderAlerts();
    }, 2500);

    // Periodic polling every 5 minutes (300,000ms)
    const intervalTimer = setInterval(() => {
      checkReminderAlerts();
    }, 300000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
      stopTabTitleAlert();
    };
  }, [isAuthenticated, canAccessReminders, checkReminderAlerts, stopTabTitleAlert]);

  // Clear title pulse when window is focused
  useEffect(() => {
    const handleFocus = () => {
      stopTabTitleAlert();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [stopTabTitleAlert]);

  // Real-time Pusher listener: immediately re-fetch alerts when an alert event arrives
  useUserChannel({
    onReminderAlert: () => checkReminderAlerts(true),
    onReminderAssigned: () => checkReminderAlerts(true),
    onReminderStatusUpdated: () => checkReminderAlerts(true),
    onReminderRemarkAdded: () => checkReminderAlerts(true),
  });

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('lp_reminders_sound_enabled', String(next));
    if (next) playReminderChime();
  };

  // Snooze options
  const handleSnooze = (minutes = 15) => {
    const snoozeTime = Date.now() + minutes * 60 * 1000;
    localStorage.setItem('lp_reminders_snooze_until', String(snoozeTime));
    setIsOpen(false);
    stopTabTitleAlert();
  };

  // Dismiss current popup without interrupting current page work
  const handleDismiss = () => {
    // Snooze default for 15 minutes upon manual dismiss so it does not spam
    handleSnooze(15);
  };

  const handleOpenReminder = (reminderId) => {
    setIsOpen(false);
    stopTabTitleAlert();
    navigate('/reminders');
  };

  if ((!isOpen || !alertsData || alertsData.total_alerts === 0) && !configuringReminder) {
    return null;
  }

  const alerts = alertsData?.alerts || [];
  const currentAlert = alerts[currentIndex] || alerts[0];

  return (
    <>
      {isOpen && currentAlert && (
        <div className="fixed bottom-5 right-5 z-[9990] max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
        currentAlert.is_overdue
          ? 'border-red-300 ring-2 ring-red-400/20'
          : currentAlert.is_today
          ? 'border-amber-300 ring-2 ring-amber-400/20'
          : currentAlert.is_needs_revision
          ? 'border-rose-300 ring-2 ring-rose-400/20'
          : 'border-indigo-200 ring-2 ring-indigo-400/15'
      }`}>
        {/* Top Header Bar */}
        <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
          currentAlert.is_overdue
            ? 'bg-red-500 text-white border-red-600'
            : currentAlert.is_today
            ? 'bg-amber-500 text-white border-amber-600'
            : currentAlert.is_needs_revision
            ? 'bg-rose-600 text-white border-rose-700'
            : 'bg-indigo-600 text-white border-indigo-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="uppercase tracking-wider text-[11px]">
              {currentAlert.is_overdue 
                ? '⚠️ Overdue Reminder' 
                : currentAlert.is_today 
                ? '⏰ Due Today' 
                : currentAlert.is_needs_revision
                ? '✍️ Revision Requested'
                : currentAlert.is_pending_approval
                ? '📋 Pending Approval'
                : 'Upcoming Reminder'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              type="button"
              className="p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white"
              title={soundEnabled ? 'Mute reminder chime' : 'Enable reminder chime'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
            </button>

            {/* Notification Schedule & Frequency Settings */}
            <button
              onClick={() => setConfiguringReminder(currentAlert)}
              type="button"
              className="p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white"
              title="Configure schedule & frequency for this reminder"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Close / Dismiss */}
            <button
              onClick={handleDismiss}
              type="button"
              className="p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white"
              title="Dismiss popup (Never disrupts your work)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2.5 text-xs">
          {/* Title & Badge */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h4 
                onClick={() => handleOpenReminder(currentAlert.id)}
                className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer leading-snug line-clamp-2"
              >
                {currentAlert.title}
              </h4>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 border ${
                currentAlert.priority === 'URGENT'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : currentAlert.priority === 'HIGH'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {currentAlert.priority}
              </span>
            </div>

            {/* Briefing Text */}
            {currentAlert.description && (
              <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                {currentAlert.description}
              </p>
            )}
          </div>

          {/* Student or Revision details if any */}
          {currentAlert.is_needs_revision && currentAlert.rejection_reason && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-snug">
              <span className="font-bold block text-rose-800">Needs Revision:</span>
              <span className="italic">"{currentAlert.rejection_reason}"</span>
            </div>
          )}

          {currentAlert.student_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100">
              <span>🎓 Linked Student: {currentAlert.student_name}</span>
            </div>
          )}

          {/* Meta Info: Deadline & Assignee */}
          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Target: <strong className={currentAlert.is_overdue ? 'text-red-600' : 'text-slate-800'}>{currentAlert.effective_deadline}</strong></span>
            </div>
            <div>
              <span>{currentAlert.user_name}</span>
            </div>
          </div>

          {/* Windows Notifications Banner if not enabled yet */}
          {desktopPermission === 'default' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={requestDesktopPermission}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enable Windows Desktop Notifications</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Carousel Pagination if multiple alerts */}
          <div className="flex items-center gap-1">
            {alerts.length > 1 ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : alerts.length - 1))}
                  className="p-1 hover:bg-white rounded border border-slate-200 transition-colors cursor-pointer"
                  title="Previous alert"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{currentIndex + 1}/{alerts.length}</span>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => (prev < alerts.length - 1 ? prev + 1 : 0))}
                  className="p-1 hover:bg-white rounded border border-slate-200 transition-colors cursor-pointer"
                  title="Next alert"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">1 Active Reminder</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Snooze Dropdown */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => handleSnooze(15)}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-800 hover:bg-white border border-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                title="Snooze for 15 minutes"
              >
                Snooze 15m
              </button>
            </div>

            {/* View / Open */}
            <button
              type="button"
              onClick={() => handleOpenReminder(currentAlert.id)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
      )}

      {/* Per-Reminder Notification Schedule & Interval Settings Modal */}
      {configuringReminder && (
        <ReminderNotificationSettingsModal
          isOpen={Boolean(configuringReminder)}
          reminder={configuringReminder}
          onClose={() => setConfiguringReminder(null)}
          onUpdated={() => {
            checkReminderAlerts(true);
          }}
        />
      )}
    </>
  );
}
