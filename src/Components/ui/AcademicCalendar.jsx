import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS_MAP = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };

export default function AcademicCalendar({ selectedDate, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate || new Date()));
  
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const pad = (n) => n.toString().padStart(2, '0');
  const selDateStr = selectedDate;

  const handleDateClick = (d) => {
    const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
    onSelectDate(dateStr);
  };

  const blanks = Array.from({ length: firstDayOfWeek });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 max-w-sm mb-6 mx-auto md:mx-0">
      <div className="flex justify-between items-center mb-4">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500" onClick={handlePrevMonth}>
          <ChevronLeft size={18} />
        </button>
        <div className="font-bold text-indigo-700">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500" onClick={handleNextMonth}>
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map(d => {
          const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
          const isSelected = dateStr === selDateStr;
          
          return (
            <div 
              key={d} 
              onClick={() => handleDateClick(d)}
              className={`w-full aspect-square flex items-center justify-center rounded-full cursor-pointer text-sm font-medium transition-all select-none
                ${isSelected 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
