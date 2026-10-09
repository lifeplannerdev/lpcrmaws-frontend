// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    try {

      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: storedRefreshToken  
        }),
      });


      if (!res.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await res.json();

      setAccessToken(data.access);

      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
      }

      return data.access;
    } catch (err) {
      // Clear everything on failure
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      return null;
    }
  }, []);

  // Login handler
  const login = async ({ access, refresh, user: userData }) => {
    setAccessToken(access);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('refreshToken', refresh);

    // Each new login creates a unique session ID and clears previous dismissal
    const loginSessionId = Date.now().toString();
    sessionStorage.setItem('login_session_id', loginSessionId);
    sessionStorage.removeItem('dismissed_doc_expiry_session');
    sessionStorage.removeItem('dismissed_doc_expiry_modal');
  };

  // Logout handler
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('login_session_id');
      sessionStorage.removeItem('dismissed_doc_expiry_session');
      sessionStorage.removeItem('dismissed_doc_expiry_modal');
    }
  };

  // Initialize auth on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedRefreshToken = localStorage.getItem('refreshToken');

        if (storedUser && storedRefreshToken) {
          const newAccessToken = await refreshAccessToken();

          if (newAccessToken) {
            try {
              setUser(JSON.parse(storedUser));
              if (!sessionStorage.getItem('login_session_id')) {
                sessionStorage.setItem('login_session_id', Date.now().toString());
              }
            } catch (e) {
              console.error('Failed to parse stored user:', e);
              localStorage.removeItem('user');
              localStorage.removeItem('refreshToken');
            }
          } else {
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
          }
        } else {
          console.log('👤 No stored credentials found');
        }
      } catch (err) {
        console.error('Auth init failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken && !!user,
        login,
        logout,
        refreshAccessToken,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
