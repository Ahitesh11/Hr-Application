import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { PunchMissFms } from "../types";
import {
  Clock, Calendar, Briefcase, Users, TrendingUp,
  CheckCircle, Loader2, Search, ArrowUpRight,
  FileText, AlertCircle, XCircle, Filter
} from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardHomeProps {
  onNavigate: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [punchMissData, setPunchMissData] = useState<PunchMissFms[]>([]);
  const [leaveData, setLeaveData]         = useState<any[]>([]);
  const [holidayData, setHolidayData]     = useState<any[]>([]);
  const [salaryIncrementData, setSalaryIncrementData] = useState<any[]>([]);
  const [allEmployees, setAllEmployees]   = useState<any[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"leave" | "punch" | "holiday">("leave");
  const [leaveSearch, setLeaveSearch]     = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<"all" | "Pending" | "Work Done" | "Rejected">("all");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [hodSection, setHodSection] = useState<"leave" | "holiday">("leave");
  const [hodSearch, setHodSearch] = useState("");
  const [hodStatusFilter, setHodStatusFilter] = useState<"all" | "Pending" | "Work Done" | "Rejected">("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const empId = user.role === "Admin" ? undefined : user.employeeId;

        const [punchRes, leaveRes, holidayRes, salaryRes] = await Promise.all([
          api.getPunchMiss(empId),
          api.getLeaves(empId),
          api.getHolidayWorking(empId),
          api.getSalaryIncrements(empId),
        ]);

        setPunchMissData((punchRes  || []).filter((d: any) => d.timestamp && d.pmNo));
        setLeaveData(   (leaveRes   || []).filter((d: any) => d.timestamp && d.leaveNo));
        setHolidayData( (holidayRes || []).filter((d: any) => d.timestamp && d.holidayWorkingNo));
        setSalaryIncrementData(salaryRes || []);

        if (user.role === "Admin") {
          try {
            const empRes = await api.getActiveEmployees();
            if (Array.isArray(empRes) && empRes.length > 0) setAllEmployees(empRes);
          } catch (_) {}
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  /* ── Derived stats ── */
  const approvedPunch  = punchMissData.filter(d => d.status  === "Work Done");
  const approvedLeaves = leaveData.filter(    d => d.status2 === "Work Done");
  const approvedHoliday= holidayData.filter(  d => d.status3 === "Work Done");
  const approvedSalary = salaryIncrementData.filter(d => d.status3 === "Work Done");

  const stats = [
    { label: "Approved Punch Miss",  value: approvedPunch.length,   trend: `${punchMissData.filter(d => d.status === "Pending").length} pending`,         icon: Clock,       color: "bg-pink-600"   },
    { label: "Approved Leaves",      value: approvedLeaves.length,  trend: `${leaveData.filter(d => !d.status2 || d.status2 === "Pending").length} pending`, icon: Calendar,    color: "bg-rose-500" },
    { label: "Approved Holiday Work",value: approvedHoliday.length, trend: `${holidayData.filter(d => !d.status3 || d.status3 === "Pending").length} pending`,icon: Briefcase,   color: "bg-fuchsia-600"  },
    { label: "Approved Increments",  value: approvedSalary.length,  trend: `${salaryIncrementData.filter(d => !d.status3 || d.status3 === "Pending").length} pending`,icon: TrendingUp,  color: "bg-purple-600" },
  ];

  /* ── Leave balance (own user) ── */
  const getLeaveStats = (type: string) => {
    const total    = parseFloat((user as any)?.[type.toLowerCase()] || 0);
    // Only count as "used" when HR has given final approval (status2 = "Work Done")
    const approved = leaveData
      .filter(d => d.typeOfLeave === type && d.status2 === "Work Done")
      .reduce((acc, d) => acc + (parseFloat(d.noOfDays) || 0), 0);
    // Pending = awaiting HR approval (not rejected by HOD or HR, HR not yet acted)
    const pending  = leaveData
      .filter(d =>
        d.typeOfLeave === type &&
        d.status1 !== "Rejected" &&
        d.status2 !== "Rejected" &&
        d.status2 !== "Work Done"
      )
      .reduce((acc, d) => acc + (parseFloat(d.noOfDays) || 0), 0);
    return { total, approved, pending, balance: total - approved };
  };
  const clStats = getLeaveStats("CL");
  const elStats = getLeaveStats("EL");
  const mlStats = getLeaveStats("ML");

  /* ── Admin: per-employee leave summary ── */
  const empMap: Record<string, { name: string; id: string; cl: number; el: number; ml: number; pending: number }> = {};
  leaveData.forEach(l => {
    const key = l.employeeIdCode || l.nameOfEmployee || "Unknown";
    if (!empMap[key]) {
      empMap[key] = { name: l.nameOfEmployee || key, id: l.employeeIdCode || "—", cl: 0, el: 0, ml: 0, pending: 0 };
    }
    const days = parseFloat(l.noOfDays) || 0;
    if (l.status2 === "Work Done") {
      if (l.typeOfLeave === "CL") empMap[key].cl += days;
      else if (l.typeOfLeave === "EL") empMap[key].el += days;
      else if (l.typeOfLeave === "ML") empMap[key].ml += days;
    }
    // Pending HR approval = not rejected by HOD, not rejected/approved by HR
    if (l.status1 !== "Rejected" && l.status2 !== "Rejected" && l.status2 !== "Work Done") {
      empMap[key].pending += days;
    }
  });

  const empSummary = Object.values(empMap).map(emp => {
    const found = allEmployees.find(e => e.employeeId === emp.id);
    return {
      ...emp,
      clQuota: found ? parseFloat(found.cl || 0) : null,
      elQuota: found ? parseFloat(found.el || 0) : null,
      mlQuota: found ? parseFloat(found.ml || 0) : null,
    };
  }).filter(emp => {
    if (!employeeFilter) return true;
    const q = employeeFilter.toLowerCase();
    return emp.id.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q);
  });

  const filteredLeaves = leaveData.filter(l => {
    const matchGlobal = !employeeFilter ||
      (l.nameOfEmployee || "").toLowerCase().includes(employeeFilter.toLowerCase()) ||
      (l.employeeIdCode || "").toLowerCase().includes(employeeFilter.toLowerCase());
    const matchSearch = !leaveSearch ||
      (l.nameOfEmployee || "").toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (l.employeeIdCode || "").toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (l.leaveNo        || "").toLowerCase().includes(leaveSearch.toLowerCase());
    const matchStatus = leaveStatusFilter === "all" || l.status2 === leaveStatusFilter ||
      (leaveStatusFilter === "Pending" && (!l.status2 || l.status2 === "Pending"));
    return matchGlobal && matchSearch && matchStatus;
  });

  const filteredHodLeaves = leaveData.filter(l => {
    const matchGlobal = !employeeFilter ||
      (l.nameOfEmployee || "").toLowerCase().includes(employeeFilter.toLowerCase()) ||
      (l.employeeIdCode || "").toLowerCase().includes(employeeFilter.toLowerCase());
    const matchSearch = !hodSearch ||
      (l.nameOfEmployee || "").toLowerCase().includes(hodSearch.toLowerCase()) ||
      (l.employeeIdCode || "").toLowerCase().includes(hodSearch.toLowerCase()) ||
      (l.leaveNo        || "").toLowerCase().includes(hodSearch.toLowerCase());
    const hodSt = l.status1 || "Pending";
    const matchStatus = hodStatusFilter === "all" || hodSt === hodStatusFilter ||
      (hodStatusFilter === "Pending" && (!l.status1 || l.status1 === "Pending"));
    return matchGlobal && matchSearch && matchStatus;
  });

  const filteredHodHoliday = holidayData.filter(h => {
    const matchGlobal = !employeeFilter ||
      (h.name || "").toLowerCase().includes(employeeFilter.toLowerCase()) ||
      (h.employeeId || "").toLowerCase().includes(employeeFilter.toLowerCase());
    const matchSearch = !hodSearch ||
      (h.name || "").toLowerCase().includes(hodSearch.toLowerCase()) ||
      (h.employeeId || "").toLowerCase().includes(hodSearch.toLowerCase()) ||
      (h.holidayWorkingNo || "").toLowerCase().includes(hodSearch.toLowerCase());
    const hodSt = h.status1 || "Pending";
    const matchStatus = hodStatusFilter === "all" || hodSt === hodStatusFilter ||
      (hodStatusFilter === "Pending" && (!h.status1 || h.status1 === "Pending"));
    return matchGlobal && matchSearch && matchStatus;
  });

  /* ── Status badge ── */
  const StatusBadge = ({ status }: { status: string }) => {
    const s = status || "Pending";
    const cfg =
      s === "Work Done" ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", label: "Approved" } :
      s === "Rejected"  ? { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100",     label: "Rejected" } :
                          { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100",   label: "Pending"  };
    return (
      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border", cfg.bg, cfg.text, cfg.border)}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-8">

      {/* ── Welcome Header ── */}
      <div className="bg-white p-8 rounded-3xl border border-pink-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user?.name}! 👋</h1>
            <p className="text-slate-500 max-w-md">
              You are logged in as <span className="font-bold text-pink-600">{user?.role}</span>.{" "}
              {user?.role === "Staf"
                ? "Track your leave balances and request history below."
                : "Manage system approvals and employee records."}
            </p>
          </div>
          {user?.role === "Staf" && (
            <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100 flex gap-6">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-pink-400 mb-1">Emp ID</p>
                <p className="text-sm font-bold text-pink-900">{user.employeeId}</p>
              </div>
              <div className="w-px h-10 bg-pink-100" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-pink-400 mb-1">Company</p>
                <p className="text-sm font-bold text-pink-900">{user.companyName}</p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full -mr-20 -mt-20 opacity-50 blur-3xl" />
      </div>

      {/* ── Leave Balance Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Casual Leave (CL)",  stats: clStats, color: "from-pink-600 to-pink-700",   icon: Calendar },
          { label: "Earned Leave (EL)",  stats: elStats, color: "from-rose-500 to-rose-600", icon: Calendar },
          { label: "Medical Leave (ML)", stats: mlStats, color: "from-fuchsia-600 to-fuchsia-700",    icon: Calendar },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
            <div className={cn("p-5 text-white bg-gradient-to-br", item.color)}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-3 py-1 rounded-full">
                  Leave Balance
                </div>
              </div>
              <p className="text-sm font-medium opacity-80 mb-1">{item.label}</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{item.stats.balance}</span>
                <span className="text-sm font-bold opacity-80 mb-1">Days Left</span>
              </div>
            </div>
            <div className="p-6 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Quota</p>
                <p className="text-lg font-bold text-slate-700">{item.stats.total}</p>
              </div>
              <div className="text-center border-x border-pink-50">
                <p className="text-[9px] text-rose-500 font-bold uppercase">Used</p>
                <p className="text-lg font-bold text-rose-600">{item.stats.approved}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-amber-500 font-bold uppercase">Pending</p>
                <p className="text-lg font-bold text-amber-600">{item.stats.pending}</p>
              </div>
            </div>
            <div className="px-6 pb-5">
              <div className="w-full h-2 bg-pink-50 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", item.color)}
                  style={{ width: `${item.stats.total > 0 ? Math.min(100, (item.stats.approved / item.stats.total) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-2 text-right">
                {item.stats.total > 0 ? Math.round((item.stats.approved / item.stats.total) * 100) : 0}% Used
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl text-white ${stat.color} shadow-lg shadow-pink-100`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          ADMIN SECTION
          ════════════════════════════════════════════════════════ */}
      {user?.role === "Admin" && (
        <div className="space-y-6">

          {/* ── Global Employee Filter Bar ── */}
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-2.5 bg-pink-600 rounded-xl">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Employee Filter</p>
                  <p className="text-[10px] text-slate-400">Employee Code ya Name se filter karo</p>
                </div>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={employeeFilter}
                  onChange={e => setEmployeeFilter(e.target.value)}
                  placeholder="Employee Code likhiye jaise PMMPL-320 ya naam..."
                  className="w-full pl-11 pr-12 py-3 text-sm rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 font-medium text-slate-700 transition-all"
                />
                {employeeFilter && (
                  <button
                    onClick={() => setEmployeeFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-pink-100 transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-slate-400 hover:text-red-500 transition-colors" />
                  </button>
                )}
              </div>
              {employeeFilter && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-pink-50 text-pink-700 border border-pink-100">
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                    Filtered: "{employeeFilter}"
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    {empSummary.length} match
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Per-Employee Leave Summary ── */}
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-pink-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500 rounded-xl">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Employee Leave Summary</h3>
                  <p className="text-xs text-slate-400">Approved leaves per employee (CL / EL / ML)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-pink-50 px-3 py-2 rounded-xl border border-pink-100">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {empSummary.length} Employees with leaves
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                <p className="text-slate-400 text-sm">Loading employee data...</p>
              </div>
            ) : empSummary.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-slate-200" />
                <p className="text-slate-400 font-bold">No leave data found</p>
                <p className="text-slate-300 text-sm text-center max-w-xs">
                  Leave records will appear here once employees start applying for leaves.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "420px" }}>
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider text-center">CL Used</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center">EL Used</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-fuchsia-500 uppercase tracking-wider text-center">ML Used</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center">Pending Days</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50">
                    {empSummary.map((emp, idx) => {
                      const totalUsed = emp.cl + emp.el + emp.ml;
                      return (
                        <tr key={idx} className="hover:bg-pink-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-pink-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {(emp.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{emp.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-base font-bold text-pink-600">{emp.cl}</span>
                              {emp.clQuota !== null && <span className="text-[9px] text-slate-400">of {emp.clQuota}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-base font-bold text-rose-600">{emp.el}</span>
                              {emp.elQuota !== null && <span className="text-[9px] text-slate-400">of {emp.elQuota}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-base font-bold text-fuchsia-600">{emp.ml}</span>
                              {emp.mlQuota !== null && <span className="text-[9px] text-slate-400">of {emp.mlQuota}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {emp.pending > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                {emp.pending} Days
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs font-bold">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                              totalUsed > 0 ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                            )}>
                              {totalUsed} Days
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-pink-50 border-t-2 border-pink-100">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-xs font-bold text-slate-600 uppercase">
                        Total ({empSummary.length} employees)
                      </td>
                      <td className="px-6 py-3 text-center text-sm font-extrabold text-pink-600">{empSummary.reduce((s, e) => s + e.cl, 0)}</td>
                      <td className="px-6 py-3 text-center text-sm font-extrabold text-rose-600">{empSummary.reduce((s, e) => s + e.el, 0)}</td>
                      <td className="px-6 py-3 text-center text-sm font-extrabold text-fuchsia-600">{empSummary.reduce((s, e) => s + e.ml, 0)}</td>
                      <td className="px-6 py-3 text-center text-sm font-extrabold text-amber-600">{empSummary.reduce((s, e) => s + e.pending, 0)}</td>
                      <td className="px-6 py-3 text-center text-sm font-extrabold text-slate-700">{empSummary.reduce((s, e) => s + e.cl + e.el + e.ml, 0)} Days</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── HOD Approvals Section ── */}
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-pink-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-700 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">HOD Approvals</h3>
                  <p className="text-xs text-slate-400">HOD step approval status — Leave & Holiday Working</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setHodSection("leave")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    hodSection === "leave" ? "bg-pink-600 text-white shadow-md shadow-pink-100" : "bg-pink-50 text-pink-600 hover:bg-pink-100"
                  )}
                >
                  Leave ({leaveData.length})
                </button>
                <button
                  onClick={() => setHodSection("holiday")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    hodSection === "holiday" ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100" : "bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100"
                  )}
                >
                  Holiday Working ({holidayData.length})
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={hodSearch}
                    onChange={e => setHodSearch(e.target.value)}
                    placeholder="Search name / ID..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700 w-40"
                  />
                </div>
                <select
                  value={hodStatusFilter}
                  onChange={e => setHodStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700"
                >
                  <option value="all">All HOD Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Work Done">HOD Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* HOD Summary Stats */}
            <div className="px-6 py-4 bg-pink-50/40 border-b border-pink-50 flex flex-wrap gap-4">
              {hodSection === "leave" ? (
                <>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span className="text-xs font-bold text-amber-700">Pending HOD</span>
                    <span className="text-sm font-extrabold text-amber-900 ml-1">
                      {leaveData.filter(l => !l.status1 || l.status1 === "Pending").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs font-bold text-emerald-700">HOD Approved</span>
                    <span className="text-sm font-extrabold text-emerald-900 ml-1">
                      {leaveData.filter(l => l.status1 === "Work Done").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    <span className="text-xs font-bold text-red-700">HOD Rejected</span>
                    <span className="text-sm font-extrabold text-red-900 ml-1">
                      {leaveData.filter(l => l.status1 === "Rejected").length}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span className="text-xs font-bold text-amber-700">Pending HOD</span>
                    <span className="text-sm font-extrabold text-amber-900 ml-1">
                      {holidayData.filter(h => !h.status1 || h.status1 === "Pending").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs font-bold text-emerald-700">HOD Approved</span>
                    <span className="text-sm font-extrabold text-emerald-900 ml-1">
                      {holidayData.filter(h => h.status1 === "Work Done").length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    <span className="text-xs font-bold text-red-700">HOD Rejected</span>
                    <span className="text-sm font-extrabold text-red-900 ml-1">
                      {holidayData.filter(h => h.status1 === "Rejected").length}
                    </span>
                  </div>
                </>
              )}
            </div>

            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                <p className="text-slate-400 text-sm">Loading HOD approval data...</p>
              </div>
            ) : hodSection === "leave" ? (
              filteredHodLeaves.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 text-slate-200" />
                  <p className="text-slate-400 font-bold">No records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "400px" }}>
                  <table className="w-full text-left min-w-[860px]">
                    <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                      <tr>
                        {["Leave No", "Employee", "Type", "Days", "HOD Status", "HR Status", "Applied On"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                      {filteredHodLeaves.map((item, idx) => (
                        <tr key={idx} className="hover:bg-pink-50/50 transition-colors">
                          <td className="px-5 py-4"><p className="text-xs font-bold text-slate-700">{item.leaveNo}</p></td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-800">{item.nameOfEmployee}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeIdCode}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold",
                              item.typeOfLeave === "CL" ? "bg-pink-50 text-pink-700 border border-pink-100" :
                              item.typeOfLeave === "EL" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                                          "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100"
                            )}>
                              {item.typeOfLeave}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-slate-800">{item.noOfDays}</span>
                            <span className="text-xs text-slate-400 ml-1">day{item.noOfDays > 1 ? "s" : ""}</span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={item.status1} /></td>
                          <td className="px-5 py-4"><StatusBadge status={item.status2} /></td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-500">{item.timestamp?.split(" ")[0]}</p>
                            <p className="text-[10px] text-slate-300">{item.timestamp?.split(" ")[1]}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              filteredHodHoliday.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 text-slate-200" />
                  <p className="text-slate-400 font-bold">No records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "400px" }}>
                  <table className="w-full text-left min-w-[860px]">
                    <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                      <tr>
                        {["Holiday No", "Employee", "From Date", "To Date", "Days", "HOD Status", "Final Status", "Applied On"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                      {filteredHodHoliday.map((item, idx) => (
                        <tr key={idx} className="hover:bg-pink-50/50 transition-colors">
                          <td className="px-5 py-4"><p className="text-xs font-bold text-slate-700">{item.holidayWorkingNo}</p></td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeId}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">{item.workingDateFrom}</td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">{item.workingDateTo}</td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-slate-800">{item.numberOfDays}</span>
                            <span className="text-xs text-slate-400 ml-1">day{item.numberOfDays > 1 ? "s" : ""}</span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge status={item.status1} /></td>
                          <td className="px-5 py-4"><StatusBadge status={item.status3} /></td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-500">{item.timestamp?.split(" ")[0]}</p>
                            <p className="text-[10px] text-slate-300">{item.timestamp?.split(" ")[1]}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── All Leave Requests Table ── */}
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-pink-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-fuchsia-600 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">All Leave Requests</h3>
                  <p className="text-xs text-slate-400">Complete leave history — all employees, all dates</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={e => setLeaveSearch(e.target.value)}
                    placeholder="Search name / ID..."
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700 w-44"
                  />
                </div>
                <select
                  value={leaveStatusFilter}
                  onChange={e => setLeaveStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Work Done">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <span className="text-xs font-bold text-slate-400 bg-pink-50 px-3 py-2 rounded-xl border border-pink-100">
                  {filteredLeaves.length} Records
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
                <p className="text-slate-400 text-sm">Loading leave records...</p>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <FileText className="w-10 h-10 text-slate-200" />
                <p className="text-slate-400 font-bold">No records found</p>
                {(leaveSearch || leaveStatusFilter !== "all") && (
                  <button
                    onClick={() => { setLeaveSearch(""); setLeaveStatusFilter("all"); }}
                    className="text-xs text-pink-600 font-bold hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "460px" }}>
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                    <tr>
                      {["Leave No","Employee","Type","From Date","To Date","Days","Status","Applied On"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50">
                    {filteredLeaves.map((item, idx) => (
                      <tr key={idx} className="hover:bg-pink-50/50 transition-colors">
                        <td className="px-5 py-4"><p className="text-xs font-bold text-slate-700">{item.leaveNo}</p></td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">{item.nameOfEmployee}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.employeeIdCode}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold",
                            item.typeOfLeave === "CL" ? "bg-pink-50 text-pink-700 border border-pink-100" :
                            item.typeOfLeave === "EL" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                                        "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100"
                          )}>
                            {item.typeOfLeave}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600 font-medium">{item.dateRequestedFrom}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 font-medium">{item.dateRequestedTo}</td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-slate-800">{item.noOfDays}</span>
                          <span className="text-xs text-slate-400 ml-1">day{item.noOfDays > 1 ? "s" : ""}</span>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={item.status2} /></td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-slate-500">{item.timestamp?.split(" ")[0]}</p>
                          <p className="text-[10px] text-slate-300">{item.timestamp?.split(" ")[1]}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STAFF / HOD – Request History + Quick Actions
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Activity Feed ── */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-pink-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4"
            style={{ background: "linear-gradient(135deg, #fff5f8 0%, #fce7f3 100%)", borderBottom: "1px solid #fce7f3" }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-600 rounded-xl shadow-lg shadow-pink-100">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {user?.role === "Staf" ? "My Request History" : "System Activity"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Real-time status of all applications</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-pink-100 shadow-sm">
                  {activeHistoryTab === "leave"   ? leaveData.length      :
                   activeHistoryTab === "punch"   ? punchMissData.length  :
                                                    holidayData.length} Records
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { id: "leave",   label: "Leave",   icon: Calendar,  count: leaveData.length,     color: "#db2777"   },
                { id: "punch",   label: "Punch",   icon: Clock,     count: punchMissData.length,  color: "#9333ea" },
                { id: "holiday", label: "Holiday", icon: Briefcase, count: holidayData.length,    color: "#d97706"  },
              ].map(tab => {
                const isActive = activeHistoryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHistoryTab(tab.id as any)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: isActive ? tab.color : `${tab.color}15`,
                      color: isActive ? "white" : tab.color,
                      boxShadow: isActive ? `0 4px 12px ${tab.color}40` : "none",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold"
                      style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)" }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
                <p className="text-slate-400 text-sm font-medium">Loading activity...</p>
              </div>
            ) : (
              <div className="divide-y divide-pink-50">

                {activeHistoryTab === "leave" && (
                  leaveData.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                      <Calendar className="w-12 h-12 text-pink-100" />
                      <p className="text-slate-400 font-bold">No leave records yet</p>
                    </div>
                  ) : leaveData.map((item, idx) => {
                    const st = item.status2 || "Pending";
                    const accentColor = st === "Work Done" ? "#10b981" : st === "Rejected" ? "#ef4444" : "#f59e0b";
                    const typeColor =
                      item.typeOfLeave === "CL" ? { bg: "#fdf2f8", text: "#db2777" } :
                      item.typeOfLeave === "EL" ? { bg: "#fff1f2", text: "#e11d48" } :
                                                  { bg: "#fdf4ff", text: "#a21caf" };
                    return (
                      <div key={idx} className="flex items-start gap-4 px-6 py-4 hover:bg-pink-50/40 transition-colors">
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-1" style={{ background: accentColor, minHeight: "40px" }} />
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: typeColor.bg }}>
                          <Calendar className="w-4 h-4" style={{ color: typeColor.text }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-800">{item.leaveNo}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: typeColor.bg, color: typeColor.text }}>{item.typeOfLeave}</span>
                            </div>
                            <StatusBadge status={item.status2} />
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-0.5">
                            {item.dateRequestedFrom} <span className="text-slate-300 mx-1">→</span> {item.dateRequestedTo}
                            <span className="ml-2 text-xs font-bold text-slate-400">({item.noOfDays} day{item.noOfDays > 1 ? "s" : ""})</span>
                          </p>
                          {item.reasonForRequestedLeave && (
                            <p className="text-xs text-slate-400 truncate max-w-xs">{item.reasonForRequestedLeave}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-slate-400">{item.timestamp?.split(" ")[0]}</p>
                          <p className="text-[10px] text-slate-300">{item.timestamp?.split(" ")[1]}</p>
                        </div>
                      </div>
                    );
                  })
                )}

                {activeHistoryTab === "punch" && (
                  punchMissData.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                      <Clock className="w-12 h-12 text-pink-100" />
                      <p className="text-slate-400 font-bold">No punch miss records</p>
                    </div>
                  ) : punchMissData.map((item, idx) => {
                    const st = item.status || "Pending";
                    const accentColor = st === "Work Done" ? "#10b981" : st === "Rejected" ? "#ef4444" : "#f59e0b";
                    return (
                      <div key={idx} className="flex items-start gap-4 px-6 py-4 hover:bg-pink-50/40 transition-colors">
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-1" style={{ background: accentColor, minHeight: "40px" }} />
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-purple-50">
                          <Clock className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-extrabold text-slate-800">{item.pmNo}</span>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-0.5">
                            {item.date}
                            {item.punchMissTime && <span className="text-slate-300 mx-1">•</span>}
                            <span className="font-bold text-slate-700">{item.punchMissTime}</span>
                            {item.inOut && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600">{item.inOut}</span>}
                          </p>
                          {item.reason && <p className="text-xs text-slate-400 truncate max-w-xs">{item.reason}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-slate-400">{item.timestamp?.split(" ")[0]}</p>
                        </div>
                      </div>
                    );
                  })
                )}

                {activeHistoryTab === "holiday" && (
                  holidayData.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                      <Briefcase className="w-12 h-12 text-pink-100" />
                      <p className="text-slate-400 font-bold">No holiday working records</p>
                    </div>
                  ) : holidayData.map((item, idx) => {
                    const st = item.status3 || "Pending";
                    const accentColor = st === "Work Done" ? "#10b981" : st === "Rejected" ? "#ef4444" : "#f59e0b";
                    return (
                      <div key={idx} className="flex items-start gap-4 px-6 py-4 hover:bg-pink-50/40 transition-colors">
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-1" style={{ background: accentColor, minHeight: "40px" }} />
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-amber-50">
                          <Briefcase className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-extrabold text-slate-800">{item.holidayWorkingNo}</span>
                            <StatusBadge status={item.status3} />
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-0.5">
                            {item.workingDateFrom} <span className="text-slate-300 mx-1">→</span> {item.workingDateTo}
                            <span className="ml-2 text-xs font-bold text-slate-400">({item.numberOfDays} day{item.numberOfDays > 1 ? "s" : ""})</span>
                          </p>
                          {item.reason && <p className="text-xs text-slate-400 truncate max-w-xs">{item.reason}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-slate-400">{item.timestamp?.split(" ")[0]}</p>
                        </div>
                      </div>
                    );
                  })
                )}

              </div>
            )}
          </div>

          {!isLoading && (
            <div className="px-6 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid #fce7f3", background: "#fff5f8" }}>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Approved</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Rejected</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Left bar color = status</p>
            </div>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Apply for Leave",    tab: "leave",      icon: Calendar },
                { label: "Report Punch Miss",  tab: "punch-miss", icon: Clock    },
                { label: "Check My Attendance",tab: "attendance", icon: Users    },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(action.tab)}
                  className="w-full p-5 bg-pink-50 hover:bg-pink-100 text-slate-700 hover:text-pink-700 rounded-2xl transition-all text-left font-bold text-sm border border-pink-100 hover:border-pink-200 flex items-center justify-between group"
                >
                  {action.label}
                  <action.icon className="w-5 h-5 text-pink-300 group-hover:text-pink-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-700 to-rose-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-4">Need Help?</h4>
              <p className="text-pink-100 text-sm mb-6 leading-relaxed">
                If you find any discrepancy in your data or leave balances, please contact the HR department.
              </p>
              <a
                href="https://wa.me/919109144126"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-pink-700 rounded-xl font-bold text-sm hover:bg-pink-50 transition-colors"
              >
                Contact Support
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
