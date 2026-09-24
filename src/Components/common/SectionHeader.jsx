import React from 'react';

export default function SectionHeader({ 
  title, 
  actionText = 'View All',
  onActionClick,
  showAction = true,
  size = 'md',
  className = '',
}) {
  const isSm = size === 'sm';

  return (
    <div className={`flex items-center justify-between ${isSm ? 'mb-3' : 'mb-6'} ${className}`}>
      <h2 className={`${isSm ? 'text-base font-bold text-gray-900 tracking-tight' : 'text-2xl font-bold text-gray-900'} truncate mr-2`}>
        {title}
      </h2>
      {showAction && (
        <button 
          onClick={onActionClick}
          className={`${isSm ? 'text-xs' : 'text-sm'} text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors flex-shrink-0 flex items-center gap-0.5`}
        >
          {actionText} →
        </button>
      )}
    </div>
  );
}