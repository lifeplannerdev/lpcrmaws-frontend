import { useEffect, useRef } from 'react';
import { usePusher } from '../context/PusherContext';

export const useLeadsChannel = ({
  onLeadCreated,
  onLeadUpdated,
  onLeadDeleted,
} = {}) => {
  const { pusher, isReady } = usePusher();
  const channelRef = useRef(null);

  const onLeadCreatedRef = useRef(onLeadCreated);
  const onLeadUpdatedRef = useRef(onLeadUpdated);
  const onLeadDeletedRef = useRef(onLeadDeleted);

  useEffect(() => {
    onLeadCreatedRef.current = onLeadCreated;
    onLeadUpdatedRef.current = onLeadUpdated;
    onLeadDeletedRef.current = onLeadDeleted;
  });

  useEffect(() => {
    if (!isReady || !pusher) return;

    const channelName = 'private-leads-updates';
    channelRef.current = pusher.subscribe(channelName);

    channelRef.current.bind('lead.created', (data) => onLeadCreatedRef.current?.(data));
    channelRef.current.bind('lead.updated', (data) => onLeadUpdatedRef.current?.(data));
    channelRef.current.bind('lead.deleted', (data) => onLeadDeletedRef.current?.(data));

    return () => {
      channelRef.current?.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [isReady, pusher]);
};
