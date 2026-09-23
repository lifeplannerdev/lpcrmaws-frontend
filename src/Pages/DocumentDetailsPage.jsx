import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions, Can } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import { Plus, Edit, Trash, FileText, AlertCircle } from 'lucide-react';
import LoadingState from '../Components/common/LoadingState';
import EmptyState from '../Components/common/EmptyState';
import CompanySwitcher from '../Components/common/CompanySwitcher';
import FormField from '../Components/common/FormField';
import Alert from '../Components/common/Alert';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DocumentDetailsPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    document_type: '',
    description: '',
    issue_date: '',
    expiry_date: '',
    company: 'LP'
  });
  const [formError, setFormError] = useState('');

  const fetchWithAuth = async (url, options = {}) => {
    try {
      let token = accessToken;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) throw new Error('Unable to refresh token');
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        return retryResponse.status === 204 ? null : await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.status === 204 ? null : await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const data = await fetchWithAuth(`${API_BASE_URL}/documents/?${params}`);
      setDocuments(data.results || data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchDocuments();
    }
  }, [accessToken, companyFilter]);

  const handleOpenModal = (doc = null) => {
    setFormError('');
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        title: doc.title,
        document_type: doc.document_type,
        description: doc.description || '',
        issue_date: doc.issue_date || '',
        expiry_date: doc.expiry_date || '',
        company: doc.company || 'LP'
      });
    } else {
      setEditingDoc(null);
      setFormData({
        title: '',
        document_type: '',
        description: '',
        issue_date: '',
        expiry_date: '',
        company: companyFilter || 'LP'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const method = editingDoc ? 'PUT' : 'POST';
      const url = editingDoc 
        ? `${API_BASE_URL}/documents/${editingDoc.id}/` 
        : `${API_BASE_URL}/documents/`;
        
      await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      setShowModal(false);
      fetchDocuments();
    } catch (err) {
      setFormError('Failed to save document details. Please check all fields.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document detail?')) return;
    try {
      await fetchWithAuth(`${API_BASE_URL}/documents/${id}/`, {
        method: 'DELETE'
      });
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    const today = new Date();
    return expiry < today;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Registry</h1>
            <p className="text-sm text-gray-500 mt-1">Track company documents, licenses, and expiry dates.</p>
          </div>
          <div className="flex items-center gap-4">
            <CompanySwitcher currentCompany={companyFilter} onChange={setCompanyFilter} />
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents Found"
            description="Start tracking licenses and contracts by adding a new document."
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{doc.title}</div>
                        {doc.description && <div className="text-sm text-gray-500 truncate max-w-xs">{doc.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.document_type}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {doc.company}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.issue_date || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isExpired(doc.expiry_date) ? 'text-red-600' : isExpiringSoon(doc.expiry_date) ? 'text-amber-600' : 'text-gray-900'}`}>
                            {doc.expiry_date}
                          </span>
                          {(isExpired(doc.expiry_date) || isExpiringSoon(doc.expiry_date)) && (
                            <AlertCircle className={`w-4 h-4 ${isExpired(doc.expiry_date) ? 'text-red-500' : 'text-amber-500'}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleOpenModal(doc)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col relative">
              <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingDoc ? 'Edit Document' : 'Add Document'}
                  </h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {formError && <Alert type="error" message={formError} />}
                  
                  <FormField
                    label="Title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Trade License 2024"
                  />
                  <FormField
                    label="Document Type"
                    type="text"
                    required
                    value={formData.document_type}
                    onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                    placeholder="e.g. License, Contract"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    >
                      <option value="LP">LP</option>
                      <option value="FLAG">FLAG</option>
                      <option value="FDS">FDS</option>
                    </select>
                  </div>
                  <FormField
                    label="Issue Date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  />
                  <FormField
                    label="Expiry Date"
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Optional notes or details..."
                    />
                  </div>
                </div>
                <div className="shrink-0 p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm">
                    Save Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
