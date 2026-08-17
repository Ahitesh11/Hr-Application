import React, { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import { SalaryRecord } from "../types";
import { Search, Loader2, AlertTriangle, RefreshCcw } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ColKey = keyof SalaryRecord;

interface Col {
  key: ColKey;
  label: string;
  money?: boolean;
  summable?: boolean;
}

const COLUMNS: Col[] = [
  { key: "employeeCode", label: "Emp Code" },
  { key: "employeeName", label: "Name" },
  { key: "location", label: "Location" },
  { key: "designation", label: "Designation" },
  { key: "mode", label: "Mode" },
  { key: "bankName", label: "Bank Name" },
  { key: "bankAccountNumber", label: "Bank A/C No." },
  { key: "ifscCode", label: "IFSC" },
  { key: "uan", label: "UAN" },
  { key: "insuranceId", label: "Insurance Id" },
  { key: "noOfDaysPresent", label: "Days Present" },
  { key: "calculationDays", label: "Calc Days" },
  { key: "totalActual", label: "Total Actual", money: true, summable: true },
  { key: "basic", label: "Basic", money: true, summable: true },
  { key: "conveyance", label: "Conveyance", money: true, summable: true },
  { key: "hra", label: "HRA", money: true, summable: true },
  { key: "medicalAllowance", label: "Medical Allowance", money: true, summable: true },
  { key: "specialAllowance", label: "Special Allowance", money: true, summable: true },
  { key: "otherAllowances", label: "Other Allowances", money: true, summable: true },
  { key: "payment", label: "Payment", money: true, summable: true },
  { key: "matchWithPayment", label: "Should Match Payment", money: true, summable: true },
  { key: "employeeContri12", label: "Emp'ee Contri @12%", money: true, summable: true },
  { key: "toBePaidAfterPF", label: "To Be Paid After PF", money: true, summable: true },
  { key: "additionalSalary", label: "Additional Salary", money: true, summable: true },
  { key: "employerContri833", label: "Emp'er Contri @8.33%", money: true, summable: true },
  { key: "employerContri367", label: "Emp'er Contri @3.67%", money: true, summable: true },
  { key: "adminExp11", label: "Admin Exp @1.1%", money: true, summable: true },
  { key: "employeeESIC075", label: "Emp'ee ESIC @0.75%", money: true, summable: true },
  { key: "employerESIC325", label: "Emp'er ESIC @3.25%", money: true, summable: true },
];

const num = (v: any) => {
  const n = parseFloat((v ?? "").toString().replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const cell = (col: Col, v: any) => {
  if (v === undefined || v === null || v === "") return col.money ? "—" : "";
  return col.money ? `₹${num(v).toLocaleString()}` : v.toString();
};

export const PayrollModule: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [rows, setRows] = useState<SalaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");

  /** Cheap read of whatever payroll was last generated — no sheet recompute/rewrite. */
  const loadExistingPayroll = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const existingRows = await api.getPayroll();
      setRows(existingRows);
      setWarnings([]);
    } catch (error) {
      console.error("Error loading payroll:", error);
      setErrorMsg("Failed to load payroll");
    } finally {
      setIsLoading(false);
    }
  };

  /** Heavy: recomputes payroll from Attendance/Present Employees and rewrites the sheet. */
  const runPayroll = async (y: string, m: string) => {
    if (!y || !m) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await api.generatePayroll(y, m);
      if (result.ok) {
        setRows(result.rows);
        setWarnings(result.warnings);
      } else {
        setRows([]);
        setErrorMsg(result.error || "Failed to load payroll");
      }
    } catch (error) {
      console.error("Error loading payroll:", error);
      setErrorMsg("Failed to load payroll");
    } finally {
      setIsLoading(false);
    }
  };

  // Show whatever payroll already exists immediately on mount — cheap read, no recompute.
  // Selecting a different Year/Month no longer auto-regenerates; use "Generate" for that.
  useEffect(() => {
    loadExistingPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companies = useMemo(() => {
    const set = new Set(rows.map(r => (r.company || "Unassigned").toString()));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(item => {
      const matchesSearch =
        item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === "All" || (item.company || "Unassigned") === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [rows, searchTerm, companyFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, SalaryRecord[]>();
    filteredRows.forEach(r => {
      const key = (r.company || "Unassigned").toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRows]);

  const subtotalFor = (groupRows: SalaryRecord[]) => {
    const totals: Record<string, number> = {};
    COLUMNS.forEach(c => { if (c.summable) totals[c.key as string] = 0; });
    groupRows.forEach(r => {
      COLUMNS.forEach(c => { if (c.summable) totals[c.key as string] += num((r as any)[c.key]); });
    });
    return totals;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-24 px-3 py-2 h-[38px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Month</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="px-3 py-2 h-[38px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm font-bold"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none" aria-hidden="true">Action</label>
              <button
                onClick={() => runPayroll(year, month)}
                disabled={isLoading}
                title="Recalculates payroll for the selected Year/Month from Attendance and Present Employees, and overwrites the Payroll sheet"
                className="flex items-center justify-center gap-2 px-4 py-2 h-[38px] bg-pink-600 text-white rounded-xl font-bold text-sm hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <RefreshCcw className={`w-4 h-4 shrink-0 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Generating..." : "Generate Payroll"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-64">
              <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none" aria-hidden="true">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 h-[38px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Firm</label>
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                className="px-3 py-2 h-[38px] bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm font-bold"
              >
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-bold" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 rounded-xl text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <p className="flex items-center gap-2 font-bold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {COLUMNS.map(c => (
                  <th key={c.key as string} className={`px-3 py-4 font-bold text-slate-600 ${c.money ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading payroll...</p>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-slate-500">
                    {errorMsg ? "Could not load payroll." : "No payroll generated yet. Pick a Year/Month and click \"Generate Payroll\"."}
                  </td>
                </tr>
              ) : (
                groups.map(([company, groupRows]) => {
                  const subtotal = subtotalFor(groupRows);
                  return (
                    <React.Fragment key={company}>
                      <tr className="bg-pink-50/60">
                        <td colSpan={COLUMNS.length} className="px-3 py-2 font-black text-pink-700 uppercase tracking-wide text-[10px]">
                          {company} <span className="opacity-60 font-bold">({groupRows.length} employees)</span>
                        </td>
                      </tr>
                      {groupRows.map((item, idx) => (
                        <tr key={idx} className="hover:bg-pink-50/40 transition-colors duration-200">
                          {COLUMNS.map(c => (
                            <td
                              key={c.key as string}
                              className={`px-3 py-3 ${c.money ? "text-right text-slate-700" : "text-slate-600"} ${c.key === "employeeName" ? "font-bold text-slate-900" : ""} ${c.key === "payment" ? "font-black text-pink-600" : ""}`}
                            >
                              {cell(c, (item as any)[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        {COLUMNS.map((c, ci) => (
                          <td key={c.key as string} className={`px-3 py-2.5 ${c.money ? "text-right text-slate-700" : "text-slate-500 text-[10px] uppercase"}`}>
                            {ci === 0 ? `${company} Total` : c.summable ? `₹${(subtotal[c.key as string] || 0).toLocaleString()}` : ""}
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
