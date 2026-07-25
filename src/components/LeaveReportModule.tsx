import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import { LeaveFms } from "../types";
import {
  Calendar, Users, CheckCircle, Clock, XCircle,
  Download, Printer, Search, Filter, TrendingUp,
  Loader2, AlertCircle, FileText, ChevronDown, BarChart2, BookOpen, X, Save,
} from "lucide-react";
import { logoBase64 } from "../lib/logoBase64";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─────────────────────────── constants ─── */
const START_YEAR     = 2026;   // system accrual start year
const START_MONTH    = 3;      // April (0-indexed) — system launch month
const EL_PER_MONTH   = 2;      // EL credited per month
const CL_PER_MONTH   = 1;      // CL credited per month
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const YEARS = ["2026","2027","2028","2029"];

/* ─────────────────────────── types ─── */
interface TypeStat {
  open: number; credit: number; availed: number; pending: number; close: number;
}
interface MonthRow {
  month: number; year: number;
  el: TypeStat; cl: TypeStat;
  ml: { open: number; availed: number; pending: number; close: number };
  total: number;
}
interface EmpRow {
  id: string; name: string; dept: string;
  current: MonthRow;            // stats for selected month
  passbook: MonthRow[];         // full history up to selected month
}

/* ─────────────────────────── date helpers ─── */
function parseDate(s: string): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
  const p = s.split(/[\/\-\.]/);
  if (p.length === 3) {
    const [a, b, c] = p.map(Number);
    if (c > 1000) return new Date(c, b - 1, a);
    if (a > 1000) return new Date(a, b - 1, c);
  }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
const fmt = (n: number) => +n.toFixed(1);

/* ─────────────────────────── accrual engine ─── */
function buildPassbook(
  idx: Record<string, LeaveFms[]>,  // "YYYY-M" → leaves for that emp+month
  mlInitial: number,
  toMonth: number, toYear: number
): MonthRow[] {
  const result: MonthRow[] = [];
  let el = 0, cl = 0, ml = mlInitial;
  let cy = START_YEAR, cm = START_MONTH;

  while (cy < toYear || (cy === toYear && cm <= toMonth)) {
    const key = `${cy}-${cm}`;
    const all = idx[key] || [];

    const approved = all.filter(l => l.status2 === "Work Done");
    const pending  = all.filter(l =>
      l.status1 !== "Rejected" && l.status2 !== "Rejected" && l.status2 !== "Work Done"
    );
    const days = (ls: LeaveFms[], type: string) =>
      fmt(ls.filter(l => l.typeOfLeave === type).reduce((s,l) => s + (parseFloat(l.noOfDays as any)||0), 0));

    const elOpen = el, clOpen = cl, mlOpen = ml;

    const elAv = days(approved,"EL"), clAv = days(approved,"CL"), mlAv = days(approved,"ML");
    const elPe = days(pending,"EL"),  clPe = days(pending,"CL"),  mlPe = days(pending,"ML");

    const elC = fmt(elOpen + EL_PER_MONTH - elAv);
    const clC = fmt(clOpen + CL_PER_MONTH - clAv);
    const mlC = fmt(mlOpen - mlAv);

    result.push({
      month: cm, year: cy,
      el: { open: elOpen, credit: EL_PER_MONTH, availed: elAv, pending: elPe, close: elC },
      cl: { open: clOpen, credit: CL_PER_MONTH, availed: clAv, pending: clPe, close: clC },
      ml: { open: mlOpen, availed: mlAv, pending: mlPe, close: mlC },
      total: fmt(elC + clC + mlC),
    });

    el = elC; cl = clC; ml = mlC;
    cm++; if (cm > 11) { cm = 0; cy++; }
  }
  return result;
}

/* ─────────────────────────── tiny UI pieces ─── */
const CreditBadge = ({ n }: { n: number }) => (
  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
    +{n}
  </span>
);
const UsedBadge = ({ n }: { n: number }) => n > 0
  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">{n}</span>
  : <span className="text-slate-300 text-xs font-bold">—</span>;
const PendBadge = ({ n }: { n: number }) => n > 0
  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">{n}</span>
  : <span className="text-slate-300 text-xs font-bold">—</span>;
