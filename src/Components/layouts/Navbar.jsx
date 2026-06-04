import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { getFilteredMenu } from '../../config/roles';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import { useUserChannel } from '../../hooks/useUserChannel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessToken, refreshAccessToken } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const navItems = getFilteredMenu(hasAnyPermission);
  const handleNavigation = (path) => { navigate(path); setIsMobileMenuOpen(false); };
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleChatOpen = () => { navigate('/chat'); setIsMobileMenuOpen(false); };
  const isActive = (path) => location.pathname === path;

  return (
    <div className="bg-white p-4 shadow-md">
      <div className="max-w-7xl mx-auto">
        <DesktopNavbar
          navItems={navItems}
          isActive={isActive}
          handleNavigation={handleNavigation}
          handleLogout={handleLogout}
          onChatOpen={handleChatOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          onClearNotifications={handleClearNotifications}
          onMarkRead={handleMarkRead}
        />
        <MobileNavbar
          navItems={navItems}
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
        />
      </div>
    </div>
  );
};

export default Navbar;
