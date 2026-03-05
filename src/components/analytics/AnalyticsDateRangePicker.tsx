import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DATE_RANGE_PRESETS, type DateRange } from '@/hooks/useAdvancedAnalytics';
import type { DateRange as RDPDateRange } from 'react-day-picker';

interface AnalyticsDateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  activePreset: string | null;
  onPresetChange: (preset: string) => void;
}

export const AnalyticsDateRangePicker: React.FC<AnalyticsDateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePreset = (preset: typeof DATE_RANGE_PRESETS[number]) => {
    const range = preset.getRange();
    onDateRangeChange(range);
    onPresetChange(preset.value);
  };

  const handleCalendarSelect = (range: RDPDateRange | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
      onPresetChange('');
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 flex-wrap">
        {DATE_RANGE_PRESETS.map((preset) => (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePreset(preset)}
            className="h-8 text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={!activePreset ? 'default' : 'outline'}
            size="sm"
            className={cn('h-8 gap-1.5 text-xs', !activePreset && 'font-medium')}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {!activePreset
              ? `${format(dateRange.from, 'dd/MM/yy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yy', { locale: es })}`
              : 'Personalizado'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={es}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
