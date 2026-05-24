import { useState, useEffect } from "react";
import { api } from "../services/api";
import { PunchMissFms, LeaveFms, HolidayWorkingFms, SalaryIncrementFms } from "../types";
import { Loader2, CheckCircle, XCircle, Image, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

interface ApprovalModuleProps {
  role: "HOD" | "HR";
}

const StatusBadge = ({ status }: { status: string }) => {
  const s = status || "Pending";
  const cfg =
    s === "Work Done"    ? { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", label: "✓ Approved" } :
    s === "Rejected"     ? { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "✗ Rejected" } :
    s === "HOD Approved" ? { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "HOD OK" } :
                           { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "⏳ Pending" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const cfg =
    type === "CL" ? { bg: "#eff6ff", color: "#2563eb" } :
    type === "EL" ? { bg: "#f5f3ff", color: "#7c3aed" } :
    type === "ML" ? { bg: "#fff1f2", color: "#e11d48" } :
                   { bg: "#fff7ed", color: "#ea580c" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type}
    </span>
  );
};

export const ApprovalModule: React.FC<ApprovalModuleProps> = ({ role }) => {
  const { user } = useAuth();
  const [punchMissData, setPunchMissData] = useState<PunchMissFms[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveFms[]>([]);
  const [holidayData, setHolidayData] = useState<HolidayWorkingFms[]>([]);
  const [salaryData, setSalaryData] = useState<SalaryIncrementFms[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"punch" | "leave" | "holiday" | "salary-hod" | "salary-mgmt" | "salary-final">("leave");
  const [selectedRequest, setSelectedRequest] = useState<{ sheet: string, id: string, step: number, rowIndex?: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [extraFields, setExtraFields] = useState<any>({});

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = ["2026", "2027", "2028", "2029"];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pm, lv, hw, si, emp] = await Promise.all([
        api.getPunchMiss(),
        api.getLeaves(),
        api.getHolidayWorking(),
        api.getSalaryIncrements(),
        api.getAllEmployees()
      ]);

      const sortFn = (a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      };

      setPunchMissData(
        pm.filter(d => d.timestamp && d.planned && d.planned.trim() !== "" && (!d.actual || d.actual.trim() === ""))
          .sort(sortFn)
      );
      setLeaveData(
        lv.filter(d => d.timestamp && d.leaveNo)
          .sort(sortFn)
      );
      setHolidayData(
        hw.filter(d => d.timestamp && d.holidayWorkingNo)
          .sort(sortFn)
      );
      setSalaryData(
        si.filter(d => d.timestamp && d.uniqueNo)
          .sort(sortFn)
      );
      setEmployees(emp || []);

    } catch (error) {
      console.error("Error fetching approval data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  const handleApprove = async (sheetName: string, rowId: string, step: number, status?: string, fieldsOverride?: any, rowIndex?: number) => {
    // Optimistic Update: Remove from local state immediately to make UI feel fast (Use rowIndex to avoid wiping duplicates)
    if (sheetName === "Punch Miss Fms") {
      setPunchMissData(prev => prev.filter(item => rowIndex ? item._row !== rowIndex : item.pmNo !== rowId));
    } else if (sheetName === "Leave Fms") {
      setLeaveData(prev => prev.filter(item => rowIndex ? item._row !== rowIndex : item.leaveNo !== rowId));
    } else if (sheetName === "Holiday Working Fms") {
      setHolidayData(prev => prev.filter(item => rowIndex ? item._row !== rowIndex : item.holidayWorkingNo !== rowId));
    } else if (sheetName === "Salary Increment") {
      setSalaryData(prev => prev.filter(item => rowIndex ? item._row !== rowIndex : item.uniqueNo !== rowId));
    }

    // Close modal immediately
    setSelectedRequest(null);
    setExtraFields({});

    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep(sheetName, rowId, step, actualTime, status, fieldsOverride || extraFields, rowIndex);

      // Always sync after update to be safe
      fetchData();

      if (!success) {
        alert("Operation failed. Re-syncing data...");
      }
    } catch (error) {
      console.error("Error approving:", error);
      fetchData(); // Sync back if error
    }
  };

  const q = searchTerm.toLowerCase().trim();

  // Filter logic for each sub-tab
  const getFilteredLeave = () => {
    let rows: LeaveFms[];
    if (role === "HOD") {
      if (!user) return [];
      const myEmployees = new Set(employees
        .filter(e => e.hod && e.hod.toString().trim() === user.employeeId.toString().trim())
        .map(e => e.employeeId.toString().trim())
      );
      rows = leaveData.filter(d =>
        d && d.employeeIdCode &&
        myEmployees.has(d.employeeIdCode.toString().trim()) &&
        d.planned1 && d.planned1.trim() !== "" &&
        (!d.actual1 || d.actual1.trim() === "")
      );
    } else {
      rows = leaveData.filter(d => d && (d.status1 === "Work Done" || d.status1 === "HOD Approved" || (d.planned2 && d.planned2.trim() !== "")) && (!d.actual2 || d.actual2.trim() === ""));
    }
    if (!q) return rows;
    return rows.filter(d =>
      d.leaveNo?.toLowerCase().includes(q) ||
      d.nameOfEmployee?.toLowerCase().includes(q) ||
      d.employeeIdCode?.toLowerCase().includes(q)
    );
  };

  const getFilteredHoliday = () => {
    let rows: HolidayWorkingFms[];
    if (role === "HOD") {
      if (!user) return [];
      const myEmployees = new Set(employees
        .filter(e => e.hod && e.hod.toString().trim() === user.employeeId.toString().trim())
        .map(e => e.employeeId.toString().trim())
      );
      rows = holidayData.filter(d =>
        d && d.employeeId &&
        myEmployees.has(d.employeeId.toString().trim()) &&
        d.planned1 && (!d.actual1)
      );
    } else {
      rows = holidayData.filter(d => d && d.planned2 && (!d.actual2));
    }
    if (!q) return rows;
    return rows.filter(d =>
      d.holidayWorkingNo?.toLowerCase().includes(q) ||
      d.name?.toLowerCase().includes(q) ||
      d.employeeId?.toLowerCase().includes(q)
    );
  };

  const getFilteredPunchMiss = () => {
    if (!q) return punchMissData;
    return punchMissData.filter(d =>
      d.pmNo?.toLowerCase().includes(q) ||
      d.name?.toLowerCase().includes(q) ||
      d.employeeId?.toLowerCase().includes(q)
    );
  };

  const getFilteredSalaryHod = () => {
    if (!user) return [];
    const myEmployeeIds = new Set(
      employees
        .filter(e => e.hod && e.hod.toString().trim() === user.employeeId.toString().trim())
        .map(e => e.employeeId.toString().trim())
    );
    const rows = salaryData.filter(d =>
      d.employeeCode &&
      myEmployeeIds.has(d.employeeCode.toString().trim()) &&
      (!d.status || d.status === "Pending")
    );
    if (!q) return rows;
    return rows.filter(d =>
      d.uniqueNo?.toLowerCase().includes(q) ||
      d.employeeName?.toLowerCase().includes(q) ||
      d.employeeCode?.toLowerCase().includes(q)
    );
  };

  const subTabs = [
    { id: "punch", label: "Punch Miss", count: getFilteredPunchMiss().length, visible: role === "HR" },
    { id: "leave", label: "Leave", count: getFilteredLeave().length, visible: true },
    { id: "holiday", label: "Holiday Working", count: getFilteredHoliday().length, visible: true },
    { id: "salary-hod", label: "Salary Increment", count: getFilteredSalaryHod().length, visible: role === "HOD" },
  ];

  const filteredSubTabs = subTabs.filter(tab => tab.visible);

  return (
    <div className="space-y-6">
      {/* Pill Tab Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {filteredSubTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
            style={
              activeSubTab === tab.id
                ? { background: "#2563eb", color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }
                : { background: "#f1f5f9", color: "#64748b" }
            }
          >
            <span className="capitalize">{tab.label}</span>
            {tab.count > 0 && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold"
                style={
                  activeSubTab === tab.id
                    ? { background: "rgba(255,255,255,0.25)", color: "white" }
                    : { background: "#dc2626", color: "white" }
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center gap-1.5"
          title="Refresh Requests"
        >
          <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, ID or No..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); }}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-slate-500">Loading pending requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "480px" }}>
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4ff)", borderBottom: "2px solid #e2e8f0" }}>
                <tr>
                  {activeSubTab === "salary-hod" ? (
                    <>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Unique No</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Company</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Designation</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Dept</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Joining Date</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Current Salary</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Last Inc. Amt</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Last Inc. Date</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Note</th>
                    </>
                  ) : activeSubTab === "punch" ? (
                    <>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">PM No</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">In/Out</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">PM Time</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Image</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned</th>
                    </>
                  ) : activeSubTab === "leave" ? (
                    <>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Leave No</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Company</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date Range</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Medical Cert</th>
                      {role === "HOD" ? (
                        <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned1</th>
                      ) : (
                        <>
                          <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">HOD Status</th>
                          <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned2</th>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Holiday No</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Company</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status1</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date From</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date To</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Days</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Adj Days</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Adj Month</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Adj Year</th>
                      <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Remarks</th>
                      {role === "HOD" ? (
                        <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned1</th>
                      ) : (
                        <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned2</th>
                      )}
                    </>
                  )}
                  <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSubTab === "punch" && (
                  getFilteredPunchMiss().length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No pending punch miss requests</td></tr>
                  ) : getFilteredPunchMiss().map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn("transition-colors hover:bg-blue-50/40", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{item.pmNo}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap"
                          style={
                            item.inOut === "In"
                              ? { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }
                              : { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }
                          }
                        >
                          {item.inOut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.date}</td>
                      {/* Employee cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {(item.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate" title={item.reason}>{item.reason}</td>
                      <td className="px-4 py-3 text-xs font-bold text-blue-600 whitespace-nowrap">{item.punchMissTime}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {item.image ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm" onClick={() => window.open(item.image, '_blank')}>
                              {item.image.startsWith('data:image') ? (
                                <img src={item.image} className="w-full h-full object-cover" />
                              ) : (
                                <Image className="w-4 h-4 text-blue-500 mx-auto mt-2.5" />
                              )}
                            </div>
                          ) : <span className="text-[10px] text-slate-400 italic">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{item.planned}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRequest({ sheet: "Punch Miss Fms", id: item.pmNo, step: 1, rowIndex: item._row })}
                          className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                        >
                          Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {activeSubTab === "leave" && (
                  getFilteredLeave().length === 0 ? (
                    <tr><td colSpan={role === "HOD" ? 9 : 10} className="px-4 py-12 text-center text-slate-400 text-sm">No pending leave requests</td></tr>
                  ) : getFilteredLeave().map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn("transition-colors hover:bg-blue-50/40", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{item.leaveNo}</td>
                      <td className="px-4 py-3">
                        <TypeBadge type={item.typeOfLeave} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.company}</td>
                      {/* Employee cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {(item.nameOfEmployee || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.nameOfEmployee}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeIdCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate" title={item.reasonForRequestedLeave}>{item.reasonForRequestedLeave}</td>
                      {/* Date range */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-slate-700 whitespace-nowrap">
                            <span className="font-medium">{item.dateRequestedFrom}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium">{item.dateRequestedTo}</span>
                          </div>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold w-fit"
                            style={{ background: "#eff6ff", color: "#2563eb" }}
                          >
                            {item.noOfDays} Day(s)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {item.medicalCertificate ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm" onClick={() => window.open(item.medicalCertificate, '_blank')}>
                              {item.medicalCertificate.startsWith('data:image') ? (
                                <img src={item.medicalCertificate} className="w-full h-full object-cover" />
                              ) : (
                                <Image className="w-4 h-4 text-blue-500 mx-auto mt-2.5" />
                              )}
                            </div>
                          ) : <span className="text-[10px] text-slate-400 italic">-</span>}
                        </div>
                      </td>
                      {role === "HOD" ? (
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{item.planned1}</td>
                      ) : (
                        <>
                          <td className="px-4 py-3"><StatusBadge status={item.status1} /></td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{item.planned2}</td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRequest({ sheet: "Leave Fms", id: item.leaveNo, step: role === "HOD" ? 1 : 2, rowIndex: item._row })}
                          className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                        >
                          Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {activeSubTab === "salary-hod" && (
                  getFilteredSalaryHod().length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">No pending salary increment requests</td></tr>
                  ) : getFilteredSalaryHod().map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn("transition-colors hover:bg-orange-50/40", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{item.uniqueNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {(item.employeeName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.joiningCompanyName || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.designation || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.department || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.dateOfJoining || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-black text-blue-600">₹{item.currentSalary || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold text-slate-500">₹{item.lastIncrementAmount || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.lastIncrementDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-500 w-[200px] max-h-[80px] overflow-y-auto whitespace-normal break-words bg-slate-50 border border-slate-200 rounded-lg p-2 leading-relaxed">
                          {item.note || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRequest({ sheet: "Salary Increment", id: item.uniqueNo, step: 1, rowIndex: item._row })}
                          className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {activeSubTab === "holiday" && (
                  getFilteredHoliday().length === 0 ? (
                    <tr><td colSpan={16} className="px-4 py-12 text-center text-slate-400 text-sm">No pending holiday working requests</td></tr>
                  ) : getFilteredHoliday().map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn("transition-colors hover:bg-blue-50/40", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.timestamp ? format(new Date(item.timestamp), "dd/MM/yy HH:mm") : "-"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{item.holidayWorkingNo}</td>
                      {/* Employee cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {(item.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.companyName}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status1} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600 uppercase whitespace-nowrap">{item.workingDateFrom}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 uppercase whitespace-nowrap">{item.workingDateTo}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.numberOfDays}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate" title={item.reason}>{item.reason}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.adjustDays || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.adjustMonth || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.adjustYear || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[100px] truncate" title={item.remarks}>{item.remarks || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{role === "HOD" ? item.planned1 : item.planned2}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedRequest({ sheet: "Holiday Working Fms", id: item.holidayWorkingNo, step: role === "HOD" ? 1 : 2, rowIndex: item._row })}
                          className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                        >
                          Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Pending Approval</h3>
            <p className="text-slate-500 text-sm mb-6 font-bold uppercase">{selectedRequest.sheet} Step {selectedRequest.step}</p>

            {selectedRequest.sheet === "Leave Fms" && (
              <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-500">
                {(() => {
                  const req = leaveData.find(l => l.leaveNo === selectedRequest.id);
                  if (!req) return null;
                  const employee = employees.find(e => e.employeeId === req.employeeIdCode);
                  if (!employee) return <p className="text-xs text-slate-400">Loading Balance...</p>;

                  // Balance only counts leaves with final HR approval (status2 = "Work Done")
                  const userLeaves = leaveData.filter(l => l.employeeIdCode === req.employeeIdCode && l.status2 === "Work Done");
                  const stats = {
                    cl: { total: parseFloat(employee.cl) || 0, taken: userLeaves.filter(l => l.typeOfLeave === "CL").reduce((acc, l) => acc + (parseFloat(l.noOfDays as any) || 0), 0) },
                    el: { total: parseFloat(employee.el) || 0, taken: userLeaves.filter(l => l.typeOfLeave === "EL").reduce((acc, l) => acc + (parseFloat(l.noOfDays as any) || 0), 0) },
                    ml: { total: parseFloat(employee.ml) || 0, taken: userLeaves.filter(l => l.typeOfLeave === "ML").reduce((acc, l) => acc + (parseFloat(l.noOfDays as any) || 0), 0) }
                  };

                  return (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                        <p className="text-sm font-bold text-slate-900">{employee.name}</p>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase">{req.typeOfLeave} Request</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "CL", stat: stats.cl },
                          { label: "EL", stat: stats.el },
                          { label: "ML", stat: stats.ml }
                        ].map((item) => (
                          <div key={item.label} className={cn(
                            "p-2 rounded-xl text-center transition-all",
                            req.typeOfLeave === item.label ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" : "bg-white text-slate-600 border border-blue-50"
                          )}>
                            <p className="text-[10px] font-bold uppercase opacity-80 mb-0.5">{item.label}</p>
                            <p className="text-sm font-black leading-none mb-1">{item.stat.total - item.stat.taken} <span className="text-[8px] opacity-70">Left</span></p>
                            <p className="text-[8px] font-bold opacity-60">Used: {item.stat.taken}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {selectedRequest.sheet === "Leave Fms" && (() => {
                const req = leaveData.find(l => l.leaveNo === selectedRequest.id);
                if (!req) return null;
                return (
                  <div className="space-y-3 text-left animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Requested Days</span>
                      <span className="text-sm font-black text-slate-800">{req.noOfDays} Day(s)</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Override Days <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder={`e.g. ${req.noOfDays}`}
                        onChange={e => {
                          const val = e.target.value;
                          setExtraFields((prev: any) => val ? { ...prev, noOfDays: parseFloat(val) } : (() => { const { noOfDays, ...rest } = prev; return rest; })());
                        }}
                        className="w-full border border-slate-200 p-2 rounded-xl text-sm text-center font-bold outline-none focus:border-blue-400 bg-white"
                      />
                    </div>
                  </div>
                );
              })()}

              {selectedRequest.sheet === "Holiday Working Fms" && selectedRequest.step === 1 && (
                <div className="space-y-3 font-bold">
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      onChange={e => setExtraFields({ ...extraFields, status2: e.target.value })}
                      className="w-full border p-2 rounded text-xs text-center font-bold"
                    >
                      <option value="Work Done">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {extraFields.status2 !== "Rejected" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Adjust Days"
                          type="number"
                          onChange={e => setExtraFields({ ...extraFields, adjustDays: e.target.value })}
                          className="w-full border p-2 rounded text-xs text-center font-bold"
                        />
                        <select
                          onChange={e => setExtraFields({ ...extraFields, adjustMonth: e.target.value })}
                          className="w-full border p-2 rounded text-xs text-center font-bold"
                        >
                          <option value="">Adjust Month</option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <select
                          onChange={e => setExtraFields({ ...extraFields, adjustYear: e.target.value })}
                          className="w-full border p-2 rounded text-xs text-center font-bold"
                        >
                          <option value="">Adjust Year</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <textarea
                        placeholder="Remarks / Reason"
                        onChange={e => setExtraFields({ ...extraFields, remarks: e.target.value })}
                        className="w-full border p-2 rounded text-xs h-20 text-center font-bold"
                      ></textarea>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.sheet === "Holiday Working Fms" && selectedRequest.step === 2 && (
                <p className="text-slate-500 text-sm font-bold">Approve or Reject this request</p>
              )}

              {selectedRequest.sheet === "Salary Increment" && (
                <div className="space-y-3 font-bold">
                  {selectedRequest.step === 1 && <><input type="number" placeholder="Hod Recommened Amount" onChange={e => setExtraFields({ ...extraFields, hodAmount: e.target.value, status2: "Pending" })} className="w-full border p-2 rounded text-xs text-center" /><textarea placeholder="Hod Feedback" onChange={e => setExtraFields({ ...extraFields, hodFeedback: e.target.value })} className="w-full border p-2 rounded text-xs text-center"></textarea></>}
                  {selectedRequest.step === 2 && <><input type="number" placeholder="Mgmt Approved Amount" onChange={e => setExtraFields({ ...extraFields, mgmtAmount: e.target.value, status3: "Pending" })} className="w-full border p-2 rounded text-xs text-center" /><textarea placeholder="Mgmt Feedback" onChange={e => setExtraFields({ ...extraFields, mgmtFeedback: e.target.value })} className="w-full border p-2 rounded text-xs text-center"></textarea></>}
                  {selectedRequest.step === 3 && <><input type="date" placeholder="Inc Date" onChange={e => setExtraFields({ ...extraFields, dateOfIncrement: e.target.value })} className="w-full border p-2 rounded text-xs text-center" /><input type="number" placeholder="New Salary" onChange={e => setExtraFields({ ...extraFields, currentSalaryAfterIncrement: e.target.value })} className="w-full border p-2 rounded text-xs text-center" /><input type="number" placeholder="Inc Amount" onChange={e => setExtraFields({ ...extraFields, incrementAmount: e.target.value })} className="w-full border p-2 rounded text-xs text-center" /></>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (selectedRequest.sheet === "Leave Fms" && !extraFields.noOfDays) {
                    alert("Override Days field is required.");
                    return;
                  }
                  const fields = selectedRequest.sheet === "Holiday Working Fms" && selectedRequest.step === 2
                    ? { ...extraFields, status3: "Rejected" }
                    : extraFields;
                  handleApprove(selectedRequest.sheet, selectedRequest.id, selectedRequest.step, "Rejected", fields, selectedRequest.rowIndex);
                }}
                className="p-4 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 flex flex-col items-center gap-1"
              >
                <XCircle className="w-6 h-6" />Rejected
              </button>
              <button
                onClick={() => {
                  if (selectedRequest.sheet === "Leave Fms" && !extraFields.noOfDays) {
                    alert("Override Days field is required.");
                    return;
                  }
                  const fields = selectedRequest.sheet === "Holiday Working Fms" && selectedRequest.step === 2
                    ? { ...extraFields, status3: "Work Done" }
                    : extraFields;
                  handleApprove(selectedRequest.sheet, selectedRequest.id, selectedRequest.step, "Work Done", fields, selectedRequest.rowIndex);
                }}
                className="p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold border border-emerald-100 flex flex-col items-center gap-1"
              >
                <CheckCircle className="w-6 h-6" />Accept
              </button>
            </div>

            <button onClick={() => { setSelectedRequest(null); setExtraFields({}); }} className="mt-6 text-slate-400 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
