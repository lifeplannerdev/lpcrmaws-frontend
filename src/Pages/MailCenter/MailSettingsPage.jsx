import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { ArrowLeft, Settings2, Mail, PenSquare } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { MailAccounts } from './MailAccounts';
import { mailTheme } from './mailTheme';
import { useMailCompose } from '../../context/MailComposeContext';

export const MailSettingsPage = () => {
  const navigate = useNavigate();
  const { openMailComposer } = useMailCompose();

  return (
    <ThemeProvider theme={mailTheme}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-purple-50/50">
        <Navbar />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/mail-center')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 shadow-xs transition-all"
                title="Go to Mail Workspace"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Settings2 size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Mail Accounts & Role Settings
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Standalone mailbox control, webmail alias configuration, and role/employee data isolation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openMailComposer({ context_module: 'EXECUTIVE', context_label: 'Direct Email' })}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all"
              >
                <PenSquare size={15} />
                Quick Compose
              </button>
              <button
                type="button"
                onClick={() => navigate('/mail-center')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
              >
                <Mail size={15} />
                Open Mail Workspace (Inbox / Sent / Templates)
              </button>
            </div>
          </div>

          <MailAccounts returnPath="/mail-settings" />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default MailSettingsPage;
