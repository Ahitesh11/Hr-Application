import React from "react";
import { SalaryRecord } from "../types";
import { format } from "date-fns";
import { Printer, X, Building2, CreditCard, Download } from "lucide-react";
import { logoBase64 } from "../lib/logoBase64";

interface SalarySlipProps {
  record: SalaryRecord;
  onClose: () => void;
}

export const SalarySlip: React.FC<SalarySlipProps> = ({ record, onClose }) => {
  const r = record as any;

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const earnRows = gross.map(e => `
      <tr><td style="padding:8px 12px;color:#475569;font-size:12px">${e.label}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:12px">₹${fmt(e.value)}</td></tr>`).join("");
    const dedRows = deductions.map(d => `
      <tr><td style="padding:8px 12px;color:#475569;font-size:12px">${d.label}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;color:#dc2626;font-size:12px">−₹${fmt(d.value)}</td></tr>`).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Salary Slip – ${record.employeeName} – ${record.month} ${record.year}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;display:flex;justify-content:center;padding:24px}
  .slip{background:#fff;width:780px;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.15)}
  .hdr{background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:28px 36px;display:flex;justify-content:space-between;align-items:center}
  .hdr-l h1{font-size:20px;font-weight:900;color:#fff;margin-bottom:4px}
  .hdr-l p{font-size:11px;color:#bfdbfe}
  .hdr-r{text-align:right}
  .hdr-r .badge{font-size:9px;font-weight:900;color:#bfdbfe;text-transform:uppercase;letter-spacing:2px}
  .hdr-r .month{font-size:22px;font-weight:900;color:#fff}
  .hdr-r .gen{font-size:9px;color:#93c5fd;margin-top:4px}
  .emp{background:#f8fafc;padding:20px 36px;border-bottom:1px solid #e2e8f0}
  .emp-top{display:flex;align-items:center;gap:14px;margin-bottom:16px}
  .avatar{width:44px;height:44px;background:#dbeafe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#1d4ed8;flex-shrink:0}
  .emp-top h2{font-size:16px;font-weight:900;color:#0f172a}
  .emp-top p{font-size:11px;color:#64748b;margin-top:2px}
  .emp-top .eid{margin-left:auto;text-align:right}
  .emp-top .eid span{font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;display:block}
  .emp-top .eid b{font-size:13px;font-weight:900;color:#2563eb}
  .info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .info-cell span{font-size:8px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px}
  .info-cell b{font-size:11px;font-weight:700;color:#1e293b}
  .att{padding:16px 36px;border-bottom:1px solid #f1f5f9;display:flex;gap:10px}
  .att-card{flex:1;border-radius:12px;padding:10px 14px;text-align:center}
  .att-card span{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1px;opacity:.7;display:block;margin-bottom:4px}
  .att-card b{font-size:14px;font-weight:900}
  .body{padding:20px 36px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .card{border-radius:14px;overflow:hidden;border:1px solid #e2e8f0}
  .card-hdr{padding:10px 16px;display:flex;align-items:center;gap:8px}
  .card-hdr span{font-size:9px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:2px}
  .card table{width:100%;border-collapse:collapse}
  .card tfoot td{padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px}
  .net{background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:14px;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .net-l span{font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:2px;display:block;margin-bottom:6px}
  .net-l b{font-size:36px;font-weight:900;color:#fff}
  .net-l p{font-size:10px;color:#475569;margin-top:6px}
  .net-r{width:56px;height:56px;background:rgba(255,255,255,.1);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px}
  .sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
  .sig{text-align:center}
  .sig-line{height:1px;border-bottom:1px dashed #cbd5e1;margin-bottom:8px;margin-top:40px}
  .sig p{font-size:8px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 36px;display:flex;justify-content:space-between}
  .footer p{font-size:9px;color:#94a3b8}
  @media print{body{background:#fff;padding:0}.slip{box-shadow:none;border-radius:0;width:100%}}
</style></head><body>
<div class="slip">
  <div class="hdr">
    <div class="hdr-l">
      <img src="${logoBase64}" alt="Logo" style="height:36px;margin-bottom:8px;" />
      <h1>${record.company || "Company"}</h1>
      <p>${record.location || ""}</p>
    </div>
    <div class="hdr-r">
      <div class="badge">Salary Pay Slip</div>
      <div class="month">${record.month} ${record.year}</div>
      <div class="gen">Generated: ${format(new Date(), "dd MMM yyyy")}</div>
    </div>
  </div>

  <div class="emp">
    <div class="emp-top">
      <div class="avatar">${(record.employeeName || "E").charAt(0)}</div>
      <div><h2>${record.employeeName}</h2><p>${record.designation || ""}</p></div>
      <div class="eid"><span>Employee ID</span><b>${record.employeeCode}</b></div>
    </div>
    <div class="info-grid">
      <div class="info-cell"><span>Joining Date</span><b>${record.joiningDate || "—"}</b></div>
      <div class="info-cell"><span>Payment Mode</span><b>${record.mode || "—"}</b></div>
      <div class="info-cell"><span>UAN Number</span><b>${record.uan || "—"}</b></div>
      <div class="info-cell"><span>ESIC ID</span><b>${record.insuranceId || "—"}</b></div>
      <div class="info-cell"><span>Bank Name</span><b>${record.bankName || "—"}</b></div>
      <div class="info-cell"><span>Account No.</span><b>${record.bankAccountNumber || "—"}</b></div>
      <div class="info-cell"><span>IFSC Code</span><b>${record.ifscCode || "—"}</b></div>
      <div class="info-cell"><span>Email</span><b>${record.email || "—"}</b></div>
    </div>
  </div>

  <div class="att">
    <div class="att-card" style="background:#f1f5f9;color:#475569"><span>Working Days</span><b>${record.calculationDays || "—"}</b></div>
    <div class="att-card" style="background:#eff6ff;color:#1d4ed8"><span>Days Present</span><b>${record.noOfDaysPresent || "—"}</b></div>
    <div class="att-card" style="background:#fef2f2;color:#dc2626"><span>LWP Days</span><b>${r.lwp || "0"}</b></div>
    <div class="att-card" style="background:#f0fdf4;color:#16a34a"><span>Total Actual</span><b>${record.totalActual || "—"}</b></div>
    <div class="att-card" style="background:#faf5ff;color:#7c3aed"><span>Gross Salary</span><b>₹${fmt(totalGross)}</b></div>
  </div>

  <div class="body">
    <div class="cols">
      <div class="card">
        <div class="card-hdr" style="background:#16a34a"><span>+ Earnings</span></div>
        <table>
          <tbody>${earnRows || '<tr><td colspan="2" style="padding:10px;color:#94a3b8;font-size:11px">No earnings data</td></tr>'}</tbody>
          <tfoot><tr style="background:#f0fdf4">
            <td style="color:#15803d">Total Earnings</td>
            <td style="text-align:right;color:#15803d">₹${fmt(totalGross)}</td>
          </tr></tfoot>
        </table>
      </div>
      <div class="card">
        <div class="card-hdr" style="background:#dc2626"><span>− Deductions</span></div>
        <table>
          <tbody>${dedRows || '<tr><td colspan="2" style="padding:10px;color:#94a3b8;font-size:11px">No deductions</td></tr>'}</tbody>
          <tfoot><tr style="background:#fef2f2">
            <td style="color:#dc2626">Total Deductions</td>
            <td style="text-align:right;color:#dc2626">−₹${fmt(totalDeductions)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>

    <div class="net">
      <div class="net-l">
        <span>Net Pay (Take Home)</span>
        <b>₹${fmt(netPay)}</b>
        <p>₹${fmt(totalGross)} Gross − ₹${fmt(totalDeductions)} Deductions</p>
      </div>
      <div class="net-r">💳</div>
    </div>

    <div class="sigs">
      ${["Employee Signature","HR Department","Authorized Signatory"].map(l => `<div class="sig"><div class="sig-line"></div><p>${l}</p></div>`).join("")}
    </div>
  </div>

  <div class="footer">
    <p>This is a system-generated salary slip and does not require a physical signature.</p>
    <p>${record.month} ${record.year}</p>
  </div>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=860,height=700");
    if (!win) {
      // fallback: direct download as HTML file
      const a = document.createElement("a");
      a.href = url;
      a.download = `Salary_Slip_${record.employeeName}_${record.month}_${record.year}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const gross = [
    { label: "Basic Pay", value: parseFloat(record.basic || "0") },
    { label: "House Rent Allowance (HRA)", value: parseFloat(record.hra || "0") },
    { label: "Conveyance Allowance", value: parseFloat(record.conveyance || "0") },
    { label: "Medical Allowance", value: parseFloat(record.medicalAllowance || "0") },
    { label: "Special Allowance", value: parseFloat(record.specialAllowance || "0") },
    { label: "Other Allowances", value: parseFloat(record.otherAllowances || "0") },
    { label: "Overtime / Additional Pay", value: parseFloat(r.addAmount || "0") },
  ].filter(e => e.value > 0);

  const deductions = [
    { label: "Provident Fund – Employee (12%)", value: parseFloat(record.employeeContri12 || "0") },
    { label: "ESIC – Employee (0.75%)", value: parseFloat(record.employeeESIC075 || "0") },
    { label: "Advance Salary Recovery", value: parseFloat(r.advanceSalary || "0") },
    { label: "PF Loan Recovery", value: parseFloat(r.pfLoanRecovery || "0") },
  ].filter(d => d.value > 0);

  const totalGross = gross.reduce((s, e) => s + e.value, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.value, 0);
  const netPay = parseFloat(record.payment || "0") || (totalGross - totalDeductions);

  const fmt = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const InfoCell: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div className="min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className="text-[11px] font-bold text-slate-800 truncate">{value || "—"}</p>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#salary-slip-portal) { display: none !important; }
          #salary-slip-portal { position: fixed; inset: 0; z-index: 9999; background: white; }
          .print\\:hidden { display: none !important; }
          .slip-page { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div id="salary-slip-portal" className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
        {/* Action Buttons */}
        <div className="print:hidden fixed top-4 right-4 z-[120] flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-300"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-300"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white text-slate-500 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 flex items-center justify-center shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slip Paper */}
        <div className="slip-page bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-16 sm:my-8 border border-slate-200">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                <img src={logoBase64} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight leading-none">{record.company || "Company Name"}</h1>
                <p className="text-blue-200 text-xs font-medium mt-0.5">{record.location || ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Salary Pay Slip</p>
              <p className="text-2xl font-black text-white mt-0.5">{record.month} {record.year}</p>
              <p className="text-[10px] text-blue-200 mt-0.5">Generated: {format(new Date(), "dd MMM yyyy")}</p>
            </div>
          </div>

          {/* ── Employee Info ── */}
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-black text-base shrink-0">
                {(record.employeeName || "E").charAt(0)}
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{record.employeeName}</p>
                <p className="text-xs text-slate-500">{record.designation}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</p>
                <p className="text-sm font-black text-blue-600">{record.employeeCode}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <InfoCell label="Date of Joining" value={record.joiningDate} />
              <InfoCell label="Payment Mode" value={record.mode} />
              <InfoCell label="UAN Number" value={record.uan} />
              <InfoCell label="ESIC ID" value={record.insuranceId} />
              <InfoCell label="Bank Name" value={record.bankName} />
              <InfoCell label="Account Number" value={record.bankAccountNumber} />
              <InfoCell label="IFSC Code" value={record.ifscCode} />
              <InfoCell label="Email" value={record.email} />
            </div>
          </div>

          {/* ── Attendance Summary ── */}
          <div className="px-8 py-4 border-b border-slate-100 bg-white">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: "Working Days", value: record.calculationDays, color: "bg-slate-100 text-slate-700" },
                { label: "Days Present", value: record.noOfDaysPresent, color: "bg-blue-50 text-blue-700" },
                { label: "LWP Days", value: r.lwp || "0", color: "bg-red-50 text-red-700" },
                { label: "Total Actual", value: record.totalActual, color: "bg-emerald-50 text-emerald-700" },
                { label: "Gross Salary", value: `₹${fmt(totalGross)}`, color: "bg-purple-50 text-purple-700" },
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-xl px-3 py-2.5 text-center`}>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">{s.label}</p>
                  <p className="text-sm font-black">{s.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Earnings & Deductions ── */}
          <div className="px-8 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Earnings */}
              <div className="rounded-2xl border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">+</span>
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Earnings</p>
                </div>
                <div className="bg-white divide-y divide-slate-50">
                  {gross.map(e => (
                    <div key={e.label} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[11px] text-slate-600 font-medium">{e.label}</span>
                      <span className="text-[11px] font-black text-slate-800">₹{fmt(e.value)}</span>
                    </div>
                  ))}
                  {gross.length === 0 && (
                    <p className="px-4 py-3 text-[11px] text-slate-400 italic">No earnings data</p>
                  )}
                </div>
                <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3 flex justify-between items-center">
                  <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Total Earnings</span>
                  <span className="text-sm font-black text-emerald-700">₹{fmt(totalGross)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-2xl border border-red-100 overflow-hidden">
                <div className="bg-red-500 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">−</span>
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Deductions</p>
                </div>
                <div className="bg-white divide-y divide-slate-50">
                  {deductions.map(d => (
                    <div key={d.label} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[11px] text-slate-600 font-medium">{d.label}</span>
                      <span className="text-[11px] font-black text-red-600">−₹{fmt(d.value)}</span>
                    </div>
                  ))}
                  {deductions.length === 0 && (
                    <p className="px-4 py-3 text-[11px] text-slate-400 italic">No deductions</p>
                  )}
                </div>
                <div className="bg-red-50 border-t border-red-100 px-4 py-3 flex justify-between items-center">
                  <span className="text-[11px] font-black text-red-600 uppercase tracking-wider">Total Deductions</span>
                  <span className="text-sm font-black text-red-600">−₹{fmt(totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* PF & ESIC Detail Table */}
            <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-700 px-4 py-2.5">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">PF &amp; ESIC Details</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                {/* Employee side */}
                <div>
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee Contributions</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">PF (Employee 12%)</span>
                      <span className="text-[11px] font-black text-red-600">₹{fmt(parseFloat(record.employeeContri12 || "0"))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">ESIC (Employee 0.75%)</span>
                      <span className="text-[11px] font-black text-red-600">₹{fmt(parseFloat(record.employeeESIC075 || "0"))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 bg-orange-50">
                      <span className="text-[11px] font-black text-orange-700">To Be Paid After PF</span>
                      <span className="text-[12px] font-black text-orange-700">₹{fmt(parseFloat(record.toBePaidAfterPF || "0"))}</span>
                    </div>
                  </div>
                </div>
                {/* Employer side */}
                <div>
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employer Contributions</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">EPF Pension (8.33%)</span>
                      <span className="text-[11px] font-black text-blue-600">₹{fmt(parseFloat(record.employerContri833 || "0"))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">EPF (3.67%)</span>
                      <span className="text-[11px] font-black text-blue-600">₹{fmt(parseFloat(record.employerContri367 || "0"))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">ESIC (Employer 3.25%)</span>
                      <span className="text-[11px] font-black text-blue-600">₹{fmt(parseFloat(record.employerESIC325 || "0"))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[11px] text-slate-500">Admin Expense (1.1%)</span>
                      <span className="text-[11px] font-black text-blue-600">₹{fmt(parseFloat(record.adminExp11 || "0"))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Net Pay Banner ── */}
          <div className="mx-8 mb-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
            {/* To Be Paid After PF highlight row */}
            {record.toBePaidAfterPF && (
              <div className="bg-orange-500/20 border-b border-orange-400/20 px-6 py-3 flex items-center justify-between">
                <p className="text-[11px] font-black text-orange-300 uppercase tracking-widest">To Be Paid After PF Deduction</p>
                <p className="text-lg font-black text-orange-300">₹{fmt(parseFloat(record.toBePaidAfterPF || "0"))}</p>
              </div>
            )}
            <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Pay (Take Home)</p>
                <p className="text-4xl font-black text-white">₹{fmt(netPay)}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  ₹{fmt(totalGross)} Gross − ₹{fmt(totalDeductions)} Deductions
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto sm:ml-auto sm:mr-0">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Mode: {record.mode || "—"}</p>
              </div>
            </div>
          </div>

          {/* ── Signatures ── */}
          <div className="px-8 pb-6 grid grid-cols-3 gap-4">
            {["Employee Signature", "HR Department", "Authorized Signatory"].map(label => (
              <div key={label} className="text-center">
                <div className="h-10 border-b border-dashed border-slate-300 mb-2" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="bg-slate-50 border-t border-slate-100 px-8 py-3 flex items-center justify-between">
            <p className="text-[9px] text-slate-400 font-medium">This is a system-generated salary slip and does not require a physical signature.</p>
            <p className="text-[9px] text-slate-400 font-bold shrink-0 ml-4">{record.month} {record.year}</p>
          </div>
        </div>
      </div>
    </>
  );
};
