import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneOff, Clock, User, 
  MapPin, Globe, BookOpen, Calendar, Tag, Shield, CheckCircle2, 
  X, Minus, Maximize2, Minimize2, Copy, Check, MessageSquare, 
  History, ExternalLink, Loader2, Sparkles, AlertCircle, PlusCircle, Layers
} from 'lucide-react';
import { useLiveCall } from '../../context/LiveCallContext';
import { useApi } from '../../context/ApiContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'ENQUIRY', label: 'Enquiry', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { value: 'JOB_ENQUIRY', label: 'Job Enquiry', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
  { value: 'CNR', label: 'Could Not Reach', color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' },
  { value: 'REGISTERED', label: 'Registered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'text-gray-600 bg-gray-100' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-amber-700 bg-amber-100' },
  { value: 'HIGH', label: 'High', color: 'text-rose-700 bg-rose-100' },
];

export default function LiveCallModal() {
  const {
    calls,
    activeCall,
    activeCallId,
    setActiveCallId,
    isModalOpen,
    isMinimized,
    setIsMinimized,
    closeCall,
    updateCallFormData,
  } = useLiveCall();

  const { authFetch, apiBaseUrl } = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local state
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingLeadData, setExistingLeadData] = useState(null);
  const [pastRemarks, setPastRemarks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Live Timer Stopwatch
  useEffect(() => {
    if (!activeCall) return;

    const calculateDuration = () => {
      if (activeCall.status === 'ended') {
        return activeCall.duration || (activeCall.endedAt && activeCall.startedAt ? Math.round((activeCall.endedAt - activeCall.startedAt) / 1000) : 0);
      }
      const startRef = activeCall.connectedAt || activeCall.startedAt || Date.now();
      return Math.max(0, Math.floor((Date.now() - startRef) / 1000));
    };

    setTimerSeconds(calculateDuration());

    if (activeCall.status !== 'ended') {
      const interval = setInterval(() => {
        setTimerSeconds(calculateDuration());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.id, activeCall?.status, activeCall?.connectedAt, activeCall?.startedAt, activeCall?.endedAt, activeCall?.duration]);

  // Fetch full details & remarks history if it's an existing lead
  useEffect(() => {
    if (!activeCall || activeCall.isNewLead || !activeCall.leadId) {
      setExistingLeadData(null);
      setPastRemarks([]);
      return;
    }

    let isMounted = true;
    const fetchLeadDetails = async () => {
      setLoadingHistory(true);
      try {
        // 1. Fetch Lead Details
        const resLead = await authFetch(`${apiBaseUrl}/leads/${activeCall.leadId}/`);
        if (resLead.ok) {
          const data = await resLead.json();
          if (isMounted) {
            setExistingLeadData(data);
            // Pre-fill formData status if not already filled
            if (!activeCall.formData.status) {
              updateCallFormData(activeCall.id, { status: data.status, priority: data.priority });
            }
          }
        }

        // 2. Fetch Follow-up Remarks
        const resFollowups = await authFetch(`${apiBaseUrl}/followups/?lead=${activeCall.leadId}`);
        if (resFollowups.ok) {
          const data = await resFollowups.json();
          const list = data.results || data || [];
          if (isMounted) setPastRemarks(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('[LiveCallModal] Error fetching lead history:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchLeadDetails();
    return () => { isMounted = false; };
  }, [activeCall?.id, activeCall?.leadId, activeCall?.isNewLead, authFetch, apiBaseUrl]);

  if (!isModalOpen || !activeCall) return null;

  const formData = activeCall.formData || {};

  const handleFieldChange = (field, value) => {
    updateCallFormData(activeCall.id, { [field]: value });
  };

  const handleCopyPhone = () => {
    if (activeCall?.phone) {
      navigator.clipboard.writeText(activeCall.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  const formatPastDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Submit Handler
  const handleSave = async () => {
    if (activeCall.isNewLead && !formData.name?.trim()) {
      toast.error('Please enter a lead name');
      return;
    }

    setSaving(true);
    try {
      if (activeCall.isNewLead) {
        // 1. Create New Lead
        const payload = {
          name: formData.name.trim(),
          phone: activeCall.phone,
          status: formData.status || 'ENQUIRY',
          priority: formData.priority || 'MEDIUM',
          source: formData.source || 'VOXBAY CALL',
          program: formData.program || '',
          interested_country: formData.interested_country || '',
          interested_course: formData.interested_course || '',
          location: formData.location || '',
          remarks: formData.remarks || '',
          assigned_to: user?.id || null,
        };

        const res = await authFetch(`${apiBaseUrl}/leads/create/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || errData.message || JSON.stringify(errData) || 'Failed to create lead');
        }

        const createdLead = await res.json();
        const createdId = createdLead.id || createdLead.lead?.id;

        // Add follow-up if date or remarks present
        if (createdId && (formData.remarks || formData.follow_up_date)) {
          await authFetch(`${apiBaseUrl}/followups/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead: createdId,
              phone_number: activeCall.phone,
              name: formData.name,
              follow_up_date: formData.follow_up_date || new Date().toISOString().split('T')[0],
              follow_up_time: formData.follow_up_time || null,
              followup_type: 'call',
              status: formData.follow_up_date ? 'pending' : 'contacted',
              priority: (formData.priority || 'medium').toLowerCase(),
              notes: formData.remarks || 'Call logged via Live Call Dossier',
            }),
          });
        }

        toast.success(`🎉 Lead "${formData.name}" created successfully!`);
      } else {
        // 2. Existing Lead: Update Lead & Record Follow-up Remark
        const leadId = activeCall.leadId;

        // Update Lead status/country/course if changed
        await authFetch(`${apiBaseUrl}/leads/${leadId}/update/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formData.status,
            priority: formData.priority,
            interested_country: formData.interested_country,
            interested_course: formData.interested_course,
            location: formData.location,
          }),
        });

        // Add Follow-up Remark
        if (formData.remarks || formData.follow_up_date) {
          await authFetch(`${apiBaseUrl}/followups/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead: leadId,
              phone_number: activeCall.phone,
              name: existingLeadData?.name || activeCall.leadName,
              follow_up_date: formData.follow_up_date || new Date().toISOString().split('T')[0],
              follow_up_time: formData.follow_up_time || null,
              followup_type: 'call',
              status: formData.follow_up_date ? 'pending' : 'contacted',
              priority: (formData.priority || 'medium').toLowerCase(),
              notes: formData.remarks || 'Call remarks logged via Live Call Dossier',
            }),
          });
        }

        toast.success(`💾 Remarks & Lead status updated for ${existingLeadData?.name || activeCall.leadName}!`);
      }

      // Close this call tab
      closeCall(activeCall.id);
    } catch (err) {
      console.error('[LiveCallModal] Save error:', err);
      toast.error(err.message || 'Error saving lead details');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: MINIMIZED FLOATING DOCK WIDGET
  // ─────────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 bg-slate-900/95 border border-purple-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-bounce-short">
        <div className="relative flex items-center justify-center">
          {activeCall.status === 'connected' ? (
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          ) : activeCall.status === 'ringing' ? (
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
          ) : (
            <span className="inline-flex rounded-full h-3.5 w-3.5 bg-slate-400"></span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300">
              {activeCall.isNewLead ? '✨ New Call' : (existingLeadData?.name || activeCall.leadName)}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
              {formatTimer(timerSeconds)}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{activeCall.phone}</span>
        </div>

        {calls.length > 1 && (
          <span className="bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
            +{calls.length - 1}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700/60 pl-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Expand Call Dossier"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={() => closeCall(activeCall.id)}
            className="p-1.5 hover:bg-rose-950/60 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
            title="Dismiss Call"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: EXPANDED FULL LIVE CALL DOSSIER MODAL
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-all">
        
        {/* ── Multi-Call Tabs (if more than 1 active call) ── */}
        {calls.length > 1 && (
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mr-2 shrink-0">
              <Layers size={14} className="text-purple-400" /> Active Calls:
            </div>
            {calls.map((c, index) => {
              const isActive = c.id === activeCall.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCallId(c.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.status === 'connected' ? 'bg-emerald-400 animate-pulse' : c.status === 'ringing' ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  <span>{c.isNewLead ? `New (${c.phone?.slice(-4) || index + 1})` : (c.leadName || c.phone)}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); closeCall(c.id); }}
                    className="hover:text-rose-200 text-slate-400 ml-1"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Header: Glowing Gradient Live Call Bar ── */}
        <div className="bg-gradient-to-r from-slate-950 via-purple-950/80 to-slate-950 text-white p-4 sm:p-5 border-b border-purple-900/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl flex items-center justify-center ${
              activeCall.callType === 'outgoing'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/20'
                : 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20'
            }`}>
              {activeCall.callType === 'outgoing' ? <PhoneOutgoing size={22} /> : <PhoneIncoming size={22} />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {activeCall.isNewLead ? '✨ New Incoming Lead' : (existingLeadData?.name || activeCall.leadName)}
                </span>
                
                {/* Status Indicator */}
                {activeCall.status === 'connected' ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Connected
                  </span>
                ) : activeCall.status === 'ringing' ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Ringing Agent...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800/80 border border-slate-700 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 size={12} className="text-slate-400" />
                    Call Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-300 font-mono">
                <span className="flex items-center gap-1 text-white font-bold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  <Phone size={11} className="text-purple-400" /> {activeCall.phone}
                </span>
                <button
                  onClick={handleCopyPhone}
                  className="hover:text-purple-300 transition-colors flex items-center gap-1"
                  title="Copy Phone"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {activeCall.assignedHandler && (
                  <span className="text-slate-400 font-sans">
                    • Handler: <strong className="text-purple-300">{activeCall.assignedHandler}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header: Stopwatch Timer & Window Controls */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-purple-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
              <Clock size={15} className="text-emerald-400 animate-spin-slow" />
              <span className="font-mono text-base font-black text-emerald-400">
                {formatTimer(timerSeconds)}
              </span>
            </div>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Minimize to Floating Dock"
            >
              <Minimize2 size={17} />
            </button>

            <button
              onClick={() => closeCall(activeCall.id)}
              className="p-2 hover:bg-rose-950/70 rounded-xl text-rose-400 hover:text-rose-300 transition-colors"
              title="Dismiss Popup"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* ======================================================== */}
          {/* CASE A: FRESH / NEW LEAD CAPTURE FORM                   */}
          {/* ======================================================== */}
          {activeCall.isNewLead ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form: Lead Information */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                    <User size={16} className="text-purple-600" /> New Lead Information
                  </h4>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full text-sm font-medium px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900 dark:text-white outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  {/* Status Selection Pills */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Lead Stage / Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map(st => (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => handleFieldChange('status', st.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            (formData.status || 'ENQUIRY') === st.value
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : st.color
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority & Location Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Priority
                      </label>
                      <div className="flex gap-1.5">
                        {PRIORITY_OPTIONS.map(pr => (
                          <button
                            key={pr.value}
                            type="button"
                            onClick={() => handleFieldChange('priority', pr.value)}
                            className={`flex-1 text-xs font-bold py-2 rounded-lg border text-center transition-all ${
                              (formData.priority || 'MEDIUM') === pr.value
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
                            }`}
                          >
                            {pr.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Location / City
                      </label>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        placeholder="e.g. Kochi, Calicut, Dubai"
                        className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-purple-600 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Target Country & Course */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Interested Country
                      </label>
                      <input
                        type="text"
                        value={formData.interested_country || ''}
                        onChange={(e) => handleFieldChange('interested_country', e.target.value)}
                        placeholder="e.g. UK, Germany, Canada"
                        className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-purple-600 outline-none text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Interested Course / Program
                      </label>
                      <input
                        type="text"
                        value={formData.interested_course || ''}
                        onChange={(e) => handleFieldChange('interested_course', e.target.value)}
                        placeholder="e.g. Film Direction, Cinematography"
                        className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-purple-600 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Form: Live Remarks & Actions */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex-1 flex flex-col space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                    <MessageSquare size={16} className="text-purple-600" /> Live Call Remarks & Notes
                  </h4>

                  <div className="flex-1 flex flex-col">
                    <textarea
                      value={formData.remarks || ''}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      placeholder="Type conversation notes, candidate budget, background, immediate doubts, next steps..."
                      rows={6}
                      className="w-full flex-1 text-sm p-3.5 bg-purple-50/40 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/30 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900 dark:text-white outline-none resize-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Schedule Follow Up Date & Time */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar size={13} className="text-purple-500" /> Schedule Next Follow-up (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={formData.follow_up_date || ''}
                        onChange={(e) => handleFieldChange('follow_up_date', e.target.value)}
                        className="text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                      />
                      <input
                        type="time"
                        value={formData.follow_up_time || ''}
                        onChange={(e) => handleFieldChange('follow_up_time', e.target.value)}
                        className="text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {saving ? 'Creating Lead...' : '✨ Create Lead & Save Remarks'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            
            /* ======================================================== */
            /* CASE B: EXISTING LEAD DOSSIER & REMARKS TIMELINE         */
            /* ======================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Lead Dossier & Past Remarks History */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Lead Summary Header Card */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {existingLeadData?.name || activeCall.leadName}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{activeCall.phone}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {existingLeadData?.status || activeCall.leadDetails?.status || 'ENQUIRY'}
                      </span>
                      {existingLeadData?.id && (
                        <button
                          onClick={() => window.open(`/leads/view/${existingLeadData.id}`, '_blank')}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Open Full Profile"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4-Box Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff</p>
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate mt-0.5">
                        {existingLeadData?.assigned_to_name || activeCall.assignedHandler || 'Unassigned'}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Country</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {existingLeadData?.interested_country || 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Course/Program</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {existingLeadData?.program || existingLeadData?.interested_course || 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Source</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {existingLeadData?.source || 'VOXBAY CALL'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Past Remarks Timeline Card */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col max-h-[360px]">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2.5 mb-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <History size={15} className="text-purple-600" /> Previous Remarks & Conversation History ({pastRemarks.length})
                    </h4>
                    {loadingHistory && <Loader2 size={13} className="animate-spin text-purple-600" />}
                  </div>

                  <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                    {pastRemarks.length > 0 ? (
                      pastRemarks.map((rem, idx) => (
                        <div key={rem.id || idx} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-purple-600 dark:text-purple-400 font-bold">
                              👤 {rem.assigned_to_name || rem.assigned_to?.username || 'Counselor'}
                            </span>
                            <span className="font-mono">{formatPastDate(rem.follow_up_date || rem.created_at)}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {rem.notes || rem.remarks || 'No notes provided'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1">
                        <MessageSquare size={24} className="text-slate-300 dark:text-slate-700" />
                        No previous remarks recorded for this lead yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Live Call Remarks & Quick Updater */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex-1 flex flex-col space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                    <PlusCircle size={16} className="text-emerald-600" /> Add Live Remarks & Update Status
                  </h4>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Update Lead Stage / Status
                    </label>
                    <select
                      value={formData.status || existingLeadData?.status || 'ENQUIRY'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
                    >
                      {STATUS_OPTIONS.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks Input */}
                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Call Remarks / Notes <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.remarks || ''}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      placeholder="Type conversation notes, candidate feedback, interest level, requirements discussed..."
                      rows={5}
                      className="w-full flex-1 text-sm p-3.5 bg-purple-50/40 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/30 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900 dark:text-white outline-none resize-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Schedule Next Follow-up */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar size={13} className="text-purple-500" /> Next Follow-up Reminder
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={formData.follow_up_date || ''}
                        onChange={(e) => handleFieldChange('follow_up_date', e.target.value)}
                        className="text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                      />
                      <input
                        type="time"
                        value={formData.follow_up_time || ''}
                        onChange={(e) => handleFieldChange('follow_up_time', e.target.value)}
                        className="text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {saving ? 'Saving...' : '💾 Save Remarks & Update Status'}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
