import React, { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { useApi } from '../../context/ApiContext';

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
    <div className="creatable-select-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <label>{label}</label>
        {canManage && !isAdding && (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
          >
            + Add New
          </button>
        )}
      </div>
      
      {isAdding ? (
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            placeholder={`New ${label}`} 
            value={newValue} 
            onChange={e => setNewValue(e.target.value)}
            disabled={saving}
          />
          <button type="button" onClick={handleSaveNew} disabled={saving} className="btn-add-main" style={{ padding: '0 10px' }}>
            {saving ? '...' : 'Save'}
          </button>
          <button type="button" onClick={() => setIsAdding(false)} disabled={saving} className="btn-remove">
            Cancel
          </button>
        </div>
      ) : (
        <select name={name} value={value || ''} onChange={onChange} className="form-select">
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
