import { useAuth } from '../../context/AuthContext';
import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { MailTemplates } from './MailTemplates';
import { MailSignatures } from './MailSignatures';
import { MailAccounts } from './MailAccounts';

export const MailControlCenter = () => {
    const { accessToken } = useAuth();
    const [tab, setTab] = useState(0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Mail Control Center</h1>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Accounts & Settings" />
                    <Tab label="Templates" />
                    <Tab label="Signatures" />
                </Tabs>
            </Box>

            {tab === 0 && <MailAccounts />}
            {tab === 1 && <MailTemplates />}
            {tab === 2 && <MailSignatures />}
        </div>
    );
};

export default MailControlCenter;
