import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, RefreshCw, Bell, Calendar, User, Users, Building2, History, BarChart3, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { cn } from "../lib/utils";
import { format, addMonths, differenceInDays } from "date-fns";

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
  const [presentEmps, setPresentEmps] = useState<any[]>([]);   // Present Employees sheet — sole source for the Upcoming tab
  const [livingIds,  setLivingIds]    = useState<Set<string>>(new Set());
  const [isLoading,  setIsLoading]    = useState(true);

  const [mainTab,     setMainTab]     = useState<MainTab>("upcoming");
  const [upFilter,    setUpFilter]    = useState<"all"|"overdue"|"soon"|"upcoming"|"first">("all");
  const [upSearch,    setUpSearch]    = useState("");
  const [histSearch,  setHistSearch]  = useState("");
  const [histYear,    setHistYear]    = useState<string>("all");

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [actual, present, living] = await Promise.all([
        api.getActualSalaryIncrements(),
        api.getPresentEmployees(),
        api.getLivingHistory(),
      ]);
      // The Actual Salary Increment sheet has no exit filter — an employee's rows stay there
      // forever even after they leave. Strip those out here so the History tab (which reads
      // actualRows directly) excludes them too.
      const exitedIds = new Set(
        (living || [])
          .map((l: any) => (l.pmmplAc || l.employeeId || l.employeeCode || "").toString().trim())
          .filter(Boolean)
      );
      const normalizedActual = (actual || []).map(normActual);
      setActualRows(normalizedActual.filter(r => !exitedIds.has(r.employeeId.trim())));
      setPresentEmps(present || []);
      setLivingIds(exitedIds);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const today = useMemo(() => new Date(), []);

  // ── UPCOMING rows ─────────────────────────────────────────────────────────
  // One row per "Present Employees" record — that sheet is the single source of truth here, so
  // the row count always matches its row count exactly. "Next Increment Date" (or Joining Date,
  // if that's blank) is the anchor date of the employee's last recorded increment — not a
  // precomputed due date — so the real due date is that anchor plus however many months their
  // latest Actual Salary Increment row says is next ("Next Increment (No. Of Month)"); employees
  // with no increment history yet default to a 12-month first-review cycle.
  const upcomingRows = useMemo(() => {
    type Row = {
      employeeId: string; name: string; designation: string; company: string;
      currentSalary: string; lastIncAmt: string; lastIncDate: string; joiningDate: string;
      baseDate: string; nextDueDate: Date | null; daysLeft: number | null; rowType: "recurring"|"first";
    };

    // Latest actual increment per employee — display-only enrichment (Last Inc. Amt/Date columns),
    // does not affect which employees appear or how their due date is computed.
    const latestActualByEmp = new Map<string, any>();
    for (const r of actualRows) {
      const id = r.employeeId.trim();
      if (!id) continue;
      const existing = latestActualByEmp.get(id);
      if (!existing) {
        latestActualByEmp.set(id, r);
      } else {
        const tA = parseDate(existing.dateOfIncrement)?.getTime() || 0;
        const tB = parseDate(r.dateOfIncrement)?.getTime() || 0;
        if (tB > tA) latestActualByEmp.set(id, r);
      }
    }

    const rows: Row[] = presentEmps.map((p: any) => {
      const code = (p.employeeCode || p.employeeId || p.pmmplAc || "").toString().trim();
      const rawJoiningDate = (p.dateOfJoining || "").toString();
      const rawNextIncDate = (p.nextIncrementDate || "").toString();

      const nextIncDate = parseDate(rawNextIncDate);
      const joiningDate = parseDate(rawJoiningDate);
      const baseDate = nextIncDate || joiningDate;

      const lastActual = latestActualByEmp.get(code);
      const rawMonths = lastActual?.nextIncrementNoOfMonth ? Number(lastActual.nextIncrementNoOfMonth) : NaN;
      const monthsToNext = Number.isFinite(rawMonths) && rawMonths > 0 ? rawMonths : 12;
      const nextDueDate = baseDate ? addMonths(baseDate, monthsToNext) : null;

      return {
        employeeId:   code,
        name:         p.employeeName || p.name || "",
        designation:  p.designation || "",
        company:      p.company || "",
        currentSalary: String(p.salary || "").replace(/,/g, ""),
        lastIncAmt:   lastActual?.incrementAmount || "",
        lastIncDate:  lastActual?.dateOfIncrement || "",
        joiningDate:  rawJoiningDate,
        // Whichever date the due-date math actually used — Next Increment Date when set, else
        // Joining Date — shown directly so it's clear what "Next Due Date" was computed from.
        baseDate:     nextIncDate ? rawNextIncDate : rawJoiningDate,
        nextDueDate,
        daysLeft:     nextDueDate ? differenceInDays(nextDueDate, today) : null,
        rowType:      nextIncDate ? "recurring" : "first",
      } as Row;
    })
    // Present Employees already excludes exited staff in practice (confirmed: zero overlap with
    // Living History) — this is a defensive safety net only, so it doesn't reduce the row count
    // under normal data hygiene.
    .filter(r => !livingIds.has(r.employeeId));

    return rows.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
  }, [actualRows, presentEmps, livingIds, today]);

  const upCounts = useMemo(() => ({
    total:   upcomingRows.length,
    overdue: upcomingRows.filter(r => r.daysLeft !== null && r.daysLeft < 0).length,
    soon:    upcomingRows.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30).length,
    up90:    upcomingRows.filter(r => r.daysLeft !== null && r.daysLeft > 30 && r.daysLeft <= 90).length,
    first:   upcomingRows.filter(r => r.rowType === "first").length,
  }), [upcomingRows]);

  const filteredUpcoming = useMemo(() => {
    let rows = upcomingRows;
    if (upFilter === "overdue")       rows = rows.filter(r => r.daysLeft !== null && r.daysLeft < 0);
    else if (upFilter === "soon")     rows = rows.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30);
    else if (upFilter === "upcoming") rows = rows.filter(r => r.daysLeft !== null && r.daysLeft > 30 && r.daysLeft <= 90);
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
    { id: "first",    label: "First Inc.",   count: upCounts.first,   activeClass: "bg-pink-600 text-white" },
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
            mainTab === "upcoming" ? "bg-white text-pink-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Bell className="w-4 h-4" /> Upcoming
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black",
            mainTab === "upcoming" ? "bg-pink-100 text-pink-700" : "bg-slate-200 text-slate-500"
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
              { label: "Total Employees",  value: upCounts.total,   color: "from-slate-800 via-slate-700 to-slate-900", shadow: "shadow-slate-500/20", icon: <Users className="w-5 h-5" /> },
              { label: "Overdue",          value: upCounts.overdue, color: "from-rose-600 via-red-600 to-red-700",      shadow: "shadow-red-500/30",   icon: <AlertTriangle className="w-5 h-5" /> },
              { label: "Due in 30 Days",   value: upCounts.soon,    color: "from-amber-500 via-orange-500 to-orange-600", shadow: "shadow-orange-500/30", icon: <Clock className="w-5 h-5" /> },
              { label: "First Increment",  value: upCounts.first,   color: "from-fuchsia-600 via-pink-600 to-pink-700", shadow: "shadow-pink-500/30",  icon: <Sparkles className="w-5 h-5" /> },
            ].map((s, i) => (
              <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-lg ${s.shadow} ring-1 ring-black/5`}>
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">{s.icon}</div>
                  <span className="text-3xl font-black">{s.value}</span>
                </div>
                <p className="relative text-xs font-bold text-white/80 uppercase tracking-wider">{s.label}</p>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none font-medium" />
              </div>
              <button onClick={fetchAll} disabled={isLoading}
                className="w-9 h-9 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 flex items-center justify-center disabled:opacity-50 ml-auto">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "460px" }}>
              <table className="w-full text-sm border-collapse min-w-max">
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <tr className="bg-gradient-to-r from-pink-600 to-pink-500 text-white">
                    {["Employee","Designation","Company","Current Salary","Last Inc. Amt","Next Inc. / Joining Date","Next Due Date","Days Left","Type","Status"]
                      .map(h => <th key={h} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr><td colSpan={10} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                      <p className="mt-2 text-sm text-slate-400 font-medium">Loading...</p>
                    </td></tr>
                  ) : filteredUpcoming.length === 0 ? (
                    <tr><td colSpan={10} className="py-16 text-center">
                      <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">No records</p>
                    </td></tr>
                  ) : filteredUpcoming.map((item, idx) => {
                    const { label, cls } = item.daysLeft !== null
                      ? urgencyLabel(item.daysLeft)
                      : { label: "No Date", cls: "bg-slate-100 text-slate-500 border-slate-200" };
                    const dispDate = item.baseDate;
                    return (
                      <tr key={idx} className={cn("transition-colors",
                        item.daysLeft !== null && item.daysLeft < 0 ? "bg-red-50/30 hover:bg-red-50/50"
                          : idx % 2 === 0 ? "bg-white hover:bg-pink-50/20"
                          : "bg-slate-50/30 hover:bg-pink-50/20"
                      )}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              item.rowType === "first" ? "bg-pink-100" : "bg-blue-100")}>
                              <User className={cn("w-4 h-4", item.rowType === "first" ? "text-pink-600" : "text-blue-600")} />
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
                            item.daysLeft === null ? "text-slate-400"
                            : item.daysLeft < 0 ? "text-red-600" : item.daysLeft <= 30 ? "text-orange-600"
                            : item.daysLeft <= 90 ? "text-yellow-700" : "text-slate-700"
                          )}>
                            {item.nextDueDate && !isNaN(item.nextDueDate.getTime())
                              ? format(item.nextDueDate, "dd MMM yyyy")
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs font-black px-2.5 py-1 rounded-xl",
                            item.daysLeft === null ? "bg-slate-100 text-slate-500"
                            : item.daysLeft < 0 ? "bg-red-100 text-red-700"
                            : item.daysLeft <= 30 ? "bg-orange-100 text-orange-700"
                            : item.daysLeft <= 90 ? "bg-yellow-100 text-yellow-700"
                            : "bg-emerald-100 text-emerald-700"
                          )}>
                            {item.daysLeft === null ? "—" : item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.rowType === "first"
                            ? <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-pink-100 text-pink-700 border border-pink-200">First</span>
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
              { label: "Total Records",     value: histStats.total,                                           color: "from-emerald-600 via-emerald-600 to-teal-700", shadow: "shadow-emerald-500/30", icon: <History className="w-5 h-5" /> },
              { label: "This Year",         value: histStats.thisYear,                                        color: "from-sky-500 via-blue-600 to-blue-700",        shadow: "shadow-blue-500/30",    icon: <Calendar className="w-5 h-5" /> },
              { label: "Unique Employees",  value: histStats.unique,                                          color: "from-fuchsia-600 via-pink-600 to-pink-700",    shadow: "shadow-pink-500/30",    icon: <User className="w-5 h-5" /> },
              { label: "Total Amount Paid", value: `₹${histStats.totalAmt.toLocaleString("en-IN")}`,          color: "from-amber-500 via-orange-500 to-orange-600",  shadow: "shadow-orange-500/30",  icon: <BarChart3 className="w-5 h-5" /> },
            ].map((s, i) => (
              <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-lg ${s.shadow} ring-1 ring-black/5`}>
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">{s.icon}</div>
                  <span className={cn("font-black", typeof s.value === "string" ? "text-xl" : "text-3xl")}>{s.value}</span>
                </div>
                <p className="relative text-xs font-bold text-white/80 uppercase tracking-wider">{s.label}</p>
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
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100 bg-white">
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