const CloseBadge = ({ n, theme }: { n: number; theme: "el"|"cl"|"ml" }) => {
  const low = n < 2, neg = n < 0;
  const base = theme === "el" ? "bg-blue-50 text-blue-700 border-blue-200"
             : theme === "cl" ? "bg-pink-50 text-pink-700 border-pink-200"
             :                  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border",
      neg ? "bg-red-100 text-red-700 border-red-300" :
      low ? "bg-amber-50 text-amber-700 border-amber-200" : base
    )}>{n}</span>
  );
};
const MiniBar = ({ av, pe, q }: { av:number; pe:number; q:number }) => {
  const t = Math.max(q, av+pe, 1);
  return (
    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex mt-0.5">
      <div className="h-full bg-emerald-400" style={{width:`${Math.min(100,(av/t)*100)}%`}} />
      <div className="h-full bg-amber-400"   style={{width:`${Math.min(100,(pe/t)*100)}%`}} />
    </div>
  );
};
const SCard = ({ label,value,sub,icon:Icon,color }:any) => (
  <div className={cn("rounded-2xl border p-4 flex flex-col gap-1",color)}>
    <div className="flex items-center justify-between">
      <Icon className="w-4 h-4 opacity-60" />
      <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</span>
    </div>
    <p className="text-2xl font-black mt-1">{value}</p>
    {sub && <p className="text-[10px] opacity-60 font-medium">{sub}</p>}
  </div>
);

