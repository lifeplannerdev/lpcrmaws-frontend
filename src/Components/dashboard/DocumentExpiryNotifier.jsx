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
              toast.error(
                <div>
                  <strong>Document Expiry Alert</strong>
                  <p className="text-sm mt-1">{documents.length} document(s) are expired or expiring soon!</p>
                </div>, 
                { duration: 8000, position: 'top-right' }
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
