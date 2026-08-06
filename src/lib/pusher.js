import Pusher from 'pusher-js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let pusherInstance = null;

export const getPusherClient = (getToken) => {
  // Always destroy old instance before creating new one
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }

    
  pusherInstance = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
    cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    forceTLS: true,
    enabledTransports: ['ws', 'wss', 'xhr_streaming', 'xhr_polling'],
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const token = await getToken();
          console.log('[Pusher] Authorizing channel:', channel.name);
          const res = await fetch(`${API_BASE_URL}/pusher/auth/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          });
          console.log('[Pusher] Auth response status:', res.status);
          if (!res.ok) {
            const err = await res.text();
            console.error('[Pusher] Auth failed:', err);
            throw new Error(`Auth failed: ${res.status}`);
          }
          const data = await res.json();
          callback(null, data);
        } catch (err) {
          console.error('[Pusher] Auth error:', err);
          callback(err, null);
        }
      },
    }),
  });

  return pusherInstance;
};

export const destroyPusherClient = () => {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
};
