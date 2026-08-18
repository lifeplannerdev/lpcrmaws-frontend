import React, { useState, useRef, useEffect } from 'react';
import { LogOut, MessageSquare, ChevronDown } from 'lucide-react';

import NotificationBell from './NotificationBell';

const DesktopNavbar = ({
  navItems, isActive, handleNavigation, handleLogout, onChatOpen,
  notifications, unreadCount, onClearNotifications, onMarkRead, isFds
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
    <div className={`hidden lg:flex items-center justify-between gap-4 rounded-lg px-2 py-2 border ${isFds ? 'bg-[#2A1F15] border-[#C9A96E]/20' : 'bg-gray-50 border-gray-200'}`}>
      
      <div className="flex items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button key={item.id} onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${active 
                  ? (isFds ? 'bg-[#C9A96E] text-[#1C1410] shadow-md' : 'bg-indigo-600 text-white shadow-md') 
                  : (isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600')}`}>
              <Icon size={18} /><span>{item.label}</span>
            </button>
          );
        })}

        {hasMoreItems && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${isMoreActive 
                  ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E]' : 'bg-indigo-100 text-indigo-700') 
                  : (isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600')}`}>
              <span>More</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreOpen && (
              <div className={`absolute top-full left-0 mt-1 w-56 rounded-md shadow-lg border py-1 z-50 ${isFds ? 'bg-[#2A1F15] border-[#C9A96E]/20' : 'bg-white border-gray-100'}`}>
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
                        ${active 
                          ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-medium' : 'bg-indigo-50 text-indigo-700 font-medium') 
                          : (isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E]' : 'text-gray-700 hover:bg-gray-50')}`}>
                      <Icon size={16} className={active ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : (isFds ? 'text-[#B89B72]' : 'text-gray-400')} />
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
          className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}>
          <MessageSquare size={18} /><span>Chat</span>
        </button>

        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onClearNotifications={onClearNotifications}
          onMarkRead={onMarkRead}
        />

        <button onClick={handleLogout}
          className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${isFds ? 'text-[#F5E6CC] hover:bg-red-900/50 hover:text-red-400' : 'text-gray-700 hover:bg-red-50 hover:text-red-600'}`}>
          <LogOut size={18} /><span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(DesktopNavbar);
