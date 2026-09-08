import React, { useState, useMemo } from 'react';
import { LogOut, Menu, X, MessageSquare, ChevronDown, Search, Sparkles } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { getCategorizedMenu } from '../../config/roles';

const MobileNavbar = ({
  navItems = [],
  categorizedNav: passedCategorizedNav,
  isActive,
  handleNavigation,
  handleLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onChatOpen,
  notifications,
  unreadCount,
  onClearNotifications,
  onMarkRead,
  isFds = false,
  onOpenSearch
}) => {
  const categorized = useMemo(() => {
    if (passedCategorizedNav) return passedCategorizedNav;
    return getCategorizedMenu(navItems, { company: isFds ? 'FDS' : 'ADM' });
  }, [passedCategorizedNav, navItems, isFds]);

  const { overviewItem, categories = [] } = categorized;

  // Track which accordions are open in mobile menu
  const [openCategories, setOpenCategories] = useState(() => {
    // Open the category that contains the currently active route
    const activeCat = categories.find(cat => cat.items.some(i => isActive(i.path)));
    return activeCat ? [activeCat.id] : [];
  });

  const toggleCategory = (categoryId) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const onItemClick = (path) => {
    handleNavigation(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="lg:hidden">
      {/* Mobile Top Header Bar */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
        isFds 
          ? 'bg-[#2A1F15] border-[#C9A96E]/20 text-[#F5E6CC]' 
          : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isFds 
              ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' 
              : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Quick Search trigger */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenSearch?.();
            }}
            className={`p-2 rounded-lg transition-colors ${
              isFds 
                ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' 
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
            title="Search modules"
          >
            <Search size={19} />
          </button>

          {/* Chat Button */}
          <button
            onClick={onChatOpen}
            className={`p-2 rounded-lg transition-colors ${
              isFds 
                ? 'text-[#F5E6CC] hover:bg-[#3A2C1E] hover:text-[#C9A96E]' 
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
          >
            <MessageSquare size={19} />
          </button>

          {/* Bell */}
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onClearNotifications={onClearNotifications}
            onMarkRead={onMarkRead}
          />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`p-2 rounded-lg transition-colors ${
              isFds 
                ? 'text-[#F5E6CC] hover:bg-red-900/40 hover:text-red-400' 
                : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown / Drawer */}
      {isMobileMenuOpen && (
        <div className={`mt-2 rounded-2xl border shadow-xl p-3 max-h-[80vh] overflow-y-auto ${
          isFds 
            ? 'bg-[#1C1410] border-[#C9A96E]/20 text-[#F5E6CC]' 
            : 'bg-white border-gray-200 text-gray-800'
        }`}>
          {/* Mobile Search Bar */}
          <div className="mb-3">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSearch?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                isFds 
                  ? 'bg-[#251A14] border-[#C9A96E]/20 text-[#B89B72]' 
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <span className="flex items-center gap-2">
                <Search size={15} />
                <span>Search all modules...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-black/10 font-mono">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Standalone Overview Item */}
          {overviewItem && (
            <button
              onClick={() => onItemClick(overviewItem.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 mb-2 rounded-xl text-sm font-semibold transition-all ${
                isActive(overviewItem.path)
                  ? (isFds ? 'bg-[#C9A96E] text-[#1C1410] shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                  : (isFds ? 'hover:bg-[#2A1F15] text-[#F5E6CC]' : 'hover:bg-gray-50 text-gray-700')
              }`}
            >
              {overviewItem.icon && <overviewItem.icon size={18} />}
              <span>{overviewItem.label}</span>
            </button>
          )}

          {/* Category Accordions */}
          <div className="space-y-1.5">
            {categories.map((category) => {
              const CategoryIcon = category.icon || Sparkles;
              const isExpanded = openCategories.includes(category.id);
              const isCategoryActive = category.items.some(item => isActive(item.path));

              return (
                <div 
                  key={category.id} 
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isFds ? 'border-[#C9A96E]/15 bg-[#241A12]' : 'border-gray-100 bg-gray-50/50'
                  }`}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isCategoryActive
                        ? (isFds ? 'text-[#C9A96E] font-semibold' : 'text-indigo-600 font-semibold')
                        : (isFds ? 'text-[#F5E6CC]' : 'text-gray-700')
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon size={17} className={isCategoryActive ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : 'opacity-70'} />
                      <span>{category.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isFds ? 'bg-[#1C1410] text-[#B89B72]' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {category.items.length}
                      </span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform duration-200 opacity-60 ${isExpanded ? 'rotate-180 opacity-100' : ''}`} 
                    />
                  </button>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className={`p-1.5 space-y-1 border-t ${
                      isFds ? 'border-[#C9A96E]/10 bg-[#1C1410]' : 'border-gray-100 bg-white'
                    }`}>
                      {category.items.map((item) => {
                        const ItemIcon = item.icon || Sparkles;
                        const active = isActive(item.path);

                        return (
                          <button
                            key={item.id}
                            onClick={() => onItemClick(item.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all ${
                              active
                                ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold')
                                : (isFds ? 'hover:bg-[#251A14] text-[#F5E6CC]/85' : 'hover:bg-gray-50 text-gray-600')
                            }`}
                          >
                            <ItemIcon size={15} className={active ? (isFds ? 'text-[#C9A96E]' : 'text-indigo-600') : 'text-gray-400'} />
                            <div className="truncate">
                              <div className="truncate">{item.label}</div>
                              {item.description && (
                                <div className="text-[10px] text-gray-400 truncate mt-0.5">
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MobileNavbar);
