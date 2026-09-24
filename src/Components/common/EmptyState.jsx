// Components/common/EmptyState.jsx
import React from 'react';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  iconColor = 'text-gray-400',
  bgColor = 'bg-gray-100',
  compact = false,
  className = '',
}) {
  if (compact) {
    return (
      <div className={`text-center py-3 flex-1 flex flex-col items-center justify-center ${className}`}>
        <div className={`w-9 h-9 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-2 flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <p className="text-gray-700 text-xs font-semibold">{title}</p>
        {description && (
          <p className="text-gray-400 text-[11px] mt-0.5">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      {description && (
        <p className="text-gray-400 text-xs mt-1">{description}</p>
      )}
    </div>
  );
}