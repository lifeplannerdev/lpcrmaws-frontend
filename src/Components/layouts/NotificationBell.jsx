// Components/layouts/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, ClipboardList, UserPlus, MessageSquare, FileText } from 'lucide-react';

const iconMap = {
  task: <ClipboardList size={14} className="text-indigo-500" />,
  lead: <UserPlus size={14} className="text-emerald-500" />,
  chat: <MessageSquare size={14} className="text-blue-500" />,
  report: <FileText size={14} className="text-orange-500" />
};

const timeAgo = (date) => {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationBell = ({ notifications, unreadCount, onClearNotifications, onMarkRead }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) onMarkRead(); // mark as read when opened
  };

  const handleNotificationClick = (n) => {
    setOpen(false);
    if (!n.related_id) return;
    
    let route = '';
    const type = n.type?.toLowerCase() || '';
    const msg = n.message?.toLowerCase() || '';

    if (type === 'report' || msg.includes('report')) {
      route = `/reports/view/${n.related_id}`;
    } else if (type === 'task' || msg.includes('task')) {
      route = `/tasks/${n.related_id}`;
    } else if (type === 'lead' || msg.includes('lead')) {
      route = `/leads/view/${n.related_id}`;
    } else if (type === 'chat' || msg.includes('chat') || msg.includes('message')) {
      route = `/chat`;
    }
    
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={onClearNotifications}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
              >
                <Trash2 size={12} /> Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const type = n.type?.toLowerCase() || '';
                const msg = n.message?.toLowerCase() || '';
                const displayIcon = iconMap[n.type] || (msg.includes('report') ? iconMap.report : null);
                
                return (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {displayIcon}
                    </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                    {n.by && <p className="text-xs text-gray-400 mt-0.5">by {n.by}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.time)}</p>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
