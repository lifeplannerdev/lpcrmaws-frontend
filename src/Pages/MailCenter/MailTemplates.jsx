import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Dialog, TextField, Switch, FormControlLabel } from '@mui/material';
import MailEditor from '../../Components/Mail/MailEditor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const MailTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/mail/templates/`, { withCredentials: true });
            setTemplates(res.data.results || res.data);
        } catch (error) {
            toast.error("Failed to load templates");
        }
    };

    useEffect(() => {
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        try {
            if (currentTemplate.id) {
                await axios.put(`${API_BASE_URL}/api/mail/templates/${currentTemplate.id}/`, currentTemplate, { withCredentials: true });
                toast.success("Template updated");
            } else {
                await axios.post(`${API_BASE_URL}/api/mail/templates/`, currentTemplate, { withCredentials: true });
                toast.success("Template created");
            }
            setOpenModal(false);
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to save template");
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mail Templates</h2>
                <Button variant="contained" onClick={() => { setCurrentTemplate({ name: '', subject: '', body_html: '', category: 'General', is_active: true }); setOpenModal(true); }}>
                    New Template
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(t => (
                    <div key={t.id} className="border p-4 rounded shadow-sm hover:shadow-md cursor-pointer bg-white" onClick={() => { setCurrentTemplate(t); setOpenModal(true); }}>
                        <h3 className="font-bold">{t.name}</h3>
                        <p className="text-sm text-gray-500">{t.category}</p>
                        <p className="text-sm font-medium mt-2">Subj: {t.subject}</p>
                    </div>
                ))}
            </div>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">{currentTemplate?.id ? 'Edit Template' : 'New Template'}</h2>
                    <div className="space-y-4">
                        <TextField 
                            label="Name" 
                            fullWidth 
                            value={currentTemplate?.name || ''} 
                            onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})} 
                        />
                        <TextField 
                            label="Category" 
                            fullWidth 
                            value={currentTemplate?.category || ''} 
                            onChange={e => setCurrentTemplate({...currentTemplate, category: e.target.value})} 
                        />
                        <TextField 
                            label="Subject" 
                            fullWidth 
                            value={currentTemplate?.subject || ''} 
                            onChange={e => setCurrentTemplate({...currentTemplate, subject: e.target.value})} 
                            helperText="Available variables: {{student_name}}, {{university}}, {{program}}"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                            <MailEditor 
                                content={currentTemplate?.body_html || ''} 
                                onChange={html => setCurrentTemplate({...currentTemplate, body_html: html})} 
                            />
                        </div>
                        <FormControlLabel
                            control={<Switch checked={currentTemplate?.is_active ?? true} onChange={e => setCurrentTemplate({...currentTemplate, is_active: e.target.checked})} />}
                            label="Active"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
