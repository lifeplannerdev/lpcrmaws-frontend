import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, CornerDownLeft, Sparkles, Compass } from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  items = [],
  onNavigate,
  isFds = false
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items.slice(0, 15);
    }
    const q = query.toLowerCase();
    return items.filter(item => 
      item.label?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.group?.toLowerCase().includes(q)
    );
  }, [query, items]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside command palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onNavigate(filteredItems[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border transition-all animate-in fade-in zoom-in-95 duration-150 ${
          isFds 
            ? 'bg-[#1C1410] border-[#C9A96E]/30 text-[#F5E6CC]' 
            : 'bg-white border-gray-200 text-gray-800'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${
          isFds ? 'border-[#C9A96E]/20 bg-[#251A14]' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <Search size={20} className={isFds ? 'text-[#C9A96E]' : 'text-indigo-600'} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any module or tool (e.g. Leads, Batches, Fees)..."
            className={`w-full bg-transparent text-base outline-none placeholder:text-gray-400 font-medium ${
              isFds ? 'text-[#F5E6CC]' : 'text-gray-900'
            }`}
          />
          <button 
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isFds ? 'hover:bg-[#3A2C1E] text-[#B89B72]' : 'hover:bg-gray-200 text-gray-400'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 scroll-smooth"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              <Compass size={36} className="mx-auto mb-2 opacity-40" />
              No matching modules found for <span className="font-semibold">"{query}"</span>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon || Sparkles;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id || item.path}
                    data-index={index}
                    onClick={() => {
                      onNavigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? (isFds ? 'bg-[#3A2C1E] text-[#C9A96E] shadow-sm' : 'bg-indigo-50 text-indigo-900 shadow-sm')
                        : (isFds ? 'hover:bg-[#2A1F15] text-[#F5E6CC]/90' : 'hover:bg-gray-50 text-gray-700')
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                        isSelected 
                          ? (isFds ? 'bg-[#C9A96E] text-[#1C1410]' : 'bg-indigo-600 text-white')
                          : (isFds ? 'bg-[#2A1F15] text-[#C9A96E]' : 'bg-gray-100 text-gray-600')
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-sm truncate flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.category && (
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                              isFds ? 'bg-[#2A1F15] text-[#B89B72]' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {item.category}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div className={`text-xs truncate ${
                            isSelected 
                              ? (isFds ? 'text-[#C9A96E]/80' : 'text-indigo-600/80') 
                              : (isFds ? 'text-gray-400' : 'text-gray-400')
                          }`}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {isSelected && (
                        <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                          isFds ? 'bg-[#251A14] text-[#C9A96E]' : 'bg-white text-indigo-600 shadow-xs'
                        }`}>
                          <span>Go</span>
                          <CornerDownLeft size={12} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-t ${
          isFds ? 'border-[#C9A96E]/10 bg-[#160E0B] text-gray-400' : 'border-gray-100 bg-gray-50/50 text-gray-400'
        }`}>
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[10px]">↵</kbd> to select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[10px]">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
