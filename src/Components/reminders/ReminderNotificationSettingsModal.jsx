import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  BellRing,
  BellOff,
  Clock,
  Calendar,
  Volume2,
  Monitor,
  CheckCircle2,
  X,
  Play,
  Sparkles,
  Save,
  AlertCircle,
  HelpCircle,
  Layers,
  Flame
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Synthesizer preview helper
function previewAudioChime() {
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
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.24, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.error('Audio preview not supported or blocked:', e);
  }
}

const INTERVAL_PRESETS = [
  { value: 15, label: '15m', desc: 'Every 15 mins (Urgent)' },
  { value: 30, label: '30m', desc: 'Every 30 mins (Recommended)' },
  { value: 60, label: '1h', desc: 'Every 1 hour' },
  { value: 120, label: '2h', desc: 'Every 2 hours' },
  { value: 240, label: '4h', desc: 'Every 4 hours' },
  { value: 1440, label: 'Daily', desc: 'Once a day (24h)' },
];

const LEAD_DAYS_PRESETS = [
  { value: 0, label: 'On Due Date', desc: 'Start alerting on deadline day' },
  { value: 1, label: '1 Day Before', desc: 'Start 24 hours prior' },
  { value: 2, label: '2 Days Before', desc: 'Start 48 hours prior' },
  { value: 3, label: '3 Days Before', desc: 'Start 3 days prior' },
  { value: 7, label: '1 Week Before', desc: 'Start 7 days prior' },
];

