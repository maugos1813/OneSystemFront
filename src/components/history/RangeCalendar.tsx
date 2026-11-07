import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/** A day as yyyy-mm-dd in the person's own calendar: what a date means to them, with no hour or time zone to trip over. */
export type Day = string;

const pad = (n: number) => String(n).padStart(2, "0");
export const dayOf = (date: Date): Day => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (day: Day) => new Date(`${day}T12:00:00`);
export const addDays = (day: Day, n: number): Day => {
  const date = parse(day);
  date.setDate(date.getDate() + n);
  return dayOf(date);
};

const MONTH = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** The days of one month laid out in weeks starting on Monday; null fills the cells before the 1st. */
function monthCells(year: number, month: number): Array<Day | null> {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, i) => dayOf(new Date(year, month, i + 1)))];
}

function Month({
  year,
  month,
  min,
  max,
  start,
  end,
  onPick,
}: {
  year: number;
  month: number;
  min: Day;
  max: Day;
  start: Day | null;
  end: Day | null;
  onPick: (day: Day) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold text-slate-800 capitalize dark:text-white">{MONTH.format(new Date(year, month, 1))}</p>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {w}
          </span>
        ))}
        {monthCells(year, month).map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const disabled = day < min || day > max;
          const isStart = day === start;
          const isEnd = day === (end ?? start);
          const between = start !== null && end !== null && day > start && day < end;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onPick(day)}
              aria-label={day}
              aria-pressed={isStart || isEnd}
              className={`relative my-0.5 h-10 text-sm transition ${
                isStart || isEnd
                  ? "brand-button z-10 rounded-full font-semibold"
                  : between
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                    : disabled
                      ? "text-slate-300 dark:text-slate-700"
                      : "rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              } ${day === dayOf(new Date()) && !isStart && !isEnd ? "font-bold text-blue-600 dark:text-blue-400" : ""}`}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A calendar to choose a stretch of days: one tap picks the first day, a second the last (before the first, it starts over from that
 * day). Only days between `min` and `max` can be chosen. Where there is room it shows two months (the one before and the one in view),
 * on a phone just the one in view.
 */
export function RangeCalendar({
  min,
  max,
  start,
  end,
  onChange,
}: {
  min: Day;
  max: Day;
  start: Day | null;
  end: Day | null;
  onChange: (start: Day | null, end: Day | null) => void;
}) {
  const latest = parse(max);
  // The month shown first is the one that holds the end of the chosen stretch (this month by default).
  const anchor = end ?? start ?? max;
  const [view, setView] = useState({ year: parse(anchor).getFullYear(), month: parse(anchor).getMonth() });
  const earliest = parse(min);

  const shift = (delta: number) => setView(({ year, month }) => {
    const next = new Date(year, month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });
  // The month in view can go back to the month of `min` and forward to the month of `max`.
  const canBack = new Date(view.year, view.month, 1) > new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const canForward = new Date(view.year, view.month, 1) < new Date(latest.getFullYear(), latest.getMonth(), 1);
  const before = new Date(view.year, view.month - 1, 1);

  function pick(day: Day) {
    if (start === null || end !== null) return onChange(day, null);
    if (day < start) return onChange(day, null);
    onChange(start, day);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canBack} aria-label="Mes anterior" className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => shift(1)} disabled={!canForward} aria-label="Mes siguiente" className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="hidden md:block">
          <Month year={before.getFullYear()} month={before.getMonth()} min={min} max={max} start={start} end={end} onPick={pick} />
        </div>
        <Month year={view.year} month={view.month} min={min} max={max} start={start} end={end} onPick={pick} />
      </div>
    </div>
  );
}
