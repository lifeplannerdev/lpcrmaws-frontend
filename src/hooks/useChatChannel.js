import { useEffect, useRef } from 'react';
import { usePusher } from '../context/PusherContext';

// Call this inside your chat page/component
// onNewMessage: (messageData) => void
// onMessagesDelivered: (data) => void
// onMessagesRead: (data) => void
export const useChatChannel = (conversationId, onNewMessage, onMessagesDelivered, onMessagesRead) => {
  const { pusher, isReady } = usePusher();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isReady || !pusher || !conversationId) return;

    const channelName = `private-chat-${conversationId}`;
    channelRef.current = pusher.subscribe(channelName);

    channelRef.current.bind('new-message', (data) => {
      onNewMessage?.(data);
    });

    channelRef.current.bind('messages-delivered', (data) => {
      onMessagesDelivered?.(data);
    });

    channelRef.current.bind('messages-read', (data) => {
      onMessagesRead?.(data);
    });

    return () => {
      channelRef.current?.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [isReady, pusher, conversationId]);
};
