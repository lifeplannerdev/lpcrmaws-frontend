import { useState } from 'react';
import { useApi } from '../context/ApiContext';
import { useLiveCall } from '../context/LiveCallContext';
import toast from 'react-hot-toast';

export function useVoxbayCall() {
  const { authFetch, apiBaseUrl } = useApi();
  const { upsertCall, setIsModalOpen, setIsMinimized } = useLiveCall();
  const [callingNumber, setCallingNumber] = useState(null);

  const initiateCall = async (phoneNumber, leadData = null) => {
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

      const resData = await res.json();
      
      // Open Live Call Modal immediately for the agent
      const callPayload = resData.lead || {
        call_uuid: resData.call_uuid || `out_${Date.now()}`,
        caller_number: destNumber,
        call_type: 'outgoing',
        event_type: 'answered',
        status: 'connected',
        is_new_lead: !leadData?.id,
        lead_id: leadData?.id || null,
        lead_name: leadData?.name || `Lead - ${destNumber}`,
        lead_status: leadData?.status || 'ENQUIRY',
        lead_priority: leadData?.priority || 'MEDIUM',
        program: leadData?.program || '',
        interested_country: leadData?.interested_country || '',
        interested_course: leadData?.interested_course || '',
        location: leadData?.location || '',
      };

      upsertCall(callPayload);
      setIsModalOpen(true);
      setIsMinimized(false);

      toast.success(`📞 Voxbay call connecting to ${phoneNumber}... Please answer your phone!`);
    } catch (err) {
      toast.error(err.message || 'Error initiating call via Voxbay');
    } finally {
      setCallingNumber(null);
    }
  };

  return { initiateCall, callingNumber };
}
