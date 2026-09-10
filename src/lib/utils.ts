import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The Apps Script backend stores every Timestamp/Actual column as
// dd/MM/yyyy HH:mm:ss in IST. Building the value client-side the same way
// (rather than via the browser's own timezone) means it still reads right
// even if a user's OS clock is set to a different timezone.
export function formatIstDateTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour"); // some engines emit "24" for midnight

  return `${get("day")}/${get("month")}/${get("year")} ${hour}:${get("minute")}:${get("second")}`;
}

// Parses a dd/MM/yyyy[ HH:mm[:ss]] string (the backend's display format) back
// into a Date for client-side sorting/formatting. Never falls through to the
// native `new Date(str)` for a slash-separated string — that reads it as
// MM/dd and silently swaps day/month (or returns Invalid Date once the day
// exceeds 12).
export function parseSheetDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const str = value.toString().trim();
  if (!str) return null;

  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, dd, mm, yyyy, hh, min, ss] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh || 0),
      Number(min || 0),
      Number(ss || 0)
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback for any legacy/unconverted rows still holding an old format
  // (ISO strings, en-IN locale strings, etc.)
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}
