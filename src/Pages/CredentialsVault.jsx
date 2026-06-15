import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions, Can } from '../context/PermissionsContext';
import { useApi } from '../context/ApiContext';
import { 
  Key, Plus, Eye, EyeOff, Copy, Search, Shield, 
  History, CheckCircle, XCircle, Clock, Lock, Edit2, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AddCredentialModal, ProposeUpdateModal, HistoryModal } from '../Components/credentials/CredentialModals';
import { ManageCategoriesModal, IconRenderer } from '../Components/credentials/ManageCategoriesModal';

export default function CredentialsVault() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { authFetch, apiBaseUrl } = useApi();
  
  const [credentials, setCredentials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vault'); // 'vault', 'requests'
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [selectedCred, setSelectedCred] = useState(null);
  
  // Filtering & Grouping
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isGrouped, setIsGrouped] = useState(false);
  
  // Unmasking State
  const [unmaskedPasswords, setUnmaskedPasswords] = useState({});

  useEffect(() => {
    fetchCredentials();
    fetchCategories();
    if (hasPermission('credentials:manage')) {
      fetchRequests();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-categories/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.results || data);
      }
    } catch (err) {}
  };

  const fetchCredentials = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credentials/`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.results || data);
      }
    } catch (err) {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-requests/`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnmask = async (id) => {
    if (unmaskedPasswords[id]) {
      // Re-mask
      setUnmaskedPasswords(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    // Fetch decrypted
    try {
      const res = await authFetch(`${apiBaseUrl}/credentials/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setUnmaskedPasswords(prev => ({ ...prev, [id]: data.decrypted_password }));
      } else {
        toast.error("Failed to decrypt password");
      }
    } catch (err) {
      toast.error("Error decrypting password");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleApprove = async (reqId) => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-requests/${reqId}/approve/`, { method: 'POST' });
      if (res.ok) {
        toast.success("Request approved");
        fetchRequests();
        fetchCredentials();
      } else {
        toast.error("Failed to approve");
      }
    } catch (err) {
      toast.error("Error approving request");
    }
  };

  const handleReject = async (reqId) => {
    try {
      const res = await authFetch(`${apiBaseUrl}/credential-requests/${reqId}/reject/`, { method: 'POST' });
      if (res.ok) {
        toast.success("Request rejected");
        fetchRequests();
      } else {
        toast.error("Failed to reject");
      }
    } catch (err) {
      toast.error("Error rejecting request");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this credential?")) return;
    try {
      const res = await authFetch(`${apiBaseUrl}/credentials/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Credential deleted");
        fetchCredentials();
      } else {
        toast.error("Failed to delete credential");
      }
    } catch (err) {
      toast.error("Error deleting credential");
    }
  };

  const renderCredentialCard = (cred) => {
    const cat = cred.category_detail;
    return (
      <div key={cred.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {cat ? (
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                <IconRenderer name={cat.icon_name} size={20} />
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                <IconRenderer name="Key" size={20} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{cred.title}</h3>
              <p className="text-xs text-gray-500">By {cred.created_by_name}</p>
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(hasPermission('credentials:manage') || cred.created_by === user.id) && (
              <>
                <button 
                  onClick={() => { setSelectedCred(cred); setShowAddModal(true); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(cred.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button 
              onClick={() => { setSelectedCred(cred); setShowHistoryModal(true); }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
              title="History"
            >
              <History size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Username</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-medium text-gray-900">{cred.username || 'N/A'}</p>
              {cred.username && (
                <button onClick={() => handleCopy(cred.username)} className="text-gray-400 hover:text-indigo-600">
                  <Copy size={14} />
                </button>
              )}
            </div>
          </div>

          {cred.web_mail && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Web Mail</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-gray-900">{cred.web_mail}</p>
                <button onClick={() => handleCopy(cred.web_mail)} className="text-gray-400 hover:text-indigo-600">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Password</p>
            <div className="flex items-center justify-between mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
              <p className="text-sm font-mono text-gray-800 tracking-wider">
                {unmaskedPasswords[cred.id] ? unmaskedPasswords[cred.id] : '••••••••••••'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleUnmask(cred.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                  {unmaskedPasswords[cred.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {unmaskedPasswords[cred.id] && (
                  <button onClick={() => handleCopy(unmaskedPasswords[cred.id])} className="text-gray-400 hover:text-indigo-600 transition-colors">
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} />
            {format(new Date(cred.updated_at), 'MMM d, yyyy')}
          </span>
          
          {!hasPermission('credentials:manage') && cred.created_by !== user.id && (
            <button 
              onClick={() => { setSelectedCred(cred); setShowUpdateModal(true); }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
            >
              Propose Update
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderVaultContent = () => {
    let filtered = credentials.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory === 'UNCATEGORIZED') {
      filtered = filtered.filter(c => !c.category);
    } else if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (filtered.length === 0) {
      return (
        <div className="col-span-full py-12 text-center text-gray-500">
          <Shield className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>No credentials found.</p>
        </div>
      );
    }

    if (isGrouped) {
      const groups = {};
      filtered.forEach(cred => {
        const catId = cred.category || 'UNCATEGORIZED';
        if (!groups[catId]) groups[catId] = [];
        groups[catId].push(cred);
      });

      return (
        <div className="col-span-full space-y-8">
          {Object.entries(groups).map(([catId, creds]) => {
            const cat = catId === 'UNCATEGORIZED' ? null : categories.find(c => c.id === catId);
            return (
              <div key={catId} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                  {cat ? (
                    <>
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        <IconRenderer name={cat.icon_name} size={18} />
                      </div>
                      {cat.name}
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                        <IconRenderer name="Folder" size={18} />
                      </div>
                      Uncategorized
                    </>
                  )}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creds.map(renderCredentialCard)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(renderCredentialCard)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header with Premium Gradient */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Lock className="h-8 w-8 text-indigo-300" />
                Credentials Vault
              </h1>
              <p className="mt-2 text-indigo-100 max-w-2xl text-sm">
                Securely store and share organizational passwords with granular access controls.
              </p>
            </div>
            
            <div className="flex gap-3">
              {hasPermission('credentials:manage') && (
                <button 
                  onClick={() => setActiveTab(activeTab === 'vault' ? 'requests' : 'vault')}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-medium transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2"
                >
                  <Shield size={18} />
                  {activeTab === 'vault' ? 'View Requests' : 'View Vault'}
                  {requests.filter(r => r.status === 'PENDING').length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {requests.filter(r => r.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              )}
              
              <Can perform="credentials:manage">
                <button 
                  onClick={() => setShowManageCategoriesModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-medium transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2"
                >
                  Manage Categories
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Credential
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>

      <main className="-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content Area - Glassmorphism */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 overflow-hidden min-h-[500px]">
          
          {/* Search and Filter Bar */}
          {activeTab === 'vault' && (
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search credentials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <select 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="UNCATEGORIZED">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                  onClick={() => setIsGrouped(!isGrouped)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${isGrouped ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
                >
                  {isGrouped ? 'Ungroup' : 'Group by Category'}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : activeTab === 'vault' ? (
              renderVaultContent()
            ) : (
              // Requests Tab
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No pending update requests.</p>
                  </div>
                ) : (
                  requests.map(req => (
                    <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' :
                          req.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          <History size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{req.credential_title}</h4>
                          <p className="text-sm text-gray-500">
                            Update proposed by <span className="font-medium text-gray-700">{req.requested_by_name}</span> on {format(new Date(req.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      {req.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(req.id)} className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button onClick={() => handleReject(req.id)} className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddCredentialModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setSelectedCred(null); }} 
        onSuccess={fetchCredentials}
        editData={selectedCred}
      />
      
      <ProposeUpdateModal 
        isOpen={showUpdateModal} 
        onClose={() => setShowUpdateModal(false)} 
        credentialId={selectedCred?.id} 
        onSuccess={() => toast.success("Update request submitted")} 
      />
      
      <HistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        credentialId={selectedCred?.id} 
      />
      
      <ManageCategoriesModal
        isOpen={showManageCategoriesModal}
        onClose={() => setShowManageCategoriesModal(false)}
        onCategoryUpdate={() => { fetchCategories(); fetchCredentials(); }}
      />
    </div>
  );
}
