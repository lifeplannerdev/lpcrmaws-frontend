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

  // Update refs on every render (no re-subscription needed)
  useEffect(() => {
    onTaskAssignedRef.current = onTaskAssigned;
    onTaskStatusUpdatedRef.current = onTaskStatusUpdated;
    onLeadAssignedRef.current = onLeadAssigned;
    onNewConversationRef.current = onNewConversation;
    onChatMessageRef.current = onChatMessage;
    onIncomingCallRef.current = onIncomingCall;
  });

  useEffect(() => {
    if (!isReady || !pusher || !user?.id) return;

    const channelName = `private-user-${user.id}`;
    channelRef.current = pusher.subscribe(channelName);

    channelRef.current.bind('task.assigned', (data) => onTaskAssignedRef.current?.(data));
    channelRef.current.bind('task.status_updated', (data) => onTaskStatusUpdatedRef.current?.(data));
    channelRef.current.bind('lead.assigned', (data) => onLeadAssignedRef.current?.(data));
    channelRef.current.bind('new-conversation', (data) => onNewConversationRef.current?.(data));
    channelRef.current.bind('chat.new_message', (data) => onChatMessageRef.current?.(data));
    channelRef.current.bind('telephony.incoming_call', (data) => onIncomingCallRef.current?.(data));

    return () => {
      channelRef.current?.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [isReady, pusher, user?.id]);
};
