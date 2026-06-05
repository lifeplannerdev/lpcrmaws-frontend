import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import { Plus } from 'lucide-react';
import AttendanceHeader from '../Components/attendancedoc/AttendanceDocHeader';
import AttendanceFilters from '../Components/attendancedoc/AttendanceDocFilters'
import AttendanceDocumentsList from '../Components/attendancedoc/AttendanceDocumentsList';
import UploadDocumentModal from '../Components/attendancedoc/UploadDocumentModal';
import LoadingState from '../Components/common/LoadingState';
import EmptyState from '../Components/common/EmptyState';
import { FileText } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AttendanceDocumentsPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const canManageAttendance = hasPermission('attendance:create') || hasPermission('attendance:edit_any') || hasPermission('attendance:edit_tenant') || hasPermission('attendance:edit_own');

  const fetchWithAuth = async (url, options = {}) => {
    try {
      let token = accessToken;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
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
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        
        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (companyFilter) params.set('company', companyFilter);
      const data = await fetchWithAuth(`${API_BASE_URL}/attendance/?${params}`);
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

  // Handle document deletion
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/api/hr/attendance/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesMonth = selectedMonth === 'all' || doc.month === selectedMonth;
    const matchesSearch = doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AttendanceHeader 
          onUploadClick={() => setShowUploadModal(true)} 
          companyFilter={companyFilter} 
          setCompanyFilter={setCompanyFilter} 
          canUpload={canManageAttendance}
        />

        {/* Filters */}
        <AttendanceFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        {/* Documents List */}
        {loading ? (
          <LoadingState />
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
            <EmptyState
              icon={FileText}
              title="No Documents Found"
              description={
                searchTerm || selectedMonth !== 'all' 
                  ? 'Try adjusting your filters or search term'
                  : 'Get started by uploading your first attendance document'
              }
            />
            {!searchTerm && selectedMonth === 'all' && canManageAttendance && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors mt-4"
              >
                <Plus className="w-5 h-5" />
                Upload First Document
              </button>
            )}
          </div>
        ) : (
          <AttendanceDocumentsList
            documents={filteredDocuments}
            onDelete={handleDelete}
            canDelete={canManageAttendance}
          />
        )}

        {/* Upload Modal */}
        {showUploadModal && canManageAttendance && (
          <UploadDocumentModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSuccess={fetchDocuments}
            accessToken={accessToken}
            refreshAccessToken={refreshAccessToken}
            apiBaseUrl={API_BASE_URL}
          />
        )}
      </main>
    </div>
  );
}