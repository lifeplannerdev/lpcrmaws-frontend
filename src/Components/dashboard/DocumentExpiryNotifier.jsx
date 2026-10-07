import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DocumentExpiryNotifier() {
  const { accessToken, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    if (isAuthenticated && hasPermission('license:admin') && accessToken && !hasNotified) {
      const checkExpiringDocuments = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/documents/expiring/`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const documents = data.results || data || [];
            
            if (documents.length > 0) {
              const displayDocs = documents.slice(0, 3);
              const extraCount = documents.length - 3;
              
              toast.error(
                <div className="flex flex-col gap-1">
                  <strong>Document Expiry Alert</strong>
                  <p className="text-sm">{documents.length} document(s) are expired or expiring soon:</p>
                  <ul className="text-xs list-disc pl-4 mt-1 space-y-1 text-gray-700">
                    {displayDocs.map(doc => (
                      <li key={doc.id}>
                        <span className="font-semibold">{doc.title}</span> 
                        {doc.amount ? ` (₹${doc.amount})` : ''} — <span className="text-red-600">{doc.days_remaining < 0 ? 'Expired' : `in ${doc.days_remaining}d`}</span>
                      </li>
                    ))}
                    {extraCount > 0 && <li>and {extraCount} more...</li>}
                  </ul>
                </div>, 
                { duration: 10000, position: 'top-right' }
              );
              setHasNotified(true);
            }
          }
        } catch (err) {
          console.error("Failed to check expiring documents", err);
        }
      };
      
      checkExpiringDocuments();
    }
  }, [isAuthenticated, hasPermission, accessToken, hasNotified]);

  return null; // This component doesn't render anything visible
}
