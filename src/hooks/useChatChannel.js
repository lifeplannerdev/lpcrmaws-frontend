import { useEffect, useRef } from 'react';
import { usePusher } from '../context/PusherContext';

// Call this inside your chat page/component
// onNewMessage: (messageData) => void
// onMessagesDelivered: (data) => void
// onMessagesRead: (data) => void
// onMessageDeleted: (data) => void
export const useChatChannel = (conversationId, onNewMessage, onMessagesDelivered, onMessagesRead, onMessageDeleted) => {
  const { pusher, isReady } = usePusher();
  const channelRef = useRef(null);

  const onNewMessageRef = useRef(onNewMessage);
  const onMessagesDeliveredRef = useRef(onMessagesDelivered);
  const onMessagesReadRef = useRef(onMessagesRead);
  const onMessageDeletedRef = useRef(onMessageDeleted);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessagesDeliveredRef.current = onMessagesDelivered;
    onMessagesReadRef.current = onMessagesRead;
    onMessageDeletedRef.current = onMessageDeleted;
  });

  useEffect(() => {
    if (!isReady || !pusher || !conversationId) return;

    const channelName = `private-chat-${conversationId}`;
    channelRef.current = pusher.subscribe(channelName);

    channelRef.current.bind('new-message', (data) => {
      onNewMessageRef.current?.(data);
    });

    channelRef.current.bind('messages-delivered', (data) => {
      onMessagesDeliveredRef.current?.(data);
    });

    channelRef.current.bind('messages-read', (data) => {
      onMessagesReadRef.current?.(data);
    });

    channelRef.current.bind('message-deleted', (data) => {
      onMessageDeletedRef.current?.(data);
    });

    return () => {
      channelRef.current?.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [isReady, pusher, conversationId]);
};

