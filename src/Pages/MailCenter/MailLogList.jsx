import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Button, Chip } from '@mui/material';
import { RefreshCw, CloudDownload } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailLogList = ({ stateFilter, directionFilter }) => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    
    useEffect(() => {
        if (accessToken) {
            fetchMessages();
        }
    }, [accessToken, stateFilter, directionFilter]);

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

    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const fetchMessages = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/messages/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            let data = res.data.results || res.data;
            if (stateFilter) {
                data = data.filter(m => m.state === stateFilter);
            }
            if (directionFilter) {
                data = data.filter(m => m.direction === directionFilter);
            }
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    return (
        <div className='bg-white rounded shadow overflow-hidden'>
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-700">Email Logs</h3>
                <div className="flex gap-2">
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
            <Table>
                <TableHead className='bg-gray-50'>
                    <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>To / From</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {messages.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className='text-center py-8 text-gray-500'>No emails found.</TableCell></TableRow>
                    ) : messages.map(msg => (
                        <TableRow key={msg.id} hover>
                            <TableCell className='font-medium'>{msg.student_name || 'Unknown'}</TableCell>
                            <TableCell>{msg.subject || '(no subject)'}</TableCell>
                            <TableCell className='text-sm text-gray-500'>
                                {msg.direction === 'OUT' ? `To: ${msg.to.join(', ')}` : `From: ${msg.from_email}`}
                            </TableCell>
                            <TableCell className='text-sm text-gray-500'>
                                {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button size='small' variant='outlined' onClick={() => navigate(`/processing-students/${msg.student}/mail`)}>
                                        View Thread
                                    </Button>
                                    <Button size='small' variant='outlined' color='error' onClick={() => handleDelete(msg.id)}>
                                        Delete
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
