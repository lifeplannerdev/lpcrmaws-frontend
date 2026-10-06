import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { RefreshCw, CloudDownload, Search, X, MessageSquare, Trash2, Inbox } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const lower = (v) => (v == null ? '' : String(v).toLowerCase());

export const MailLogList = ({ stateFilter, directionFilter }) => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/messages/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            let data = res.data.results || res.data;
            if (stateFilter) {
                data = data.filter(m => lower(m.state) === lower(stateFilter));
            }
            if (directionFilter) {
                data = data.filter(m => lower(m.direction) === lower(directionFilter));
            }
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
            toast.error('Failed to load emails');
        } finally {
            setLoading(false);
        }
    }, [accessToken, stateFilter, directionFilter]);

    useEffect(() => {
        if (accessToken) {
            setLoading(true);
            fetchMessages();
        }
    }, [accessToken, fetchMessages]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this email log? If this is a Draft, it will also be deleted from Gmail.')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/messages/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Message deleted");
            fetchMessages();
        } catch (error) {
            toast.error("Failed to delete message");
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await axios.post(`${API_BASE_URL}/mail/messages/sync_all/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success('Background sync started. Click Refresh in a few moments.');
        } catch (error) {
            toast.error('Failed to start sync');
        }
        setIsSyncing(false);
    };
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchMessages();
        setIsRefreshing(false);
    };

    const q = query.trim().toLowerCase();
    const visible = messages.filter(m => !q || [
        m.student_name, m.subject, m.from_email, ...(Array.isArray(m.to) ? m.to : [])
    ].some(v => lower(v).includes(q)));

    const title = stateFilter === 'draft' ? 'Drafts' : stateFilter === 'sent' ? 'Sent Mail' : stateFilter === 'received' ? 'Inbox' : 'Email Logs';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center flex-wrap gap-3 p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/60">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">{visible.length}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search student, subject, email..."
                            className="pl-9 pr-8 py-2 w-64 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Clear search">
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
                        {isSyncing ? 'Starting Sync...' : 'Sync All Gmail Accounts'}
                    </Button>
                    <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        startIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell>Subject</TableCell>
                            <TableCell>To / From</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                <div className="flex justify-center"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div></div>
                            </TableCell></TableRow>
                        ) : visible.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                <Inbox className="mx-auto text-gray-300 mb-2" size={34} />
                                <span className="text-gray-500">No emails found.</span>
                            </TableCell></TableRow>
                        ) : visible.map(msg => (
                            <TableRow key={msg.id} hover>
                                <TableCell className='font-medium'>{msg.student_name || 'Unknown'}</TableCell>
                                <TableCell>{msg.subject || '(no subject)'}</TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                    {lower(msg.direction) === 'out' ? `To: ${(msg.to || []).join(', ')}` : `From: ${msg.from_email || ''}`}
                                </TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                    {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button size='small' variant='outlined' startIcon={<MessageSquare size={14} />} onClick={() => navigate(`/processing-students/${msg.student}/mail`)}>
                                            View Thread
                                        </Button>
                                        <Button size='small' variant='outlined' color='error' startIcon={<Trash2 size={14} />} onClick={() => handleDelete(msg.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
