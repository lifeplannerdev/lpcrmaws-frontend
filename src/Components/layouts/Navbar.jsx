import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { getFilteredMenu, getCategorizedMenu } from '../../config/roles';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import CommandPalette from './CommandPalette';
import { useUserChannel } from '../../hooks/useUserChannel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessToken, refreshAccessToken } = useAuth();
  const { hasAnyPermission, hasPermission } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getToken = useCallback(async () => {
    return accessToken || await refreshAccessToken();
  }, [accessToken, refreshAccessToken]);

  // Load persisted notifications from backend on login
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/notifications/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
  }, [user]);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 20));
    setUnreadCount(prev => prev + 1);
  }, []);

  const handleClearNotifications = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/notifications/clear/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleMarkRead = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/notifications/mark-read/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  useUserChannel({
    onTaskAssigned: (data) => addNotification({
      id: Date.now(),
      type: 'task',
      message: data.message,
      by: data.assigned_by_name,
      time: new Date().toISOString(),
      is_read: false,
    }),
    onLeadAssigned: (data) => addNotification({
      id: Date.now(),
      type: 'lead',
      message: data.message,
      by: data.assigned_by_name,
      time: new Date().toISOString(),
      is_read: false,
    }),
    onNewConversation: (data) => addNotification({
      id: Date.now(),
      type: 'chat',
      message: data.type === 'GROUP'
        ? `Added to group: "${data.name}"`
        : 'New direct message conversation',
      time: new Date().toISOString(),
      is_read: false,
    }),
  });

  const baseNavItems = getFilteredMenu(hasAnyPermission, hasPermission, user);
  const navItems = baseNavItems.map(item => {
    if (user?.company === 'FDS' && item.path === '/') {
      return { ...item, path: '/fds', label: 'FDS Studio' };
    }
    return item;
  });

  const categorizedNav = getCategorizedMenu(navItems, user);

  const handleNavigation = (path) => { navigate(path); setIsMobileMenuOpen(false); };
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleChatOpen = () => { navigate('/chat'); setIsMobileMenuOpen(false); };
  const isActive = (path) => location.pathname === path;

  const isFds = user?.company === 'FDS';

  return (
    <div className={`p-3 lg:p-4 shadow-sm transition-colors relative z-40 ${isFds ? 'bg-[#1C1410] border-b border-[#C9A96E]/20' : 'bg-white border-b border-gray-100'}`}>
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 relative z-40">
        {isFds && (
          <div 
            className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity mr-2" 
            onClick={() => handleNavigation('/fds')}
          >
            <img 
              src="/fds_logo.jpeg" 
              alt="FILMAATIC Dance Studio" 
              className="h-12 w-auto object-contain rounded-md p-1 bg-white/10 mix-blend-screen"
            />
          </div>
        )}
        <div className="flex-1 w-full min-w-0 relative z-40">
          <DesktopNavbar
            navItems={navItems}
            categorizedNav={categorizedNav}
            isActive={isActive}
            handleNavigation={handleNavigation}
            handleLogout={handleLogout}
            onChatOpen={handleChatOpen}
            notifications={notifications}
            unreadCount={unreadCount}
            onClearNotifications={handleClearNotifications}
            onMarkRead={handleMarkRead}
            isFds={isFds}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
          <MobileNavbar
            navItems={navItems}
            categorizedNav={categorizedNav}
            isActive={isActive}
            handleNavigation={handleNavigation}
            handleLogout={handleLogout}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            onChatOpen={handleChatOpen}
            notifications={notifications}
            unreadCount={unreadCount}
            onClearNotifications={handleClearNotifications}
            onMarkRead={handleMarkRead}
            isFds={isFds}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        </div>
      </div>

      {/* Global Spotlight Search Palette */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={navItems}
        onNavigate={handleNavigation}
        isFds={isFds}
      />
    </div>
  );
};

export default Navbar;
