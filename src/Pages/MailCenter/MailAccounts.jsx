import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '@mui/material';
import { Mail, Plus, RefreshCw, Unplug, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailAccounts = () => {
    const { accessToken } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/accounts/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setAccounts(res.data.results || res.data);
        } catch (error) {
            toast.error("Failed to load accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDeleteAccount = async (id) => {
        if (!window.confirm('Are you sure you want to disconnect this account?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/accounts/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success('Account disconnected');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to disconnect account');
        }
    };

    const handleConnectGmail = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/authorize/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.data.authorization_url) {
                window.location.href = res.data.authorization_url;
            }
        } catch (error) {
            toast.error("Failed to start connection flow");
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Connected Accounts</h2>
                    <p className="text-sm text-gray-500">Gmail accounts used to send and sync student emails</p>
                </div>
                <Button variant="contained" onClick={handleConnectGmail} startIcon={<Plus size={16} />}>
                    Connect New Gmail
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {accounts.map(acc => {
                    const connected = acc.status === 'connected';
                    return (
                        <div key={acc.id} className="border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all p-5 rounded-2xl flex justify-between items-center gap-4 bg-white">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Mail size={22} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate">{acc.email}</h3>
                                    <p className="text-gray-500 text-sm truncate">{acc.display_name || 'No display name'}</p>
                                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                        {(acc.status || 'unknown').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!connected && (
                                    <Button variant="outlined" color="warning" size="small" onClick={handleConnectGmail} startIcon={<RefreshCw size={14} />}>
                                        Reconnect
                                    </Button>
                                )}
                                <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteAccount(acc.id)} startIcon={<Unplug size={14} />}>
                                    Disconnect
                                </Button>
                            </div>
                        </div>
                    );
                })}
                {!loading && accounts.length === 0 && (
                    <div className="col-span-full text-center py-12 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                        <Mail className="mx-auto text-gray-300 mb-2" size={36} />
                        <p className="text-gray-500">No accounts connected yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
