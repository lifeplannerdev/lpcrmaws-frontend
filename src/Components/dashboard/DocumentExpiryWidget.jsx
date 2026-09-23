import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, AlertCircle, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DocumentExpiryWidget() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpiringDocuments = async () => {
    try {
      let token = accessToken;
      const response = await fetch(`${API_BASE_URL}/documents/expiring/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        token = await refreshAccessToken();
        const retryResponse = await fetch(`${API_BASE_URL}/documents/expiring/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          setDocuments(data.results || data || []);
        }
      } else if (response.ok) {
        const data = await response.json();
        setDocuments(data.results || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch expiring documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchExpiringDocuments();
    }
  }, [accessToken]);

  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full animate-pulse">
        <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3 mt-4">
          <div className="h-4 w-full bg-gray-100 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
          <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full items-center justify-center text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Documents Up to Date</h3>
        <p className="text-sm text-gray-500 mt-1">No documents are expiring in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Expiring Documents</h3>
        </div>
        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-amber-800 bg-amber-100 rounded-full">
          {documents.length}
        </span>
      </div>
      
      <div className="divide-y divide-gray-100 overflow-y-auto max-h-[300px]">
        {documents.map(doc => {
          const days = getDaysRemaining(doc.expiry_date);
          const isExpired = days < 0;
          
          return (
            <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {doc.company}
                  </span>
                  <span className="text-xs text-gray-500 truncate">{doc.document_type}</span>
                </div>
              </div>
              
              <div className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${
                isExpired ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {isExpired ? 'Expired' : `${days} days`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
