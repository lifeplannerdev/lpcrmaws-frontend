import { useState } from 'react';
import { useApi } from '../context/ApiContext';

export function useVoxbayCall() {
  const { authFetch, apiBaseUrl } = useApi();
  const [callingNumber, setCallingNumber] = useState(null);

  const initiateCall = async (phoneNumber) => {
    if (!phoneNumber) return;
    
    // Normalize phone number for Voxbay if it's exactly 10 digits
    let destNumber = phoneNumber.toString().replace(/\D/g, '');
    if (destNumber.length === 10) {
      destNumber = `91${destNumber}`;
    } else {
      destNumber = phoneNumber; // fallback to original if not 10 digits
    }

    setCallingNumber(destNumber);
    try {
      const res = await authFetch(`${apiBaseUrl}/voxbay/click-to-call/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destNumber })
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
