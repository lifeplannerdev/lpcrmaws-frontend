import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function GmailCallbackPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Connecting your Gmail account...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');

    const state = params.get('state');

    if (error) {
      setStatus('error');
      setMessage(`Google returned an error: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code found in URL.');
      return;
    }

    if (!accessToken) return; // Wait for auth

    axios.post(`${API_BASE_URL}/mail/callback/`, {
      code,
      state
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(res => {
      setStatus('success');
      setMessage('Gmail connected successfully!');
      setTimeout(() => {
        navigate('/mail-center');
      }, 3000);
    })
    .catch(err => {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Failed to connect Gmail account.');
    });

  }, [location.search, accessToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/60 to-purple-50/60 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {status === 'processing' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Please wait...</h2>
            <p className="text-gray-500 mt-2">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Success!</h2>
            <p className="text-gray-500 mt-2">{message}</p>
            <button 
              onClick={() => navigate('/mail-center')}
              className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all"
            >
              Return to Mail Center
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Connection Failed</h2>
            <p className="text-red-500 mt-2">{message}</p>
            <button 
              onClick={() => navigate('/mail-center')}
              className="mt-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl font-semibold transition-all"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
