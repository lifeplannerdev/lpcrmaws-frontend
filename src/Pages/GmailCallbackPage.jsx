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

    // Post the code back to the backend
    const redirectUri = window.location.origin + '/gmail-callback';
    
    axios.post(`${API_BASE_URL}/gmail/callback/`, {
      code,
      redirect_uri: redirectUri
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(res => {
      setStatus('success');
      setMessage('Gmail connected successfully! You can now close this window or return to the CRM.');
      setTimeout(() => {
        navigate('/processing-students');
      }, 3000);
    })
    .catch(err => {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to connect Gmail account.');
    });

  }, [location.search, accessToken, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'processing' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
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
              onClick={() => navigate('/processing-students')}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Return to Processing Students
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Connection Failed</h2>
            <p className="text-red-500 mt-2">{message}</p>
            <button 
              onClick={() => navigate('/processing-students')}
              className="mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
