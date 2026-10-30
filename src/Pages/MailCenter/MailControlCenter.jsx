import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tabs, Tab, ThemeProvider } from '@mui/material';
import {
  ArrowLeft,
  Mail,
  Settings2,
  PenSquare,
  Crown,
  GraduationCap,
  Landmark,
  Users,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { MailTemplates } from './MailTemplates';
import { MailSignatures } from './MailSignatures';
import { MailAccounts } from './MailAccounts';
import { MailLogList } from './MailLogList';
import { mailTheme } from './mailTheme';
import { useMailCompose } from '../../context/MailComposeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const WORKSPACE_SCOPES = [
  { id: 'EXECUTIVE', label: 'Executive & MD Workspace', Icon: Crown },
  { id: 'PROCESSING', label: 'Processing & Admissions', Icon: GraduationCap },
  { id: 'FEES', label: 'Fees & Accounts (FLAG)', Icon: Landmark },
  { id: 'HR', label: 'HR & Administration', Icon: Users },
  { id: 'SALES', label: 'Sales & Leads', Icon: Layers },
  { id: 'ALL', label: 'All Mailboxes (Admin Audit)', Icon: ShieldCheck },
];

export const MailControlCenter = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { openMailComposer } = useMailCompose();
  const [tab, setTab] = useState(0);
  const [accessMeta, setAccessMeta] = useState({
    can_manage: false,
    can_use: true,
    default_scope: 'EXECUTIVE',
    user_roles: [],
  });
  const [activeScope, setActiveScope] = useState('');

  const fetchMeta = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/mail/accounts/access_metadata/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAccessMeta(res.data);
      setActiveScope((prev) => prev || res.data.default_scope || 'PROCESSING');
    } catch (err) {
      setActiveScope((prev) => prev || 'PROCESSING');
    }
  }, [accessToken]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const currentScopeObj =
    WORKSPACE_SCOPES.find((s) => s.id === activeScope) || WORKSPACE_SCOPES[0];

  return (
    <ThemeProvider theme={mailTheme}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/60 to-purple-50/60">
        <Navbar />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Mail size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                    Mail Control Center
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {currentScopeObj.label}
                  </span>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
                  Role-isolated Inbox, Sent Mail, Drafts, Templates, Signatures &amp; Multi-Alias Thread Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Scope Workspace Switcher for mail:manage (MD / Admin) */}
              {accessMeta.can_manage && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Workspace:
                  </span>
                  <select
                    value={activeScope}
                    onChange={(e) => setActiveScope(e.target.value)}
                    className="text-xs font-bold text-indigo-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {WORKSPACE_SCOPES.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/mail-settings')}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all"
              >
                <Settings2 size={15} />
                Mail Accounts &amp; Role Settings
              </button>

              <button
                type="button"
                onClick={() =>
                  openMailComposer({
                    context_module:
                      activeScope && activeScope !== 'ALL' ? activeScope : 'EXECUTIVE',
                    context_label: `${currentScopeObj.label} • Direct Email`,
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
              >
                <PenSquare size={15} />
                Compose New Mail
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 mb-6 px-2">
            <Tabs
              value={tab}
              onChange={(e, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Accounts & Settings" />
              <Tab label="Templates" />
              <Tab label="Signatures" />
              <Tab label="Drafts" />
              <Tab label="Sent Mail" />
              <Tab label="Inbox" />
            </Tabs>
          </div>

          {tab === 0 && <MailAccounts returnPath="/mail-center" />}
          {tab === 1 && <MailTemplates moduleScope={activeScope} />}
          {tab === 2 && <MailSignatures moduleScope={activeScope} />}
          {tab === 3 && <MailLogList stateFilter="draft" moduleScope={activeScope} />}
          {tab === 4 && (
            <MailLogList stateFilter="sent" directionFilter="out" moduleScope={activeScope} />
          )}
          {tab === 5 && (
            <MailLogList stateFilter="received" directionFilter="in" moduleScope={activeScope} />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default MailControlCenter;
