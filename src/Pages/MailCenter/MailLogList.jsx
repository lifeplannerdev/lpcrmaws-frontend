import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Button, Chip } from '@mui/material';

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
                                <Button size='small' variant='outlined' onClick={() => navigate(`/processing-students/${msg.student}/mail`)}>
                                    View Thread
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
