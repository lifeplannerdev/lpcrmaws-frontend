import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ApiContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const ApiProvider = ({ children }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const tokenRef = useRef(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const authFetch = useCallback(async (url, options = {}, signal = null, retry = true) => {
    let token = tokenRef.current;
    if (!token) throw new Error('No access token');

    const res = await fetch(url, {
      ...options,
      signal,
      credentials: 'include',
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 && retry) {
      const tok = await refreshAccessToken();
      if (!tok) throw new Error('Session expired');
      tokenRef.current = tok;
      return authFetch(url, options, signal, false);
    }
    return res;
  }, [refreshAccessToken]);

  return (
    <ApiContext.Provider value={{ authFetch, apiBaseUrl: API_BASE_URL }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
