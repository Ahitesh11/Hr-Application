import { GasRecord } from "../types/gas.types";

/**
 * Fields safe to expose from an employee record. Deliberately an allowlist,
 * not a denylist — the "User" sheet also holds the login password column
 * (see login() in apps-script/Auth.gs), and an allowlist guarantees that
 * can never leak through a tool output regardless of what else the sheet
 * contains or how its columns change over time.
 */
export interface EmployeeSummary {
  employeeId?: string;
  name?: string;
  designation?: string;
  companyName?: string;
  role?: string;
  hod?: string;
  mailId?: string;
}

const ALLOWED_FIELDS: (keyof EmployeeSummary)[] = [
  "employeeId",
  "name",
  "designation",
  "companyName",
  "role",
  "hod",
  "mailId",
];

export function sanitizeEmployeeRecord(record: GasRecord): EmployeeSummary {
  const summary: EmployeeSummary = {};
  for (const field of ALLOWED_FIELDS) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== "") {
      summary[field] = String(value);
    }
  }
  return summary;
}
