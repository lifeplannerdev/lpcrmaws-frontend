import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LogOut, MessageSquare, ChevronDown, Search, Sparkles, BookOpen } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { getCategorizedMenu } from '../../config/roles';

const DesktopNavbar = ({
  navItems = [],
  categorizedNav: passedCategorizedNav,
  isActive,
  handleNavigation,
  handleLogout,
  onChatOpen,
  notifications,
  unreadCount,
  onClearNotifications,
  onMarkRead,
  isFds = false,
  onOpenSearch
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const navbarRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Compute categorized navigation if not directly provided
  const categorized = useMemo(() => {
    if (passedCategorizedNav) return passedCategorizedNav;
    return getCategorizedMenu(navItems, { company: isFds ? 'FDS' : 'ADM' });
  }, [passedCategorizedNav, navItems, isFds]);

  const { overviewItem, categories = [] } = categorized;

  const isOverviewActive = overviewItem ? isActive(overviewItem.path) : false;

  const handleToggleDropdown = (categoryId) => {
    setOpenDropdown(prev => prev === categoryId ? null : categoryId);
  };

  const onItemClick = (path) => {
    handleNavigation(path);
    setOpenDropdown(null);
  };

  return (
    <div 
      ref={navbarRef}
      className={`hidden lg:flex items-center justify-between gap-3 rounded-xl px-3 py-2 border transition-all duration-200 ${
        isFds 
          ? 'bg-[#2A1F15] border-[#C9A96E]/25 shadow-md shadow-black/20' 
          : 'bg-white/95 backdrop-blur-md border-gray-200/80 shadow-xs'
      }`}
    >
      {/* Left / Center Navigation Items */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Standalone Overview Button */}
        {overviewItem && (
          <button
            onClick={() => onItemClick(overviewItem.path)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
              isOverviewActive
                ? (isFds ? 'bg-[#C9A96E] text-[#1C1410] shadow-sm font-semibold' : 'bg-indigo-600 text-white shadow-sm font-semibold')
                : (isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' : 'text-gray-700 hover:bg-indigo-50/80 hover:text-indigo-600')
            }`}
          >
            {overviewItem.icon && <overviewItem.icon size={17} />}
            <span>{overviewItem.label}</span>
          </button>
        )}

        {/* Categorized Dropdowns */}
        {categories.map((category) => {
          const CategoryIcon = category.icon || Sparkles;
          const isCategoryActive = category.items.some(item => isActive(item.path));
          const isOpen = openDropdown === category.id;
          const isDivisions = category.id === 'divisions';
          const hasManyItems = category.items.length > 5;

          // Split divisions into FDS and FLAG if applicable
          const fdsItems = isDivisions ? category.items.filter(i => i.group === 'fds') : [];
          const flagItems = isDivisions ? category.items.filter(i => i.group === 'flag') : [];

          return (
            <div key={category.id} className="relative">
              <button
                type="button"
                onClick={() => handleToggleDropdown(category.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-150 whitespace-nowrap ${
                  isOpen
                    ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] ring-1 ring-[#C9A96E]/40' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200')
                    : isCategoryActive
                    ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-semibold' : 'bg-indigo-50/90 text-indigo-700 font-semibold')
                    : (isFds ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' : 'text-gray-700 hover:bg-gray-100/70 hover:text-indigo-600')
                }`}
              >
                <CategoryIcon size={16} className={isCategoryActive ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : 'opacity-70'} />
                <span>{category.label}</span>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180 opacity-100' : ''}`} 
                />
              </button>

              {/* Dropdown Menu Card */}
              {isOpen && (
                <div
                  className={`absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl border p-3 transition-all animate-in fade-in zoom-in-95 duration-150 ${
                    isFds
                      ? 'bg-[#1C1410] border-[#C9A96E]/30 text-[#F5E6CC]'
                      : 'bg-white border-gray-100 text-gray-800'
                  } ${
                    isDivisions 
                      ? 'w-[560px]' 
                      : hasManyItems 
                      ? 'w-[520px]' 
                      : 'w-[280px]'
                  }`}
                >
                  {/* Category Header */}
                  <div className={`px-2.5 pb-2.5 mb-2 border-b flex items-center justify-between ${
                    isFds ? 'border-[#C9A96E]/15' : 'border-gray-100'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isFds ? 'text-[#C9A96E]' : 'text-indigo-600'
                      }`}>
                        {category.label}
                      </span>
                      {category.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isFds ? 'bg-[#2A1F15] text-[#C9A96E]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {category.items.length} {category.items.length === 1 ? 'module' : 'modules'}
                    </span>
                  </div>

                  {/* Special Layout for Divisions: Split by Portal */}
                  {isDivisions && (fdsItems.length > 0 || flagItems.length > 0) ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* FDS Studio Column */}
                      {fdsItems.length > 0 && (
                        <div className={`p-2 rounded-xl border ${
                          isFds ? 'bg-[#251A14]/70 border-[#C9A96E]/20' : 'bg-amber-50/40 border-amber-100'
                        }`}>
                          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs font-bold text-amber-600">
                            <Sparkles size={13} />
                            <span>FILMAATIC Studio</span>
                          </div>
                          <div className="space-y-0.5">
                            {fdsItems.map((item) => {
                              const ItemIcon = item.icon || Sparkles;
                              const active = isActive(item.path);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => onItemClick(item.path)}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                                    active
                                      ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold')
                                      : (isFds ? 'hover:bg-[#2A1F15] text-[#F5E6CC]/90' : 'hover:bg-white text-gray-700 hover:shadow-xs')
                                  }`}
                                >
                                  <ItemIcon size={14} className={active ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : 'text-gray-400'} />
                                  <span className="truncate">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* FLAG German Column */}
                      {flagItems.length > 0 && (
                        <div className={`p-2 rounded-xl border ${
                          isFds ? 'bg-[#251A14]/70 border-[#C9A96E]/20' : 'bg-blue-50/40 border-blue-100'
                        }`}>
                          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs font-bold text-blue-600">
                            <BookOpen size={13} />
                            <span>FLAG German Academy</span>
                          </div>
                          <div className="space-y-0.5">
                            {flagItems.map((item) => {
                              const ItemIcon = item.icon || Sparkles;
                              const active = isActive(item.path);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => onItemClick(item.path)}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                                    active
                                      ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold')
                                      : (isFds ? 'hover:bg-[#2A1F15] text-[#F5E6CC]/90' : 'hover:bg-white text-gray-700 hover:shadow-xs')
                                  }`}
                                >
                                  <ItemIcon size={14} className={active ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : 'text-gray-400'} />
                                  <span className="truncate">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Category Grid/List */
                    <div className={hasManyItems ? "grid grid-cols-2 gap-1.5" : "space-y-1"}>
                      {category.items.map((item) => {
                        const ItemIcon = item.icon || Sparkles;
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.id}
                            onClick={() => onItemClick(item.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                              active
                                ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-medium shadow-xs' : 'bg-indigo-50 text-indigo-700 font-medium shadow-xs')
                                : (isFds ? 'hover:bg-[#2A1F15] text-[#F5E6CC]/90' : 'hover:bg-gray-50 text-gray-700')
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              active 
                                ? (isFds ? 'bg-[#C9A96E] text-[#1C1410]' : 'bg-indigo-600 text-white')
                                : (isFds ? 'bg-[#2A1F15] text-[#C9A96E]' : 'bg-gray-100 text-gray-500')
                            }`}>
                              <ItemIcon size={15} />
                            </div>
                            <div className="min-w-0 flex-1 truncate">
                              <div className="text-xs font-semibold truncate leading-snug">
                                {item.label}
                              </div>
                              {item.description && (
                                <div className={`text-[11px] truncate leading-tight mt-0.5 ${
                                  active 
                                    ? (isFds ? 'text-[#C9A96E]/80' : 'text-indigo-600/80') 
                                    : 'text-gray-400'
                                }`}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Side Utility Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Search Spotlight Button */}
        <button
          onClick={onOpenSearch}
          title="Search all modules (Ctrl + K)"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isFds
              ? 'bg-[#241A12] border-[#C9A96E]/20 text-[#B89B72] hover:bg-[#3A2C1E] hover:text-[#C9A96E]'
              : 'bg-gray-50/90 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Search size={14} />
          <span className="hidden xl:inline">Search modules</span>
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
            isFds ? 'bg-[#1C1410] text-[#C9A96E]' : 'bg-gray-200/70 text-gray-600'
          }`}>
            Ctrl K
          </kbd>
        </button>

        {/* Chat Button */}
        <button
          onClick={onChatOpen}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
            isFds 
              ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' 
              : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          <MessageSquare size={17} />
          <span>Chat</span>
        </button>

        {/* Notification Bell */}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onClearNotifications={onClearNotifications}
          onMarkRead={onMarkRead}
        />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
            isFds 
              ? 'text-[#F5E6CC] hover:bg-red-950/60 hover:text-red-400' 
              : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(DesktopNavbar);
