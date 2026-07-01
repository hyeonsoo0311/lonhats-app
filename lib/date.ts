import { endOfMonth, format, startOfMonth, startOfWeek, subDays } from "date-fns";

export function localDateKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function calendarWeekStartKey(date = new Date()) {
  return localDateKey(startOfWeek(date, { weekStartsOn: 1 }));
}

export function monthStart(date = new Date()) {
  return startOfMonth(date);
}

export function monthStartKey(date = new Date()) {
  return localDateKey(startOfMonth(date));
}

export function monthEndKey(date = new Date()) {
  return localDateKey(endOfMonth(date));
}

export function rollingWindowStartKey(days: number, date = new Date()) {
  return localDateKey(subDays(date, Math.max(0, days - 1)));
}
