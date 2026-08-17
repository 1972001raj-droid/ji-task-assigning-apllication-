import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value?: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  // Sync state when value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(String(parseInt(parts[1], 10))); // remove leading zeros for select value
        setDay(String(parseInt(parts[2], 10)));
      }
    } else {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  const monthNames = [
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];

  // Years range
  const startYear = 2025;
  const years = Array.from({ length: 15 }, (_, i) => String(startYear + i));

  // Determine days in selected month/year
  const getDaysInMonth = (m?: string, y?: string) => {
    const monthNum = m ? parseInt(m, 10) : 1;
    const yearNum = y ? parseInt(y, 10) : new Date().getFullYear();
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const maxDays = getDaysInMonth(month, year);
  const days = Array.from({ length: maxDays }, (_, i) => String(i + 1));

  // Handle changes and propagate
  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear) {
      const yyyy = newYear;
      const mm = newMonth.padStart(2, '0');
      const dd = newDay.padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    } else if (!newDay && !newMonth && !newYear) {
      onChange(undefined);
    }
  };

  const handleDayChange = (val: string) => {
    setDay(val);
    updateDate(val, month, year);
  };

  const handleMonthChange = (val: string) => {
    setMonth(val);
    // If selected day exceeds the new month's max days, adjust it
    const newMaxDays = getDaysInMonth(val, year);
    let adjustedDay = day;
    if (day && parseInt(day, 10) > newMaxDays) {
      adjustedDay = String(newMaxDays);
      setDay(adjustedDay);
    }
    updateDate(adjustedDay, val, year);
  };

  const handleYearChange = (val: string) => {
    setYear(val);
    const newMaxDays = getDaysInMonth(month, val);
    let adjustedDay = day;
    if (day && parseInt(day, 10) > newMaxDays) {
      adjustedDay = String(newMaxDays);
      setDay(adjustedDay);
    }
    updateDate(adjustedDay, month, val);
  };

  const handleClear = () => {
    setDay('');
    setMonth('');
    setYear('');
    onChange(undefined);
  };

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {/* Day Select */}
      <select
        value={day}
        onChange={(e) => handleDayChange(e.target.value)}
        className="flex-1 h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer overflow-y-auto"
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d.padStart(2, '0')}
          </option>
        ))}
      </select>

      {/* Month Select */}
      <select
        value={month}
        onChange={(e) => handleMonthChange(e.target.value)}
        className="flex-[1.5] h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
      >
        <option value="">Month</option>
        {monthNames.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Year Select */}
      <select
        value={year}
        onChange={(e) => handleYearChange(e.target.value)}
        className="flex-[1.2] h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Clear Button */}
      {(day || month || year) && (
        <button
          type="button"
          onClick={handleClear}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-rose-500 hover:text-rose-600 transition-colors shrink-0"
          title="Clear date"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
