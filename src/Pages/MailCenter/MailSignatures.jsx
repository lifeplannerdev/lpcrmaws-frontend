import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Dialog, TextField, FormControlLabel, Switch } from '@mui/material';
import MailEditor from '../../Components/Mail/MailEditor';
import { CloudDownload } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailSignatures = () => {
    const { accessToken } = useAuth();
    const [signatures, setSignatures] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [currentSignature, setCurrentSignature] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

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
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mail Signatures</h2>
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
                    <Button variant="contained" onClick={() => { setCurrentSignature({ name: '', body_html: '', is_shared: false }); setOpenModal(true); }}>
                        New Signature
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signatures.length === 0 && <p className="text-gray-500 col-span-full">No signatures found. Create one or import from Gmail.</p>}
                {signatures.map(s => (
                    <div key={s.id} className="border p-4 rounded shadow-sm hover:shadow-md cursor-pointer bg-white" onClick={() => { setCurrentSignature(s); setOpenModal(true); }}>
                        <h3 className="font-bold">{s.name}</h3>
                        <p className="text-xs mt-1 text-gray-500">{s.is_shared ? 'Shared' : 'Personal'}</p>
                        <div className="text-sm mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: s.body_html }} />
                    </div>
                ))}
            </div>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">{currentSignature?.id ? 'Edit Signature' : 'New Signature'}</h2>
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
                        <div className="flex justify-between mt-4">
                            <div>
                                {currentSignature?.id && (
                                    <Button color="error" onClick={handleDelete}>Delete</Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                                <Button variant="contained" onClick={handleSave}>Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
