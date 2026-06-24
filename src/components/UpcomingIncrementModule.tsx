import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, RefreshCw, Bell, Calendar, User, Building2, History, BarChart3 } from "lucide-react";
import { api } from "../services/api";
import { cn } from "../lib/utils";
import { format, addMonths, addDays, differenceInDays } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────
const parseDate = (raw: string | undefined): Date | null => {
  if (!raw) return null;
  // M/D/YYYY or MM/DD/YYYY (Google Sheets default)
  const slash = raw.split("/");
  if (slash.length === 3) {
    const [m, d, y] = slash;
    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? null : dt;
};

// Normalise a row from "Actual Salary Increment" sheet — headers may vary
const normActual = (r: any) => ({
  timestamp:            r.timestamp            || r.Timestamp                       || "",
  employeeId:           r.employeeId           || r["Employee ID"]                  || r.employeeCode || "",
  name:                 r.name                 || r.Name                             || r.employeeName || "",
  dateOfIncrement:      r.dateOfIncrement      || r["Date Of Increment"]            || "",
  currentSalary:        String(r.currentSalary || r["Current Salary"]              || ""),
  incrementAmount:      String(r.incrementAmount || r["Increment Amount"]          || ""),
  note:                 r.note                 || r.Note                             || "",
  nextIncrementNoOfMonth: String(r.nextIncrementNoOfMonth || r["Next Increment (No. Of Month)"] || r["Next Increment No Of Month"] || ""),
});

const urgencyLabel = (days: number) => {
  if (days < 0)   return { label: "Overdue",  cls: "bg-red-100 text-red-700 border-red-200" };
  if (days <= 30)  return { label: "Due Soon", cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (days <= 90)  return { label: "Upcoming", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return            { label: "Scheduled",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
};

type MainTab = "upcoming" | "history";

// ── component ────────────────────────────────────────────────────────────────
export const UpcomingIncrementModule = () => {
  const [actualRows, setActualRows]   = useState<any[]>([]);   // Actual Salary Increment sheet
  const [activeEmps, setActiveEmps]   = useState<any[]>([]);
  const [joinings,   setJoinings]     = useState<any[]>([]);
  const [presentEmps, setPresentEmps] = useState<any[]>([]);
  const [isLoading,  setIsLoading]    = useState(true);

  const [mainTab,     setMainTab]     = useState<MainTab>("upcoming");
  const [upFilter,    setUpFilter]    = useState<"all"|"overdue"|"soon"|"upcoming"|"first">("all");
  const [upSearch,    setUpSearch]    = useState("");
  const [histSearch,  setHistSearch]  = useState("");
  const [histYear,    setHistYear]    = useState<string>("all");

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [actual, emps, join, present] = await Promise.all([
        api.getActualSalaryIncrements(),
        api.getActiveEmployees(),
        api.getJoining(),
        api.getPresentEmployees(),
      ]);
      setActualRows((actual || []).map(normActual));
      setActiveEmps(emps    || []);
      setJoinings(join      || []);
      setPresentEmps(present || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const today = useMemo(() => new Date(), []);

  // ── UPCOMING rows ─────────────────────────────────────────────────────────
  const upcomingRows = useMemo(() => {
    type Row = {
      employeeId: string; name: string; designation: string; company: string;
      currentSalary: string; lastIncAmt: string; lastIncDate: string; joiningDate: string;
      nextDueDate: Date; daysLeft: number; nextMonths: string; rowType: "recurring"|"first";
    };
    const rows: Row[] = [];

    // 1. Per employee: latest actual increment with months > 0
    const byEmp = new Map<string, any>();
    for (const r of actualRows) {
      const months = parseInt(r.nextIncrementNoOfMonth || "0", 10);
      if (isNaN(months) || months <= 0) continue;
      const id = r.employeeId.trim();
      if (!id) continue;
      const existing = byEmp.get(id);
      if (!existing) {
        byEmp.set(id, r);
      } else {
        const tA = parseDate(existing.dateOfIncrement)?.getTime() || 0;
        const tB = parseDate(r.dateOfIncrement)?.getTime() || 0;
        if (tB > tA) byEmp.set(id, r);
      }
    }

    for (const r of byEmp.values()) {
      const months = parseInt(r.nextIncrementNoOfMonth, 10);
      const base   = parseDate(r.dateOfIncrement);
      if (!base) continue;
      const nextDueDate = addMonths(base, months);
      const newSal = (Number(r.currentSalary) || 0) + (Number(r.incrementAmount) || 0);
      rows.push({
        employeeId:   r.employeeId,
        name:         r.name,
        designation:  "",
        company:      "",
        currentSalary: newSal ? String(newSal) : r.currentSalary,
        lastIncAmt:   r.incrementAmount,
        lastIncDate:  r.dateOfIncrement,
        joiningDate:  "",
        nextDueDate,
        daysLeft:     differenceInDays(nextDueDate, today),
        nextMonths:   r.nextIncrementNoOfMonth,
        rowType:      "recurring",
      } as Row);
    }

    // 2. Active employees NOT in byEmp → dateOfJoining + 365
    const doneIds = new Set(byEmp.keys());

    const joiningMap  = new Map<string, any>();
    for (const j of joinings) {
      const code = (j.pmmplAc || j.employeeId || j.employeeCode || "").trim();
      if (code) joiningMap.set(code, j);
    }
    const presentMap  = new Map<string, any>();
    for (const p of presentEmps) {
      const code = (p.employeeId || p.employeeCode || p.pmmplAc || "").trim();
      if (code) presentMap.set(code, p);
    }

    for (const emp of activeEmps) {
      const code = (emp.employeeId || emp.employeeCode || emp.pmmplAc || "").trim();
      if (!code || doneIds.has(code)) continue;
      const joining = joiningMap.get(code);
      const rawDate = joining?.dateOfJoining || joining?.["Date Of Joining"] || emp.dateOfJoining || "";
      const joiningDate = parseDate(rawDate);
      if (!joiningDate) continue;
      const present   = presentMap.get(code);
      const rawSalary = present
        ? (Object.entries(present).find(([k]) =>
            k.replace(/\s+/g, " ").trim().toLowerCase() === "current salary"
          )?.[1] as string || "")
        : (joining?.salary || joining?.["Salary"] || "");
      const nextDueDate = addDays(joiningDate, 365);
      rows.push({
        employeeId:   code,
        name:         emp.name || emp.employeeName || "",
        designation:  emp.designation || "",
        company:      emp.companyName || joining?.companyName || "",
        currentSalary: rawSalary.replace(/,/g, ""),
        lastIncAmt:   "",
        lastIncDate:  "",
        joiningDate:  rawDate,
        nextDueDate,
        daysLeft:     differenceInDays(nextDueDate, today),
        nextMonths:   "12",
        rowType:      "first",
      } as Row);
    }

    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [actualRows, activeEmps, joinings, presentEmps, today]);

  const upCounts = useMemo(() => ({
    total:   upcomingRows.length,
    overdue: upcomingRows.filter(r => r.daysLeft < 0).length,
    soon:    upcomingRows.filter(r => r.daysLeft >= 0 && r.daysLeft <= 30).length,
    up90:    upcomingRows.filter(r => r.daysLeft > 30 && r.daysLeft <= 90).length,
    first:   upcomingRows.filter(r => r.rowType === "first").length,
  }), [upcomingRows]);

  const filteredUpcoming = useMemo(() => {
    let rows = upcomingRows;
    if (upFilter === "overdue")       rows = rows.filter(r => r.daysLeft < 0);
    else if (upFilter === "soon")     rows = rows.filter(r => r.daysLeft >= 0 && r.daysLeft <= 30);
    else if (upFilter === "upcoming") rows = rows.filter(r => r.daysLeft > 30 && r.daysLeft <= 90);
    else if (upFilter === "first")    rows = rows.filter(r => r.rowType === "first");
    if (upSearch) {
      const q = upSearch.toLowerCase();
      rows = rows.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.employeeId?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [upcomingRows, upFilter, upSearch]);

  // ── HISTORY rows (from Actual Salary Increment sheet) ────────────────────
  const historyYears = useMemo(() => {
    const yrs = new Set<string>();
    for (const r of actualRows) {
      const d = parseDate(r.dateOfIncrement);
      if (d) yrs.add(String(d.getFullYear()));
    }
    return Array.from(yrs).sort((a, b) => Number(b) - Number(a));
  }, [actualRows]);

  const filteredHistory = useMemo(() => {
    let rows = [...actualRows].sort((a, b) => {
      const tA = parseDate(a.dateOfIncrement)?.getTime() || 0;
      const tB = parseDate(b.dateOfIncrement)?.getTime() || 0;
      return tB - tA;
    });
    if (histYear !== "all") {
      rows = rows.filter(r => {
        const d = parseDate(r.dateOfIncrement);
        return d && String(d.getFullYear()) === histYear;
      });
    }
    if (histSearch) {
      const q = histSearch.toLowerCase();
      rows = rows.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.employeeId?.toLowerCase().includes(q) ||
        r.note?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [actualRows, histYear, histSearch]);

  const histStats = useMemo(() => {
    const src = histYear === "all" ? actualRows : filteredHistory;
    const totalAmt = src.reduce((s, r) => s + (Number(r.incrementAmount) || 0), 0);
    const thisYearRows = actualRows.filter(r => {
      const d = parseDate(r.dateOfIncrement);
      return d && d.getFullYear() === today.getFullYear();
    });
    return {
      total:      actualRows.length,
      thisYear:   thisYearRows.length,
      unique:     new Set(actualRows.map(r => r.employeeId)).size,
      totalAmt,
    };
  }, [actualRows, histYear, filteredHistory, today]);

  const filterTabs = [
    { id: "all",      label: "All",          count: upCounts.total,   activeClass: "bg-slate-800 text-white" },
    { id: "overdue",  label: "Overdue",      count: upCounts.overdue, activeClass: "bg-red-600 text-white" },
    { id: "soon",     label: "Due Soon",     count: upCounts.soon,    activeClass: "bg-orange-500 text-white" },
    { id: "upcoming", label: "Next 90 Days", count: upCounts.up90,    activeClass: "bg-yellow-500 text-white" },
    { id: "first",    label: "First Inc.",   count: upCounts.first,   activeClass: "bg-violet-600 text-white" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Salary Increment Tracker</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Upcoming dues &amp; full history from Actual Salary Increment sheet
          </p>
        </div>
        <p className="text-xs font-bold text-slate-400 hidden sm:block">{format(today, "d MMM yyyy")}</p>
      </div>

      {/* Main Tab Toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setMainTab("upcoming")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
            mainTab === "upcoming" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Bell className="w-4 h-4" /> Upcoming
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black",
            mainTab === "upcoming" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
          )}>{upCounts.total}</span>
        </button>
        <button
          onClick={() => setMainTab("history")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
            mainTab === "history" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="w-4 h-4" /> History
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black",
            mainTab === "history" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          )}>{actualRows.length}</span>
        </button>
      </div>

      {/* ════════════════ UPCOMING ════════════════ */}
      {mainTab === "upcoming" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Employees",  value: upCounts.total,   color: "from-slate-700 to-slate-800" },
              { label: "Overdue",          value: upCounts.overdue, color: "from-red-500 to-red-600" },
              { label: "Due in 30 Days",   value: upCounts.soon,    color: "from-orange-400 to-orange-500" },
              { label: "First Increment",  value: upCounts.first,   color: "from-violet-500 to-violet-600" },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <Bell className="w-5 h-5 opacity-80" />
                  <span className="text-3xl font-black">{s.value}</span>
                </div>
                <p className="text-xs font-bold text-white/80">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {filterTabs.map(tab => (
              <button key={tab.id} onClick={() => setUpFilter(tab.id)}
                className={cn("px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm",
                  upFilter === tab.id ? `${tab.activeClass} shadow-lg` : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                )}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black",
                    upFilter === tab.id ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  )}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search employee..."
                  value={upSearch} onChange={e => setUpSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none font-medium" />
              </div>
              <button onClick={fetchAll} disabled={isLoading}
                className="w-9 h-9 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-50 ml-auto">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "460px" }}>
              <table className="w-full text-sm border-collapse min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">
                    {["Employee","Designation","Company","Current Salary","Last Inc. Amt","Last Inc. / Joining Date","Next Due Date","Days Left","Type","Status"]
                      .map(h => <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={10} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
                      <p className="mt-2 text-sm text-slate-400 font-medium">Loading...</p>
                    </td></tr>
                  ) : filteredUpcoming.length === 0 ? (
                    <tr><td colSpan={10} className="py-16 text-center">
                      <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">No records</p>
                    </td></tr>
                  ) : filteredUpcoming.map((item, idx) => {
                    const { label, cls } = urgencyLabel(item.daysLeft);
                    const dispDate = item.rowType === "recurring" ? item.lastIncDate : item.joiningDate;
                    return (
                      <tr key={idx} className={cn("transition-colors",
                        item.daysLeft < 0 ? "bg-red-50/30 hover:bg-red-50/50"
                          : idx % 2 === 0 ? "bg-white hover:bg-violet-50/20"
                          : "bg-slate-50/30 hover:bg-violet-50/20"
                      )}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              item.rowType === "first" ? "bg-violet-100" : "bg-blue-100")}>
                              <User className={cn("w-4 h-4", item.rowType === "first" ? "text-violet-600" : "text-blue-600")} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.name || "—"}</p>
                              <p className="text-[10px] text-slate-400">{item.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.designation || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600">{item.company || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-black text-blue-600">{item.currentSalary ? `₹${item.currentSalary}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-bold text-emerald-600">{item.lastIncAmt ? `₹${item.lastIncAmt}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500">{dispDate || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("text-xs font-bold",
                            item.daysLeft < 0 ? "text-red-600" : item.daysLeft <= 30 ? "text-orange-600"
                            : item.daysLeft <= 90 ? "text-yellow-700" : "text-slate-700"
                          )}>
                            {item.nextDueDate && !isNaN(item.nextDueDate.getTime())
                              ? format(item.nextDueDate, "dd MMM yyyy")
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs font-black px-2.5 py-1 rounded-xl",
                            item.daysLeft < 0 ? "bg-red-100 text-red-700"
                            : item.daysLeft <= 30 ? "bg-orange-100 text-orange-700"
                            : item.daysLeft <= 90 ? "bg-yellow-100 text-yellow-700"
                            : "bg-emerald-100 text-emerald-700"
                          )}>
                            {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.rowType === "first"
                            ? <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-violet-100 text-violet-700 border border-violet-200">First</span>
                            : <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">Recurring</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-xl border", cls)}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUpcoming.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between">
                <p className="text-xs text-slate-400 font-medium">{filteredUpcoming.length} employees</p>
                <p className="text-xs text-slate-400 font-medium">Sorted by nearest due date</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════ HISTORY ════════════════ */}
      {mainTab === "history" && (
        <>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Records",     value: histStats.total,                                           color: "from-emerald-600 to-emerald-700", icon: <History className="w-5 h-5 opacity-80" /> },
              { label: "This Year",         value: histStats.thisYear,                                        color: "from-blue-500 to-blue-600",     icon: <Calendar className="w-5 h-5 opacity-80" /> },
              { label: "Unique Employees",  value: histStats.unique,                                          color: "from-violet-500 to-violet-600", icon: <User className="w-5 h-5 opacity-80" /> },
              { label: "Total Amount Paid", value: `₹${histStats.totalAmt.toLocaleString("en-IN")}`,          color: "from-orange-400 to-orange-500", icon: <BarChart3 className="w-5 h-5 opacity-80" /> },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  {s.icon}
                  <span className={cn("font-black", typeof s.value === "string" ? "text-xl" : "text-3xl")}>{s.value}</span>
                </div>
                <p className="text-xs font-bold text-white/80">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Year-wise breakdown chips */}
          {historyYears.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Year:</span>
              <button onClick={() => setHistYear("all")}
                className={cn("px-4 py-2 rounded-2xl text-xs font-black transition-all",
                  histYear === "all" ? "bg-emerald-600 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                )}>All</button>
              {historyYears.map(yr => (
                <button key={yr} onClick={() => setHistYear(yr)}
                  className={cn("px-4 py-2 rounded-2xl text-xs font-black transition-all",
                    histYear === yr ? "bg-emerald-600 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  )}>
                  {yr}
                  <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                    histYear === yr ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {actualRows.filter(r => parseDate(r.dateOfIncrement)?.getFullYear() === Number(yr)).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* History Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search employee or note..."
                  value={histSearch} onChange={e => setHistSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
              <p className="text-xs text-slate-400 font-bold ml-auto mr-2 hidden sm:block">
                {filteredHistory.length} records
                {histYear !== "all" && ` · ${histYear}`}
              </p>
              <button onClick={fetchAll} disabled={isLoading}
                className="w-9 h-9 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-50">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "500px" }}>
              <table className="w-full text-sm border-collapse min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">#</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Employee</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Date of Increment</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">Prev Salary</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">Inc. Amount</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">New Salary</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-center whitespace-nowrap">Next Inc. (Months)</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Note</th>
                    <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={9} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                      <p className="mt-2 text-sm text-slate-400 font-medium">Loading history...</p>
                    </td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={9} className="py-20 text-center">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">No records found</p>
                      <p className="text-xs text-slate-300 mt-1">Data from Actual Salary Increment sheet</p>
                    </td></tr>
                  ) : filteredHistory.map((item, idx) => {
                    const prevSal = Number(item.currentSalary) || 0;
                    const incAmt  = Number(item.incrementAmount) || 0;
                    const newSal  = prevSal + incAmt;
                    const incDate = parseDate(item.dateOfIncrement);
                    return (
                      <tr key={idx} className={cn(
                        "transition-colors hover:bg-emerald-50/30",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      )}>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-emerald-700">
                                {(item.name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.name || "—"}</p>
                              <p className="text-[10px] text-slate-400">{item.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-700">
                              {incDate && !isNaN(incDate.getTime())
                                ? format(incDate, "dd MMM yyyy")
                                : item.dateOfIncrement || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-bold text-slate-500">{prevSal ? `₹${prevSal.toLocaleString("en-IN")}` : "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-black text-emerald-600">
                            {incAmt ? `+₹${incAmt.toLocaleString("en-IN")}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-black text-blue-700">
                            {newSal ? `₹${newSal.toLocaleString("en-IN")}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.nextIncrementNoOfMonth
                            ? <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{item.nextIncrementNoOfMonth} Mon</span>
                            : <span className="text-xs text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate italic" title={item.note}>
                          {item.note || "—"}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-400 whitespace-nowrap">{item.timestamp || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredHistory.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between">
                <p className="text-xs text-slate-400 font-medium">{filteredHistory.length} records</p>
                <p className="text-xs font-bold text-emerald-600">
                  Total Inc.: ₹{filteredHistory.reduce((s, r) => s + (Number(r.incrementAmount) || 0), 0).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