/* ═══════════════════════════════════════════════════════════ */
export const LeaveReportModule: React.FC = () => {
  const today = new Date();
  const [selMonth, setSelMonth] = useState(today.getMonth());
  const [selYear,  setSelYear]  = useState(today.getFullYear());
  const [dept,     setDept]     = useState("all");
  const [empQ,     setEmpQ]     = useState("");
  const [pbEmpId,  setPbEmpId]  = useState<string|null>(null);  // passbook modal
  const [leaves,   setLeaves]   = useState<LeaveFms[]>([]);
  const [emps,     setEmps]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success"|"error"|null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [lv, em] = await Promise.all([api.getLeaves(), api.getActiveEmployees()]);
        const activeEmps = em || [];
        const activeIds  = new Set(activeEmps.map((e:any) =>
          (e.employeeId || e.pmmplAc || e.employeeCode || "").toString().trim()
        ).filter(Boolean));
        // Only show leave records for currently active employees
        setLeaves((lv||[]).filter((d:any) =>
          d.timestamp && d.leaveNo &&
          (activeIds.size === 0 || activeIds.has((d.employeeIdCode || "").toString().trim()))
        ));
        setEmps(activeEmps);
      } finally { setLoading(false); }
    })();
  }, []);

  /* ── index leaves per employee per month ── */
  const leaveIdx = useMemo(() => {
    // idx[empId]["YYYY-M"] = leaves[]
    const idx: Record<string, Record<string, LeaveFms[]>> = {};
    leaves.forEach(l => {
      const eid = l.employeeIdCode || "??";
      const d   = parseDate(l.dateRequestedFrom);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!idx[eid])       idx[eid]     = {};
      if (!idx[eid][key])  idx[eid][key] = [];
      idx[eid][key].push(l);
    });
    return idx;
  }, [leaves]);

  /* ── build employee rows ── */
  const allRows: EmpRow[] = useMemo(() => {
    const empMap: Record<string, { name:string; id:string }> = {};
    leaves.forEach(l => {
      const k = l.employeeIdCode || "??";
      if (!empMap[k]) empMap[k] = { name: l.nameOfEmployee||k, id: k };
    });

    return Object.values(empMap).map(e => {
      const det     = emps.find(x => x.employeeId === e.id);
      const dept    = det?.department || "—";
      const mlQuota = parseFloat(det?.ml || 0);

      const passbook = buildPassbook(leaveIdx[e.id] || {}, mlQuota, selMonth, selYear);
      const current  = passbook[passbook.length - 1] ?? {
        month: selMonth, year: selYear,
        el: { open:0,credit:EL_PER_MONTH,availed:0,pending:0,close:0 },
        cl: { open:0,credit:CL_PER_MONTH,availed:0,pending:0,close:0 },
        ml: { open:0,availed:0,pending:0,close:0 },
        total: 0,
      };

      return { id:e.id, name:e.name, dept, current, passbook };
    });
  }, [leaveIdx, emps, selMonth, selYear]);

  /* ── filter ── */
  const filtered = useMemo(() => allRows.filter(r => {
    const matchD = dept === "all" || r.dept === dept;
    const q = empQ.toLowerCase();
    const matchE = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    return matchD && matchE;
  }), [allRows, dept, empQ]);

  /* ── summary totals ── */
  const tot = useMemo(() => ({
    elBal:    fmt(filtered.reduce((s,r)=>s+r.current.el.close,0)),
    clBal:    fmt(filtered.reduce((s,r)=>s+r.current.cl.close,0)),
    mlBal:    fmt(filtered.reduce((s,r)=>s+r.current.ml.close,0)),
    taken:    fmt(filtered.reduce((s,r)=>s+r.current.el.availed+r.current.cl.availed+r.current.ml.availed,0)),
    pending:  fmt(filtered.reduce((s,r)=>s+r.current.el.pending+r.current.cl.pending+r.current.ml.pending,0)),
    approved: fmt(filtered.reduce((s,r)=>s+r.current.el.availed+r.current.cl.availed+r.current.ml.availed,0)),
    lowCount:          filtered.filter(r=>r.current.total < 3).length,
    elCredited:        filtered.length * EL_PER_MONTH,
    clCredited:        filtered.length * CL_PER_MONTH,
    paidLeaveBalance:  fmt(filtered.reduce((s,r)=>s+r.current.el.close+r.current.cl.close,0)),
    paidLeaveAvailed:  fmt(filtered.reduce((s,r)=>s+r.current.el.availed+r.current.cl.availed,0)),
  }), [filtered]);

  const depts = useMemo(() =>
    [...new Set(emps.map(e=>e.department).filter(Boolean))].sort()
  ,[emps]);

  const pbRow = useMemo(() => allRows.find(r => r.id === pbEmpId) ?? null, [allRows, pbEmpId]);

  /* ── CSV export ── */
  const exportCSV = () => {
    const h = ["Emp ID","Name","Dept",
               "EL Opening","EL Credit","EL Availed","EL Closing",
               "CL Opening","CL Credit","CL Availed","CL Closing",
               "ML Opening","ML Availed","ML Closing",
               "Total Balance","Pending"];
    const body = filtered.map(r => {
      const c = r.current;
      return [r.id,r.name,r.dept,
              c.el.open,c.el.credit,c.el.availed,c.el.close,
              c.cl.open,c.cl.credit,c.cl.availed,c.cl.close,
              c.ml.open,c.ml.availed,c.ml.close,
              c.total, c.el.pending+c.cl.pending+c.ml.pending];
    });
    const csv = [h,...body].map(r=>r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `Leave_Accrual_${MONTHS[selMonth]}_${selYear}.csv`;
    a.click();
  };

  /* ── PDF export ── */
  const exportPDF = () => {
    const doc = new jsPDF({orientation:"landscape"});
    try { doc.addImage(logoBase64, "PNG", 14, 5, 12, 12); } catch(e){}
    doc.setFontSize(14);
    doc.text(`Leave Balance Report (Accrual) — ${MONTHS[selMonth]} ${selYear}`, 30, 14);
    doc.setFontSize(8);
    doc.text(`EL: +${EL_PER_MONTH}/month  CL: +${CL_PER_MONTH}/month  |  Generated: ${new Date().toLocaleString()}`, 30, 20);

    autoTable(doc, {
      startY: 25,
      head: [
        [
          {content:"#",        rowSpan:2, styles:{valign:"middle"}},
          {content:"Employee", rowSpan:2, styles:{valign:"middle"}},
          {content:"Dept",     rowSpan:2, styles:{valign:"middle"}},
          {content:`EL (Earned Leave) — +${EL_PER_MONTH}/month`, colSpan:4, styles:{halign:"center",fillColor:[219,234,254],textColor:[29,78,216],fontStyle:"bold"}},
          {content:`CL (Casual Leave) — +${CL_PER_MONTH}/month`, colSpan:4, styles:{halign:"center",fillColor:[252,231,243],textColor:[157,23,77],fontStyle:"bold"}},
          {content:"ML (Medical Leave)", colSpan:3, styles:{halign:"center",fillColor:[250,232,255],textColor:[134,25,143],fontStyle:"bold"}},
          {content:"Summary", colSpan:2, styles:{halign:"center",fillColor:[240,253,244],textColor:[22,101,52],fontStyle:"bold"}},
        ],
        ["Open","+Credit","Used","Close","Open","+Credit","Used","Close","Open","Used","Close","Balance","Pending"],
      ],
      body: filtered.map((r,i)=>{
        const c=r.current;
        return [i+1,`${r.name}\n${r.id}`,r.dept,
                c.el.open,`+${c.el.credit}`,c.el.availed,c.el.close,
                c.cl.open,`+${c.cl.credit}`,c.cl.availed,c.cl.close,
                c.ml.open,c.ml.availed,c.ml.close,
                c.total, c.el.pending+c.cl.pending+c.ml.pending];
      }),
      foot:[["","TOTAL","","","",tot.taken,"",
             "","",fmt(filtered.reduce((s,r)=>s+r.current.cl.availed,0)),"",
             "",fmt(filtered.reduce((s,r)=>s+r.current.ml.availed,0)),"",
             `EL:${tot.elBal} CL:${tot.clBal} ML:${tot.mlBal}`,tot.pending]],
      styles:{fontSize:7,cellPadding:2},
      headStyles:{fillColor:[219,39,119],textColor:255,fontStyle:"bold"},
      alternateRowStyles:{fillColor:[255,248,252]},
      footStyles:{fillColor:[253,232,244],fontStyle:"bold"},
      didParseCell:(data:any)=>{
        const v=parseFloat(data.cell.raw);
        if([6,10,13].includes(data.column.index) && !isNaN(v)){
          if(v<0)  data.cell.styles.textColor=[220,38,38];
          else if(v<2) data.cell.styles.textColor=[217,119,6];
        }
      },
    });
    doc.save(`Leave_Accrual_${MONTHS[selMonth]}_${selYear}.pdf`);
  };

  const handleSaveReport = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const rows = allRows.map(r => ({
        employeeId:        r.id,
        employeeName:      r.name,
        department:        r.dept,
        month:             MONTHS[selMonth],
        year:              String(selYear),
        elOpening:         r.current.el.open,
        elCredit:          r.current.el.credit,
        elAvailed:         r.current.el.availed,
        elClosing:         r.current.el.close,
        clOpening:         r.current.cl.open,
        clCredit:          r.current.cl.credit,
        clAvailed:         r.current.cl.availed,
        clClosing:         r.current.cl.close,
        totalLeaveBalance: fmt(r.current.el.close + r.current.cl.close),
      }));
      const ok = await api.savePaidLeaveReport(rows);
      setSaveStatus(ok ? "success" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  /* ════════════════════════════════════ render ══ */
  return (
    <div className="space-y-6 print:space-y-4">

      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-600 rounded-2xl shadow-lg shadow-pink-200 print:hidden">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Leave Passbook</h1>
              <p className="text-sm text-slate-400 font-medium">
                Accrual-based monthly ledger &nbsp;·&nbsp;
                <span className="text-blue-600 font-bold">EL +{EL_PER_MONTH}/month</span>
                &nbsp;·&nbsp;
                <span className="text-pink-600 font-bold">CL +{CL_PER_MONTH}/month</span>
                &nbsp;·&nbsp;Opening → Credit → Used → Closing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="relative">
              <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)}
                className="appearance-none pl-4 pr-8 py-2.5 text-sm font-bold rounded-xl border border-pink-100 bg-pink-50 text-pink-700 outline-none focus:ring-2 focus:ring-pink-400">
                {MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none"/>
            </div>
            <div className="relative">
              <select value={selYear} onChange={e=>setSelYear(+e.target.value)}
                className="appearance-none pl-4 pr-8 py-2.5 text-sm font-bold rounded-xl border border-pink-100 bg-pink-50 text-pink-700 outline-none focus:ring-2 focus:ring-pink-400">
                {YEARS.map(y=><option key={y} value={+y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none"/>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-bold hover:bg-emerald-100 transition-all">
              <Download className="w-4 h-4"/> Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-sm font-bold hover:bg-rose-100 transition-all">
              <FileText className="w-4 h-4"/> PDF
            </button>
            <button onClick={()=>window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 text-sm font-bold hover:bg-slate-100 transition-all">
              <Printer className="w-4 h-4"/> Print
            </button>
            <button onClick={handleSaveReport} disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-violet-200">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {saving ? "Saving…" : "Generate Monthly Report"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Save Status Notification ── */}
      {saveStatus === "success" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 print:hidden">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0"/>
          <div>
            <p className="font-bold text-sm">Report saved to "Paid Leave" sheet!</p>
            <p className="text-xs opacity-70">{MONTHS[selMonth]} {selYear} — {allRows.length} employees saved. Existing entries updated automatically.</p>
          </div>
          <button onClick={()=>setSaveStatus(null)} className="ml-auto p-1.5 hover:bg-emerald-100 rounded-xl transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}
      {saveStatus === "error" && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-center gap-3 print:hidden">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0"/>
          <div>
            <p className="font-bold text-sm">Failed to save report</p>
            <p className="text-xs opacity-70">Ensure the "Paid Leave" sheet exists in Google Sheets and the GAS is re-deployed, then try again.</p>
          </div>
          <button onClick={()=>setSaveStatus(null)} className="ml-auto p-1.5 hover:bg-red-100 rounded-xl transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SCard label="Total Employees"  value={filtered.length}       sub="in report"                icon={Users}       color="bg-white       border-slate-100   text-slate-700"   />
        <SCard label="EL Credited"      value={tot.elCredited}        sub={`+${EL_PER_MONTH}/month`} icon={TrendingUp}  color="bg-blue-50     border-blue-100    text-blue-700"    />
        <SCard label="CL Credited"      value={tot.clCredited}        sub={`+${CL_PER_MONTH}/month`} icon={TrendingUp}  color="bg-pink-50     border-pink-100    text-pink-700"    />
        <SCard label="Leave Availed"    value={tot.paidLeaveAvailed}  sub="EL + CL approved"         icon={CheckCircle} color="bg-emerald-50  border-emerald-100 text-emerald-700" />
        <SCard label="Leave Balance"    value={tot.paidLeaveBalance}  sub="EL + CL available"        icon={Calendar}    color="bg-violet-50   border-violet-100  text-violet-700"  />
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 flex flex-wrap gap-3 items-center print:hidden">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-pink-400"/>
          <span className="text-sm font-bold text-slate-700">Filters</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={empQ} onChange={e=>setEmpQ(e.target.value)}
            placeholder="Employee name / ID..."
            className="pl-9 pr-3 py-2 text-sm rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700 w-48"/>
        </div>
        <div className="relative">
          <select value={dept} onChange={e=>setDept(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700">
            <option value="all">All Departments</option>
            {depts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
        </div>
        {/* accrual note */}
        <div className="ml-auto flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>EL: +{EL_PER_MONTH}/month
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-100 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-pink-400 inline-block"/>CL: +{CL_PER_MONTH}/month
          </span>
          <span className="text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            {filtered.length} employees
          </span>
        </div>
      </div>

      {/* ── Main Table ── */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden print:rounded-none">
        <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-600 rounded-xl print:hidden">
              <TrendingUp className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {MONTHS[selMonth]} {selYear} — Leave Balance Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Accrued from {MONTHS[START_MONTH]} {START_YEAR} · Click <BookOpen className="w-3 h-3 inline"/> Passbook for full history
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] font-bold text-slate-400 print:hidden">
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-blue-300 inline-block"/>EL</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-pink-300 inline-block"/>CL</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-fuchsia-300 inline-block"/>ML</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-amber-200 inline-block"/>Low (&lt;2)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-red-200 inline-block"/>Negative</span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500"/>
            <p className="text-slate-400 text-sm">Calculating leave balances…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-slate-200"/>
            <p className="text-slate-400 font-bold">No leave data found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{minWidth:"1120px"}}>

              {/* ── 2-row grouped header ── */}
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                {/* Row 1 */}
                <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wide">
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 align-middle">#</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 align-middle">Employee</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 align-middle">Dept</th>
                  <th colSpan={4} className="px-2 py-2 text-center border-r border-slate-700 bg-blue-900">
                    EL — Earned Leave (+{EL_PER_MONTH}/month)
                  </th>
                  <th colSpan={4} className="px-2 py-2 text-center border-r border-slate-700 bg-pink-900">
                    CL — Casual Leave (+{CL_PER_MONTH}/month)
                  </th>
                  <th colSpan={3} className="px-2 py-2 text-center border-r border-slate-700 bg-fuchsia-900">
                    ML — Medical Leave
                  </th>
                  <th colSpan={3} className="px-2 py-2 text-center bg-slate-700">
                    Summary
                  </th>
                </tr>
                {/* Row 2 */}
                <tr className="bg-slate-700 text-[10px] font-black uppercase tracking-wide">
                  <th className="px-3 py-2 text-center text-blue-200">Open</th>
                  <th className="px-3 py-2 text-center text-emerald-300">+Credit</th>
                  <th className="px-3 py-2 text-center text-rose-300">Used</th>
                  <th className="px-3 py-2 text-center text-blue-200 border-r border-slate-600">Close</th>

                  <th className="px-3 py-2 text-center text-pink-200">Open</th>
                  <th className="px-3 py-2 text-center text-emerald-300">+Credit</th>
                  <th className="px-3 py-2 text-center text-rose-300">Used</th>
                  <th className="px-3 py-2 text-center text-pink-200 border-r border-slate-600">Close</th>

                  <th className="px-3 py-2 text-center text-fuchsia-200">Open</th>
                  <th className="px-3 py-2 text-center text-rose-300">Used</th>
                  <th className="px-3 py-2 text-center text-fuchsia-200 border-r border-slate-600">Close</th>

                  <th className="px-3 py-2 text-center text-white">Balance</th>
                  <th className="px-3 py-2 text-center text-amber-200">Pending</th>
                  <th className="px-3 py-2 text-center text-slate-300">Passbook</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-pink-50">
                {filtered.map((r, i) => {
                  const c = r.current;
                  const isLow = r.current.total < 3 && r.current.total >= 0;
                  const isNeg = r.current.total < 0;
                  return (
                    <tr key={i} className={cn(
                      "transition-colors",
                      isNeg ? "bg-red-50/40 hover:bg-red-50/60" :
                      isLow ? "bg-amber-50/30 hover:bg-amber-50/50" :
                               "hover:bg-pink-50/40"
                    )}>
                      <td className="px-4 py-3 text-xs text-slate-400 font-bold">{i+1}</td>

                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0",
                            isNeg ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-pink-600"
                          )}>
                            {(r.name||"?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{r.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{r.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Dept */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{r.dept}</span>
                      </td>

                      {/* EL */}
                      <td className="px-3 py-3 text-center bg-blue-50/20">
                        <span className="text-sm font-black text-blue-700">{c.el.open}</span>
                      </td>
                      <td className="px-3 py-3 text-center bg-blue-50/20">
                        <CreditBadge n={c.el.credit}/>
                      </td>
                      <td className="px-3 py-3 text-center bg-blue-50/20">
                        <UsedBadge n={c.el.availed}/>
                      </td>
                      <td className="px-3 py-3 text-center bg-blue-50/20 border-r border-blue-100">
                        <CloseBadge n={c.el.close} theme="el"/>
                        <MiniBar av={c.el.availed} pe={c.el.pending} q={c.el.open+c.el.credit}/>
                      </td>

                      {/* CL */}
                      <td className="px-3 py-3 text-center bg-pink-50/20">
                        <span className="text-sm font-black text-pink-700">{c.cl.open}</span>
                      </td>
                      <td className="px-3 py-3 text-center bg-pink-50/20">
                        <CreditBadge n={c.cl.credit}/>
                      </td>
                      <td className="px-3 py-3 text-center bg-pink-50/20">
                        <UsedBadge n={c.cl.availed}/>
                      </td>
                      <td className="px-3 py-3 text-center bg-pink-50/20 border-r border-pink-100">
                        <CloseBadge n={c.cl.close} theme="cl"/>
                        <MiniBar av={c.cl.availed} pe={c.cl.pending} q={c.cl.open+c.cl.credit}/>
                      </td>

                      {/* ML */}
                      <td className="px-3 py-3 text-center bg-fuchsia-50/20">
                        <span className="text-sm font-black text-fuchsia-700">{c.ml.open}</span>
                      </td>
                      <td className="px-3 py-3 text-center bg-fuchsia-50/20">
                        <UsedBadge n={c.ml.availed}/>
                      </td>
                      <td className="px-3 py-3 text-center bg-fuchsia-50/20 border-r border-fuchsia-100">
                        <CloseBadge n={c.ml.close} theme="ml"/>
                        <MiniBar av={c.ml.availed} pe={c.ml.pending} q={c.ml.open}/>
                      </td>

                      {/* Summary */}
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          "text-base font-black",
                          isNeg ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"
                        )}>{c.total}</span>
                        <p className="text-[9px] text-slate-400">days</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <PendBadge n={c.el.pending+c.cl.pending+c.ml.pending}/>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={()=>setPbEmpId(r.id)}
                          className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-pink-50 text-slate-600 hover:text-pink-700 border border-slate-100 hover:border-pink-200 text-xs font-bold transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5"/> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              <tfoot className="bg-slate-800 text-white text-xs font-black">
                <tr>
                  <td colSpan={3} className="px-4 py-3 uppercase tracking-wide">
                    Totals — {filtered.length} Employees
                  </td>
                  {/* EL */}
                  <td className="px-3 py-3 text-center bg-blue-900/40 text-blue-200">—</td>
                  <td className="px-3 py-3 text-center bg-blue-900/40 text-emerald-300">+{filtered.length * EL_PER_MONTH}</td>
                  <td className="px-3 py-3 text-center bg-blue-900/40 text-rose-300">{fmt(filtered.reduce((s,r)=>s+r.current.el.availed,0))}</td>
                  <td className="px-3 py-3 text-center bg-blue-900/40 text-blue-200">{tot.elBal}</td>
                  {/* CL */}
                  <td className="px-3 py-3 text-center bg-pink-900/40 text-pink-200">—</td>
                  <td className="px-3 py-3 text-center bg-pink-900/40 text-emerald-300">+{filtered.length * CL_PER_MONTH}</td>
                  <td className="px-3 py-3 text-center bg-pink-900/40 text-rose-300">{fmt(filtered.reduce((s,r)=>s+r.current.cl.availed,0))}</td>
                  <td className="px-3 py-3 text-center bg-pink-900/40 text-pink-200">{tot.clBal}</td>
                  {/* ML */}
                  <td className="px-3 py-3 text-center bg-fuchsia-900/40 text-fuchsia-200">—</td>
                  <td className="px-3 py-3 text-center bg-fuchsia-900/40 text-rose-300">{fmt(filtered.reduce((s,r)=>s+r.current.ml.availed,0))}</td>
                  <td className="px-3 py-3 text-center bg-fuchsia-900/40 text-fuchsia-200">{tot.mlBal}</td>
                  {/* Summary */}
                  <td className="px-3 py-3 text-center">{fmt(tot.elBal+tot.clBal+tot.mlBal)}</td>
                  <td className="px-3 py-3 text-center text-amber-300">{tot.pending}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════ PASSBOOK MODAL ══ */}
      {pbEmpId && pbRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setPbEmpId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
               onClick={e=>e.stopPropagation()}>

            {/* Modal Header */}
            <div className="p-6 border-b border-pink-50 flex items-center justify-between bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black">
                  {(pbRow.name||"?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-black">{pbRow.name}</p>
                  <p className="text-pink-200 text-xs font-medium">{pbRow.id} · {pbRow.dept} · Leave Passbook ({MONTHS[START_MONTH]} {START_YEAR} → {MONTHS[selMonth]} {selYear})</p>
                </div>
              </div>
              <button onClick={()=>setPbEmpId(null)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Passbook Table */}
            <div className="overflow-auto flex-1 p-1">
              <table className="w-full text-left" style={{minWidth:"900px"}}>
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wide">
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 align-middle">Month</th>
                    <th colSpan={4} className="px-2 py-2 text-center border-r border-slate-700 bg-blue-900">EL (+{EL_PER_MONTH}/month)</th>
                    <th colSpan={4} className="px-2 py-2 text-center border-r border-slate-700 bg-pink-900">CL (+{CL_PER_MONTH}/month)</th>
                    <th colSpan={3} className="px-2 py-2 text-center border-r border-slate-700 bg-fuchsia-900">ML</th>
                    <th rowSpan={2} className="px-4 py-3 text-center align-middle">Total</th>
                  </tr>
                  <tr className="bg-slate-700 text-[10px] font-black uppercase tracking-wide">
                    <th className="px-3 py-2 text-center text-blue-200">Open</th>
                    <th className="px-3 py-2 text-center text-emerald-300">+Credit</th>
                    <th className="px-3 py-2 text-center text-rose-300">Used</th>
                    <th className="px-3 py-2 text-center text-blue-200 border-r border-slate-600">Close</th>
                    <th className="px-3 py-2 text-center text-pink-200">Open</th>
                    <th className="px-3 py-2 text-center text-emerald-300">+Credit</th>
                    <th className="px-3 py-2 text-center text-rose-300">Used</th>
                    <th className="px-3 py-2 text-center text-pink-200 border-r border-slate-600">Close</th>
                    <th className="px-3 py-2 text-center text-fuchsia-200">Open</th>
                    <th className="px-3 py-2 text-center text-rose-300">Used</th>
                    <th className="px-3 py-2 text-center text-fuchsia-200 border-r border-slate-600">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {pbRow.passbook.map((row, i) => {
                    const isCurrent = row.month === selMonth && row.year === selYear;
                    const hasActivity = row.el.availed > 0 || row.cl.availed > 0 || row.ml.availed > 0;
                    const hasPending  = row.el.pending > 0 || row.cl.pending > 0 || row.ml.pending > 0;
                    return (
                      <tr key={i} className={cn(
                        "transition-colors text-sm",
                        isCurrent ? "bg-pink-50 border-l-4 border-l-pink-500" :
                        hasActivity ? "bg-emerald-50/30" : "hover:bg-pink-50/40 transition-colors duration-200"
                      )}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-black",
                              isCurrent ? "text-pink-700" : "text-slate-700"
                            )}>
                              {MONTHS[row.month].slice(0,3)} {row.year}
                            </span>
                            {isCurrent && <span className="px-2 py-0.5 text-[9px] font-black bg-pink-500 text-white rounded-full">Current</span>}
                            {hasPending && !isCurrent && <span className="px-2 py-0.5 text-[9px] font-black bg-amber-100 text-amber-700 rounded-full">Pending</span>}
                          </div>
                        </td>
                        {/* EL */}
                        <td className="px-3 py-3 text-center text-blue-700 font-bold bg-blue-50/20">{row.el.open}</td>
                        <td className="px-3 py-3 text-center bg-blue-50/20"><CreditBadge n={row.el.credit}/></td>
                        <td className="px-3 py-3 text-center bg-blue-50/20"><UsedBadge n={row.el.availed}/></td>
                        <td className="px-3 py-3 text-center bg-blue-50/20 border-r border-blue-100"><CloseBadge n={row.el.close} theme="el"/></td>
                        {/* CL */}
                        <td className="px-3 py-3 text-center text-pink-700 font-bold bg-pink-50/20">{row.cl.open}</td>
                        <td className="px-3 py-3 text-center bg-pink-50/20"><CreditBadge n={row.cl.credit}/></td>
                        <td className="px-3 py-3 text-center bg-pink-50/20"><UsedBadge n={row.cl.availed}/></td>
                        <td className="px-3 py-3 text-center bg-pink-50/20 border-r border-pink-100"><CloseBadge n={row.cl.close} theme="cl"/></td>
                        {/* ML */}
                        <td className="px-3 py-3 text-center text-fuchsia-700 font-bold bg-fuchsia-50/20">{row.ml.open}</td>
                        <td className="px-3 py-3 text-center bg-fuchsia-50/20"><UsedBadge n={row.ml.availed}/></td>
                        <td className="px-3 py-3 text-center bg-fuchsia-50/20 border-r border-fuchsia-100"><CloseBadge n={row.ml.close} theme="ml"/></td>
                        {/* Total */}
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "text-base font-black",
                            row.total < 0 ? "text-red-600" :
                            row.total < 3 ? "text-amber-600" : "text-slate-800"
                          )}>{row.total}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-pink-50 bg-pink-50/40 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-100 border-l-2 border-l-pink-500 inline-block"/>Current month</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-50 inline-block"/>Leave taken</span>
                <span><span className="text-emerald-700 font-black">+n</span> = monthly credit</span>
              </div>
              <button onClick={()=>setPbEmpId(null)}
                className="px-5 py-2 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
