import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MailEditor from './MailEditor';
import {
  X,
  Mail,
  Send,
  Save,
  RefreshCw,
  PenSquare,
  FileText,
  PenLine,
  Paperclip,
  Trash2,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles,
  Reply,
  Settings2,
  Download,
  CheckCircle2,
  Clock,
  Inbox,
  ArrowUpRight,
  ChevronDown,
  Plus,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EmailChipInput = ({ label, values = [], onChange, placeholder }) => {
  const [inputVal, setInputVal] = useState('');

  const addEmail = (raw) => {
    const cleaned = (raw || '').trim().replace(/,+$/, '');
    if (!cleaned) return;
    if (!cleaned.includes('@')) {
      toast.error(`"${cleaned}" is not a valid email address`);
      return;
    }
    if (!values.some((v) => v.toLowerCase() === cleaned.toLowerCase())) {
      onChange([...values, cleaned]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (inputVal.trim()) {
        e.preventDefault();
        addEmail(inputVal);
      }
    } else if (e.key === 'Backspace' && !inputVal && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 focus-within:border-indigo-400 transition-colors">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 w-12 pt-1.5 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {values.map((email, idx) => (
          <span
            key={`${email}-${idx}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/80 text-xs font-semibold"
          >
            {email}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== idx))}
              className="text-indigo-400 hover:text-indigo-700"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputVal.trim()) addEmail(inputVal);
          }}
          placeholder={values.length === 0 ? placeholder : 'Add another email...'}
          className="flex-1 min-w-[180px] text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none py-1 bg-transparent"
        />
      </div>
    </div>
  );
};

export default function ContextualMailDrawer({ open, onClose, config }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Loaded data
  const [accounts, setAccounts] = useState([]);
  const [senderIdentities, setSenderIdentities] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [variables, setVariables] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Active mode: 'compose' | 'read'
  const [viewMode, setViewMode] = useState('compose');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTargetId, setActiveTargetId] = useState('advisor');
  const [activeRightPanel, setActiveRightPanel] = useState(null); // 'templates' | 'signatures' | 'variables' | null

  // Draft state
  const [draftId, setDraftId] = useState(null);
  const [selectedIdentityKey, setSelectedIdentityKey] = useState('');
  const [toList, setToList] = useState([]);
  const [ccList, setCcList] = useState([]);
  const [bccList, setBccList] = useState([]);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [gmailThreadId, setGmailThreadId] = useState('');
  const [newThread, setNewThread] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Build flat list of sender identities (primary emails + webmail aliases) across accessible accounts
  const buildIdentities = useCallback((accList) => {
    const list = [];
    for (const acc of accList) {
      if (Array.isArray(acc.sender_identities) && acc.sender_identities.length > 0) {
        for (const idItem of acc.sender_identities) {
          list.push({
            ...idItem,
            account_status: acc.status,
          });
        }
      } else {
        const primaryEmail = acc.send_as_email || acc.email;
        list.push({
          key: `${acc.id}:${primaryEmail}`,
          account_id: acc.id,
          email: primaryEmail,
          display_name: acc.display_name || '',
          label: acc.display_name ? `${acc.display_name} <${primaryEmail}>` : primaryEmail,
          is_alias: Boolean(acc.send_as_email),
          module_scope: acc.module_scope,
          company: acc.company,
          account_status: acc.status,
        });
      }
    }
    return list;
  }, []);

  // Fetch accounts, templates, signatures, variables
  const fetchResources = useCallback(async () => {
    if (!accessToken) return;
    try {
      const pageMap = {
        TASKS: 'tasks',
        PENALTIES: 'penalties',
        REPORTS: 'reports',
        STAFF_ANALYSIS: 'staff_analysis',
        PROCESSING: 'processing_students',
        FEES: 'receipts',
      };
      const pageParam = config?.context_module ? pageMap[config.context_module] || '' : '';
      const [accRes, tplRes, sigRes, varRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/mail/accounts/${pageParam ? `?page=${pageParam}` : ''}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/mail/templates/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/mail/signatures/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/mail/template-variables/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const accData = accRes.data.results || accRes.data || [];
      setAccounts(accData);
      const idents = buildIdentities(accData);
      setSenderIdentities(idents);
      if (idents.length > 0) {
        setSelectedIdentityKey((prev) =>
          prev && idents.some((i) => i.key === prev) ? prev : idents[0].key
        );
      }

      const tplData = tplRes.data.results || tplRes.data || [];
      setTemplates(tplData);

      const sigData = sigRes.data.results || sigRes.data || [];
      setSignatures(sigData);
      const defaultSig = sigData.find((s) => s.is_default) || sigData[0];
      if (defaultSig && !config?.signature_html) {
        setSignatureHtml((prev) => prev || defaultSig.body_html || '');
      }

      setVariables(varRes.data || []);
    } catch (err) {
      console.error('Failed to load mail resources', err);
    }
  }, [accessToken, config?.context_module, config?.signature_html, buildIdentities]);

  // Fetch conversation history threads for the target recipient / entity
  const fetchThreadHistory = useCallback(async () => {
    if (!accessToken || !open) return;
    setLoadingThreads(true);
    try {
      const params = new URLSearchParams();
      if (config?.student) {
        params.set('student_id', config.student);
      } else if (config?.gmail_thread_id) {
        params.set('gmail_thread_id', config.gmail_thread_id);
      } else if (config?.lead && activeTargetId === 'lead') {
        params.set('lead_id', config.lead);
      } else if (config?.recipient_staff && activeTargetId !== 'lead') {
        params.set('recipient_staff_id', config.recipient_staff);
      } else if (toList.length > 0) {
        params.set('target_email', toList[0]);
      }

      const queryStr = params.toString();
      const res = await axios.get(
        `${API_BASE_URL}/mail/messages/${queryStr ? `?${queryStr}` : ''}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgList = res.data.results || res.data || [];
      setThreads(msgList);
    } catch (err) {
      console.error('Failed to load thread history', err);
    } finally {
      setLoadingThreads(false);
    }
  }, [accessToken, open, config, activeTargetId, toList]);

  // Initialize form whenever drawer opens with a new config
  useEffect(() => {
    if (!open || !config) return;
    setDraftId(config.draft_id || null);
    const initialTo = Array.isArray(config.to)
      ? config.to.filter(Boolean)
      : config.to
      ? [config.to]
      : [];
    const initialCc = Array.isArray(config.cc)
      ? config.cc.filter(Boolean)
      : config.cc
      ? [config.cc]
      : [];
    const initialBcc = Array.isArray(config.bcc)
      ? config.bcc.filter(Boolean)
      : config.bcc
      ? [config.bcc]
      : [];

    setToList(initialTo);
    setCcList(initialCc);
    setBccList(initialBcc);
    setShowCcBcc(initialCc.length > 0 || initialBcc.length > 0);
    setSubject(config.subject || '');
    setBodyHtml(config.body_html || '');
    setSignatureHtml(config.signature_html || '');
    setGmailThreadId(config.gmail_thread_id || '');
    setNewThread(Boolean(config.new_thread));
    setAttachments(config.attachments || []);
    setActiveTargetId(config.activeTargetId || 'advisor');

    if (config.initialMode === 'read' && config.initialMessage) {
      setSelectedMessage(config.initialMessage);
      setViewMode('read');
    } else {
      setSelectedMessage(null);
      setViewMode('compose');
    }

    fetchResources();
  }, [open, config?._openedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      fetchThreadHistory();
    }
  }, [open, fetchThreadHistory]);

  if (!open) return null;

  const currentIdentity =
    senderIdentities.find((i) => i.key === selectedIdentityKey) || senderIdentities[0] || null;

  const handleSwitchTarget = (target) => {
    setActiveTargetId(target.id);
    setToList(Array.isArray(target.to) ? target.to.filter(Boolean) : []);
    setCcList(Array.isArray(target.cc) ? target.cc.filter(Boolean) : []);
    if (target.cc?.length > 0) setShowCcBcc(true);
    setSubject(target.subject || '');
    setBodyHtml(target.body_html || '');
    setViewMode('compose');
  };

  const buildPayload = () => ({
    id: draftId || undefined,
    student: config?.student || null,
    recipient_staff: config?.recipient_staff || null,
    lead: config?.lead || null,
    context_module: config?.context_module || currentIdentity?.module_scope || 'EXECUTIVE',
    context_id: config?.context_id ? String(config.context_id) : '',
    context_label: config?.context_label || '',
    custom_variables: config?.custom_variables || {},
    account: currentIdentity?.account_id || (accounts[0]?.id ?? null),
    sender_alias_email: currentIdentity?.email || '',
    sender_display_name: currentIdentity?.display_name || '',
    to: toList,
    cc: ccList,
    bcc: bccList,
    subject,
    body_html: bodyHtml,
    signature_html: signatureHtml,
    gmail_thread_id: gmailThreadId || undefined,
    new_thread: newThread,
  });

  const handleSaveDraft = async () => {
    if (!currentIdentity && accounts.length === 0) {
      toast.error('Please connect a mailbox in Mail Settings first.');
      return null;
    }
    setIsSavingDraft(true);
    try {
      const payload = buildPayload();
      let res;
      if (draftId) {
        res = await axios.put(`${API_BASE_URL}/mail/messages/${draftId}/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        res = await axios.post(`${API_BASE_URL}/mail/messages/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setDraftId(res.data.id);
      }
      toast.success('Draft saved & synced with Gmail');
      fetchThreadHistory();
      return res.data.id || draftId;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save draft');
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendNow = async () => {
    if (!currentIdentity && accounts.length === 0) {
      toast.error('No connected mailbox found. Configure a mailbox in Mail Settings.');
      return;
    }
    if (toList.length === 0) {
      toast.error('Please add at least one recipient email address in To.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject.');
      return;
    }

    setIsSending(true);
    try {
      const payload = { ...buildPayload(), force: true };
      const res = await axios.post(`${API_BASE_URL}/mail/messages/send_now/`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success(`Email sent from ${currentIdentity?.email || 'mailbox'}!`);
      setSelectedMessage(res.data);
      setViewMode('read');
      setDraftId(null);
      fetchThreadHistory();
      if (typeof config?.onSent === 'function') {
        config.onSent(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
      if (err.response?.data?.draft_id) {
        setDraftId(err.response.data.draft_id);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      let currentDraftId = draftId;
      if (!currentDraftId) {
        const payload = buildPayload();
        const res = await axios.post(`${API_BASE_URL}/mail/messages/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        currentDraftId = res.data.id;
        setDraftId(currentDraftId);
      }
      const formData = new FormData();
      formData.append('message', currentDraftId);
      formData.append('file', file);
      const attRes = await axios.post(`${API_BASE_URL}/mail/attachments/`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setAttachments((prev) => [...prev, attRes.data]);
      toast.success(`Attached "${file.name}"`);
    } catch (err) {
      toast.error('Failed to upload attachment');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = async (attId) => {
    try {
      await axios.delete(`${API_BASE_URL}/mail/attachments/${attId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch {
      toast.error('Failed to remove attachment');
    }
  };

  const handleSyncThreads = async () => {
    setIsSyncing(true);
    try {
      const targetEmail = toList[0] || selectedMessage?.from_email || '';
      await axios.post(
        `${API_BASE_URL}/mail/messages/sync/`,
        {
          student_id: config?.student || undefined,
          account_id: currentIdentity?.account_id || undefined,
          target_email: targetEmail || undefined,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success('Synced conversation threads from Gmail');
      await fetchThreadHistory();
    } catch {
      toast.error('Could not sync threads from Gmail');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReplyToMessage = (msg) => {
    const cleanSubj = (msg.subject || '').replace(/^\s*(re:\s*)+/i, '');
    setSubject(`Re: ${cleanSubj}`);
    setGmailThreadId(msg.gmail_thread_id || '');
    setNewThread(false);
    if (msg.direction === 'in' && msg.from_email) {
      const match = msg.from_email.match(/<([^>]+)>/) || [null, msg.from_email];
      const replyAddr = (match[1] || msg.from_email).trim();
      if (replyAddr.includes('@')) setToList([replyAddr]);
    }
    setViewMode('compose');
  };

  const insertVariable = (varKey) => {
    const tag = `{{${varKey}}}`;
    if (editorRef.current?.insertContent) {
      editorRef.current.insertContent(tag);
    } else {
      setBodyHtml((prev) => `${prev} ${tag}`);
    }
    toast.success(`Inserted ${tag}`);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-screen h-screen' : 'w-full max-w-[1160px] h-screen rounded-l-3xl border-l border-slate-200'
        }`}
      >
        {/* Top Executive Studio Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <Mail size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold tracking-tight truncate">
                  Executive Mail & Thread Studio
                </h2>
                {config?.context_module && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                    {config.context_module.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                {config?.context_label || 'Direct multi-alias email & Gmail thread conversation'}
              </p>
            </div>
          </div>

          {/* Alternate Target Switcher (e.g., Mail Advisor vs Mail Lead in Staff Analysis) */}
          {Array.isArray(config?.alternateTargets) && config.alternateTargets.length > 1 && (
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15">
              {config.alternateTargets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitchTarget(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTargetId === t.id
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/mail-settings');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-white/10 transition-all"
              title="Open Standalone Mail Accounts & Settings"
            >
              <Settings2 size={14} />
              <span className="hidden sm:inline">Mail Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 transition-all"
              title={isFullscreen ? 'Restore Drawer Size' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-500/80 flex items-center justify-center text-slate-200 hover:text-white transition-all"
              title="Close Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Split-Pane Workspace */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-50">
          {/* LEFT PANE: Thread Timeline (Preserving & Elevating the Thread Ideology) */}
          <div className="w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Conversation Thread
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                  {threads.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSyncThreads}
                  disabled={isSyncing}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  title="Sync Gmail Threads"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-600' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessage(null);
                    setViewMode('compose');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                >
                  <PenSquare size={12} />
                  Compose
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loadingThreads ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw size={22} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading conversation threads...</span>
                </div>
              ) : threads.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Inbox size={22} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No prior emails in this thread</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Send your first message on the right or click Sync to check Gmail.
                  </p>
                </div>
              ) : (
                threads.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id && viewMode === 'read';
                  const isIncoming = (msg.direction || '').toLowerCase() === 'in';
                  const isDraftMsg = msg.state === 'draft';
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessage(msg);
                        if (isDraftMsg) {
                          setDraftId(msg.id);
                          setToList(msg.to || []);
                          setCcList(msg.cc || []);
                          setBccList(msg.bcc || []);
                          setSubject(msg.subject || '');
                          setBodyHtml(msg.body_html || '');
                          setSignatureHtml(msg.signature_html || '');
                          setViewMode('compose');
                        } else {
                          setViewMode('read');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20'
                          : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            isDraftMsg
                              ? 'bg-amber-100 text-amber-800'
                              : isIncoming
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDraftMsg ? 'Draft' : isIncoming ? 'Inbox Reply' : 'Sent'}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {msg.effective_time
                            ? new Date(msg.effective_time).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {msg.subject || '(No subject)'}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {isIncoming ? `From: ${msg.from_email}` : `To: ${(msg.to || []).join(', ')}`}
                      </p>
                      {msg.snippet && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {msg.snippet}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER / RIGHT PANE: Composer OR Thread Reader */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {viewMode === 'read' && selectedMessage ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 max-w-4xl mx-auto">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            selectedMessage.direction === 'in'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {selectedMessage.direction === 'in' ? 'Received in Inbox' : 'Sent Outgoing'}
                        </span>
                        {selectedMessage.context_label && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {selectedMessage.context_label}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        {selectedMessage.subject || '(No Subject)'}
                      </h3>
                      <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                        <p>
                          <strong className="text-slate-800">From:</strong>{' '}
                          {selectedMessage.from_email || selectedMessage.account_email}
                        </p>
                        <p>
                          <strong className="text-slate-800">To:</strong>{' '}
                          {(selectedMessage.to || []).join(', ')}
                        </p>
                        {selectedMessage.cc?.length > 0 && (
                          <p>
                            <strong className="text-slate-800">Cc:</strong>{' '}
                            {selectedMessage.cc.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-slate-400">
                        {selectedMessage.effective_time
                          ? new Date(selectedMessage.effective_time).toLocaleString()
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReplyToMessage(selectedMessage)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Reply size={14} />
                        Reply in Thread
                      </button>
                    </div>
                  </div>

                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.body_html || '' }}
                  />

                  {selectedMessage.attachments?.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <Paperclip size={14} /> Attachments ({selectedMessage.attachments.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMessage.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={`${API_BASE_URL}/mail/attachments/${att.id}/download/?token=${accessToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs font-semibold text-slate-700 transition-all"
                          >
                            <span>{att.filename || att.document_name || 'Attachment'}</span>
                            <Download size={13} className="text-indigo-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* COMPOSE VIEW */
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto p-5">
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex-1 flex flex-col">
                    {/* FROM: Multi-Mailbox & Webmail Alias Selector */}
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">
                        From
                      </span>
                      {senderIdentities.length > 0 ? (
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <select
                            value={selectedIdentityKey}
                            onChange={(e) => setSelectedIdentityKey(e.target.value)}
                            className="flex-1 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            {senderIdentities.map((idObj) => (
                              <option key={idObj.key} value={idObj.key}>
                                {idObj.label} [{idObj.is_alias ? 'Webmail Alias' : 'Primary Gmail'} • {idObj.company}]
                              </option>
                            ))}
                          </select>
                          {currentIdentity?.is_alias && (
                            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold shrink-0">
                              <ShieldCheck size={13} className="text-amber-600" />
                              Webmail Alias
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                          <span>No connected mailbox assigned to this role/page yet.</span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate('/mail-settings');
                            }}
                            className="font-bold underline hover:text-amber-950 ml-2"
                          >
                            Connect Mailbox →
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowCcBcc((prev) => !prev)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                      >
                        {showCcBcc ? 'Hide Cc/Bcc' : '+ Cc / Bcc'}
                      </button>
                    </div>

                    {/* TO / CC / BCC Chip Inputs */}
                    <EmailChipInput
                      label="To"
                      values={toList}
                      onChange={setToList}
                      placeholder={
                        config?.recipient_staff_name
                          ? `Enter email for ${config.recipient_staff_name} (Press Enter to add)`
                          : 'Recipient email address (Press Enter to add)'
                      }
                    />
                    {showCcBcc && (
                      <>
                        <EmailChipInput
                          label="Cc"
                          values={ccList}
                          onChange={setCcList}
                          placeholder="Cc email addresses..."
                        />
                        <EmailChipInput
                          label="Bcc"
                          values={bccList}
                          onChange={setBccList}
                          placeholder="Bcc email addresses..."
                        />
                      </>
                    )}

                    {/* SUBJECT */}
                    <div className="flex items-center gap-2 py-2 border-b border-slate-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">
                        Subj
                      </span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject..."
                        className="flex-1 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent py-1"
                      />
                    </div>

                    {/* Quick Toolbar: Templates, Signatures, Variables, Context Card */}
                    <div className="flex items-center justify-between flex-wrap gap-2 py-2.5 border-b border-slate-100">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRightPanel((p) => (p === 'templates' ? null : 'templates'))
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            activeRightPanel === 'templates'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                          }`}
                        >
                          <FileText size={13} />
                          Templates ({templates.length})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRightPanel((p) => (p === 'signatures' ? null : 'signatures'))
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            activeRightPanel === 'signatures'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                          }`}
                        >
                          <PenLine size={13} />
                          Signatures ({signatures.length})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRightPanel((p) => (p === 'variables' ? null : 'variables'))
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            activeRightPanel === 'variables'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                          }`}
                        >
                          <Sparkles size={13} />
                          Variables
                        </button>
                        {config?.contextCardHtml && (
                          <button
                            type="button"
                            onClick={() => {
                              setBodyHtml((prev) => `${prev}${config.contextCardHtml}`);
                              toast.success('Context summary card embedded');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all"
                          >
                            <Plus size={13} />
                            Re-Insert Context Card
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 transition-all"
                        >
                          <Paperclip size={13} />
                          {uploadingFile ? 'Uploading...' : 'Attach File'}
                        </button>
                      </div>
                    </div>

                    {/* RICH HTML EDITOR */}
                    <div className="flex-1 mt-3 min-h-[250px]">
                      <MailEditor
                        editorRef={editorRef}
                        content={bodyHtml}
                        onChange={setBodyHtml}
                        placeholder="Write your message here..."
                      />
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            <Paperclip size={12} className="text-indigo-500" />
                            <span className="truncate max-w-[180px]">{att.filename}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Signature Preview */}
                    {signatureHtml && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Active Signature
                          </span>
                          <button
                            type="button"
                            onClick={() => setSignatureHtml('')}
                            className="text-[11px] text-rose-500 hover:underline"
                          >
                            Remove Signature
                          </button>
                        </div>
                        <div
                          className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-dashed border-slate-200 max-h-28 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: signatureHtml }}
                        />
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newThread}
                          onChange={(e) => setNewThread(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Start as a brand new Gmail thread
                      </label>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={isSavingDraft || isSending}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Save size={14} />
                          {isSavingDraft ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendNow}
                          disabled={isSending}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                          <Send size={14} />
                          {isSending ? 'Sending via Gmail...' : 'Send Email Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Side Picker for Templates, Signatures, or Variables */}
                {activeRightPanel && (
                  <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto p-4 shrink-0 animate-in slide-in-from-right-5 duration-150">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        {activeRightPanel === 'templates'
                          ? 'Insert Template'
                          : activeRightPanel === 'signatures'
                          ? 'Choose Signature'
                          : 'Insert Variable'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveRightPanel(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {activeRightPanel === 'templates' && (
                      <div className="space-y-2.5">
                        {templates.map((tpl) => (
                          <div
                            key={tpl.id}
                            onClick={() => {
                              if (tpl.subject) setSubject(tpl.subject);
                              setBodyHtml(tpl.body_html || '');
                              toast.success(`Applied template "${tpl.name}"`);
                            }}
                            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {tpl.name}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                {tpl.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-1">
                              {tpl.subject}
                            </p>
                          </div>
                        ))}
                        {templates.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-6">
                            No templates found for this role scope.
                          </p>
                        )}
                      </div>
                    )}

                    {activeRightPanel === 'signatures' && (
                      <div className="space-y-2.5">
                        {signatures.map((sig) => (
                          <div
                            key={sig.id}
                            onClick={() => {
                              setSignatureHtml(sig.body_html || '');
                              toast.success(`Selected signature "${sig.name}"`);
                            }}
                            className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-all"
                          >
                            <p className="text-xs font-bold text-slate-800">{sig.name}</p>
                            <div
                              className="text-[11px] text-slate-500 mt-1.5 max-h-16 overflow-hidden"
                              dangerouslySetInnerHTML={{ __html: sig.body_html }}
                            />
                          </div>
                        ))}
                        {signatures.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-6">
                            No signatures configured yet.
                          </p>
                        )}
                      </div>
                    )}

                    {activeRightPanel === 'variables' && (
                      <div className="space-y-2">
                        {variables.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => insertVariable(v.id)}
                            className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-[11px] font-bold text-indigo-700">
                                {`{{${v.id}}}`}
                              </code>
                              {v.group && (
                                <span className="text-[9px] uppercase font-bold text-slate-400">
                                  {v.group}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{v.label}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
