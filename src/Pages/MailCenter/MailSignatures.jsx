import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Dialog, TextField, FormControlLabel, Switch } from '@mui/material';
import MailEditor from '../../Components/Mail/MailEditor';
import { CloudDownload, Plus, PenLine, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailSignatures = () => {
    const { accessToken } = useAuth();
    const [signatures, setSignatures] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [currentSignature, setCurrentSignature] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchSignatures = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/mail/signatures/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setSignatures(res.data.results || res.data);
        } catch (error) {
            toast.error("Failed to load signatures");
        }
    };

    useEffect(() => {
        fetchSignatures();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleImportGmail = async () => {
        setIsImporting(true);
        try {
            const accRes = await axios.get(`${API_BASE_URL}/mail/accounts/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            const accounts = accRes.data.results || accRes.data;
            if (accounts.length === 0) {
                toast.error("No connected Gmail accounts found.");
                setIsImporting(false);
                return;
            }
            
            let totalImported = 0;
            for (const acc of accounts) {
                try {
                    const res = await axios.post(`${API_BASE_URL}/mail/accounts/${acc.id}/fetch_signatures/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
                    totalImported += res.data.imported || 0;
                } catch (e) {
                    console.error(`Failed to import for account ${acc.id}`, e);
                }
            }
            toast.success(`Imported/Updated ${totalImported} signatures from Gmail`);
            fetchSignatures();
        } catch (error) {
            toast.error("Failed to import signatures");
        }
        setIsImporting(false);
    };

    const handleDelete = async () => {
        if (!currentSignature || !currentSignature.id) return;
        if (!window.confirm('Are you sure you want to delete this signature?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/signatures/${currentSignature.id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Signature deleted");
            setOpenModal(false);
            fetchSignatures();
        } catch (error) {
            toast.error("Failed to delete signature");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (currentSignature.id) {
                await axios.put(`${API_BASE_URL}/mail/signatures/${currentSignature.id}/`, currentSignature, { headers: { Authorization: `Bearer ${accessToken}` } });
                toast.success("Signature updated");
            } else {
                await axios.post(`${API_BASE_URL}/mail/signatures/`, currentSignature, { headers: { Authorization: `Bearer ${accessToken}` } });
                toast.success("Signature created");
            }
            setOpenModal(false);
            fetchSignatures();
        } catch (error) {
            toast.error("Failed to save signature");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Mail Signatures</h2>
                    <p className="text-sm text-gray-500">Signatures appended to outgoing student emails</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={handleImportGmail} 
                        disabled={isImporting}
                        startIcon={<CloudDownload className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />}
                    >
                        {isImporting ? 'Importing...' : 'Import from Gmail'}
                    </Button>
                    <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => { setCurrentSignature({ name: '', body_html: '', is_shared: false }); setOpenModal(true); }}>
                        New Signature
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signatures.length === 0 && (
                    <div className="col-span-full text-center py-12 border border-dashed border-gray-300 rounded-2xl bg-gray-50 text-gray-500">
                        No signatures found. Create one or import from Gmail.
                    </div>
                )}
                {signatures.map(s => (
                    <div key={s.id} className="border border-gray-200 p-5 rounded-2xl hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer bg-white" onClick={() => { setCurrentSignature(s); setOpenModal(true); }}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><PenLine size={16} /></div>
                                <h3 className="font-bold text-gray-800 truncate">{s.name}</h3>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.is_shared ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{s.is_shared ? 'Shared' : 'Personal'}</span>
                        </div>
                        <div className="text-sm mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-40 overflow-hidden" dangerouslySetInnerHTML={{ __html: s.body_html }} />
                    </div>
                ))}
            </div>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{currentSignature?.id ? 'Edit Signature' : 'New Signature'}</h2>
                    <button onClick={() => setOpenModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors" aria-label="Close"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <TextField 
                            label="Name" 
                            fullWidth 
                            value={currentSignature?.name || ''} 
                            onChange={e => setCurrentSignature({...currentSignature, name: e.target.value})} 
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Body</label>
                            <MailEditor 
                                content={currentSignature?.body_html || ''} 
                                onChange={html => setCurrentSignature({...currentSignature, body_html: html})} 
                            />
                        </div>
                        <FormControlLabel
                            control={<Switch checked={currentSignature?.is_shared || false} onChange={e => setCurrentSignature({...currentSignature, is_shared: e.target.checked})} />}
                            label="Shared with all users"
                        />
                        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                            <div>
                                {currentSignature?.id && (
                                    <Button color="error" onClick={handleDelete}>Delete</Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                                <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
