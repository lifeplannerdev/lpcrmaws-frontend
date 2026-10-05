import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '@mui/material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailAccounts = () => {
    const [accounts, setAccounts] = useState([]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/accounts/`, { withCredentials: true });
            setAccounts(res.data.results || res.data);
        } catch (error) {
            toast.error("Failed to load accounts");
        }
    };

    useEffect(() => {
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnectGmail = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/authorize/`, { withCredentials: true });
            if (res.data.authorization_url) {
                window.location.href = res.data.authorization_url;
            }
        } catch (error) {
            toast.error("Failed to start connection flow");
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Connected Accounts</h2>
                <Button variant="contained" onClick={handleConnectGmail}>
                    Connect New Gmail
                </Button>
            </div>
            
            <div className="space-y-4">
                {accounts.map(acc => (
                    <div key={acc.id} className="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
                        <div>
                            <h3 className="font-bold text-lg">{acc.email}</h3>
                            <p className="text-gray-600">{acc.display_name || 'No display name'}</p>
                            <p className={`text-sm font-semibold mt-1 ${acc.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                                Status: {acc.status.toUpperCase()}
                            </p>
                        </div>
                        <div>
                            {acc.status !== 'connected' && (
                                <Button variant="outlined" color="warning" onClick={handleConnectGmail}>
                                    Reconnect
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
                {accounts.length === 0 && (
                    <p className="text-gray-500">No accounts connected yet.</p>
                )}
            </div>
        </div>
    );
};
