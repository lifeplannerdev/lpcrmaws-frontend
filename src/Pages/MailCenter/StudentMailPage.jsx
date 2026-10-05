import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Select, MenuItem, TextField } from '@mui/material';
import { ArrowLeft, RefreshCw, Send, Save, Trash } from 'lucide-react';
import MailEditor from '../../Components/Mail/MailEditor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const StudentMailPage = () => {
    const { accessToken } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [signatures, setSignatures] = useState([]);
    
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isDraft, setIsDraft] = useState(false);
    
    // Draft form state
    const [draft, setDraft] = useState({
        account: '',
        to: [],
        subject: '',
        body_html: '',
        signature_html: ''
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [studentEmail, setStudentEmail] = useState('');

    const fetchData = async () => {
        try {
            try {
                const studentRes = await axios.get(`${API_BASE_URL}/processing-students/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
                setStudentEmail(studentRes.data.email || '');
            } catch (err) {
                console.error("Failed to load student", err);
            }
            
            const msgRes = await axios.get(`${API_BASE_URL}/mail/messages/?student_id=${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setMessages(msgRes.data.results || msgRes.data);
            
            const accRes = await axios.get(`${API_BASE_URL}/mail/accounts/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setAccounts(accRes.data.results || accRes.data);
            
            const tplRes = await axios.get(`${API_BASE_URL}/mail/templates/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setTemplates(tplRes.data.results || tplRes.data);
            
            const sigRes = await axios.get(`${API_BASE_URL}/mail/signatures/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setSignatures(sigRes.data.results || sigRes.data);

        } catch (error) {
            toast.error("Failed to load mail data.");
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await axios.post(`${API_BASE_URL}/mail/messages/sync/`, { student_id: id }, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Inbox synced");
            fetchData();
        } catch (error) {
            toast.error("Sync failed");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCreateDraft = () => {
        setSelectedMessage(null);
        setIsDraft(true);
        setDraft({
            account: accounts.length > 0 ? accounts[0].id : '',
            to: studentEmail ? [studentEmail] : [''],
            subject: '',
            body_html: '',
            signature_html: ''
        });
    };

    const handleSaveDraft = async () => {
        try {
            const payload = { ...draft, student: id };
            if (selectedMessage && selectedMessage.id) {
                await axios.put(`${API_BASE_URL}/mail/messages/${selectedMessage.id}/`, payload, { headers: { Authorization: `Bearer ${accessToken}` } });
                toast.success("Draft updated");
            } else {
                await axios.post(`${API_BASE_URL}/mail/messages/`, payload, { headers: { Authorization: `Bearer ${accessToken}` } });
                toast.success("Draft saved");
            }
            fetchData();
        } catch (error) {
            toast.error("Failed to save draft");
        }
    };

    const handleSendDraft = async () => {
        try {
            let draftId = selectedMessage?.id;
            const payload = { ...draft, student: id };
            if (draftId) {
                await axios.put(`${API_BASE_URL}/mail/messages/${draftId}/`, payload, { headers: { Authorization: `Bearer ${accessToken}` } });
            } else {
                const res = await axios.post(`${API_BASE_URL}/mail/messages/`, payload, { headers: { Authorization: `Bearer ${accessToken}` } });
                draftId = res.data.id;
            }
            
            await axios.post(`${API_BASE_URL}/mail/messages/${draftId}/send/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Email sent!");
            setIsDraft(false);
            fetchData();
        } catch (error) {
            toast.error("Failed to send email");
        }
    };

    const handleDiscard = async () => {
        if (selectedMessage && selectedMessage.id) {
            try {
                await axios.delete(`${API_BASE_URL}/mail/messages/${selectedMessage.id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
                toast.success("Draft discarded");
            } catch (err) {
                toast.error("Failed to discard draft");
            }
        }
        setIsDraft(false);
        setSelectedMessage(null);
        fetchData();
    };

    const applyTemplate = (tpl) => {
        setDraft(prev => ({
            ...prev,
            subject: tpl.subject,
            body_html: tpl.body_html
        }));
    };

    const applySignature = (sig) => {
        setDraft(prev => ({
            ...prev,
            signature_html: sig.body_html
        }));
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/processing-students')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Student Mail Panel</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outlined" startIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />} onClick={handleSync}>
                        Sync Threads
                    </Button>
                    <Button variant="contained" onClick={handleCreateDraft}>
                        Compose New
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Timeline */}
                <div className="w-1/3 border-r bg-white overflow-y-auto p-4 space-y-4">
                    <h2 className="font-semibold text-gray-700 mb-4">Conversation History</h2>
                    {messages.map(msg => (
                        <div 
                            key={msg.id} 
                            onClick={() => {
                                setSelectedMessage(msg);
                                if (msg.state === 'draft') {
                                    setIsDraft(true);
                                    setDraft({
                                        account: msg.account || '',
                                        to: msg.to || [],
                                        subject: msg.subject || '',
                                        body_html: msg.body_html || '',
                                        signature_html: msg.signature_html || ''
                                    });
                                } else {
                                    setIsDraft(false);
                                }
                            }}
                            className={`p-3 rounded border cursor-pointer ${selectedMessage?.id === msg.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    msg.state === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    msg.direction === 'in' ? 'bg-indigo-100 text-indigo-800' :
                                    msg.state === 'sent' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {msg.state === 'draft' ? 'DRAFT' : msg.direction === 'in' ? 'INBOX' : 'SENT'}
                                </span>
                                <span className="text-xs text-gray-500">{new Date(msg.effective_time).toLocaleString()}</span>
                            </div>
                            <h3 className="font-medium text-sm text-gray-900 truncate">{msg.subject || '(No subject)'}</h3>
                            <p className="text-xs text-gray-500 mt-1 truncate">{msg.direction === 'in' ? `From: ${msg.from_email}` : `To: ${(msg.to || []).join(', ')}`}</p>
                        </div>
                    ))}
                    {messages.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No emails found.</p>}
                </div>

                {/* Center: Composer or Reader */}
                <div className="flex-1 bg-gray-50 flex flex-col">
                    {isDraft ? (
                        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                            <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <label className="w-20 text-sm font-medium text-gray-700">From</label>
                                    <Select 
                                        size="small" 
                                        className="flex-1"
                                        value={draft.account}
                                        onChange={e => setDraft({...draft, account: e.target.value})}
                                    >
                                        {accounts.map(acc => (
                                            <MenuItem key={acc.id} value={acc.id}>{acc.display_name} ({acc.email})</MenuItem>
                                        ))}
                                    </Select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="w-20 text-sm font-medium text-gray-700">To</label>
                                    <TextField 
                                        size="small" 
                                        className="flex-1"
                                        placeholder="Comma separated emails"
                                        value={draft.to.join(', ')}
                                        onChange={e => setDraft({...draft, to: e.target.value.split(',').map(s => s.trim())})}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="w-20 text-sm font-medium text-gray-700">Subject</label>
                                    <TextField 
                                        size="small" 
                                        className="flex-1"
                                        value={draft.subject}
                                        onChange={e => setDraft({...draft, subject: e.target.value})}
                                    />
                                </div>
                                <div className="flex-1 mt-4">
                                    <MailEditor 
                                        content={draft.body_html}
                                        onChange={html => setDraft({...draft, body_html: html})}
                                    />
                                </div>
                                <div className="mt-4 border-t pt-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Signature</h4>
                                    <div dangerouslySetInnerHTML={{ __html: draft.signature_html }} className="text-sm text-gray-600 bg-gray-50 p-3 rounded min-h-[50px] border border-dashed" />
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <Button color="error" onClick={handleDiscard} startIcon={<Trash className="w-4 h-4" />}>Discard</Button>
                                    <div className="flex gap-2">
                                        <Button variant="outlined" startIcon={<Save className="w-4 h-4" />} onClick={handleSaveDraft}>Save Draft</Button>
                                        <Button variant="contained" startIcon={<Send className="w-4 h-4" />} onClick={handleSendDraft}>Send</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedMessage ? (
                        <div className="p-6 overflow-y-auto">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-xl font-bold mb-4">{selectedMessage.subject}</h2>
                                <div className="flex justify-between text-sm text-gray-600 border-b pb-4 mb-4">
                                    <div>
                                        <p><strong>From:</strong> {selectedMessage.from_email || selectedMessage.account_email}</p>
                                        <p><strong>To:</strong> {(selectedMessage.to || []).join(', ')}</p>
                                    </div>
                                    <div>
                                        <p>{new Date(selectedMessage.effective_time).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a message or compose a new one
                        </div>
                    )}
                </div>

                {/* Right: Templates */}
                {isDraft && (
                    <div className="w-1/4 border-l bg-white overflow-y-auto p-4">
                        <h2 className="font-semibold text-gray-700 mb-4">Insert Template</h2>
                        <div className="space-y-3">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="p-3 border rounded cursor-pointer hover:bg-gray-50 hover:border-blue-300" onClick={() => applyTemplate(tpl)}>
                                    <p className="font-medium text-sm">{tpl.name}</p>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{tpl.subject}</p>
                                </div>
                            ))}
                        </div>
                        
                        <h2 className="font-semibold text-gray-700 mt-8 mb-4">Insert Signature</h2>
                        <div className="space-y-3">
                            {signatures.map(sig => (
                                <div key={sig.id} className="p-3 border rounded cursor-pointer hover:bg-gray-50 hover:border-blue-300" onClick={() => applySignature(sig)}>
                                    <p className="font-medium text-sm">{sig.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentMailPage;
