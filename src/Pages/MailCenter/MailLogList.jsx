import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMailCompose } from '../../context/MailComposeContext';
import toast from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import {
  RefreshCw,
  CloudDownload,
  Search,
  X,
  MessageSquare,
  Trash2,
  Inbox,
  PenSquare,
  ExternalLink,
  Mail,
  Reply,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const lower = (v) => (v == null ? '' : String(v).toLowerCase());

const MODULE_BADGE = {
  EXECUTIVE: 'bg-purple-100 text-purple-800',
  TASKS: 'bg-indigo-100 text-indigo-800',
  PENALTIES: 'bg-rose-100 text-rose-800',
  REPORTS: 'bg-blue-100 text-blue-800',
  STAFF_ANALYSIS: 'bg-amber-100 text-amber-800',
  FEES: 'bg-emerald-100 text-emerald-800',
  PROCESSING: 'bg-cyan-100 text-cyan-800',
};

export const MailLogList = ({ stateFilter, directionFilter, moduleScope = '' }) => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { openMailComposer } = useMailCompose();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const scopeParam = moduleScope ? `?module_scope=${moduleScope}` : '';
      const res = await axios.get(`${API_BASE_URL}/mail/messages/${scopeParam}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      let data = res.data.results || res.data || [];
      if (stateFilter) {
        data = data.filter((m) => lower(m.state) === lower(stateFilter));
      }
      if (directionFilter) {
        data = data.filter((m) => lower(m.direction) === lower(directionFilter));
      }
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages', error);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [accessToken, stateFilter, directionFilter, moduleScope]);

  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      fetchMessages();
    }
  }, [accessToken, fetchMessages]);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to permanently delete this email log? If this is a Draft, it will also be deleted from Gmail.'
      )
    )
      return;
    try {
      await axios.delete(`${API_BASE_URL}/mail/messages/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Message deleted');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/mail/messages/sync_all/`,
        { module_scope: moduleScope || undefined },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(res.data.detail || 'Synced mailboxes successfully.');
      await fetchMessages();
    } catch (error) {
      toast.error('Failed to sync mailboxes');
    }
    setIsSyncing(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMessages();
    setIsRefreshing(false);
  };

  const handleOpenThreadInStudio = (msg) => {
    const isDraft = lower(msg.state) === 'draft';
    openMailComposer({
      draft_id: isDraft ? msg.id : undefined,
      initialMode: isDraft ? 'compose' : 'read',
      initialMessage: msg,
      student: msg.student || null,
      recipient_staff: msg.recipient_staff || null,
      recipient_staff_name: msg.recipient_staff_name || '',
      lead: msg.lead || null,
      context_module: msg.context_module || moduleScope || 'EXECUTIVE',
      context_id: msg.context_id || '',
      context_label: msg.context_label || msg.display_target_name || '',
      to: lower(msg.direction) === 'in' && !isDraft ? [msg.from_email] : msg.to || [],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      subject: isDraft ? msg.subject : `Re: ${(msg.subject || '').replace(/^\s*(re:\s*)+/i, '')}`,
      body_html: isDraft ? msg.body_html : '',
      signature_html: isDraft ? msg.signature_html : '',
      gmail_thread_id: msg.gmail_thread_id || '',
      onSent: () => fetchMessages(),
    });
  };

  const q = query.trim().toLowerCase();
  const visible = messages.filter(
    (m) =>
      !q ||
      [
        m.display_target_name,
        m.student_name,
        m.recipient_staff_name,
        m.lead_name,
        m.context_label,
        m.subject,
        m.from_email,
        ...(Array.isArray(m.to) ? m.to : []),
      ].some((v) => lower(v).includes(q))
  );

  const title =
    stateFilter === 'draft'
      ? 'Drafts'
      : stateFilter === 'sent'
      ? 'Sent Mail'
      : stateFilter === 'received'
      ? 'Inbox'
      : 'Email Threads & Logs';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex justify-between items-center flex-wrap gap-3 p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/60">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            {visible.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipient, context, subject, email..."
              className="pl-9 pr-8 py-2 w-64 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={handleSyncAll}
            disabled={isSyncing}
            startIcon={<CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />}
          >
            {isSyncing ? 'Syncing Gmail...' : 'Sync Gmail Inbox & Sent'}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Recipient / Context</TableCell>
              <TableCell>Subject & Snippet</TableCell>
              <TableCell>Mailbox / Address</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Inbox className="mx-auto text-gray-300 mb-2" size={36} />
                  <p className="text-gray-600 font-semibold">No emails found in {title}.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click &quot;Sync Gmail Inbox &amp; Sent&quot; to pull recent threads or click &quot;Compose Mail&quot; to start a new thread.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((msg) => {
                const modKey = (msg.context_module || msg.account_scope || 'GENERAL').toUpperCase();
                const badgeCls = MODULE_BADGE[modKey] || 'bg-slate-100 text-slate-700';
                const isDraft = lower(msg.state) === 'draft';
                return (
                  <TableRow
                    key={msg.id}
                    hover
                    className="cursor-pointer"
                    onClick={() => handleOpenThreadInStudio(msg)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {msg.display_target_name || msg.student_name || 'General Recipient'}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeCls}`}
                        >
                          {modKey.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {msg.subject || '(no subject)'}
                        </div>
                        {msg.snippet && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">{msg.snippet}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      <div>
                        {lower(msg.direction) === 'out'
                          ? `To: ${(msg.to || []).join(', ')}`
                          : `From: ${msg.from_email || ''}`}
                      </div>
                      {(msg.sender_alias_email || msg.account_email) && (
                        <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                          Via: {msg.sender_alias_email || msg.account_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {msg.effective_time ? new Date(msg.effective_time).toLocaleString() : ''}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={isDraft ? <PenSquare size={14} /> : <MessageSquare size={14} />}
                          onClick={() => handleOpenThreadInStudio(msg)}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          {isDraft ? 'Edit Draft' : 'View Thread'}
                        </Button>
                        {msg.student && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/processing-students/${msg.student}/mail`)}
                            sx={{ textTransform: 'none', borderRadius: '8px', minWidth: 'auto', px: 1.5 }}
                            title="Open Student Mail Panel"
                          >
                            <ExternalLink size={14} />
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDelete(msg.id)}
                          sx={{ textTransform: 'none', borderRadius: '8px', minWidth: 'auto', px: 1.5 }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
