import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Folder, Globe, Mail, Key, Shield, Smartphone, Server, Database, Plus } from 'lucide-react';
import { useApi } from '../../context/ApiContext';
import toast from 'react-hot-toast';

export const CATEGORY_ICONS = {
  Folder, Globe, Mail, Key, Shield, Smartphone, Server, Database
};

export function IconRenderer({ name, size = 20, className = "" }) {
  const Icon = CATEGORY_ICONS[name] || Folder;
  return <Icon size={size} className={className} />;
}

export function ManageCategoriesModal({ isOpen, onClose, onCategoryUpdate }) {
  const { authFetch, apiBaseUrl } = useApi();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', color: '#6B7280', icon_name: 'Folder' });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setShowAddForm(false);
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-categories/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.results || data);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Category created");
        setShowAddForm(false);
        setFormData({ name: '', color: '#6B7280', icon_name: 'Folder' });
        fetchCategories();
        if (onCategoryUpdate) onCategoryUpdate();
      } else {
        toast.error("Failed to create category");
      }
    } catch (err) {
      toast.error("Error creating category");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category? Associated credentials will become uncategorized.")) return;
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-categories/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Category deleted");
        fetchCategories();
        if (onCategoryUpdate) onCategoryUpdate();
      } else {
        toast.error("Failed to delete category");
      }
    } catch (err) {
      toast.error("Error deleting category");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        <div className="shrink-0 p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold">Manage Categories</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {showAddForm ? (
            <form onSubmit={handleAddSubmit} className="bg-gray-50 p-4 rounded-xl border mb-6 space-y-4">
              <h3 className="font-semibold text-gray-800">New Category</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl" placeholder="e.g. Finance" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="h-10 w-10 border rounded-lg cursor-pointer" />
                    <span className="text-sm text-gray-500">{formData.color}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select value={formData.icon_name} onChange={e => setFormData({...formData, icon_name: e.target.value})} className="w-full px-4 py-2 border rounded-xl">
                    {Object.keys(CATEGORY_ICONS).map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Save size={16}/> Save</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)} className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
              <Plus size={20}/> Add New Category
            </button>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-gray-500 py-4">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No categories defined yet.</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                      <IconRenderer name={cat.icon_name} size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{cat.name}</h4>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
