import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Select, MenuItem, TextField, ThemeProvider } from '@mui/material';
import { ArrowLeft, RefreshCw, Send, Save, Trash, PenSquare, Mail } from 'lucide-react';
import MailEditor from '../../Components/Mail/MailEditor';
import { mailTheme } from './mailTheme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const lower = (v) => (v == null ? '' : String(v).toLowerCase());

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
        <ThemeProvider theme={mailTheme}>
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-indigo-50/60 to-purple-50/60">
            <header className="bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/processing-students')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all" title="Back to Processing Students" aria-label="Back">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-tight">Student Mail Panel</h1>
                        {studentEmail && <p className="text-xs text-gray-500">{studentEmail}</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outlined" startIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />} onClick={handleSync} disabled={isSyncing}>
                        Sync Threads
                    </Button>
                    <Button variant="contained" startIcon={<PenSquare className="w-4 h-4" />} onClick={handleCreateDraft}>
                        Compose New
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Timeline */}
                <div className="w-1/3 border-r border-gray-100 bg-white overflow-y-auto p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-bold text-gray-800">Conversation History</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">{messages.length}</span>
                    </div>
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
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selectedMessage?.id === msg.id ? 'border-indigo-400 bg-indigo-50/70 shadow-sm' : 'border-gray-200 hover:bg-gray-50 hover:border-indigo-200'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    msg.state === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    lower(msg.direction) === 'in' ? 'bg-indigo-100 text-indigo-800' :
                                    msg.state === 'sent' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {msg.state === 'draft' ? 'DRAFT' : lower(msg.direction) === 'in' ? 'INBOX' : 'SENT'}
                                </span>
                                <span className="text-xs text-gray-500">{msg.effective_time ? new Date(msg.effective_time).toLocaleString() : ''}</span>
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 truncate">{msg.subject || '(No subject)'}</h3>
                            <p className="text-xs text-gray-500 mt-1 truncate">{lower(msg.direction) === 'in' ? `From: ${msg.from_email}` : `To: ${(msg.to || []).join(', ')}`}</p>
                        </div>
                    ))}
                    {messages.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No emails found.</p>}
                </div>

                {/* Center: Composer or Reader */}
                <div className="flex-1 flex flex-col min-w-0">
                    {isDraft ? (
                        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col gap-4">
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
                                        value={(draft.to || []).join(', ')}
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
                                <div className="mt-4 border-t border-gray-100 pt-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Signature</h4>
                                    <div dangerouslySetInnerHTML={{ __html: draft.signature_html }} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl min-h-[50px] border border-dashed border-gray-300" />
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
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedMessage.subject}</h2>
                                <div className="flex justify-between text-sm text-gray-600 border-b border-gray-100 pb-4 mb-4">
                                    <div>
                                        <p><strong>From:</strong> {selectedMessage.from_email || selectedMessage.account_email}</p>
                                        <p><strong>To:</strong> {(selectedMessage.to || []).join(', ')}</p>
                                    </div>
                                    <div>
                                        <p>{selectedMessage.effective_time ? new Date(selectedMessage.effective_time).toLocaleString() : ''}</p>
                                    </div>
                                </div>
                                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />
                                
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                                            <Paperclip size={16} /> Attachments
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedMessage.attachments.map(att => (
                                                <a 
                                                    key={att.id}
                                                    href={`${API_BASE_URL}/mail/attachments/${att.id}/download/?token=${accessToken}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer group text-sm"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-800 group-hover:text-indigo-700 truncate max-w-[200px]">
                                                            {att.filename || att.document_name || 'Attachment'}
                                                        </span>
                                                        {att.size > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                {(att.size / 1024).toFixed(1)} KB
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Download size={14} className="text-gray-400 group-hover:text-indigo-600 ml-1" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <Mail size={42} className="text-gray-300" />
                            <span>Select a message or compose a new one</span>
                        </div>
                    )}
                </div>

                {/* Right: Templates */}
                {isDraft && (
                    <div className="w-1/4 border-l border-gray-100 bg-white overflow-y-auto p-4">
                        <h2 className="font-bold text-gray-800 mb-4">Insert Template</h2>
                        <div className="space-y-3">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all" onClick={() => applyTemplate(tpl)}>
                                    <p className="font-medium text-sm">{tpl.name}</p>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{tpl.subject}</p>
                                </div>
                            ))}
                            {templates.length === 0 && <p className="text-xs text-gray-400">No templates available.</p>}
                        </div>
                        
                        <h2 className="font-bold text-gray-800 mt-8 mb-4">Insert Signature</h2>
                        <div className="space-y-3">
                            {signatures.map(sig => (
                                <div key={sig.id} className="p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all" onClick={() => applySignature(sig)}>
                                    <p className="font-medium text-sm">{sig.name}</p>
                                </div>
                            ))}
                            {signatures.length === 0 && <p className="text-xs text-gray-400">No signatures available.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </ThemeProvider>
    );
};

export default StudentMailPage;
