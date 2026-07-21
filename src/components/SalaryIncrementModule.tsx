import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, FileDown, Loader2, ChevronRight, User, TrendingUp, Calendar, CheckCircle, Building2, FileText, X, DollarSign, Clock, BarChart3, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { SalaryIncrementFms } from "../types";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const SalaryIncrementModule: React.FC = () => {
  const [data, setData] = useState<SalaryIncrementFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"hod" | "mgmt" | "final" | "history">("hod");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [allEmps, setAllEmps] = useState<any[]>([]);
  const [allJoining, setAllJoining] = useState<any[]>([]);
  const [allPresentEmps, setAllPresentEmps] = useState<any[]>([]);

  const [newEntry, setNewEntry] = useState<Partial<SalaryIncrementFms>>({
    uniqueNo: `SI-${Date.now().toString().slice(-6)}`,
    timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    hodAmount: "",
    hodFeedback: "",
    mgmtAmount: "",
    mgmtFeedback: "",
    dateOfIncrement: "",
    currentSalary: "",
    incrementAmount: "",
    nextIncrementNoOfMonth: "",
    note: "",
    status: "Pending",
    status2: "Pending",
    status3: "Pending"
  });

  const fetchEmployees = async () => {
    try {
      const [emps, joining, presentEmps] = await Promise.all([
        api.getActiveEmployees(),
        api.getJoining(),
        api.getPresentEmployees(),
      ]);
      setAllEmps(emps || []);
      setAllJoining(joining || []);
      setAllPresentEmps(presentEmps || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSalaryIncrements();
      setData(res || []);
    } catch (error) {
      console.error("Error fetching salary records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  // Convert any date string to yyyy-MM-dd for HTML date input
  const toIsoDate = (raw: string): string => {
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // already correct
    // M/D/YYYY or MM/DD/YYYY (Google Sheets default) → yyyy-MM-dd
    const parts = raw.split("/");
    if (parts.length === 3) {
      const [a, b, year] = parts;
      return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  // Strip commas from numbers like "15,000" → "15000"
  const cleanNum = (raw: string): string => (raw || "").replace(/,/g, "").trim();

  const handleFetchEmployee = async (code: string) => {
    if (!code) return;

    // Login sheet → name, designation, hod, companyName
    const emp = allEmps.find(
      e => e.employeeId === code || e.employeeCode === code || e.pmmplAc === code
    );

    // Joining sheet → dateOfJoining, salary (joining salary)
    const joining = allJoining.find(
      j => j.pmmplAc === code || j.employeeId === code || j.employeeCode === code
    );

    // Salary Increment sheet → lastIncrementAmount, dateOfIncrement
    const lastIncrement = data
      .filter(d => d.employeeCode === code && d.actual3 && d.incrementAmount)
      .sort((a, b) => {
        const tA = a.dateOfIncrement ? new Date(a.dateOfIncrement).getTime() : 0;
        const tB = b.dateOfIncrement ? new Date(b.dateOfIncrement).getTime() : 0;
        return tB - tA;
      })[0];

    // Present Employees sheet → Current Salary
    const presentEmp = allPresentEmps.find(
      p => p.employeeId === code || p.employeeCode === code || p.pmmplAc === code
    );
    const rawCurrentSalary = presentEmp
      ? Object.entries(presentEmp).find(
          ([k]) => k.replace(/\s+/g, " ").trim().toLowerCase() === "current salary"
        )?.[1] as string || ""
      : "";

    const rawJoiningDate = joining?.dateOfJoining || joining?.["Date Of Joining"] || "";
    const rawJoiningSalary = joining?.salary || joining?.["Salary"] || "";

    if (emp) {
      setNewEntry(prev => ({
        ...prev,
        employeeCode: code,
        employeeName: emp.name || "",
        designation: emp.designation || "",
        hod: emp.hod || "",
        joiningCompanyName: emp.companyName || "",
        dateOfJoining: toIsoDate(rawJoiningDate),
        joiningSalary: cleanNum(rawJoiningSalary),
        department: joining?.department || joining?.["Department"] || "",
        currentSalary: cleanNum(rawCurrentSalary || lastIncrement?.currentSalaryAfterIncrement || rawJoiningSalary),
        lastIncrementAmount: cleanNum(lastIncrement?.incrementAmount || ""),
        lastIncrementDate: toIsoDate(lastIncrement?.dateOfIncrement || ""),
      }));
    } else {
      setIsSearching(true);
      try {
        const res = await api.getEmployeeById(code);
        if (res && res.length > 0) {
          const empData = res[0];
          setNewEntry(prev => ({
            ...prev,
            employeeCode: code,
            employeeName: empData.name || empData.nameAsPerAadhar || "",
            designation: empData.designation || "",
            hod: empData.hod || "",
            joiningCompanyName: empData.companyName || empData.joiningCompanyName || "",
            dateOfJoining: toIsoDate(rawJoiningDate),
            joiningSalary: cleanNum(rawJoiningSalary),
            department: joining?.department || joining?.["Department"] || "",
            currentSalary: cleanNum(rawCurrentSalary || lastIncrement?.currentSalaryAfterIncrement || rawJoiningSalary),
            lastIncrementAmount: cleanNum(lastIncrement?.incrementAmount || ""),
            lastIncrementDate: toIsoDate(lastIncrement?.dateOfIncrement || ""),
          }));
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await api.submitSalaryIncrement(newEntry as SalaryIncrementFms);
      if (success) {
        setIsModalOpen(false);
        setNewEntry({
          uniqueNo: `SI-${Date.now().toString().slice(-6)}`,
          timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          hodAmount: "", hodFeedback: "", mgmtAmount: "", mgmtFeedback: "",
          dateOfIncrement: "", currentSalary: "", incrementAmount: "",
          nextIncrementNoOfMonth: "", note: "", status: "Pending", status2: "Pending", status3: "Pending"
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting increment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentData = useMemo(() => {
    let filtered = data.filter(item =>
      Object.values(item).some(val =>
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    if (activeTab === "hod") return filtered.filter(d => !d.actual);
    if (activeTab === "mgmt") return filtered.filter(d => d.actual && !d.actual2);
    if (activeTab === "final") return filtered.filter(d => d.actual2 && !d.actual3);
    if (activeTab === "history") return filtered.filter(d => d.actual3);
    return filtered;
  }, [data, searchTerm, activeTab]);

  const tabs = [
    { id: "hod", label: "HOD Review", count: data.filter(d => !d.actual).length, color: "blue" },
    { id: "mgmt", label: "Mgmt Review", count: data.filter(d => d.actual && !d.actual2).length, color: "orange" },
    { id: "final", label: "Final Step", count: data.filter(d => d.actual2 && !d.actual3).length, color: "purple" },
    { id: "history", label: "Completed", count: data.filter(d => d.actual3).length, color: "green" },
  ];

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SalaryIncrementFms | null>(null);
  const [actionData, setActionData] = useState<any>({
    hodAmount: "", hodFeedback: "", mgmtAmount: "", mgmtFeedback: "",
    dateOfIncrement: "", currentSalaryAfterIncrement: "", incrementAmount: "",
    nextIncrementNoOfMonth: "", note: ""
  });

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      const payload = {
        ...selectedItem,
        ...(activeTab === 'hod' ? {
          hodAmount: actionData.hodAmount,
          hodFeedback: actionData.hodFeedback,
          actual: format(new Date(), "yyyy-MM-dd HH:mm:ss")
        } : activeTab === 'mgmt' ? {
          mgmtAmount: actionData.mgmtAmount,
          mgmtFeedback: actionData.mgmtFeedback,
          actual2: format(new Date(), "yyyy-MM-dd HH:mm:ss")
        } : {
          dateOfIncrement: actionData.dateOfIncrement,
          currentSalaryAfterIncrement: actionData.currentSalaryAfterIncrement,
          incrementAmount: actionData.incrementAmount,
          nextIncrementNoOfMonth: actionData.nextIncrementNoOfMonth,
          note: actionData.note,
          actual3: format(new Date(), "yyyy-MM-dd HH:mm:ss")
        })
      };
      const success = await api.submitSalaryIncrement(payload as any);
      if (success) {
        setIsActionModalOpen(false);
        fetchData();
        setActionData({ hodAmount: "", hodFeedback: "", mgmtAmount: "", mgmtFeedback: "", dateOfIncrement: "", currentSalaryAfterIncrement: "", incrementAmount: "", nextIncrementNoOfMonth: "", note: "" });
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error updating increment action:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabColorMap: Record<string, string> = {
    hod: "bg-blue-600 text-white shadow-blue-200",
    mgmt: "bg-orange-500 text-white shadow-orange-200",
    final: "bg-purple-600 text-white shadow-purple-200",
    history: "bg-emerald-600 text-white shadow-emerald-200",
  };
  const tabBadgeColorMap: Record<string, string> = {
    hod: "bg-blue-100 text-blue-700",
    mgmt: "bg-orange-100 text-orange-700",
    final: "bg-purple-100 text-purple-700",
    history: "bg-emerald-100 text-emerald-700",
  };

  const statsCards = [
    { label: "Total Requests", value: data.length, icon: <BarChart3 className="w-5 h-5" />, color: "from-blue-500 to-blue-600" },
    { label: "Pending HOD", value: data.filter(d => !d.actual).length, icon: <Clock className="w-5 h-5" />, color: "from-orange-400 to-orange-500" },
    { label: "Pending Mgmt", value: data.filter(d => d.actual && !d.actual2).length, icon: <User className="w-5 h-5" />, color: "from-purple-500 to-purple-600" },
    { label: "Completed", value: data.filter(d => d.actual3).length, icon: <CheckCircle className="w-5 h-5" />, color: "from-emerald-500 to-emerald-600" },
  ];

  const downloadPdf = () => {
    // Use Rs. instead of ₹ — jsPDF default font (Helvetica) doesn't support rupee symbol
    const rs = (val: string | undefined) => val ? `Rs.${val}` : "-";

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = 297;

    // Header color per tab
    const headerColor: [number, number, number] =
      activeTab === "hod"     ? [37, 99, 235]  :
      activeTab === "mgmt"    ? [234, 88, 12]  :
      activeTab === "final"   ? [124, 58, 237] :
                                [16, 185, 129];

    const tabLabel = tabs.find(t => t.id === activeTab)?.label || activeTab;

    const drawTitleBar = () => {
      doc.setFillColor(...headerColor);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Salary Increment Report", 14, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, pageW - 70, 12);
      doc.setTextColor(...headerColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Stage: ${tabLabel}   Records: ${currentData.length}`, 14, 24);
    };

    drawTitleBar();

    // Prepared rows — all salary as "Rs.XXXX"
    const rows = currentData.map(d => ({
      ...d,
      joiningSalary:               rs(d.joiningSalary),
      currentSalary:               rs(d.currentSalary),
      lastIncrementAmount:         rs(d.lastIncrementAmount),
      hodAmount:                   rs(d.hodAmount),
      mgmtAmount:                  rs(d.mgmtAmount),
      incrementAmount:             rs(d.incrementAmount),
      currentSalaryAfterIncrement: rs(d.currentSalaryAfterIncrement),
      lastIncrementDate:           d.lastIncrementDate || "-",
      dateOfJoining:               d.dateOfJoining || "-",
      dateOfIncrement:             d.dateOfIncrement || "-",
      hodFeedback:                 d.hodFeedback || "-",
      mgmtFeedback:                d.mgmtFeedback || "-",
      note:                        d.note || "-",
      department:                  d.department || "-",
      joiningCompanyName:          d.joiningCompanyName || "-",
    }));

    const showHod = ["mgmt", "final", "history"].includes(activeTab);

    // ── TABLE 1: Base employee + salary info (+ HOD columns when applicable) ─
    autoTable(doc, {
      startY: 28,
      margin: { left: 6, right: 6 },
      columns: [
        { header: "Unique No",       dataKey: "uniqueNo"           },
        { header: "Employee Name",   dataKey: "employeeName"       },
        { header: "Code",            dataKey: "employeeCode"       },
        { header: "Company",         dataKey: "joiningCompanyName" },
        { header: "Designation",     dataKey: "designation"        },
        { header: "Dept",            dataKey: "department"         },
        { header: "Joining Date",    dataKey: "dateOfJoining"      },
        { header: "Joining Sal.",    dataKey: "joiningSalary"      },
        { header: "Current Sal.",    dataKey: "currentSalary"      },
        { header: "Last Inc.Amt",    dataKey: "lastIncrementAmount"},
        { header: "Last Inc.Date",   dataKey: "lastIncrementDate"  },
        { header: "HOD",             dataKey: "hod"                },
        ...(showHod ? [
          { header: "HOD Amt",      dataKey: "hodAmount"   },
          { header: "HOD Feedback", dataKey: "hodFeedback" },
        ] : []),
      ],
      body: rows,
      styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: headerColor, textColor: [255,255,255], fontStyle: "bold", fontSize: 6.5 },
      columnStyles: {
        uniqueNo:            { cellWidth: 16 },
        employeeName:        { cellWidth: 28 },
        employeeCode:        { cellWidth: 16 },
        joiningCompanyName:  { cellWidth: 16 },
        designation:         { cellWidth: 24 },
        department:          { cellWidth: 16 },
        dateOfJoining:       { cellWidth: 18 },
        joiningSalary:       { cellWidth: 18, halign: "right" },
        currentSalary:       { cellWidth: 18, halign: "right" },
        lastIncrementAmount: { cellWidth: 16, halign: "right" },
        lastIncrementDate:   { cellWidth: 18 },
        hod:                 { cellWidth: 16 },
        ...(showHod ? {
          hodAmount:   { cellWidth: 16, halign: "right" },
          hodFeedback: { cellWidth: "auto" },
        } : {}),
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      didParseCell: (h) => {
        if (h.section !== "body") return;
        if (h.column.dataKey === "currentSalary")
          { h.cell.styles.textColor = [37,99,235]; h.cell.styles.fontStyle = "bold"; }
        if (h.column.dataKey === "hodAmount")
          { h.cell.styles.textColor = [234,88,12]; h.cell.styles.fontStyle = "bold"; }
      },
    });

    // ── TABLE 2: HOD Review (always present for mgmt/final/history) ───────
    if (["mgmt", "final", "history"].includes(activeTab)) {
      doc.addPage();
      drawTitleBar();
      autoTable(doc, {
        startY: 28,
        margin: { left: 6, right: 6 },
        columns: [
          { header: "Unique No",    dataKey: "uniqueNo" },
          { header: "Employee",     dataKey: "employeeName" },
          { header: "HOD Amt",      dataKey: "hodAmount" },
          { header: "HOD Feedback", dataKey: "hodFeedback" },
        ],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: {
          uniqueNo:    { cellWidth: 25 },
          employeeName:{ cellWidth: 45 },
          hodAmount:   { cellWidth: 28, halign: "right" },
          hodFeedback: { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [235, 245, 255] },
        didParseCell: (h) => {
          if (h.section !== "body") return;
          if (h.column.dataKey === "hodAmount")
            { h.cell.styles.textColor = [234,88,12]; h.cell.styles.fontStyle = "bold"; }
        },
      });
    }

    // ── TABLE 3: Mgmt Review (final / history) ────────────────────────────
    if (["final", "history"].includes(activeTab)) {
      doc.addPage();
      drawTitleBar();
      autoTable(doc, {
        startY: 28,
        margin: { left: 6, right: 6 },
        columns: [
          { header: "Unique No",     dataKey: "uniqueNo" },
          { header: "Employee",      dataKey: "employeeName" },
          { header: "Mgmt Amt",      dataKey: "mgmtAmount" },
          { header: "Mgmt Feedback", dataKey: "mgmtFeedback" },
        ],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [234,88,12], textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: {
          uniqueNo:     { cellWidth: 25 },
          employeeName: { cellWidth: 45 },
          mgmtAmount:   { cellWidth: 28, halign: "right" },
          mgmtFeedback: { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [255, 245, 235] },
        didParseCell: (h) => {
          if (h.section !== "body") return;
          if (h.column.dataKey === "mgmtAmount")
            { h.cell.styles.textColor = [234,88,12]; h.cell.styles.fontStyle = "bold"; }
        },
      });
    }

    // ── TABLE 4: Final Increment details (history only) ───────────────────
    if (activeTab === "history") {
      doc.addPage();
      drawTitleBar();
      autoTable(doc, {
        startY: 28,
        margin: { left: 6, right: 6 },
        columns: [
          { header: "Unique No",   dataKey: "uniqueNo" },
          { header: "Employee",    dataKey: "employeeName" },
          { header: "Inc. Date",   dataKey: "dateOfIncrement" },
          { header: "Inc. Amount", dataKey: "incrementAmount" },
          { header: "New Salary",  dataKey: "currentSalaryAfterIncrement" },
          { header: "Next Inc.(M)",dataKey: "nextIncrementNoOfMonth" },
          { header: "Note",        dataKey: "note" },
        ],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [16,185,129], textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: {
          uniqueNo:                    { cellWidth: 25 },
          employeeName:                { cellWidth: 40 },
          dateOfIncrement:             { cellWidth: 25 },
          incrementAmount:             { cellWidth: 25, halign: "right" },
          currentSalaryAfterIncrement: { cellWidth: 25, halign: "right" },
          nextIncrementNoOfMonth:      { cellWidth: 20, halign: "center" },
          note:                        { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [235, 255, 245] },
        didParseCell: (h) => {
          if (h.section !== "body") return;
          if (["incrementAmount","currentSalaryAfterIncrement"].includes(h.column.dataKey as string))
            { h.cell.styles.textColor = [16,185,129]; h.cell.styles.fontStyle = "bold"; }
        },
      });
    }

    doc.save(`salary-increment-${activeTab}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Salary Increment</h2>
          <p className="text-sm text-slate-400 mt-0.5">Manage employee salary increment workflow</p>
        </div>
        <p className="text-xs font-bold text-slate-400 hidden sm:block">{format(new Date(), "d MMM yyyy")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">{s.icon}</div>
              <span className="text-3xl font-black">{s.value}</span>
            </div>
            <p className="text-xs font-bold text-white/80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm",
              activeTab === tab.id
                ? `${tabColorMap[tab.id]} shadow-lg`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === tab.id ? "bg-white/25 text-white" : tabBadgeColorMap[tab.id]
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-5 border-b border-slate-100">
          <div className="relative flex-1 w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-4 h-4" /> New Increment
            </button>
            <button onClick={fetchData} disabled={isLoading} className="w-9 h-9 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={downloadPdf}
              title="Download PDF"
              className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center"
            >
              <FileDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "460px" }}>
          <table className="w-full text-sm border-collapse min-w-max">
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
              <tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Unique No</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Employee</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Company</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Designation</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Dept</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Joining Date</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">Joining Salary</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">Current Salary</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap">Last Inc. Amt</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Last Inc. Date</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">HOD</th>
                {/* Extra columns for mgmt tab */}
                {(activeTab === "mgmt" || activeTab === "final" || activeTab === "history") && <>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap bg-orange-500/30">HOD Amt</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap bg-orange-500/30">HOD Feedback</th>
                </>}
                {/* Extra columns for final tab */}
                {(activeTab === "final" || activeTab === "history") && <>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap bg-pink-500/30">Mgmt Amt</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap bg-pink-500/30">Mgmt Feedback</th>
                </>}
                {/* Extra columns for history tab */}
                {activeTab === "history" && <>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap bg-blue-700/40">Inc. Date</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap bg-emerald-500/30">Inc. Amount</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-right whitespace-nowrap bg-emerald-500/30">New Salary</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-center whitespace-nowrap">Next Inc. (Months)</th>
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-left whitespace-nowrap">Note</th>
                </>}
                {activeTab !== "history" && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-center whitespace-nowrap">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={20} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-2 text-sm text-slate-400 font-medium">Loading records...</p>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-20 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No records in {tabs.find(t => t.id === activeTab)?.label} stage</p>
                  </td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={idx} className={cn("transition-colors hover:bg-pink-50/40 transition-colors duration-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    {/* Unique No */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{item.uniqueNo}</span>
                    </td>
                    {/* Employee */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                          {(item.employeeName || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.employeeName || "—"}</p>
                          <p className="text-[10px] text-slate-400">{item.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {/* Company */}
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.joiningCompanyName || "—"}</td>
                    {/* Designation */}
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.designation || "—"}</td>
                    {/* Dept */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.department || "—"}</td>
                    {/* Joining Date */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.dateOfJoining || "—"}</td>
                    {/* Joining Salary */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-slate-600">₹{item.joiningSalary || "—"}</span>
                    </td>
                    {/* Current Salary */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-black text-blue-600">₹{item.currentSalary || "—"}</span>
                    </td>
                    {/* Last Inc Amt */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-slate-500">₹{item.lastIncrementAmount || "—"}</span>
                    </td>
                    {/* Last Inc Date */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.lastIncrementDate || "—"}</td>
                    {/* HOD */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.hod || "—"}</td>
                    {/* HOD Amount & Feedback */}
                    {(activeTab === "mgmt" || activeTab === "final" || activeTab === "history") && <>
                      <td className="px-4 py-3 text-right bg-orange-50/40">
                        <span className="text-xs font-black text-orange-600">₹{item.hodAmount || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 bg-orange-50/40 max-w-[200px] whitespace-normal break-words">{item.hodFeedback || "—"}</td>
                    </>}
                    {/* Mgmt Amount & Feedback */}
                    {(activeTab === "final" || activeTab === "history") && <>
                      <td className="px-4 py-3 text-right bg-pink-50/40">
                        <span className="text-xs font-black text-pink-600">₹{item.mgmtAmount || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 bg-pink-50/40 max-w-[200px] whitespace-normal break-words">{item.mgmtFeedback || "—"}</td>
                    </>}
                    {/* History-only columns */}
                    {activeTab === "history" && <>
                      <td className="px-4 py-3 text-xs font-bold text-blue-700 whitespace-nowrap">{item.dateOfIncrement || "—"}</td>
                      <td className="px-4 py-3 text-right bg-emerald-50/40">
                        <span className="text-xs font-black text-emerald-600">₹{item.incrementAmount || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right bg-emerald-50/40">
                        <span className="text-sm font-black text-blue-800">
                          ₹{(Number(item.currentSalary) || 0) + (Number(item.incrementAmount) || 0) || item.currentSalaryAfterIncrement || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-slate-700 font-bold">{item.nextIncrementNoOfMonth ? `${item.nextIncrementNoOfMonth} Mon` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate italic" title={item.note}>{item.note || "—"}</td>
                    </>}
                    {/* Action */}
                    {activeTab !== "history" && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setActionData({
                              hodAmount: item.hodAmount || "",
                              hodFeedback: item.hodFeedback || "",
                              mgmtAmount: item.mgmtAmount || "",
                              mgmtFeedback: item.mgmtFeedback || "",
                              dateOfIncrement: item.dateOfIncrement || "",
                              currentSalaryAfterIncrement: item.currentSalaryAfterIncrement || "",
                              incrementAmount: item.incrementAmount || "",
                              nextIncrementNoOfMonth: item.nextIncrementNoOfMonth || "",
                              note: item.note || ""
                            });
                            setIsActionModalOpen(true);
                          }}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all hover:scale-105 shadow-sm uppercase tracking-wide",
                            activeTab === "hod" ? "bg-blue-600 text-white shadow-blue-200" :
                            activeTab === "mgmt" ? "bg-orange-500 text-white shadow-orange-200" :
                            "bg-purple-600 text-white shadow-purple-200"
                          )}
                        >
                          {activeTab === "hod" ? "Review" : activeTab === "mgmt" ? "Approve" : "Finalize"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {currentData.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">{currentData.length} record{currentData.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-slate-400 font-medium capitalize">{tabs.find(t => t.id === activeTab)?.label} Stage</p>
          </div>
        )}
      </div>

      {/* ─── New Increment Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Salary Increment Form</h3>
                  <p className="text-xs text-blue-100 mt-0.5">Search employee and submit increment request</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 bg-white/15 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5">

                {/* Step 1 — Employee Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3 text-blue-500" /> Employee Code
                  </label>
                  <div className="relative">
                    <input
                      required
                      list="employee-ids"
                      type="text"
                      value={newEntry.employeeCode || ""}
                      placeholder="Type employee ID or name..."
                      onChange={(e) => {
                        setNewEntry({ ...newEntry, employeeCode: e.target.value });
                        handleFetchEmployee(e.target.value);
                      }}
                      onBlur={(e) => handleFetchEmployee(e.target.value)}
                      className="w-full pl-5 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm font-bold"
                    />
                    <datalist id="employee-ids">
                      {allEmps.map((e, index) => (
                        <option key={index} value={e.employeeId || e.employeeCode}>{e.name || e.employeeName}</option>
                      ))}
                    </datalist>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isSearching
                        ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        : <Search className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Empty state — no employee entered yet */}
                {!newEntry.employeeCode && (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Enter employee code above</p>
                    <p className="text-xs text-slate-300 mt-1">Details will load or you can fill them manually</p>
                  </div>
                )}

                {/* Step 2 — Employee Details (editable, auto-filled when found) */}
                {newEntry.employeeCode && (
                  <>
                    {/* Profile header */}
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0">
                        {(newEntry.employeeName || newEntry.employeeCode || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{newEntry.employeeName || newEntry.employeeCode}</p>
                        <p className="text-[10px] text-slate-400">{newEntry.employeeCode}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100">
                        {isSearching ? "Loading..." : newEntry.employeeName ? "Auto-filled" : "Fill manually"}
                      </span>
                    </div>

                    {/* Divider label */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-100" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Details</p>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* 2-column editable grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Employee Name */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-400" /> Employee Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={newEntry.employeeName || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, employeeName: e.target.value })}
                          placeholder="Full name"
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.employeeName
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                          )}
                        />
                      </div>

                      {/* Designation */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" /> Designation <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={newEntry.designation || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, designation: e.target.value })}
                          placeholder="e.g. Manager"
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.designation
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                          )}
                        />
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-400" /> Department <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={newEntry.department || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, department: e.target.value })}
                          placeholder="e.g. Operations"
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.department
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                          )}
                        />
                      </div>

                      {/* HOD */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-400" /> HOD / Reporting Manager <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={newEntry.hod || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, hod: e.target.value })}
                          placeholder="HOD name or code"
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.hod
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                          )}
                        />
                      </div>

                      {/* Company */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-400" /> Company <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={newEntry.joiningCompanyName || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, joiningCompanyName: e.target.value })}
                          placeholder="Company name"
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.joiningCompanyName
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                          )}
                        />
                      </div>

                      {/* Date of Joining */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" /> Date of Joining <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="date"
                          value={newEntry.dateOfJoining || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, dateOfJoining: e.target.value })}
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.dateOfJoining
                              ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                              : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400"
                          )}
                        />
                      </div>

                      {/* Divider */}
                      <div className="col-span-2 flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-slate-100" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Info</p>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      {/* Joining Salary */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-500" /> Joining Salary <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            required
                            type="number"
                            value={newEntry.joiningSalary || ""}
                            onChange={(e) => setNewEntry({ ...newEntry, joiningSalary: e.target.value })}
                            placeholder="0"
                            className={cn(
                              "w-full pl-8 pr-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                              newEntry.joiningSalary
                                ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                                : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                            )}
                          />
                        </div>
                      </div>

                      {/* Current Salary */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-500" /> Current Salary <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            required
                            type="number"
                            value={newEntry.currentSalary || ""}
                            onChange={(e) => setNewEntry({ ...newEntry, currentSalary: e.target.value })}
                            placeholder="0"
                            className={cn(
                              "w-full pl-8 pr-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                              newEntry.currentSalary
                                ? "bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-400"
                                : "bg-amber-50 border-amber-200 text-slate-900 focus:border-amber-400 placeholder:text-amber-300"
                            )}
                          />
                        </div>
                      </div>

                      {/* Last Increment Amount */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-orange-400" /> Last Inc. Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            value={newEntry.lastIncrementAmount || ""}
                            onChange={(e) => setNewEntry({ ...newEntry, lastIncrementAmount: e.target.value })}
                            placeholder="0"
                            className={cn(
                              "w-full pl-8 pr-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                              newEntry.lastIncrementAmount
                                ? "bg-orange-50 border-orange-200 text-orange-900 focus:border-orange-400"
                                : "bg-slate-50 border-slate-200 text-slate-700 focus:border-slate-400 placeholder:text-slate-300"
                            )}
                          />
                        </div>
                      </div>

                      {/* Last Increment Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-orange-400" /> Last Inc. Date
                        </label>
                        <input
                          type="date"
                          value={newEntry.lastIncrementDate || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, lastIncrementDate: e.target.value })}
                          className={cn(
                            "w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold transition-all",
                            newEntry.lastIncrementDate
                              ? "bg-orange-50 border-orange-200 text-orange-900 focus:border-orange-400"
                              : "bg-slate-50 border-slate-200 text-slate-700 focus:border-slate-400"
                          )}
                        />
                      </div>

                      {/* Note — full width */}
                      <div className="col-span-2 space-y-1.5 pt-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" /> Reason / Note for Increment
                        </label>
                        <textarea
                          value={newEntry.note || ""}
                          onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium min-h-[75px] resize-none"
                          placeholder="Reason for increment request..."
                        />
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> Auto-filled</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" /> Fill manually</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isSearching || !newEntry.employeeName}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><CheckCircle className="w-4 h-4" /> Submit Increment Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Action Modal ─── */}
      {isActionModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Action Modal Header */}
            <div className={cn(
              "p-5 flex items-center justify-between",
              activeTab === "hod" ? "bg-gradient-to-r from-blue-600 to-blue-500" :
              activeTab === "mgmt" ? "bg-gradient-to-r from-orange-500 to-orange-400" :
              "bg-gradient-to-r from-purple-600 to-purple-500"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {activeTab === "hod" ? "HOD Review" : activeTab === "mgmt" ? "Management Approval" : "Final Increment"}
                  </h3>
                  <p className="text-[10px] text-white/70 mt-0.5">{selectedItem.employeeName} · {selectedItem.employeeCode}</p>
                </div>
              </div>
              <button onClick={() => setIsActionModalOpen(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Employee mini card */}
            <div className="mx-4 mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">{selectedItem.employeeName}</p>
                <p className="text-[10px] text-slate-400">{selectedItem.designation} · {selectedItem.department}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">Current Salary</p>
                <p className="text-sm font-black text-blue-600">₹{selectedItem.currentSalary}</p>
              </div>
            </div>

            <form onSubmit={handleActionSubmit} className="p-4 max-h-[55vh] overflow-y-auto space-y-4">
              {activeTab !== 'final' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {activeTab === 'hod' ? 'Proposed Increment Amount' : 'Approved Increment Amount'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        required
                        type="number"
                        value={activeTab === 'hod' ? actionData.hodAmount : actionData.mgmtAmount}
                        onChange={(e) => setActionData({ ...actionData, [activeTab === 'hod' ? 'hodAmount' : 'mgmtAmount']: e.target.value })}
                        className="w-full pl-8 pr-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-black"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {activeTab === 'hod' ? 'Performance Feedback' : 'Management Feedback'}
                    </label>
                    <textarea
                      required
                      value={activeTab === 'hod' ? actionData.hodFeedback : actionData.mgmtFeedback}
                      onChange={(e) => setActionData({ ...actionData, [activeTab === 'hod' ? 'hodFeedback' : 'mgmtFeedback']: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium min-h-[100px] resize-none"
                      placeholder="Provide detailed feedback..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Increment Amount</label>
                      <input
                        required type="number"
                        value={actionData.incrementAmount}
                        onChange={(e) => {
                          const incAmt = e.target.value;
                          setActionData({
                            ...actionData,
                            incrementAmount: incAmt,
                            currentSalaryAfterIncrement: ((Number(selectedItem.currentSalary) || 0) + (Number(incAmt) || 0)).toString()
                          });
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-black"
                        placeholder="₹ 0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Salary</label>
                      <input
                        readOnly type="number"
                        value={actionData.currentSalaryAfterIncrement}
                        className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl outline-none text-sm font-black text-blue-900 cursor-not-allowed"
                        placeholder="Auto-calc"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date of Increment</label>
                    <input
                      required type="date"
                      value={actionData.dateOfIncrement}
                      onChange={(e) => setActionData({ ...actionData, dateOfIncrement: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Increment (Months)</label>
                    <input
                      required type="number"
                      value={actionData.nextIncrementNoOfMonth}
                      onChange={(e) => setActionData({ ...actionData, nextIncrementNoOfMonth: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-black"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Final Note</label>
                    <textarea
                      required
                      value={actionData.note}
                      onChange={(e) => setActionData({ ...actionData, note: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50",
                    activeTab === "hod" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" :
                    activeTab === "mgmt" ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200" :
                    "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
                  )}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                    {activeTab === 'hod' ? 'Send to Management' : activeTab === 'mgmt' ? 'Send for Final Review' : 'Confirm Increment'}
                    <ChevronRight className="w-4 h-4" />
                  </>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
