import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Search, MoreVertical, ArrowLeft, Users,
  MessageSquare, X, Check, CheckCheck, Loader2,
  RefreshCw, UserPlus, Info, Crown, FileText, Image, Film,
  Music, Archive, File, Download, XCircle, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../Components/layouts/Navbar';
import { useChatChannel } from '../hooks/useChatChannel';
import { useUserChannel } from '../hooks/useUserChannel';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function getConversationName(conv, currentUser) {
  if (conv.type === 'GROUP') return conv.name || 'Group';
  const other = conv.participants?.find((p) => p.id !== currentUser?.id);
  return other?.username || 'Unknown';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return Image;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return Film;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return Music;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return Archive;
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return FileText;
  return File;
}

function isImageFile(filename = '', url = '') {
  const source = filename || url || '';
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(source);
}

// ─── Color palette ───────────────────────────────────────────────────────────

const COLORS = [
  ['bg-indigo-100', 'text-indigo-700'],
  ['bg-violet-100', 'text-violet-700'],
  ['bg-sky-100', 'text-sky-700'],
  ['bg-emerald-100', 'text-emerald-700'],
  ['bg-amber-100', 'text-amber-700'],
  ['bg-pink-100', 'text-pink-700'],
];

function getColorClass(name = '') {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

// ─── Small components ────────────────────────────────────────────────────────

const Avatar = ({ name = '', size = 'md', isGroup = false }) => {
  const sizeClasses = { sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const iconSize = { sm: 13, md: 16, lg: 19 }[size];
  const [bg, fg] = getColorClass(name);
  return (
    <div className={`${sizeClasses[size]} ${bg} ${fg} ${isGroup ? 'rounded-xl' : 'rounded-full'} flex items-center justify-center font-bold flex-shrink-0`}>
      {isGroup ? <Users size={iconSize} /> : getInitials(name)}
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-slate-400">
    <Icon size={36} strokeWidth={1.2} />
    <div className="text-center">
      <p className="font-semibold text-slate-500 text-sm">{title}</p>
      <p className="text-xs mt-1">{desc}</p>
    </div>
  </div>
);

// ─── File preview (in message bubble) ────────────────────────────────────────

const FilePreview = ({ fileUrl, filename }) => {
  if (!fileUrl) return null;

  // Derive display name
  const displayName = filename || fileUrl.split('/').pop()?.split('?')[0] || 'File';

  if (isImageFile(displayName, fileUrl)) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={fileUrl}
          alt={displayName}
          className="max-w-[220px] max-h-[220px] rounded-xl object-cover mt-1 border border-white/20 hover:opacity-90 transition"
          onError={e => { e.target.style.display = 'none'; }}
        />
      </a>
    );
  }

  if (/\.(mp4|webm|mov|mkv)$/i.test(displayName)) {
    return (
      <div className="mt-1 max-w-[220px]">
        <video controls className="w-full rounded-xl border border-white/20" preload="metadata">
          <source src={fileUrl} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (/\.(mp3|wav|ogg|aac)$/i.test(displayName)) {
    return (
      <div className="mt-1 w-[260px]">
        <audio controls className="w-full" preload="metadata">
          <source src={fileUrl} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  const IconComp = getFileIcon(displayName);
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={displayName}
      className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition max-w-[220px]"
    >
      <IconComp size={18} className="flex-shrink-0 opacity-80" />
      <span className="text-xs truncate flex-1">{displayName}</span>
      <Download size={13} className="flex-shrink-0 opacity-70" />
    </a>
  );
};

// ─── Attachment preview strip (above input) ──────────────────────────────────

const AttachmentPreview = ({ file, onRemove }) => {
  if (!file) return null;
  const isImg = file.type.startsWith('image/');
  const IconComp = getFileIcon(file.name);
  const previewUrl = isImg ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl mb-2 mx-0">
      {isImg && previewUrl ? (
        <img src={previewUrl} alt={file.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-indigo-200" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <IconComp size={18} className="text-indigo-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"
        title="Remove attachment"
      >
        <XCircle size={16} />
      </button>
    </div>
  );
};

// ─── Employee picker ──────────────────────────────────────────────────────────

const EmployeePicker = ({ employees, selected, onToggle, search, onSearch, single = false, empLoading = false }) => (
  <div className="flex flex-col gap-2">
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search employees..."
        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
      />
    </div>
    <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl">
      {empLoading ? (
        <div className="p-4 text-center text-slate-400 text-sm">Loading employees...</div>
      ) : employees.length === 0 ? (
        <div className="p-4 text-center text-slate-400 text-sm">No employees found.</div>
      ) : (
        employees.map((emp, idx) => {
          const isSelected = selected.includes(emp.id);
          const [bg, fg] = getColorClass(emp.username);
          return (
            <button
              key={emp.id}
              onClick={() => onToggle(emp.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border-b border-gray-100 last:border-b-0
                ${isSelected ? 'bg-indigo-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                hover:bg-indigo-50`}
            >
              <div className={`w-8 h-8 rounded-full ${bg} ${fg} text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                {getInitials(emp.username)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{emp.username}</p>
                {emp.role && <p className="text-xs text-slate-400">{emp.role}</p>}
              </div>
              {isSelected && !single && <Check size={14} className="text-indigo-500 flex-shrink-0" />}
              {isSelected && single && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
            </button>
          );
        })
      )}
    </div>
    {!single && selected.length > 0 && (
      <p className="text-xs text-indigo-500 text-right">
        {selected.length} member{selected.length > 1 ? 's' : ''} selected
      </p>
    )}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
};

// ─── Group info panel ─────────────────────────────────────────────────────────

const GroupInfoPanel = ({ conv, currentUser, onClose }) => {
  if (!conv || conv.type !== 'GROUP') return null;
  const participants = conv.participants || [];
  const createdBy = conv.created_by;

  return (
    <div className="w-72 border-l border-slate-100 bg-slate-50 flex flex-col flex-shrink-0 h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-800">Group Info</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-5 flex flex-col items-center gap-3 border-b border-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-md">
          <Users size={28} className="text-indigo-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-900">{conv.name || 'Group'}</p>
          <p className="text-xs text-slate-400 mt-1">Group · {participants.length} members</p>
        </div>
      </div>
      <div className="p-4 flex-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Members</p>
        <div className="flex flex-col gap-2">
          {participants.map((p) => {
            const isMe = p.id === currentUser?.id;
            const isAdmin = p.id === createdBy || p.is_admin;
            const [bg, fg] = getColorClass(p.username || '');
            return (
              <div key={p.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition ${isMe ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                <div className={`w-8 h-8 rounded-full ${bg} ${fg} text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                  {getInitials(p.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.username}{isMe ? ' (You)' : ''}</p>
                    {isAdmin && <Crown size={11} className="text-amber-400 flex-shrink-0" />}
                  </div>
                  {p.role && <p className="text-xs text-slate-400 truncate">{p.role}</p>}
                </div>
                {isAdmin && (
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex-shrink-0">Admin</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Main ChatPage ────────────────────────────────────────────────────────────

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, accessToken, refreshAccessToken } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [selectedConv, setSelectedConv] = useState(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState(null);  // File object
  const fileInputRef = useRef(null);

  // Employee / modal state
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [showDirect, setShowDirect] = useState(false);
  const [directSelected, setDirectSelected] = useState([]);
  const [directSearch, setDirectSearch] = useState('');
  const [directSaving, setDirectSaving] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSelected, setGroupSelected] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSaving, setGroupSaving] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getToken = useCallback(async () => {
    return accessToken || await refreshAccessToken();
  }, [accessToken, refreshAccessToken]);

  // ── Data fetching ──

  const fetchEmployees = useCallback(async () => {
    try {
      setEmpLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/employees-list/`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmployees((data.results || data).filter(e => e.id !== user?.id));
    } catch { console.error('employees failed'); }
    finally { setEmpLoading(false); }
  }, [getToken, user?.id]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/conversations/`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConversations(data.results || data);
      setError(null);
    } catch {
      if (!silent) setError('Could not load conversations.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getToken]);

  const loadMessages = useCallback(async (convId) => {
    try {
      setMsgLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/messages/${convId}/`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => ({ ...prev, [convId]: data.results || data }));
    } catch { }
    finally { setMsgLoading(false); }
  }, [getToken]);

  // ── Effects ──

  useEffect(() => { loadConversations(); fetchEmployees(); }, []);

  const markMessagesDelivered = async (convId) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/delivered/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversation_id: convId }),
      });
    } catch {}
  };

  const markMessagesRead = async (convId) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/read/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversation_id: convId }),
      });
    } catch {}
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/messages/${msgId}/delete/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        // Optimistically remove from state
        setMessages(prev => {
          const convMsgs = prev[selectedConv.id] || [];
          return { ...prev, [selectedConv.id]: convMsgs.filter(m => m.id !== msgId) };
        });
      }
    } catch (e) {
      console.error('Delete message failed', e);
    }
  };

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    setShowGroupInfo(false);
    markMessagesRead(selectedConv.id);
  }, [selectedConv]);

  const handleNewMessage = useCallback((data) => {
    const targetConvId = data.conversation_id || selectedConv?.id;
    if (!targetConvId) return;

    setMessages((prev) => {
      const convMsgs = prev[targetConvId] || [];
      let foundOptimistic = false;
      const nextMsgs = convMsgs.map(m => {
        if (m.client_id && m.client_id === data.client_id) {
          foundOptimistic = true;
          return data;
        }
        return m;
      });
      if (foundOptimistic) {
        return { ...prev, [targetConvId]: nextMsgs };
      }
      if (convMsgs.some((m) => m.id === data.id)) return prev;
      return {
        ...prev,
        [targetConvId]: [...convMsgs, data],
      };
    });

    // Notify delivered if we are not the sender
    if (data.sender?.id !== user?.id) {
      markMessagesDelivered(targetConvId);
      if (selectedConv?.id === targetConvId) markMessagesRead(targetConvId);
    }

    // Update sidebar last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetConvId
          ? { ...c, last_message: data }
          : c
      )
    );
  }, [selectedConv, user]);

  useChatChannel(
    selectedConv?.id, 
    handleNewMessage,
    (data) => { // onMessagesDelivered
      setMessages(prev => {
        const convMsgs = prev[data.conversation_id] || [];
        const next = convMsgs.map(m => data.message_ids.includes(m.id) ? { ...m, delivered_to: [...(m.delivered_to || []), data.user_id] } : m);
        return { ...prev, [data.conversation_id]: next };
      });
    },
    (data) => { // onMessagesRead
      setMessages(prev => {
        const convMsgs = prev[data.conversation_id] || [];
        const next = convMsgs.map(m => data.message_ids.includes(m.id) ? { ...m, read_by: [...(m.read_by || []), data.user_id] } : m);
        return { ...prev, [data.conversation_id]: next };
      });
    }
  );

  useUserChannel({
    onNewConversation: () => {
      loadConversations(true); // silent refresh
    },
    onChatMessage: (data) => {
      // If we are NOT currently in the conversation where the message was sent,
      // update the sidebar silently so we see the new message preview!
      if (!selectedConv || selectedConv.id !== data.conversation_id) {
        loadConversations(true);
      }
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConv]);

  // ── File handling ──

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB limit (adjust as needed)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10 MB.');
      return;
    }
    setAttachedFile(file);
    // Reset file input so the same file can be re-selected after removing
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  // ── Send message (text + optional file) ──

  const handleSend = async () => {
    const hasText = input.trim();
    const hasFile = !!attachedFile;
    if ((!hasText && !hasFile) || !selectedConv || sending) return;

    const text = input.trim();
    setInput('');
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setSending(true);

    const clientId = `opt-${Date.now()}`;
    // Optimistic message (shows immediately)
    const optimistic = {
      id: clientId,
      client_id: clientId,
      sender: { id: user?.id, username: user?.username },
      text: text || null,
      file: fileToSend ? URL.createObjectURL(fileToSend) : null,
      _optimisticFilename: fileToSend?.name,
      created_at: new Date().toISOString(),
      optimistic: true,
      delivered_to: [],
      read_by: [],
    };
    setMessages(prev => ({ ...prev, [selectedConv.id]: [...(prev[selectedConv.id] || []), optimistic] }));

    try {
      const token = await getToken();
      if (!token) return;

      const formData = new FormData();
      formData.append('conversation_id', selectedConv.id);
      formData.append('client_id', clientId);
      if (text) formData.append('text', text);
      if (fileToSend) formData.append('file', fileToSend);

      const res = await fetch(`${API_BASE_URL}/send/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // NOTE: Do NOT set Content-Type manually — the browser sets it with the
        // correct multipart boundary when using FormData.
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) throw new Error('Send failed');
      
      const realMessage = await res.json();
      
      // Replace optimistic message with real message
      setMessages(prev => ({
        ...prev,
        [selectedConv.id]: (prev[selectedConv.id] || []).map(m => 
          m.id === optimistic.id ? realMessage : m
        )
      }));

      // Update sidebar immediately for the sender
      setConversations(prev => 
        prev.map(c => c.id === selectedConv.id ? { ...c, last_message: realMessage } : c)
      );
    } catch {
      // Roll back optimistic message and restore input
      setMessages(prev => ({
        ...prev,
        [selectedConv.id]: (prev[selectedConv.id] || []).filter(m => m.id !== optimistic.id),
      }));
      setInput(text);
      if (fileToSend) setAttachedFile(fileToSend);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Conversation actions ──

  const handleSelectConv = (conv) => { setSelectedConv(conv); setMobileView('chat'); };
  const handleBackToSidebar = () => { setSelectedConv(null); setMobileView('sidebar'); setShowGroupInfo(false); };

  const handleCreateDirect = async () => {
    if (directSelected.length !== 1 || directSaving) return;
    setDirectSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/create-direct/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: directSelected[0] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      await loadConversations();
      setConversations(prev => {
        const found = prev.find(c => c.id === data.conversation_id);
        if (found) handleSelectConv(found);
        return prev;
      });
      setShowDirect(false); setDirectSelected([]); setDirectSearch('');
    } catch { alert('Failed to start conversation.'); }
    finally { setDirectSaving(false); }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name || groupSelected.length === 0 || groupSaving) return;
    setGroupSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/create-group/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, user_ids: groupSelected }),
      });
      if (!res.ok) throw new Error();
      await loadConversations();
      setShowGroup(false); setGroupName(''); setGroupSelected([]); setGroupSearch('');
    } catch { alert('Failed to create group.'); }
    finally { setGroupSaving(false); }
  };

  const toggleDirect = (id) => setDirectSelected([id]);
  const toggleGroup = (id) => setGroupSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Derived values ──

  const filteredConvs = conversations.filter(c =>
    getConversationName(c, user).toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredForGroup = employees.filter(e => e.username.toLowerCase().includes(groupSearch.toLowerCase()));
  const filteredForDirect = employees.filter(e => e.username.toLowerCase().includes(directSearch.toLowerCase()));
  const currentMessages = selectedConv ? messages[selectedConv.id] || [] : [];
  const convName = selectedConv ? getConversationName(selectedConv, user) : '';
  const isGroup = selectedConv?.type === 'GROUP';
  const canSend = (input.trim() || attachedFile) && !sending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-slate-50 font-sans overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={`
          flex flex-col bg-white border-r border-slate-100 flex-shrink-0
          w-full md:w-80 md:min-w-[280px]
          ${mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'}
        `}>
          <div className="px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-500 transition">
                <ArrowLeft size={16} />
              </button>
              <span className="text-base font-bold text-slate-900 flex-1">Messages</span>
              <button onClick={() => setShowDirect(true)} title="New direct message" className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition">
                <UserPlus size={15} />
              </button>
              <button onClick={() => setShowGroup(true)} title="New group" className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition">
                <Users size={15} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-500 text-sm mb-2">{error}</p>
                <button onClick={() => loadConversations()} className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 cursor-pointer mx-auto bg-transparent border-none">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : filteredConvs.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No conversations" desc="Start a new message or group" />
            ) : (
              filteredConvs.map((conv) => {
                const name = getConversationName(conv, user);
                const isSel = selectedConv?.id === conv.id;
                const lastMsg = conv.last_message;
                const group = conv.type === 'GROUP';
                return (
                  <button key={conv.id} onClick={() => handleSelectConv(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition
                      ${isSel ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent hover:bg-slate-50'}`}
                  >
                    <Avatar name={name} isGroup={group} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">{name}</span>
                        {lastMsg && <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatTime(lastMsg.created_at)}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender?.id === user?.id && <span className="font-medium">You: </span>}
                            {lastMsg.file && !lastMsg.text ? '📎 Attachment' : lastMsg.text}
                          </>
                        ) : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="px-4 md:px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-3 shadow-sm flex-shrink-0">
                <button onClick={handleBackToSidebar} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition">
                  <ArrowLeft size={16} />
                </button>
                <Avatar name={convName} isGroup={isGroup} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{convName}</p>
                  <p className="text-xs text-slate-400">
                    {isGroup ? `${selectedConv.participants?.length || 0} members` : (() => {
                      const other = selectedConv.participants?.find(p => p.id !== user?.id);
                      return other?.role ? other.role : 'Member';
                    })()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {isGroup && (
                    <button onClick={() => setShowGroupInfo(v => !v)} title="Group Info"
                      className={`p-2 rounded-xl transition ${showGroupInfo ? 'bg-indigo-50 text-indigo-500' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-500'}`}>
                      <Info size={17} />
                    </button>
                  )}
                  <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-500 transition">
                    <MoreVertical size={17} />
                  </button>
                </div>
              </div>

              {/* Messages + optional group info */}
              <div className="flex-1 flex min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-1 bg-slate-50">
                  {msgLoading && currentMessages.length === 0 ? (
                    <div className="flex items-center justify-center flex-1 text-slate-400 text-sm gap-2">
                      <Loader2 size={18} className="animate-spin" /> Loading messages...
                    </div>
                  ) : currentMessages.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="No messages yet" desc="Say hello!" />
                  ) : (() => {
                    let lastDate = null;
                    return currentMessages.map(msg => {
                      const isMe = msg.sender?.id === user?.id;
                      const msgDate = new Date(msg.created_at).toLocaleDateString();
                      const showDate = msgDate !== lastDate;
                      lastDate = msgDate;

                      // Resolve file URL — real messages have a URL string, optimistic ones
                      // have a blob URL we created from createObjectURL.
                      const fileUrl = msg.file || null;
                      const filename = msg._optimisticFilename || (fileUrl ? fileUrl.split('/').pop()?.split('?')[0] : null);

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center gap-3 my-3">
                              <div className="flex-1 h-px bg-slate-200" />
                              <span className="text-xs text-slate-400 font-medium">
                                {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>
                          )}
                          <div className={`flex mb-0.5 gap-2 items-end ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                            {!isMe && <Avatar name={msg.sender?.username || ''} size="sm" />}
                            
                            {isMe && !msg.optimistic && (
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-all duration-200 mb-6"
                                title="Delete Message"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            <div className="max-w-[80%] sm:max-w-[70%] md:max-w-[62%]">
                              {!isMe && isGroup && (
                                <p className="text-xs font-semibold text-indigo-500 mb-1 pl-0.5">{msg.sender?.username}</p>
                              )}
                              <div className={`px-3.5 py-2 text-sm leading-relaxed
                                ${isMe
                                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-indigo-200'
                                  : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm shadow-sm'
                                }
                                ${msg.optimistic ? 'opacity-70' : ''}`}>
                                {msg.text && <p>{msg.text}</p>}
                                {fileUrl && (
                                  <FilePreview fileUrl={fileUrl} filename={filename} />
                                )}
                              </div>
                                <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                                {isMe && !msg.optimistic && (() => {
                                  // Determine tick status
                                  const totalParticipants = selectedConv.participants?.length || 1;
                                  const requiredAcks = totalParticipants - 1; // Exclude sender
                                  
                                  const reads = (msg.read_by || []).filter(uid => uid !== user?.id).length;
                                  const deliveries = (msg.delivered_to || []).filter(uid => uid !== user?.id).length;
                                  
                                  if (requiredAcks > 0 && reads >= requiredAcks) {
                                    return <CheckCheck size={14} className="text-blue-500" />;
                                  } else if (requiredAcks > 0 && (deliveries >= requiredAcks || reads > 0)) {
                                    return <CheckCheck size={14} className="text-slate-400" />;
                                  }
                                  return <Check size={14} className="text-slate-400" />;
                                })()}
                                {isMe && msg.optimistic && <Check size={14} className="text-slate-300 opacity-60" />}
                              </div>
                            </div>
                          </div>
                      );
                    });
                  })()}
                  <div ref={messagesEndRef} />
                </div>

                {/* Group Info Panel — desktop */}
                {isGroup && showGroupInfo && (
                  <div className="hidden lg:block">
                    <GroupInfoPanel conv={selectedConv} currentUser={user} onClose={() => setShowGroupInfo(false)} />
                  </div>
                )}

                {/* Group Info Panel — mobile overlay */}
                {isGroup && showGroupInfo && (
                  <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex justify-end" onClick={() => setShowGroupInfo(false)}>
                    <div className="w-72 max-w-[90vw] bg-white h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
                      <GroupInfoPanel conv={selectedConv} currentUser={user} onClose={() => setShowGroupInfo(false)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="px-4 md:px-5 pt-3 pb-4 bg-white border-t border-slate-100 flex-shrink-0">
                {/* Attachment preview strip */}
                {attachedFile && (
                  <AttachmentPreview file={attachedFile} onRemove={handleRemoveAttachment} />
                )}

                <div className="flex items-end gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
                  />

                  {/* Paperclip button — now actually opens the file picker */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach a file"
                    className={`p-1 transition flex-shrink-0 self-end mb-1 ${attachedFile ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'}`}
                  >
                    <Paperclip size={16} />
                  </button>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={attachedFile ? 'Add a caption...' : 'Type a message...'}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none leading-relaxed max-h-28 py-1 font-[inherit] placeholder:text-slate-400"
                  />

                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`p-2.5 rounded-xl flex-shrink-0 self-end flex items-center justify-center transition
                      ${canSend
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-indigo-700 cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-300 mt-1.5 hidden sm:block">↵ send · ⇧↵ new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center flex-col gap-6">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-inner">
                <MessageSquare size={38} strokeWidth={1.5} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">Your messages</p>
                <p className="text-sm mt-1.5 text-slate-500">Select a conversation or start a new one</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDirect(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-200 transition">
                  <UserPlus size={15} /> New Message
                </button>
                <button onClick={() => setShowGroup(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                  <Users size={15} /> New Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Direct Modal */}
      <Modal open={showDirect} onClose={() => { setShowDirect(false); setDirectSelected([]); setDirectSearch(''); }} title="New Direct Message">
        <p className="text-xs text-slate-500 -mt-2">Select an employee to start a private conversation.</p>
        <EmployeePicker employees={filteredForDirect} selected={directSelected} onToggle={toggleDirect} search={directSearch} onSearch={setDirectSearch} single={true} empLoading={empLoading} />
        <button onClick={handleCreateDirect} disabled={directSelected.length !== 1 || directSaving}
          className={`w-full py-2.5 text-sm rounded-xl font-medium flex items-center justify-center gap-2 transition border-none
            ${directSelected.length === 1 && !directSaving ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-indigo-700 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          {directSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Start Conversation
        </button>
      </Modal>

      {/* New Group Modal */}
      <Modal open={showGroup} onClose={() => { setShowGroup(false); setGroupSelected([]); setGroupName(''); setGroupSearch(''); }} title="New Group Chat">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Group Name <span className="text-red-400">*</span></span>
            {!groupName.trim() && groupSelected.length > 0 && (
              <span className="text-xs text-red-400 font-normal">Required to create group</span>
            )}
          </label>
          <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Design Team" autoFocus
            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition
              ${!groupName.trim() && groupSelected.length > 0 ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-2">
            Add Members
            {groupSelected.length > 0 && <span className="text-indigo-500">{groupSelected.length} selected</span>}
          </label>
          <EmployeePicker employees={filteredForGroup} selected={groupSelected} onToggle={toggleGroup} search={groupSearch} onSearch={setGroupSearch} single={false} empLoading={empLoading} />
        </div>
        {(groupSelected.length === 0 || !groupName.trim()) && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To create a group:</p>
            <div className={`flex items-center gap-2 text-xs ${groupName.trim() ? 'text-emerald-600' : 'text-slate-400'}`}>
              {groupName.trim() ? <Check size={13} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />}
              Enter a group name
            </div>
            <div className={`flex items-center gap-2 text-xs ${groupSelected.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {groupSelected.length > 0 ? <Check size={13} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />}
              Select at least 1 member
            </div>
          </div>
        )}
        <button onClick={handleCreateGroup} disabled={!groupName.trim() || groupSelected.length === 0 || groupSaving}
          className={`w-full py-2.5 text-sm rounded-xl font-semibold flex items-center justify-center gap-2 transition border-none
            ${groupName.trim() && groupSelected.length > 0 && !groupSaving ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-indigo-700 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          {groupSaving ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
          {groupSaving ? 'Creating...' : 'Create Group'}
        </button>
      </Modal>
    </>
  );
};

export default ChatPage;