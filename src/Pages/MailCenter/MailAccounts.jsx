import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Mail,
  Plus,
  RefreshCw,
  Unplug,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  ShieldCheck,
  Landmark,
  GraduationCap,
  Crown,
  Users,
  UserCheck,
  Layers,
  Lock,
  Trash2,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SCOPE_META = {
  EXECUTIVE: {
    label: 'Executive & MD',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    iconBg: 'bg-purple-50 text-purple-600',
    border: 'border-purple-200 hover:border-purple-300',
    Icon: Crown,
  },
  FEES: {
    label: 'Fees & Accounts',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-300',
    Icon: Landmark,
  },
  PROCESSING: {
    label: 'Processing & Admissions',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-200 hover:border-indigo-300',
    Icon: GraduationCap,
  },
  HR: {
    label: 'HR & Administration',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    iconBg: 'bg-rose-50 text-rose-600',
    border: 'border-rose-200 hover:border-rose-300',
    Icon: Users,
  },
  SALES: {
    label: 'Sales & Leads',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-50 text-blue-600',
    border: 'border-blue-200 hover:border-blue-300',
    Icon: Layers,
  },
  GLOBAL: {
    label: 'Global / All Modules',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200 hover:border-slate-300',
    Icon: Mail,
  },
};

export const MailAccounts = ({ returnPath = '/mail-settings' }) => {
  const { accessToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accessMeta, setAccessMeta] = useState({
    can_manage: false,
    can_use: true,
    user_roles: [],
    default_scope: 'PROCESSING',
    available_scopes: [],
    available_pages: [],
    roles: [],
    staff: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('mailboxes'); // 'mailboxes' | 'roles' | 'employees'
  const [filterScope, setFilterScope] = useState('ALL');
  const [staffSearch, setStaffSearch] = useState('');

  // Connect Custom Mailbox Dialog state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectScope, setConnectScope] = useState('EXECUTIVE');
  const [connectCompany, setConnectCompany] = useState('LP');
  const [connectRoleIds, setConnectRoleIds] = useState([]);
  const [connectPages, setConnectPages] = useState([
    'tasks',
    'penalties',
    'reports',
    'staff_analysis',
  ]);

  // Configure Mailbox Dialog state
  const [editAccount, setEditAccount] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editSendAs, setEditSendAs] = useState('');
  const [editCustomAliases, setEditCustomAliases] = useState([]);
  const [newAliasEmail, setNewAliasEmail] = useState('');
  const [newAliasName, setNewAliasName] = useState('');
  const [editScope, setEditScope] = useState('PROCESSING');
  const [editCompany, setEditCompany] = useState('LP');
  const [editRoleIds, setEditRoleIds] = useState([]);
  const [editUserIds, setEditUserIds] = useState([]);
  const [editPages, setEditPages] = useState([]);
  const [availableAliases, setAvailableAliases] = useState([]);
  const [fetchingAliases, setFetchingAliases] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Role Quick-Assign Modal
  const [roleModalTarget, setRoleModalTarget] = useState(null);
  const [roleModalAccountIds, setRoleModalAccountIds] = useState([]);
  const [savingRoleAssign, setSavingRoleAssign] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [metaRes, accRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/mail/accounts/access_metadata/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/mail/accounts/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setAccessMeta(metaRes.data);
      setAccounts(accRes.data.results || accRes.data || []);
    } catch (error) {
      toast.error('Failed to load mailbox settings');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const canManage = Boolean(accessMeta.can_manage);

  const handleConnectGmail = async (
    scope = 'PROCESSING',
    company = 'LP',
    roleIds = [],
    allowedPages = []
  ) => {
    try {
      sessionStorage.setItem('gmail_oauth_module_scope', scope);
      sessionStorage.setItem('gmail_oauth_company', company);
      sessionStorage.setItem('gmail_oauth_return_to', returnPath);
      if (roleIds.length > 0) {
        sessionStorage.setItem('gmail_oauth_role_ids', roleIds.join(','));
      }
      if (allowedPages.length > 0) {
        sessionStorage.setItem('gmail_oauth_allowed_pages', JSON.stringify(allowedPages));
      }
      const res = await axios.get(
        `${API_BASE_URL}/mail/authorize/?module_scope=${scope}&company=${company}&role_ids=${roleIds.join(',')}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start Gmail connection flow');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this mailbox?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/mail/accounts/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Mailbox disconnected');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to disconnect mailbox');
    }
  };

  const handleSyncMailboxThreads = async (accId) => {
    const toastId = toast.loading('Syncing Gmail threads...');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/mail/accounts/${accId}/sync_threads/`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(res.data.detail || 'Mailbox synced!', { id: toastId });
      fetchAllData();
    } catch (err) {
      toast.error('Failed to sync mailbox threads', { id: toastId });
    }
  };

  const handleOpenEdit = async (acc) => {
    setEditAccount(acc);
    setEditDisplayName(acc.display_name || '');
    setEditSendAs(acc.send_as_email || '');
    setEditCustomAliases(Array.isArray(acc.custom_aliases) ? acc.custom_aliases : []);
    setNewAliasEmail('');
    setNewAliasName('');
    setEditScope(acc.module_scope || 'PROCESSING');
    setEditCompany(acc.company || 'LP');
    setEditRoleIds(acc.assigned_roles || []);
    setEditUserIds(acc.assigned_users || []);
    setEditPages(Array.isArray(acc.allowed_pages) ? acc.allowed_pages : []);
    setAvailableAliases([]);

    try {
      setFetchingAliases(true);
      const res = await axios.get(`${API_BASE_URL}/mail/accounts/${acc.id}/send_as_aliases/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (Array.isArray(res.data)) {
        setAvailableAliases(res.data);
      }
    } catch (err) {
      console.warn('Could not auto-fetch aliases', err);
    } finally {
      setFetchingAliases(false);
    }
  };

  const handleAddCustomAlias = () => {
    const emailClean = newAliasEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      toast.error('Enter a valid alias email address');
      return;
    }
    if (editCustomAliases.some((a) => (a.email || '').toLowerCase() === emailClean)) {
      toast.error('This alias is already added');
      return;
    }
    setEditCustomAliases((prev) => [
      ...prev,
      { email: emailClean, display_name: newAliasName.trim() || editDisplayName },
    ]);
    setNewAliasEmail('');
    setNewAliasName('');
  };

  const handleSaveEdit = async () => {
    if (!editAccount) return;
    setSavingEdit(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/mail/accounts/${editAccount.id}/`,
        {
          display_name: editDisplayName,
          send_as_email: editSendAs,
          custom_aliases: editCustomAliases,
          module_scope: editScope,
          company: editCompany,
          assigned_roles: editRoleIds,
          assigned_users: editUserIds,
          allowed_pages: editPages,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success('Mailbox configuration & role permissions saved!');
      setEditAccount(null);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update mailbox settings');
    } finally {
      setSavingEdit(false);
    }
  };

  // Role Matrix: Assign/Unassign accounts for a specific role
  const handleOpenRoleAssign = (role) => {
    setRoleModalTarget(role);
    const attachedIds = accounts
      .filter((a) => (a.assigned_roles || []).includes(role.id))
      .map((a) => a.id);
    setRoleModalAccountIds(attachedIds);
  };

  const handleSaveRoleAssign = async () => {
    if (!roleModalTarget) return;
    setSavingRoleAssign(true);
    try {
      const roleId = roleModalTarget.id;
      for (const acc of accounts) {
        const currentlyHas = (acc.assigned_roles || []).includes(roleId);
        const shouldHave = roleModalAccountIds.includes(acc.id);
        if (currentlyHas !== shouldHave) {
          const updatedRoles = shouldHave
            ? [...new Set([...(acc.assigned_roles || []), roleId])]
            : (acc.assigned_roles || []).filter((id) => id !== roleId);
          await axios.patch(
            `${API_BASE_URL}/mail/accounts/${acc.id}/`,
            { assigned_roles: updatedRoles },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }
      }
      toast.success(`Updated mailboxes for role "${roleModalTarget.name}"`);
      setRoleModalTarget(null);
      fetchAllData();
    } catch (err) {
      toast.error('Failed to update role mailbox assignments');
    } finally {
      setSavingRoleAssign(false);
    }
  };

  // Employee Direct Assignment toggle
  const handleToggleEmployeeMailbox = async (staffId, acc) => {
    const currentUsers = acc.assigned_users || [];
    const hasUser = currentUsers.includes(staffId);
    const nextUsers = hasUser
      ? currentUsers.filter((id) => id !== staffId)
      : [...currentUsers, staffId];
    try {
      await axios.patch(
        `${API_BASE_URL}/mail/accounts/${acc.id}/`,
        { assigned_users: nextUsers },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(hasUser ? 'Removed employee from mailbox' : 'Assigned mailbox to employee');
      fetchAllData();
    } catch {
      toast.error('Failed to update employee assignment');
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (filterScope === 'ALL') return true;
    return (acc.module_scope || 'PROCESSING').toUpperCase() === filterScope;
  });

  // Find managing_director role ID for quick connect
  const mdRole = (accessMeta.roles || []).find(
    (r) => (r.name || '').toLowerCase() === 'managing_director'
  );

  return (
    <div className="space-y-6">
      {/* RBAC Isolation Banner */}
      {!canManage ? (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white rounded-2xl p-6 shadow-md border border-indigo-500/20 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 shrink-0">
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold">Your Role Mail System (Isolated Scope)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  mail:use • Strict Data Separation
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Active Role(s):{' '}
                <strong>
                  {(accessMeta.user_roles || []).map((r) => r.name).join(', ') || 'Standard Staff'}
                </strong>{' '}
                — You can view and sync mailboxes attached to your role only. Editing other roles is restricted to{' '}
                <code>mail:manage</code>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Admin / MD Full Control Header Card */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Mail Accounts, Webmail Aliases & Role Matrix
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  mail:manage • Full Control
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Pair multiple Gmail & Webmail aliases per role or individual employee with complete data separation across CRM pages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="contained"
                onClick={() =>
                  handleConnectGmail(
                    'EXECUTIVE',
                    'LP',
                    mdRole ? [mdRole.id] : [],
                    ['tasks', 'penalties', 'reports', 'staff_analysis', 'leads', 'staff']
                  )
                }
                startIcon={<Crown size={16} />}
                sx={{
                  bgcolor: '#7c3aed',
                  '&:hover': { bgcolor: '#6d28d9' },
                  textTransform: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                Connect MD / Executive Mailbox
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleConnectGmail('FEES', 'FLAG', [], ['receipts'])}
                startIcon={<Landmark size={16} />}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                Connect Fees Mailbox (FLAG)
              </Button>
              <Button
                variant="contained"
                onClick={() =>
                  handleConnectGmail('PROCESSING', 'LP', [], ['processing_students'])
                }
                startIcon={<GraduationCap size={16} />}
                sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
              >
                Connect Admissions Mailbox
              </Button>
              <Button
                variant="outlined"
                onClick={() => setConnectModalOpen(true)}
                startIcon={<Plus size={16} />}
                sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
              >
                Custom Role Mailbox
              </Button>
            </div>
          </div>

          {/* Sub-navigation tabs for Admin */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 flex-wrap">
            {[
              { id: 'mailboxes', label: `Connected Mailboxes (${accounts.length})`, Icon: Mail },
              {
                id: 'roles',
                label: `Role Assignment Matrix (${(accessMeta.roles || []).length} Roles)`,
                Icon: Users,
              },
              {
                id: 'employees',
                label: `Employee Direct Assignment (Scalable Per-Staff)`,
                Icon: UserCheck,
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSubTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeSubTab === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <t.Icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: CONNECTED MAILBOXES */}
      {activeSubTab === 'mailboxes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          {/* Scope Filter Pills */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
              Filter Scope:
            </span>
            {[
              { id: 'ALL', label: `All (${accounts.length})` },
              {
                id: 'EXECUTIVE',
                label: `Executive & MD (${accounts.filter((a) => a.module_scope === 'EXECUTIVE').length})`,
              },
              {
                id: 'PROCESSING',
                label: `Processing & Admissions (${accounts.filter((a) => a.module_scope === 'PROCESSING').length})`,
              },
              {
                id: 'FEES',
                label: `Fees & Accounts (${accounts.filter((a) => a.module_scope === 'FEES').length})`,
              },
              {
                id: 'HR',
                label: `HR & Admin (${accounts.filter((a) => a.module_scope === 'HR').length})`,
              },
              {
                id: 'SALES',
                label: `Sales & Leads (${accounts.filter((a) => a.module_scope === 'SALES').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterScope(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterScope === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAccounts.map((acc) => {
              const connected = acc.status === 'connected';
              const scopeKey = (acc.module_scope || 'PROCESSING').toUpperCase();
              const meta = SCOPE_META[scopeKey] || SCOPE_META.PROCESSING;
              const ScopeIcon = meta.Icon;
              const customAliases = Array.isArray(acc.custom_aliases) ? acc.custom_aliases : [];
              const assignedRoles = acc.assigned_role_details || [];
              const assignedUsers = acc.assigned_user_details || [];
              const allowedPages = Array.isArray(acc.allowed_pages) ? acc.allowed_pages : [];

              return (
                <div
                  key={acc.id}
                  className={`border transition-all p-5 rounded-2xl flex flex-col justify-between gap-4 bg-white shadow-xs hover:shadow-md ${meta.border}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${meta.iconBg}`}
                      >
                        <ScopeIcon size={23} />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 truncate text-base">
                            {acc.email}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              connected
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                            {(acc.status || 'unknown').toUpperCase()}
                          </span>
                        </div>

                        <p className="text-slate-600 text-xs font-medium">
                          Sender Display Name:{' '}
                          <strong className="text-slate-800">
                            {acc.display_name || 'Default Gmail Name'}
                          </strong>
                        </p>

                        {/* Webmail Aliases */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {acc.send_as_email && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200 font-semibold">
                              <ShieldCheck size={13} className="text-amber-600 shrink-0" />
                              Primary Webmail Alias: <strong>{acc.send_as_email}</strong>
                            </span>
                          )}
                          {customAliases.map((al, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 text-[11px] border border-purple-200 font-semibold"
                            >
                              <Sparkles size={11} />
                              Alias: {al.email}
                            </span>
                          ))}
                        </div>

                        {/* Scope & Company */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase border ${meta.badgeBg}`}
                          >
                            {meta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                            {acc.company || 'FLAG'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {canManage && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenEdit(acc)}
                          startIcon={<Settings2 size={14} />}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          Configure
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        onClick={() => handleSyncMailboxThreads(acc.id)}
                        startIcon={<RefreshCw size={14} />}
                        sx={{ textTransform: 'none', borderRadius: '8px' }}
                      >
                        Sync Mail
                      </Button>
                      {canManage && (
                        <Button
                          variant="outlined"
                          color={connected ? 'primary' : 'warning'}
                          size="small"
                          onClick={() => handleConnectGmail(acc.module_scope, acc.company)}
                          startIcon={<RefreshCw size={14} />}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          Reconnect OAuth
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleDeleteAccount(acc.id)}
                          startIcon={<Unplug size={14} />}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Assigned Roles, Employees & Allowed Pages Footer */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Roles:
                      </span>
                      {assignedRoles.length > 0 ? (
                        assignedRoles.map((r) => (
                          <span
                            key={r.id}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]"
                          >
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Default Scope ({meta.label})
                        </span>
                      )}
                    </div>

                    {assignedUsers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Assigned Staff:
                        </span>
                        {assignedUsers.map((u) => (
                          <span
                            key={u.id}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]"
                          >
                            {u.full_name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Active CRM Pages:
                      </span>
                      {allowedPages.length > 0 ? (
                        allowedPages.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]"
                          >
                            {p.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">All pages in scope</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && filteredAccounts.length === 0 && (
              <div className="col-span-full text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <Mail className="mx-auto text-slate-300 mb-2" size={36} />
                <p className="text-slate-600 font-bold">No mailboxes connected in this scope.</p>
                {canManage ? (
                  <p className="text-slate-400 text-xs mt-1">
                    Use the Connect buttons above to pair a Gmail or Google Workspace account and configure its Webmail Alias.
                  </p>
                ) : (
                  <p className="text-slate-400 text-xs mt-1">
                    Contact an administrator with <code>mail:manage</code> to assign a mailbox to your role.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROLE ASSIGNMENT MATRIX (Admin Only) */}
      {canManage && activeSubTab === 'roles' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-slate-900">
              Role-Based Mailbox Assignment Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign one or multiple mailboxes (and their webmail aliases) to any CRM role. Each role only sees its own assigned mailboxes and email threads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(accessMeta.roles || []).map((role) => {
              const roleAccounts = accounts.filter((a) =>
                (a.assigned_roles || []).includes(role.id)
              );
              const isMd = (role.name || '').toLowerCase() === 'managing_director';
              return (
                <div
                  key={role.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isMd
                      ? 'border-purple-300 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
                          isMd
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {role.name}
                      </span>
                      <span className="text-xs font-bold text-indigo-600">
                        {roleAccounts.length} Mailbox(es)
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-2">{role.description}</p>
                    )}

                    <div className="mt-4 space-y-2">
                      {roleAccounts.length > 0 ? (
                        roleAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="font-bold text-slate-800 truncate">{acc.email}</div>
                            {acc.send_as_email && (
                              <div className="text-[11px] text-amber-700 font-semibold truncate">
                                Alias: {acc.send_as_email}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">
                          No explicit mailboxes assigned yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => handleOpenRoleAssign(role)}
                      sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Assign / Edit Mailboxes
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setConnectRoleIds([role.id]);
                        setConnectScope(isMd ? 'EXECUTIVE' : 'PROCESSING');
                        setConnectModalOpen(true);
                      }}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        minWidth: 'auto',
                        px: 2,
                      }}
                      title="Connect a new Gmail account for this role"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEE DIRECT ASSIGNMENT (Future-Proof Scalable Staff Pairing) */}
      {canManage && activeSubTab === 'employees' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Direct Employee Mailbox Assignment (Irrespective of Role)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Grant specific employees access to send and view threads from any connected mailbox regardless of their role.
              </p>
            </div>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search employee name, email, role..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs w-72 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {(accessMeta.staff || [])
              .filter((s) => {
                const q = staffSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (s.full_name || '').toLowerCase().includes(q) ||
                  (s.email || '').toLowerCase().includes(q) ||
                  (s.roles || []).some((r) => r.toLowerCase().includes(q))
                );
              })
              .map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {staffMember.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {staffMember.email || 'No email on profile'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">
                      {(staffMember.roles || []).join(', ') || 'Staff'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Toggle Paired Mailboxes:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {accounts.map((acc) => {
                        const isAssigned = (acc.assigned_users || []).includes(staffMember.id);
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleToggleEmployeeMailbox(staffMember.id, acc)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                              isAssigned
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {isAssigned && <Check size={11} />}
                            <span className="truncate max-w-[160px]">
                              {acc.send_as_email || acc.email}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* DIALOG 1: CONFIGURE MAILBOX SETTINGS, MULTIPLE ALIASES, ROLES & PAGES */}
      <Dialog
        open={Boolean(editAccount)}
        onClose={() => setEditAccount(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="font-extrabold text-slate-900 border-b border-slate-100">
          Configure Mailbox, Webmail Aliases & Role Isolation
        </DialogTitle>
        <DialogContent className="space-y-5 pt-5">
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 flex items-center justify-between">
            <span>
              Connected Google / Workspace Account: <strong>{editAccount?.email}</strong>
            </span>
            <span className="font-bold uppercase">{editAccount?.status}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Sender Display Name
              </label>
              <TextField
                fullWidth
                size="small"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="e.g. Managing Director • Life Planner"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Primary Webmail Alias (Send-As Header)
                </label>
                {fetchingAliases && (
                  <span className="text-[11px] text-indigo-600 animate-pulse">
                    Detecting Gmail aliases...
                  </span>
                )}
              </div>
              <TextField
                fullWidth
                size="small"
                value={editSendAs}
                onChange={(e) => setEditSendAs(e.target.value)}
                placeholder="e.g. md@lifeplanneruniversal.com"
              />
            </div>
          </div>

          {/* Detected Gmail Aliases */}
          {availableAliases.length > 0 && (
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
              <p className="text-xs font-bold text-amber-900 mb-2">
                Verified Send-As Aliases Detected in Gmail (Click to set as Primary or Add to Multi-Alias List):
              </p>
              <div className="flex flex-wrap gap-2">
                {availableAliases.map((al) => (
                  <div
                    key={al.email}
                    className="inline-flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs"
                  >
                    <span className="font-bold text-slate-800">{al.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSendAs(al.email);
                        if (al.display_name && !editDisplayName) {
                          setEditDisplayName(al.display_name);
                        }
                      }}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white"
                    >
                      Set Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !editCustomAliases.some(
                            (a) => (a.email || '').toLowerCase() === al.email.toLowerCase()
                          )
                        ) {
                          setEditCustomAliases((prev) => [
                            ...prev,
                            { email: al.email, display_name: al.display_name || editDisplayName },
                          ]);
                        }
                      }}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold hover:bg-purple-600 hover:text-white"
                    >
                      + Multi-Alias
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Paired Webmail Aliases */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Additional Paired Webmail Aliases (Selectable in &quot;From:&quot; Dropdown)
            </label>
            <div className="flex flex-wrap gap-2">
              {editCustomAliases.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-purple-200 text-xs font-semibold text-purple-900 shadow-2xs"
                >
                  <span>
                    {item.display_name ? `${item.display_name} <${item.email}>` : item.email}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditCustomAliases((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              {editCustomAliases.length === 0 && (
                <span className="text-xs text-slate-400 italic">
                  No additional aliases configured. Add below if this mailbox has multiple webmail aliases.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="email"
                value={newAliasEmail}
                onChange={(e) => setNewAliasEmail(e.target.value)}
                placeholder="Alias email (e.g. director@flag.com)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              />
              <input
                type="text"
                value={newAliasName}
                onChange={(e) => setNewAliasName(e.target.value)}
                placeholder="Display Name (optional)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddCustomAlias}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                + Add Alias
              </Button>
            </div>
          </div>

          {/* Scope & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department / Module Scope
              </label>
              <TextField
                select
                fullWidth
                size="small"
                value={editScope}
                onChange={(e) => setEditScope(e.target.value)}
              >
                <MenuItem value="EXECUTIVE">Executive & Management (MD)</MenuItem>
                <MenuItem value="PROCESSING">Processing & Admissions</MenuItem>
                <MenuItem value="FEES">Fees & Accounts (FLAG)</MenuItem>
                <MenuItem value="HR">HR & Administration</MenuItem>
                <MenuItem value="SALES">Sales & Leads</MenuItem>
                <MenuItem value="GLOBAL">Global / All Modules</MenuItem>
              </TextField>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
              <TextField
                select
                fullWidth
                size="small"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
              >
                <MenuItem value="LP">Life Planner (LP)</MenuItem>
                <MenuItem value="FLAG">FLAG</MenuItem>
                <MenuItem value="FDS">FDS</MenuItem>
              </TextField>
            </div>
          </div>

          {/* Assigned Roles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Assign to Roles (Strict Role Data Separation)
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 max-h-36 overflow-y-auto">
              {(accessMeta.roles || []).map((r) => {
                const selected = editRoleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      setEditRoleIds((prev) =>
                        selected ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed CRM Pages */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Enabled CRM Pages for Mail-To & Thread Drawer
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(accessMeta.available_pages || []).map((page) => {
                const checked = editPages.includes(page.id);
                return (
                  <label
                    key={page.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditPages((prev) => [...prev, page.id]);
                        } else {
                          setEditPages((prev) => prev.filter((p) => p !== page.id));
                        }
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span className="truncate">{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </DialogContent>
        <DialogActions className="border-t border-slate-100 p-4">
          <Button
            onClick={() => setEditAccount(null)}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={savingEdit}
            sx={{ bgcolor: '#4f46e5', textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            {savingEdit ? 'Saving...' : 'Save Mailbox Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: CUSTOM ROLE MAILBOX OAUTH LAUNCHER */}
      <Dialog
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-extrabold text-slate-900 border-b border-slate-100">
          Connect New Gmail / Google Workspace Mailbox
        </DialogTitle>
        <DialogContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Module Scope</label>
              <TextField
                select
                fullWidth
                size="small"
                value={connectScope}
                onChange={(e) => setConnectScope(e.target.value)}
              >
                <MenuItem value="EXECUTIVE">Executive & Management (MD)</MenuItem>
                <MenuItem value="PROCESSING">Processing & Admissions</MenuItem>
                <MenuItem value="FEES">Fees & Accounts</MenuItem>
                <MenuItem value="HR">HR & Administration</MenuItem>
                <MenuItem value="SALES">Sales & Leads</MenuItem>
                <MenuItem value="GLOBAL">Global / All Modules</MenuItem>
              </TextField>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
              <TextField
                select
                fullWidth
                size="small"
                value={connectCompany}
                onChange={(e) => setConnectCompany(e.target.value)}
              >
                <MenuItem value="LP">Life Planner (LP)</MenuItem>
                <MenuItem value="FLAG">FLAG</MenuItem>
                <MenuItem value="FDS">FDS</MenuItem>
              </TextField>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assign to Role(s)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              {(accessMeta.roles || []).map((r) => {
                const active = connectRoleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      setConnectRoleIds((prev) =>
                        active ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Enable on CRM Pages
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(accessMeta.available_pages || []).map((p) => {
                const checked = connectPages.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setConnectPages((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                        )
                      }
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
        </DialogContent>
        <DialogActions className="border-t border-slate-100 p-4">
          <Button onClick={() => setConnectModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              handleConnectGmail(connectScope, connectCompany, connectRoleIds, connectPages)
            }
            sx={{ bgcolor: '#4f46e5', textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            Continue to Google Sign-In
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: ASSIGN MAILBOXES TO ROLE */}
      <Dialog
        open={Boolean(roleModalTarget)}
        onClose={() => setRoleModalTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-extrabold text-slate-900 border-b border-slate-100">
          Assign Mailboxes to Role: {roleModalTarget?.name}
        </DialogTitle>
        <DialogContent className="space-y-3 pt-4">
          <p className="text-xs text-slate-500">
            Select which connected mailboxes users with the{' '}
            <strong>{roleModalTarget?.name}</strong> role are permitted to view and send from:
          </p>
          {accounts.map((acc) => {
            const checked = roleModalAccountIds.includes(acc.id);
            return (
              <label
                key={acc.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  checked
                    ? 'border-indigo-500 bg-indigo-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setRoleModalAccountIds((prev) =>
                        e.target.checked
                          ? [...prev, acc.id]
                          : prev.filter((id) => id !== acc.id)
                      )
                    }
                    className="rounded text-indigo-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{acc.email}</p>
                    {acc.send_as_email && (
                      <p className="text-xs text-amber-700 font-semibold">
                        Webmail Alias: {acc.send_as_email}
                      </p>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                  {acc.module_scope}
                </span>
              </label>
            );
          })}
        </DialogContent>
        <DialogActions className="border-t border-slate-100 p-4">
          <Button onClick={() => setRoleModalTarget(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={savingRoleAssign}
            onClick={handleSaveRoleAssign}
            sx={{ bgcolor: '#4f46e5', textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            {savingRoleAssign ? 'Saving...' : 'Save Role Assignment'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MailAccounts;