export default function ReminderNotificationSettingsModal({
  isOpen,
  onClose,
  reminder,
  onUpdated,
}) {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [isEnabled, setIsEnabled] = useState(true);
  const [startMode, setStartMode] = useState('date'); // 'date' | 'lead_days'
  const [notifyStartDate, setNotifyStartDate] = useState('');
  const [leadDays, setLeadDays] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [enableInApp, setEnableInApp] = useState(true);
  const [enableDesktop, setEnableDesktop] = useState(true);
  const [enableSound, setEnableSound] = useState(true);
  const [notifyOverdueRepeatedly, setNotifyOverdueRepeatedly] = useState(true);
  const [notes, setNotes] = useState('');

  // Load current settings when modal opens
  useEffect(() => {
    if (!isOpen || !reminder) return;
    setTestSuccessMessage('');
    setErrorMessage('');

    // Pre-populate from reminder.notification_setting if already provided
    const existing = reminder.notification_setting;
    if (existing) {
      setIsEnabled(existing.is_enabled !== false);
      setNotifyStartDate(existing.notify_start_date || reminder.reminder_date || '');
      setLeadDays(existing.lead_days || 0);
      setStartMode(existing.notify_start_date ? 'date' : (existing.lead_days > 0 ? 'lead_days' : 'date'));
      setIntervalMinutes(existing.interval_minutes || 30);
      setEnableInApp(existing.enable_in_app !== false);
      setEnableDesktop(existing.enable_desktop !== false);
      setEnableSound(existing.enable_sound !== false);
      setNotifyOverdueRepeatedly(existing.notify_overdue_repeatedly !== false);
      setNotes(existing.notes || '');
    } else {
      // Fetch latest from backend
      fetchSettings();
    }
  }, [isOpen, reminder]);

  const fetchSettings = async () => {
    if (!reminder?.id || !accessToken) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/reminders/${reminder.id}/notification-settings/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = res.data;
      if (data) {
        setIsEnabled(data.is_enabled !== false);
        setNotifyStartDate(data.notify_start_date || reminder.reminder_date || '');
        setLeadDays(data.lead_days || 0);
        setStartMode(data.notify_start_date ? 'date' : (data.lead_days > 0 ? 'lead_days' : 'date'));
        setIntervalMinutes(data.interval_minutes || 30);
        setEnableInApp(data.enable_in_app !== false);
        setEnableDesktop(data.enable_desktop !== false);
        setEnableSound(data.enable_sound !== false);
        setNotifyOverdueRepeatedly(data.notify_overdue_repeatedly !== false);
        setNotes(data.notes || '');
      }
    } catch (err) {
      console.error('Failed to fetch reminder notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!reminder?.id || !accessToken) return;

    try {
      setSaving(true);
      setErrorMessage('');
      setTestSuccessMessage('');

      const payload = {
        is_enabled: isEnabled,
        notify_start_date: startMode === 'date' ? (notifyStartDate || null) : null,
        lead_days: startMode === 'lead_days' ? Number(leadDays) : 0,
        interval_minutes: Number(intervalMinutes),
        enable_in_app: enableInApp,
        enable_desktop: enableDesktop,
        enable_sound: enableSound,
        notify_overdue_repeatedly: notifyOverdueRepeatedly,
        notes: notes.trim(),
      };

      const res = await axios.patch(
        `${API_BASE_URL}/reminders/${reminder.id}/notification-settings/`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (onUpdated) {
        onUpdated({
          ...reminder,
          notification_setting: res.data,
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!reminder?.id || !accessToken) return;

    try {
      setTesting(true);
      setTestSuccessMessage('');
      setErrorMessage('');

      // Play local chime immediately for testing
      if (enableSound) {
        previewAudioChime();
      }

      // If desktop notification enabled, check or trigger local toast too
      if (enableDesktop && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`🔔 Test Alert: ${reminder.title}`, {
            body: `This is a test notification for your reminder. Settings are working successfully!`,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      const res = await axios.post(
        `${API_BASE_URL}/reminders/${reminder.id}/notification-settings/test/`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      setTestSuccessMessage(res.data?.message || 'Test alert dispatched successfully to all channels!');
    } catch (err) {
      console.error('Failed to trigger test notification:', err);
      setErrorMessage('Failed to dispatch test alert.');
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen || !reminder) return null;

  const targetDeadline = reminder.deadline || reminder.reminder_date;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-slate-50/80">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
              isEnabled 
                ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                : 'bg-slate-200 text-slate-500'
            }`}>
              {isEnabled ? <BellRing className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Notification Settings</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                  isEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                {reminder.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          
          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {testSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{testSuccessMessage}</span>
            </div>
          )}

          {/* 1. Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div>
              <span className="font-bold text-sm text-slate-900 block">Enable Reminder Alerts</span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Automatically push alerts, sound chimes, and popup notifications for this task.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {isEnabled && (
            <>
              {/* 2. When to Start Alerting */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>When Should Notifications Start?</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Target Due: <strong className="text-slate-800">{targetDeadline || 'No date set'}</strong>
                  </span>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setStartMode('date')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      startMode === 'date'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Exact Start Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartMode('lead_days')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      startMode === 'lead_days'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Days Before Deadline
                  </button>
                </div>

                {/* Mode A: Specific Date Input */}
                {startMode === 'date' ? (
                  <div className="space-y-1.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Start Alerting From Date:
                    </label>
                    <input
                      type="date"
                      value={notifyStartDate}
                      onChange={(e) => setNotifyStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                    />
                    <p className="text-[10px] text-slate-500">
                      Notifications will strictly begin once the calendar reaches this date.
                    </p>
                  </div>
                ) : (
                  /* Mode B: Lead Days Selector */
                  <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Lead Window (Before Deadline):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {LEAD_DAYS_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setLeadDays(preset.value)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            leadDays === preset.value
                              ? 'bg-indigo-50/90 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/15'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="font-bold block text-xs">{preset.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Alert Interval / Frequency */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Notification Interval & Frequency</span>
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    Repeats every {intervalMinutes < 60 ? `${intervalMinutes}m` : `${intervalMinutes / 60}h`}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {INTERVAL_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setIntervalMinutes(preset.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        intervalMinutes === preset.value
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-bold block text-xs">{preset.label}</span>
                      <span className={`text-[9px] block ${intervalMinutes === preset.value ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {preset.value >= 60 ? `${preset.value / 60} hr` : `${preset.value} min`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Delivery Channels & Audio Preview */}
              <div className="space-y-3 pt-2">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Delivery Channels</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Channel A: In-CRM Popup */}
                  <div
                    onClick={() => setEnableInApp(!enableInApp)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      enableInApp
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/15'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Monitor className="w-4 h-4 text-indigo-600" />
                        <span>In-CRM Popup</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableInApp}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      Floating card across all CRM screens.
                    </span>
                  </div>

                  {/* Channel B: Windows / OS Desktop Toast */}
                  <div
                    onClick={() => setEnableDesktop(!enableDesktop)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      enableDesktop
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/15'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <span>Desktop Toast</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDesktop}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      Native Windows / Android status alerts.
                    </span>
                  </div>

                  {/* Channel C: Audio Chime */}
                  <div
                    onClick={() => setEnableSound(!enableSound)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      enableSound
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/15'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                        <span>Sound Chime</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableSound}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 block">Harmonic tone</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewAudioChime();
                        }}
                        className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Click to preview chime sound"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Custom Note / Directive */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Custom Alert Directive (Optional)</span>
                  <span className="text-slate-400 text-[10px]">Appears directly in the alert banner</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call student before 5 PM, Check VFS slot, Verify documents..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              {/* 6. Overdue Policy */}
              <div className="flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-amber-900 text-[11px]">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={notifyOverdueRepeatedly}
                    onChange={(e) => setNotifyOverdueRepeatedly(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    Keep repeating alerts if the task becomes overdue until it is approved or completed.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Test Alert Button */}
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testing || !isEnabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Fire a test notification now across all selected channels"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Send Test Alert Now'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
