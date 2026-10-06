import { useAuth } from '../../context/AuthContext';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab, ThemeProvider } from '@mui/material';
import { ArrowLeft, Mail } from 'lucide-react';
import { MailTemplates } from './MailTemplates';
import { MailSignatures } from './MailSignatures';
import { MailAccounts } from './MailAccounts';
import { MailLogList } from './MailLogList';
import { mailTheme } from './mailTheme';

export const MailControlCenter = () => {
    // eslint-disable-next-line no-unused-vars
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);

    return (
        <ThemeProvider theme={mailTheme}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/60 to-purple-50/60">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/processing-students')}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all"
                                title="Back to Processing Students"
                                aria-label="Back to Processing Students"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                                <Mail size={22} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                                    Mail Control Center
                                </h1>
                                <p className="text-gray-600 text-sm">Manage Gmail accounts, templates, signatures and email logs</p>
                            </div>
                        </div>
                    </div>

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

                    {tab === 0 && <MailAccounts />}
                    {tab === 1 && <MailTemplates />}
                    {tab === 2 && <MailSignatures />}
                    {tab === 3 && <MailLogList stateFilter="draft" />}
                    {tab === 4 && <MailLogList stateFilter="sent" directionFilter="out" />}
                    {tab === 5 && <MailLogList stateFilter="received" directionFilter="in" />}
                </div>
            </div>
        </ThemeProvider>
    );
};

export default MailControlCenter;
