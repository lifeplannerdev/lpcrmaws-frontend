import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button, Dialog, TextField, Switch, FormControlLabel, MenuItem } from '@mui/material';
import { Plus, FileText, Search, X, Sparkles } from 'lucide-react';
import MailEditor from '../../Components/Mail/MailEditor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MailTemplates = ({ moduleScope = '' }) => {
  const { accessToken } = useAuth();
  const editorRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [variables, setVariables] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const scopeParam = moduleScope ? `?module_scope=${moduleScope}` : '';
      const [tplRes, varRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/mail/templates/${scopeParam}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${API_BASE_URL}/mail/template-variables/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setTemplates(tplRes.data.results || tplRes.data || []);
      setVariables(varRes.data || []);
    } catch (error) {
      toast.error('Failed to load templates');
    }
  }, [accessToken, moduleScope]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!currentTemplate || !currentTemplate.id) return;
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/mail/templates/${currentTemplate.id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Template deleted');
      setOpenModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...currentTemplate,
        module_scope:
          currentTemplate.module_scope ||
          (moduleScope && moduleScope !== 'ALL' ? moduleScope : 'EXECUTIVE'),
      };
      if (currentTemplate.id) {
        await axios.put(`${API_BASE_URL}/mail/templates/${currentTemplate.id}/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        toast.success('Template updated');
      } else {
        await axios.post(`${API_BASE_URL}/mail/templates/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        toast.success('Template created');
      }
      setOpenModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariableIntoTemplate = (varKey) => {
    const tag = `{{${varKey}}}`;
    if (editorRef.current?.insertContent) {
      editorRef.current.insertContent(tag);
    } else {
      setCurrentTemplate((prev) => ({
        ...prev,
        body_html: `${prev?.body_html || ''} ${tag}`,
      }));
    }
    toast.success(`Inserted ${tag}`);
  };

  const q = query.trim().toLowerCase();
  const visible = templates.filter(
    (t) =>
      !q ||
      [t.name, t.category, t.subject, t.module_scope].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mail Templates</h2>
          <p className="text-sm text-gray-500">
            Role-isolated reusable email templates with dynamic variables for Staff, Tasks, Penalties, Reports, Leads &amp; Students
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 pr-8 py-2 w-56 border border-gray-200 rounded-xl text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setCurrentTemplate({
                name: '',
                subject: '',
                body_html: '',
                category: 'General',
                module_scope:
                  moduleScope && moduleScope !== 'ALL' ? moduleScope : 'EXECUTIVE',
                is_active: true,
              });
              setOpenModal(true);
            }}
          >
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((t) => (
          <div
            key={t.id}
            className="border border-gray-200 p-5 rounded-2xl hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer bg-white"
            onClick={() => {
              setCurrentTemplate(t);
              setOpenModal(true);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  {t.module_scope || 'PROCESSING'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    t.is_active === false ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'
                  }`}
                >
                  {t.is_active === false ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 mt-3 truncate">{t.name}</h3>
            <p className="text-xs text-indigo-600 font-medium">{t.category}</p>
            <p className="text-sm text-gray-600 mt-2 truncate">Subj: {t.subject}</p>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-12 border border-dashed border-gray-300 rounded-2xl bg-gray-50 text-gray-500">
            {templates.length === 0
              ? 'No templates in this role scope yet. Create your first one.'
              : 'No templates match your search.'}
          </div>
        )}
      </div>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {currentTemplate?.id ? 'Edit Template' : 'New Template'}
          </h2>
          <button
            onClick={() => setOpenModal(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField
                label="Template Name"
                size="small"
                fullWidth
                value={currentTemplate?.name || ''}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, name: e.target.value })
                }
              />
              <TextField
                label="Category"
                size="small"
                fullWidth
                placeholder="e.g. Executive, Task Follow-up, Visa"
                value={currentTemplate?.category || ''}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, category: e.target.value })
                }
              />
              <TextField
                select
                label="Role / Module Scope"
                size="small"
                fullWidth
                value={currentTemplate?.module_scope || 'EXECUTIVE'}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, module_scope: e.target.value })
                }
              >
                <MenuItem value="EXECUTIVE">Executive &amp; Management (MD)</MenuItem>
                <MenuItem value="PROCESSING">Processing &amp; Admissions</MenuItem>
                <MenuItem value="FEES">Fees &amp; Accounts</MenuItem>
                <MenuItem value="HR">HR &amp; Administration</MenuItem>
                <MenuItem value="SALES">Sales &amp; Leads</MenuItem>
                <MenuItem value="GLOBAL">Global / All Roles</MenuItem>
              </TextField>
            </div>
            <TextField
              label="Subject Line"
              size="small"
              fullWidth
              value={currentTemplate?.subject || ''}
              onChange={(e) =>
                setCurrentTemplate({ ...currentTemplate, subject: e.target.value })
              }
            />

            {/* Quick Variable Insertion Pills */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <Sparkles size={12} className="text-indigo-600" /> Click to Insert Dynamic Variable:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {variables.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => insertVariableIntoTemplate(v.id)}
                    className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 text-xs font-mono hover:bg-indigo-600 hover:text-white transition-all"
                    title={v.label}
                  >
                    {`{{${v.id}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <MailEditor
                editorRef={editorRef}
                content={currentTemplate?.body_html || ''}
                onChange={(html) =>
                  setCurrentTemplate({ ...currentTemplate, body_html: html })
                }
              />
            </div>
            <FormControlLabel
              control={
                <Switch
                  checked={currentTemplate?.is_active ?? true}
                  onChange={(e) =>
                    setCurrentTemplate({ ...currentTemplate, is_active: e.target.checked })
                  }
                />
              }
              label="Active"
            />
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
              <div>
                {currentTemplate?.id && (
                  <Button color="error" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
