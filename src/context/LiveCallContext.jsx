import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUserChannel } from '../hooks/useUserChannel';
import { useAuth } from './AuthContext';

const LiveCallContext = createContext(null);

export const LiveCallProvider = ({ children }) => {
  const { user } = useAuth();
  // Array of active calls: [{ id, phone, leadId, leadName, isNewLead, callType, status, startedAt, duration, formData, ... }]
  const [calls, setCalls] = useState([]);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Extract and clean phone digits from payload
  const extractPhone = (data) => {
    const raw = data.caller_number || data.callerNumber || data.callernumber || data.phone || data.phone_number || data.destination || data.destination_number || data.calledNumber || data.callerid || data.number || '';
    const digits = String(raw).replace(/\D/g, '');
    return digits || raw || '';
  };

  // Add or update a call
  const upsertCall = useCallback((callData) => {
    const callUuid = callData.call_uuid || callData.id || `call_${Date.now()}`;
    const cleanPhone = extractPhone(callData);
    const isIncoming = (callData.call_type || 'incoming') === 'incoming';
    const isNew = callData.is_new_lead !== undefined ? Boolean(callData.is_new_lead) : !callData.lead_id;
    const defaultLeadName = callData.lead_name || callData.leadName || (isNew ? `Voxbay ${isIncoming ? 'Incoming' : 'Outgoing'} - ${cleanPhone}` : 'Existing Lead');

    setCalls(prevCalls => {
      const existingIndex = prevCalls.findIndex(c => c.id === callUuid);
      const isFirstTime = existingIndex === -1;
      
      const updatedCall = {
        id: callUuid,
        phone: cleanPhone,
        leadId: callData.lead_id || callData.leadId || null,
        leadName: defaultLeadName,
        isNewLead: isNew,
        callType: callData.call_type || 'incoming',
        status: callData.event_type === 'answered' || callData.callevent === 'connect' || callData.callevent === 'answer' ? 'connected' : (callData.status || 'ringing'),
        startedAt: isFirstTime ? Date.now() : (prevCalls[existingIndex].startedAt || Date.now()),
        connectedAt: (callData.event_type === 'answered' || callData.callevent === 'connect') ? Date.now() : (isFirstTime ? null : prevCalls[existingIndex].connectedAt),
        endedAt: callData.event_type === 'ended' ? Date.now() : (isFirstTime ? null : prevCalls[existingIndex].endedAt),
        duration: callData.duration !== undefined ? callData.duration : (isFirstTime ? 0 : prevCalls[existingIndex].duration || 0),
        recordingUrl: callData.recording_url || (isFirstTime ? null : prevCalls[existingIndex].recordingUrl),
        assignedHandler: callData.assigned_handler || (isFirstTime ? null : prevCalls[existingIndex].assignedHandler),
        leadDetails: {
          status: callData.lead_status || 'ENQUIRY',
          priority: callData.lead_priority || 'MEDIUM',
          program: callData.program || '',
          interested_country: callData.interested_country || '',
          interested_course: callData.interested_course || '',
          location: callData.location || '',
          ...(isFirstTime ? {} : prevCalls[existingIndex].leadDetails),
        },
        formData: isFirstTime ? {
          name: isNew ? defaultLeadName : (callData.lead_name || ''),
          status: callData.lead_status || 'ENQUIRY',
          priority: callData.lead_priority || 'MEDIUM',
          program: callData.program || '',
          interested_country: callData.interested_country || '',
          interested_course: callData.interested_course || '',
          location: callData.location || '',
          source: 'VOXBAY CALL',
          remarks: '',
          follow_up_date: '',
          follow_up_time: '',
        } : prevCalls[existingIndex].formData,
      };

      if (isFirstTime) {
        return [...prevCalls, updatedCall];
      } else {
        const next = [...prevCalls];
        next[existingIndex] = { ...next[existingIndex], ...updatedCall, formData: next[existingIndex].formData };
        return next;
      }
    });

    setActiveCallId(callUuid);
  }, []);

  // Handle incoming call / ringing / connected webhook event
  const handleIncomingCallEvent = useCallback((data) => {
    if (!data) return;
    const isAnswered = data.event_type === 'answered' || data.callevent === 'connect' || data.callevent === 'answer' || data.call_type === 'outgoing';
    const isExisting = !data.is_new_lead || data.lead_id;

    // Rule:
    // 1. If outgoing -> always open modal
    // 2. If incoming & answered -> always open modal (both fresh & existing)
    // 3. If incoming & ringing -> only open modal immediately if existing lead
    if (data.call_type === 'outgoing' || isAnswered || isExisting) {
      upsertCall(data);
      setIsModalOpen(true);
      setIsMinimized(false);
    }
  }, [upsertCall]);

  // Handle call connected event
  const handleCallConnectedEvent = useCallback((data) => {
    if (!data) return;
    upsertCall({ ...data, event_type: 'answered', status: 'connected' });
    setIsModalOpen(true);
    setIsMinimized(false);
  }, [upsertCall]);

  // Handle call ended event (from CDR) - Updates status and recording without closing modal
  const handleCallEndedEvent = useCallback((data) => {
    if (!data || !data.call_uuid) return;
    setCalls(prevCalls => prevCalls.map(c => {
      if (c.id === data.call_uuid) {
        return {
          ...c,
          status: 'ended',
          endedAt: Date.now(),
          duration: data.duration !== undefined ? data.duration : c.duration,
          recordingUrl: data.recording_url || c.recordingUrl,
        };
      }
      return c;
    }));
  }, []);

  // Listen to user Pusher channel
  useUserChannel({
    onIncomingCall: handleIncomingCallEvent,
    onCallConnected: handleCallConnectedEvent,
    onCallEnded: handleCallEndedEvent,
  });

  // Update in-progress form data for a specific call
  const updateCallFormData = useCallback((callId, newFormData) => {
    setCalls(prevCalls => prevCalls.map(c => {
      if (c.id === callId) {
        return {
          ...c,
          formData: { ...c.formData, ...newFormData }
        };
      }
      return c;
    }));
  }, []);

  // Close/Dismiss a single call
  const closeCall = useCallback((callId) => {
    setCalls(prevCalls => {
      const remaining = prevCalls.filter(c => c.id !== callId);
      if (remaining.length === 0) {
        setIsModalOpen(false);
        setActiveCallId(null);
        setIsMinimized(false);
      } else if (activeCallId === callId) {
        setActiveCallId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeCallId]);

  // Close all calls
  const closeAllCalls = useCallback(() => {
    setCalls([]);
    setIsModalOpen(false);
    setActiveCallId(null);
    setIsMinimized(false);
  }, []);

  // Helper to get currently focused call
  const activeCall = calls.find(c => c.id === activeCallId) || calls[0] || null;

  // Manual Trigger for Testing / Simulating incoming or outgoing call
  const simulateCall = useCallback(({ phone = '9876543210', isNewLead = false, leadId = null, leadName = 'Akash Sharma', callType = 'incoming', status = 'connected' } = {}) => {
    const testUuid = `sim_${Date.now()}`;
    const cleanPhone = String(phone).replace(/\D/g, '') || '9876543210';
    const isIncoming = callType === 'incoming';
    const payload = {
      call_uuid: testUuid,
      caller_number: cleanPhone,
      agent_extension: user?.voxbay_extension || '101',
      call_type: callType,
      callevent: status === 'connected' ? 'connect' : 'ringing',
      event_type: status === 'connected' ? 'answered' : 'ringing',
      is_new_lead: isNewLead,
      lead_id: isNewLead ? null : (leadId || 101),
      lead_name: isNewLead ? `Voxbay ${isIncoming ? 'Incoming' : 'Outgoing'} - ${cleanPhone}` : leadName,
      lead_status: 'ENQUIRY',
      lead_priority: 'HIGH',
      program: 'Film Making Diploma',
      interested_country: 'United Kingdom',
      interested_course: 'Master of Arts in Direction',
      location: 'Kochi, Kerala',
      assigned_handler: user?.username || 'Counselor Priya',
    };
    upsertCall(payload);
    setIsModalOpen(true);
    setIsMinimized(false);
  }, [user, upsertCall]);

  return (
    <LiveCallContext.Provider
      value={{
        calls,
        activeCall,
        activeCallId,
        setActiveCallId,
        isModalOpen,
        setIsModalOpen,
        isMinimized,
        setIsMinimized,
        upsertCall,
        updateCallFormData,
        closeCall,
        closeAllCalls,
        simulateCall,
      }}
    >
      {children}
    </LiveCallContext.Provider>
  );
};

export const useLiveCall = () => {
  const context = useContext(LiveCallContext);
  if (!context) {
    throw new Error('useLiveCall must be used within a LiveCallProvider');
  }
  return context;
};
