// Components/common/MetricCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  gradient, 
  hoverColor,
  showTrend = false,
  subtitle,
  tooltip
}) {
  const displayVal = typeof value === 'number' ? value.toLocaleString() : value;
  const isLongVal = String(displayVal ?? '').length > 8;

  const getHoverTextColor = () => {
    switch (hoverColor) {
      case 'blue': return 'group-hover:text-blue-600';
      case 'green': return 'group-hover:text-green-600';
      case 'emerald': return 'group-hover:text-emerald-600';
      case 'purple': return 'group-hover:text-purple-600';
      case 'indigo': return 'group-hover:text-indigo-600';
      case 'amber': return 'group-hover:text-amber-600';
      case 'orange': return 'group-hover:text-orange-600';
      case 'rose':
      case 'red': return 'group-hover:text-rose-600';
      case 'sky': return 'group-hover:text-sky-600';
      case 'teal': return 'group-hover:text-teal-600';
      case 'pink': return 'group-hover:text-pink-600';
      default: return 'group-hover:text-blue-600';
    }
  };

  return (
    <div 
      className="group bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
      title={tooltip || (typeof value === 'number' ? value.toLocaleString() : undefined)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-1.5 truncate">
            {title}
          </p>
          <h3 className={`font-extrabold text-gray-900 transition-colors tracking-tight truncate ${
            isLongVal ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          } ${getHoverTextColor()}`}>
            {displayVal}
          </h3>
          
          {subtitle && (
            <p className="text-xs text-gray-500 font-medium truncate mt-1">
              {subtitle}
            </p>
          )}

          {showTrend && change !== undefined && change !== null && (
            <div className={`flex items-center text-xs font-medium mt-1.5 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
              )}
              <span className="font-bold">{change >= 0 ? '+' : ''}{change}%</span>
              <span className="text-gray-400 ml-1">vs last mo</span>
            </div>
          )}
        </div>
        
        {/* Compact Responsive Icon Container */}
        {Icon && (
          <div className={`bg-gradient-to-br ${gradient} w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform flex-shrink-0`}>
            <Icon className="text-white" size={20} />
          </div>
        )}
      </div>
    </div>
  );
}