import { useState } from 'react';
import { useApi } from '../context/ApiContext';

export function useVoxbayCall() {
  const { authFetch, apiBaseUrl } = useApi();
  const [callingNumber, setCallingNumber] = useState(null);

  const initiateCall = async (phoneNumber) => {
    if (!phoneNumber) return;
    setCallingNumber(phoneNumber);
    try {
      const res = await authFetch(`${apiBaseUrl}/voxbay/click-to-call/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: phoneNumber })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }
      alert(`Call initiated to ${phoneNumber}`);
    } catch (err) {
      alert(err.message || 'Error initiating call via Voxbay');
    } finally {
      setCallingNumber(null);
    }
  };

  return { initiateCall, callingNumber };
}
