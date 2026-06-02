import React, { useState, useRef, useEffect } from 'react';
import { LogOut, MessageSquare, ChevronDown } from 'lucide-react';

import NotificationBell from './NotificationBell';

const DesktopNavbar = ({
  navItems, isActive, handleNavigation, handleLogout, onChatOpen,
  notifications, unreadCount, onClearNotifications, onMarkRead
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show up to 6 items on the main bar, the rest go into the "More" dropdown
  const MAX_VISIBLE_ITEMS = 6;
  const visibleItems = navItems.slice(0, MAX_VISIBLE_ITEMS);
  const moreItems = navItems.slice(MAX_VISIBLE_ITEMS);
  const hasMoreItems = moreItems.length > 0;

  // Check if any item in the "More" menu is currently active
  const isMoreActive = moreItems.some(item => isActive(item.path));

  return (
    <div className="hidden lg:flex items-center justify-between gap-4 bg-gray-50 rounded-lg px-2 py-2 border border-gray-200">
      
      <div className="flex items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button key={item.id} onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
              <Icon size={18} /><span>{item.label}</span>
            </button>
          );
        })}

        {hasMoreItems && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${isMoreActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
              <span>More</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => {
                        handleNavigation(item.path);
                        setIsMoreOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
                        ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Icon size={16} className={active ? 'text-indigo-600' : 'text-gray-400'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onChatOpen}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap">
          <MessageSquare size={18} /><span>Chat</span>
        </button>

        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onClearNotifications={onClearNotifications}
          onMarkRead={onMarkRead}
        />

        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap">
          <LogOut size={18} /><span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(DesktopNavbar);
