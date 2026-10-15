import { useEffect, useRef } from 'react';
import { usePusher } from '../context/PusherContext';
import { useAuth } from '../context/AuthContext';

export const useUserChannel = ({
  onTaskAssigned,
  onTaskStatusUpdated,
  onTaskRemarkAdded,
  onLeadAssigned,
  onNewConversation,
  onChatMessage,
  onIncomingCall,
  onCallConnected,
  onCallEnded,
  onCallDismissed,
  onReminderAlert,
  onReminderAssigned,
  onReminderStatusUpdated,
  onReminderRemarkAdded,
} = {}) => {
  const { pusher, isReady } = usePusher();
  const { user } = useAuth();
  const channelRef = useRef(null);

  // Store callbacks in refs so they're always fresh
  const onTaskAssignedRef = useRef(onTaskAssigned);
  const onTaskStatusUpdatedRef = useRef(onTaskStatusUpdated);
  const onTaskRemarkAddedRef = useRef(onTaskRemarkAdded);
  const onLeadAssignedRef = useRef(onLeadAssigned);
  const onNewConversationRef = useRef(onNewConversation);
  const onChatMessageRef = useRef(onChatMessage);
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallConnectedRef = useRef(onCallConnected);
  const onCallEndedRef = useRef(onCallEnded);
  const onCallDismissedRef = useRef(onCallDismissed);
  const onReminderAlertRef = useRef(onReminderAlert);
  const onReminderAssignedRef = useRef(onReminderAssigned);
  const onReminderStatusUpdatedRef = useRef(onReminderStatusUpdated);
  const onReminderRemarkAddedRef = useRef(onReminderRemarkAdded);

  // Update refs on every render (no re-subscription needed)
  useEffect(() => {
    onTaskAssignedRef.current = onTaskAssigned;
    onTaskStatusUpdatedRef.current = onTaskStatusUpdated;
    onTaskRemarkAddedRef.current = onTaskRemarkAdded;
    onLeadAssignedRef.current = onLeadAssigned;
    onNewConversationRef.current = onNewConversation;
    onChatMessageRef.current = onChatMessage;
    onIncomingCallRef.current = onIncomingCall;
    onCallConnectedRef.current = onCallConnected;
    onCallEndedRef.current = onCallEnded;
    onCallDismissedRef.current = onCallDismissed;
    onReminderAlertRef.current = onReminderAlert;
    onReminderAssignedRef.current = onReminderAssigned;
    onReminderStatusUpdatedRef.current = onReminderStatusUpdated;
    onReminderRemarkAddedRef.current = onReminderRemarkAdded;
  });

  useEffect(() => {
    if (!isReady || !pusher || !user?.id) return;

    const channelName = `private-user-${user.id}`;
    channelRef.current = pusher.subscribe(channelName);

    const handleTaskAssigned = (data) => onTaskAssignedRef.current?.(data);
    const handleTaskStatus = (data) => onTaskStatusUpdatedRef.current?.(data);
    const handleTaskRemark = (data) => onTaskRemarkAddedRef.current?.(data);
    const handleLeadAssigned = (data) => onLeadAssignedRef.current?.(data);
    const handleNewConv = (data) => onNewConversationRef.current?.(data);
    const handleChatMsg = (data) => onChatMessageRef.current?.(data);
    const handleIncomingCall = (data) => onIncomingCallRef.current?.(data);
    const handleCallConnected = (data) => onCallConnectedRef.current?.(data);
    const handleCallEnded = (data) => onCallEndedRef.current?.(data);
    const handleCallDismissed = (data) => onCallDismissedRef.current?.(data);
    const handleReminderAlert = (data) => onReminderAlertRef.current?.(data);
    const handleReminderAssigned = (data) => onReminderAssignedRef.current?.(data);
    const handleReminderStatus = (data) => onReminderStatusUpdatedRef.current?.(data);
    const handleReminderRemark = (data) => onReminderRemarkAddedRef.current?.(data);

    channelRef.current.bind('task.assigned', handleTaskAssigned);
    channelRef.current.bind('task.status_updated', handleTaskStatus);
    channelRef.current.bind('task.remark_added', handleTaskRemark);
    channelRef.current.bind('lead.assigned', handleLeadAssigned);
    channelRef.current.bind('new-conversation', handleNewConv);
    channelRef.current.bind('chat.new_message', handleChatMsg);
    channelRef.current.bind('telephony.incoming_call', handleIncomingCall);
    channelRef.current.bind('telephony.call_connected', handleCallConnected);
    channelRef.current.bind('telephony.call_ended', handleCallEnded);
    channelRef.current.bind('telephony.call_dismissed', handleCallDismissed);
    channelRef.current.bind('reminder.alert', handleReminderAlert);
    channelRef.current.bind('reminder.assigned', handleReminderAssigned);
    channelRef.current.bind('reminder.status_updated', handleReminderStatus);
    channelRef.current.bind('reminder.remark_added', handleReminderRemark);

    return () => {
      channelRef.current?.unbind('task.assigned', handleTaskAssigned);
      channelRef.current?.unbind('task.status_updated', handleTaskStatus);
      channelRef.current?.unbind('task.remark_added', handleTaskRemark);
      channelRef.current?.unbind('lead.assigned', handleLeadAssigned);
      channelRef.current?.unbind('new-conversation', handleNewConv);
      channelRef.current?.unbind('chat.new_message', handleChatMsg);
      channelRef.current?.unbind('telephony.incoming_call', handleIncomingCall);
      channelRef.current?.unbind('telephony.call_connected', handleCallConnected);
      channelRef.current?.unbind('telephony.call_ended', handleCallEnded);
      channelRef.current?.unbind('telephony.call_dismissed', handleCallDismissed);
      channelRef.current?.unbind('reminder.alert', handleReminderAlert);
      channelRef.current?.unbind('reminder.assigned', handleReminderAssigned);
      channelRef.current?.unbind('reminder.status_updated', handleReminderStatus);
      channelRef.current?.unbind('reminder.remark_added', handleReminderRemark);
    };
  }, [isReady, pusher, user?.id]);
};
