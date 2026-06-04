// src/context/PermissionsContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (user && user.permissions) {
      setPermissions(user.permissions);
    } else {
      setPermissions({});
    }
  }, [user]);

  // Generic permission check function
  const hasPermission = (resourceString) => {
    // resourceString format: "resource:action" e.g., "leads:edit_own"
    if (!resourceString) return false;
    
    // Superuser wildcard check
    if (permissions["*"] && permissions["*"].includes("*")) return true;

    const [resource, action] = resourceString.split(':');
    
    if (permissions[resource]) {
        // If they have wildcard action for this resource, or specific action
        return permissions[resource].includes("*") || permissions[resource].includes(action);
    }
    return false;
  };

  const hasAnyPermission = (resource) => {
    if (!resource) return false;
    if (permissions["*"] && permissions["*"].includes("*")) return true;
    
    if (permissions[resource] && permissions[resource].length > 0) {
      return true;
    }
    return false;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, hasAnyPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// Generic wrapper component
export const Can = ({ perform, children, fallback = null }) => {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(perform)) {
    return <>{children}</>;
  }
  return fallback;
};
