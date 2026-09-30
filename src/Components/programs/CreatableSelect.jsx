import React, { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { useApi } from '../../context/ApiContext';
import { Plus, Check, X } from 'lucide-react';

const CreatableSelect = ({ label, name, value, onChange, options, endpoint, onOptionAdded }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const { hasPermission } = usePermissions();
  const { authFetch, apiBaseUrl } = useApi();
  
  const canManage = hasPermission('programs:manage');

  const handleSaveNew = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newValue.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (onOptionAdded) onOptionAdded(data);
        // Call the parent onChange to update the form data with the new string
        onChange({ target: { name, value: data.name } });
        setIsAdding(false);
        setNewValue('');
      } else {
        alert('Failed to add new option');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
        {canManage && !isAdding && (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New
          </button>
        )}
      </div>
      
      {isAdding ? (
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder={`New ${label}`} 
            value={newValue} 
            onChange={e => setNewValue(e.target.value)}
            disabled={saving}
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            autoFocus
          />
          <button 
            type="button" 
            onClick={handleSaveNew} 
            disabled={saving} 
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            type="button" 
            onClick={() => setIsAdding(false)} 
            disabled={saving} 
            className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <select 
          name={name} 
          value={value || ''} 
          onChange={onChange} 
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
        >
          <option value="">Select {label}</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.name}>{opt.name}</option>
          ))}
        </select>
      )}
    </div>
  );
};

export default CreatableSelect;

