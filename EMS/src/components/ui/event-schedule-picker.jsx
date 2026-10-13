import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { format } from 'date-fns';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { useState } from 'react';
import { getCampusToday } from '../../lib/campusDate';

const SELECT_CLASSES =
  'flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-nu-dark outline-none hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-nu-navy disabled:cursor-not-allowed disabled:opacity-55';

const pad = (value) => String(value).padStart(2, '0');

const timeToMinutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const isTimeAllowed = (value, minTime, maxTime, minTimeExclusive = false) => {
  const minutes = timeToMinutes(value);
  if (minutes === null) return false;
  const minimum = timeToMinutes(minTime);
  const maximum = timeToMinutes(maxTime);
  return (
    (minimum === null || (minTimeExclusive ? minutes > minimum : minutes >= minimum)) &&
    (maximum === null || minutes <= maximum)
  );
};

const getTimeParts = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return { hour: '', minute: '', period: '' };
  }

  const [hours, minute] = value.split(':').map(Number);
  return {
    hour: pad(hours % 12 || 12),
    minute: pad(minute),
    period: hours >= 12 ? 'PM' : 'AM',
  };
};

const TimeSelect = ({
  id,
  label,
  value,
  options,
  onValueChange,
  disabled,
  invalid,
  disabledOptions = [],
}) => (
  <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger
      id={id}
      aria-label={label}
      aria-invalid={invalid}
      className={`${SELECT_CLASSES} ${invalid ? 'border-red-500' : ''}`}
    >
      <Select.Value placeholder={label} />
      <Select.Icon>
        <ChevronDown size={15} aria-hidden="true" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        position="popper"
        sideOffset={6}
        className="z-50 max-h-60 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        <Select.Viewport>
          {options.map((option) => (
            <Select.Item
              key={option}
              value={option}
              disabled={disabledOptions.includes(option)}
              className="relative flex min-h-9 cursor-pointer items-center rounded-md px-3 pr-8 text-sm text-nu-dark outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-slate-100 data-[state=checked]:font-semibold"
            >
              <Select.ItemText>{option}</Select.ItemText>
              <Select.ItemIndicator className="absolute right-2">
                <Check size={14} aria-hidden="true" />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

export const EventDatePicker = ({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  minDate,
  maxDate,
  allowPast = false,
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const earliestDay = [allowPast ? null : getCampusToday(), minDate].filter(Boolean).sort().at(-1);
  const latestDay = maxDate || undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`${SELECT_CLASSES} ${invalid ? 'border-red-500' : ''}`}
        >
          <span className={value ? '' : 'text-slate-400'}>
            {selected && !Number.isNaN(selected.getTime())
              ? format(selected, 'MMM d, yyyy')
              : 'Choose a date'}
          </span>
          <CalendarDays size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl outline-none"
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            disabled={
              earliestDay || latestDay
                ? {
                    ...(earliestDay ? { before: new Date(`${earliestDay}T12:00:00`) } : {}),
                    ...(latestDay ? { after: new Date(`${latestDay}T12:00:00`) } : {}),
                  }
                : undefined
            }
            onSelect={(date) => {
              if (date) {
                const chosenDay = format(date, 'yyyy-MM-dd');
                if (
                  (!allowPast && chosenDay < getCampusToday()) ||
                  (minDate && chosenDay < minDate) ||
                  (maxDate && chosenDay > maxDate)
                )
                  return;
                onChange(chosenDay);
                setOpen(false);
              }
            }}
            showOutsideDays
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
            }}
            classNames={{
              root: 'relative text-sm text-nu-dark',
              month_caption: 'mb-3 flex h-9 items-center justify-center font-semibold',
              caption_label: 'text-sm',
              nav: 'absolute top-4 inset-x-4 flex justify-between',
              button_previous:
                'relative z-10 flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy',
              button_next:
                'relative z-10 flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy',
              month_grid: 'border-separate border-spacing-1',
              weekdays: 'text-slate-500',
              weekday: 'h-9 w-9 text-center text-xs font-medium',
              day: 'h-9 w-9 p-0 text-center',
              day_button:
                'flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nu-navy',
              selected: '[&>button]:bg-nu-navy [&>button]:text-white [&>button]:hover:bg-nu-dark',
              today: '[&>button]:font-bold [&>button]:text-nu-navy',
              outside: 'text-slate-400',
              disabled: 'opacity-40',
            }}
          />
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const EventTimePicker = ({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  minTime,
  maxTime,
  minTimeExclusive = false,
}) => {
  const { hour, minute, period } = getTimeParts(value);

  const hourOptions = Array.from({ length: 12 }, (_, index) => pad(index + 1));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index));
  const periodOptions = ['AM', 'PM'];

  const disabledHours = hourOptions.filter(
    (option) =>
      !periodOptions.some((optionPeriod) =>
        minuteOptions.some((optionMinute) =>
          isTimeAllowed(
            `${pad((Number(option) % 12) + (optionPeriod === 'PM' ? 12 : 0))}:${optionMinute}`,
            minTime,
            maxTime,
            minTimeExclusive,
          ),
        ),
      ),
  );
  const disabledMinutes = minuteOptions.filter(
    (option) =>
      hour &&
      period &&
      !isTimeAllowed(
        `${pad((Number(hour) % 12) + (period === 'PM' ? 12 : 0))}:${option}`,
        minTime,
        maxTime,
        minTimeExclusive,
      ),
  );
  const disabledPeriods = periodOptions.filter(
    (option) =>
      hour &&
      minute &&
      !isTimeAllowed(
        `${pad((Number(hour) % 12) + (option === 'PM' ? 12 : 0))}:${minute}`,
        minTime,
        maxTime,
        minTimeExclusive,
      ),
  );

  const updatePart = (part, nextValue) => {
    const nextHour = part === 'hour' ? nextValue : hour || '09';
    const nextMinute = part === 'minute' ? nextValue : minute || '00';
    const nextPeriod = part === 'period' ? nextValue : period || 'AM';
    const hours24 = (Number(nextHour) % 12) + (nextPeriod === 'PM' ? 12 : 0);
    onChange(`${pad(hours24)}:${nextMinute}`);
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="relative grid grid-cols-[1fr_1fr_1.2fr] gap-1.5"
    >
      <TimeSelect
        id={id}
        label="Hour"
        value={hour}
        options={hourOptions}
        disabledOptions={disabledHours}
        onValueChange={(next) => updatePart('hour', next)}
        disabled={disabled}
        invalid={invalid}
      />
      <TimeSelect
        label="Minute"
        value={minute}
        options={minuteOptions}
        disabledOptions={disabledMinutes}
        onValueChange={(next) => updatePart('minute', next)}
        disabled={disabled}
        invalid={invalid}
      />
      <TimeSelect
        label="AM or PM"
        value={period}
        options={periodOptions}
        disabledOptions={disabledPeriods}
        onValueChange={(next) => updatePart('period', next)}
        disabled={disabled}
        invalid={invalid}
      />
    </div>
  );
};
