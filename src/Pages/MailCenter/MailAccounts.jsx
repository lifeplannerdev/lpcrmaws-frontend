import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import { Mail, Plus, RefreshCw, Unplug, CheckCircle2, AlertTriangle, Settings2, ShieldCheck, Landmark, GraduationCap } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailAccounts = () => {
    const { accessToken } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterScope, setFilterScope] = useState('ALL'); // ALL, FEES, PROCESSING

    // Edit modal state
    const [editAccount, setEditAccount] = useState(null);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editSendAs, setEditSendAs] = useState('');
    const [editScope, setEditScope] = useState('FEES');
    const [editCompany, setEditCompany] = useState('FLAG');
    const [availableAliases, setAvailableAliases] = useState([]);
    const [fetchingAliases, setFetchingAliases] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

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

    const handleConnectGmail = async (scope = 'PROCESSING', company = 'FLAG') => {
        try {
            sessionStorage.setItem('gmail_oauth_module_scope', scope);
            sessionStorage.setItem('gmail_oauth_company', company);
            const res = await axios.get(`${API_BASE_URL}/mail/authorize/?module_scope=${scope}&company=${company}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (res.data.authorization_url) {
                window.location.href = res.data.authorization_url;
            }
        } catch (error) {
            toast.error("Failed to start connection flow");
        }
    };

    const handleOpenEdit = async (acc) => {
        setEditAccount(acc);
        setEditDisplayName(acc.display_name || '');
        setEditSendAs(acc.send_as_email || '');
        setEditScope(acc.module_scope || 'PROCESSING');
        setEditCompany(acc.company || 'FLAG');
        setAvailableAliases([]);

        // Auto-fetch aliases configured in the Gmail account
        try {
            setFetchingAliases(true);
            const res = await axios.get(`${API_BASE_URL}/mail/accounts/${acc.id}/send_as_aliases/`, {
                headers: { Authorization: `Bearer ${accessToken}` }
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

    const handleSaveEdit = async () => {
        if (!editAccount) return;
        setSavingEdit(true);
        try {
            await axios.patch(`${API_BASE_URL}/mail/accounts/${editAccount.id}/`, {
                display_name: editDisplayName,
                send_as_email: editSendAs,
                module_scope: editScope,
                company: editCompany,
            }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            toast.success('Mailbox settings updated successfully');
            setEditAccount(null);
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update mailbox settings');
        } finally {
            setSavingEdit(false);
        }
    };

    const filteredAccounts = accounts.filter(acc => {
        if (filterScope === 'ALL') return true;
        return (acc.module_scope || 'PROCESSING').toUpperCase() === filterScope;
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Connected Mailboxes</h2>
                    <p className="text-sm text-gray-500">
                        Separate Gmail and Webmail accounts for Admissions and FLAG Fees & Accounts
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleConnectGmail('FEES', 'FLAG')}
                        startIcon={<Landmark size={16} />}
                        sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', borderRadius: '10px' }}
                    >
                        Connect Fees Mailbox (FLAG)
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleConnectGmail('PROCESSING', 'LP')}
                        startIcon={<GraduationCap size={16} />}
                        sx={{ textTransform: 'none', borderRadius: '10px' }}
                    >
                        Connect Admissions Mailbox
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Filter Scope:</span>
                {[
                    { id: 'ALL', label: `All (${accounts.length})` },
                    { id: 'FEES', label: `Fees & Accounts (${accounts.filter(a => a.module_scope === 'FEES').length})` },
                    { id: 'PROCESSING', label: `Processing & Admissions (${accounts.filter(a => a.module_scope !== 'FEES').length})` },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterScope(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterScope === tab.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredAccounts.map(acc => {
                    const connected = acc.status === 'connected';
                    const isFees = (acc.module_scope || '').toUpperCase() === 'FEES';
                    return (
                        <div
                            key={acc.id}
                            className={`border transition-all p-5 rounded-2xl flex justify-between items-start gap-4 bg-white shadow-sm hover:shadow-md ${
                                isFees ? 'border-emerald-200 hover:border-emerald-300' : 'border-gray-200 hover:border-indigo-200'
                            }`}
                        >
                            <div className="flex items-start gap-4 min-w-0">
                                <div
                                    className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${
                                        isFees ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}
                                >
                                    {isFees ? <Landmark size={24} /> : <Mail size={22} />}
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-900 truncate text-base">{acc.email}</h3>
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}
                                        >
                                            {connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                            {(acc.status || 'unknown').toUpperCase()}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 text-sm truncate font-medium">
                                        {acc.display_name || 'No display name'}
                                    </p>

                                    {/* Send As / Webmail Alias Badge */}
                                    {acc.send_as_email && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs border border-amber-200">
                                            <ShieldCheck size={13} className="text-amber-600 shrink-0" />
                                            <span>
                                                Webmail Sender Alias: <strong>{acc.send_as_email}</strong>
                                            </span>
                                        </div>
                                    )}

                                    {/* Module Scope & Company Tags */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <span
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                                                isFees ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                                            }`}
                                        >
                                            {isFees ? 'Fees & Accounts' : 'Processing & Admissions'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">
                                            {acc.company || 'FLAG'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleOpenEdit(acc)}
                                    startIcon={<Settings2 size={14} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Configure
                                </Button>
                                {!connected && (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        onClick={() => handleConnectGmail(acc.module_scope, acc.company)}
                                        startIcon={<RefreshCw size={14} />}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Reconnect
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => handleDeleteAccount(acc.id)}
                                    startIcon={<Unplug size={14} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Disconnect
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {!loading && filteredAccounts.length === 0 && (
                    <div className="col-span-full text-center py-12 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                        <Mail className="mx-auto text-gray-300 mb-2" size={36} />
                        <p className="text-gray-500 font-medium">No mailboxes connected in this scope.</p>
                        <p className="text-gray-400 text-xs mt-1">
                            Click &quot;Connect Fees Mailbox (FLAG)&quot; to connect <code>jayeshlifeplanner@gmail.com</code>
                        </p>
                    </div>
                )}
            </div>

            {/* Configure Mailbox Dialog */}
            <Dialog open={Boolean(editAccount)} onClose={() => setEditAccount(null)} maxWidth="sm" fullWidth>
                <DialogTitle className="font-bold text-gray-800 border-b border-gray-100">
                    Configure Mailbox Settings
                </DialogTitle>
                <DialogContent className="space-y-4 pt-4">
                    <p className="text-xs text-gray-500 mb-3">
                        Configuring Google Workspace account: <strong>{editAccount?.email}</strong>
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Display Name (Sender Header)</label>
                        <TextField
                            fullWidth
                            size="small"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="e.g. FLAG Accounts & Finance"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-700">
                                Send-As Webmail Alias (From Header)
                            </label>
                            {fetchingAliases && <span className="text-[11px] text-indigo-600 animate-pulse">Detecting aliases...</span>}
                        </div>
                        <TextField
                            fullWidth
                            size="small"
                            value={editSendAs}
                            onChange={(e) => setEditSendAs(e.target.value)}
                            placeholder="e.g. accounts@lifeplanneruniversal.com"
                            helperText="Leave empty to send directly from the primary Gmail address"
                        />

                        {availableAliases.length > 0 && (
                            <div className="mt-2 p-2 bg-indigo-50/60 rounded-lg border border-indigo-100">
                                <p className="text-[11px] font-bold text-indigo-900 mb-1">Detected Send-As Aliases from Gmail:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {availableAliases.map((al) => (
                                        <button
                                            key={al.email}
                                            type="button"
                                            onClick={() => {
                                                setEditSendAs(al.email);
                                                if (al.display_name && !editDisplayName) {
                                                    setEditDisplayName(al.display_name);
                                                }
                                            }}
                                            className="px-2 py-1 bg-white border border-indigo-200 text-indigo-700 text-xs rounded hover:bg-indigo-600 hover:text-white transition-all font-medium"
                                        >
                                            {al.email} {al.display_name ? `(${al.display_name})` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Module Scope (Strict Isolation)</label>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={editScope}
                                onChange={(e) => setEditScope(e.target.value)}
                            >
                                <MenuItem value="FEES">Fees & Accounts (FLAG)</MenuItem>
                                <MenuItem value="PROCESSING">Processing & Admissions</MenuItem>
                                <MenuItem value="GLOBAL">Global / All Modules</MenuItem>
                            </TextField>
                            <p className="text-[11px] text-gray-400 mt-1">
                                {editScope === 'FEES'
                                    ? 'Isolates this mailbox exclusively to digital fee receipts and finance notifications.'
                                    : 'Isolates this mailbox to study abroad student processing and admissions.'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Company</label>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                            >
                                <MenuItem value="FLAG">FLAG</MenuItem>
                                <MenuItem value="LP">Life Planner (LP)</MenuItem>
                                <MenuItem value="FDS">FDS</MenuItem>
                            </TextField>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions className="border-t border-gray-100 p-4">
                    <Button onClick={() => setEditAccount(null)} color="inherit" sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        disabled={savingEdit}
                        sx={{ bgcolor: '#4f46e5', textTransform: 'none' }}
                    >
                        {savingEdit ? 'Saving...' : 'Save Mailbox Settings'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
