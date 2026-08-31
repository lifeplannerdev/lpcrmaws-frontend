import { useEffect, useRef } from 'react';
import { usePusher } from '../context/PusherContext';
import { useAuth } from '../context/AuthContext';

export const useUserChannel = ({
  onTaskAssigned,
  onTaskStatusUpdated,
  onLeadAssigned,
  onNewConversation,
  onChatMessage,
  onIncomingCall,
  onCallConnected,
  onCallEnded,
} = {}) => {
  const { pusher, isReady } = usePusher();
  const { user } = useAuth();
  const channelRef = useRef(null);

  // Store callbacks in refs so they're always fresh
  const onTaskAssignedRef = useRef(onTaskAssigned);
  const onTaskStatusUpdatedRef = useRef(onTaskStatusUpdated);
  const onLeadAssignedRef = useRef(onLeadAssigned);
  const onNewConversationRef = useRef(onNewConversation);
  const onChatMessageRef = useRef(onChatMessage);
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallConnectedRef = useRef(onCallConnected);
  const onCallEndedRef = useRef(onCallEnded);

  // Update refs on every render (no re-subscription needed)
  useEffect(() => {
    onTaskAssignedRef.current = onTaskAssigned;
    onTaskStatusUpdatedRef.current = onTaskStatusUpdated;
    onLeadAssignedRef.current = onLeadAssigned;
    onNewConversationRef.current = onNewConversation;
    onChatMessageRef.current = onChatMessage;
    onIncomingCallRef.current = onIncomingCall;
    onCallConnectedRef.current = onCallConnected;
    onCallEndedRef.current = onCallEnded;
  });

  useEffect(() => {
    if (!isReady || !pusher || !user?.id) return;

    const channelName = `private-user-${user.id}`;
    channelRef.current = pusher.subscribe(channelName);

    const handleTaskAssigned = (data) => onTaskAssignedRef.current?.(data);
    const handleTaskStatus = (data) => onTaskStatusUpdatedRef.current?.(data);
    const handleLeadAssigned = (data) => onLeadAssignedRef.current?.(data);
    const handleNewConv = (data) => onNewConversationRef.current?.(data);
    const handleChatMsg = (data) => onChatMessageRef.current?.(data);
    const handleIncomingCall = (data) => onIncomingCallRef.current?.(data);
    const handleCallConnected = (data) => onCallConnectedRef.current?.(data);
    const handleCallEnded = (data) => onCallEndedRef.current?.(data);

    channelRef.current.bind('task.assigned', handleTaskAssigned);
    channelRef.current.bind('task.status_updated', handleTaskStatus);
    channelRef.current.bind('lead.assigned', handleLeadAssigned);
    channelRef.current.bind('new-conversation', handleNewConv);
    channelRef.current.bind('chat.new_message', handleChatMsg);
    channelRef.current.bind('telephony.incoming_call', handleIncomingCall);
    channelRef.current.bind('telephony.call_connected', handleCallConnected);
    channelRef.current.bind('telephony.call_ended', handleCallEnded);

    return () => {
      channelRef.current?.unbind('task.assigned', handleTaskAssigned);
      channelRef.current?.unbind('task.status_updated', handleTaskStatus);
      channelRef.current?.unbind('lead.assigned', handleLeadAssigned);
      channelRef.current?.unbind('new-conversation', handleNewConv);
      channelRef.current?.unbind('chat.new_message', handleChatMsg);
      channelRef.current?.unbind('telephony.incoming_call', handleIncomingCall);
      channelRef.current?.unbind('telephony.call_connected', handleCallConnected);
      channelRef.current?.unbind('telephony.call_ended', handleCallEnded);
    };
  }, [isReady, pusher, user?.id]);
};
