import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { LeaveFms } from "../types";
import { Plus, Search, CheckCircle, Clock, AlertCircle, Loader2, Calendar, User, Building2, FileText, X, Image, Upload } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

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

export const LeaveModule: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LeaveFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    company: user?.companyName || "",
    typeOfLeave: "CL",
    reasonForRequestedLeave: "",
    dateRequestedFrom: format(new Date(), "yyyy-MM-dd"),
    dateRequestedTo: format(new Date(), "yyyy-MM-dd"),
    noOfDays: 1,
    medicalCertificate: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getLeaves(user?.role === "Admin" ? undefined : user?.employeeId);
      setData((result || []).filter(d => d.timestamp && d.leaveNo));

    } catch (error) {
      console.error("Error fetching leave data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.dateRequestedFrom && formData.dateRequestedTo) {
      const from = new Date(formData.dateRequestedFrom);
      const to = new Date(formData.dateRequestedTo);

      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        const diffTime = to.getTime() - from.getTime();
        const diffDays = (diffTime / (1000 * 60 * 60 * 24)) + 1;

        // If difference is more than 1 day, auto-calculate and update
        if (diffDays > 1) {
          setFormData(prev => ({ ...prev, noOfDays: diffDays }));
        } else if (diffDays === 1) {
          // If same date, default to 1 but allow manual change
          setFormData(prev => ({ ...prev, noOfDays: 1 }));
        }
      }
    }
  }, [formData.dateRequestedFrom, formData.dateRequestedTo]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, medicalCertificate: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await api.submitLeave({
        ...formData,
        employeeIdCode: user?.employeeId,
        nameOfEmployee: user?.name,
        timestamp: format(new Date(), "M/d/yyyy H:mm:ss"),
        folderId: "1d45zekLBdo-BcLp2-1fqmDOEZ1ZM-hXx"
      } as any);

      if (success) {
        setIsFormOpen(false);
        setFormData({
          company: user?.companyName || "",
          typeOfLeave: "CL",
          reasonForRequestedLeave: "",
          dateRequestedFrom: format(new Date(), "yyyy-MM-dd"),
          dateRequestedTo: format(new Date(), "yyyy-MM-dd"),
          noOfDays: 1,
          medicalCertificate: ""
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting leave:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStep = async (rowId: string, step: number) => {
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Leave Fms", rowId, step, actualTime);
      if (success) {
        fetchData();
      }
    } catch (error) {
      console.error("Error updating step:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => data.filter(item =>
    (item.nameOfEmployee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeIdCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.leaveNo?.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [data, searchTerm]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or Leave No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Apply for Leave
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #2563eb" }}>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Applied</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #6366f1" }}>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-medium mb-1">Leave Balances</p>
            <div className="flex gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">CL</span>
                <span className="text-sm font-bold text-slate-900">{user?.cl || 0}</span>
              </div>
              <div className="border-r border-slate-100" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">EL</span>
                <span className="text-sm font-bold text-slate-900">{user?.el || 0}</span>
              </div>
              <div className="border-r border-slate-100" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">ML</span>
                <span className="text-sm font-bold text-slate-900">{user?.ml || 0}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #d97706" }}>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.filter(d => d.status1 === "Pending" || d.status2 === "Pending").length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #059669" }}>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Approved</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.filter(d => d.status1 === "Work Done" && d.status2 === "Work Done").length}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "520px" }}>
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4ff)", borderBottom: "2px solid #e2e8f0" }}>
              <tr>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Leave No</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Type</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Company</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date Range</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Medical Cert</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">HOD Status</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">HR Status</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading data...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr
                    key={idx}
                    className={cn("transition-colors hover:bg-blue-50/40", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {item.timestamp ? format(new Date(item.timestamp), "dd/MM/yy HH:mm") : "-"}
                    </td>
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
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{item.reasonForRequestedLeave}</td>
                    {/* Date range cell */}
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
                          <div
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors shadow-sm"
                            onClick={() => window.open(item.medicalCertificate, '_blank')}
                          >
                            {item.medicalCertificate.startsWith('data:image') ? (
                              <img src={item.medicalCertificate} alt="Cert" className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status1} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status2} />
                    </td>
                    <td className="px-4 py-3">
                      {user?.role === "Admin" && (
                        <div className="flex gap-2">
                          {item.status1 === "Pending" && (
                            <button
                              onClick={() => handleUpdateStep(item.leaveNo, 1)}
                              className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                              style={{ background: "#059669" }}
                            >
                              ✓ HOD OK
                            </button>
                          )}
                          {item.status1 === "Work Done" && item.status2 === "Pending" && (
                            <button
                              onClick={() => handleUpdateStep(item.leaveNo, 2)}
                              className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                              style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                            >
                              ✓ HR OK
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type Of Leave</label>
                  <select
                    value={formData.typeOfLeave}
                    onChange={(e) => setFormData({ ...formData, typeOfLeave: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    required
                  >
                    <option value="CL">CL (Casual Leave)</option>
                    <option value="EL">EL (Earned Leave)</option>
                    <option value="ML">ML (Medical Leave)</option>
                    <option value="UL">UL (Unpaid Leave)</option>
                  </select>
                </div>
              </div>
              {formData.typeOfLeave === "ML" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medical Certificate</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="medical-cert-upload"
                      required
                    />
                    <label
                      htmlFor="medical-cert-upload"
                      className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                    >
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600 truncate">
                        {formData.medicalCertificate ? "Certificate Selected" : "Upload Medical Certificate"}
                      </span>
                    </label>
                  </div>
                  {formData.medicalCertificate && (
                    <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 relative group">
                      <img src={formData.medicalCertificate} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, medicalCertificate: ""})}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={formData.dateRequestedFrom}
                    onChange={(e) => setFormData({ ...formData, dateRequestedFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={formData.dateRequestedTo}
                    onChange={(e) => setFormData({ ...formData, dateRequestedTo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.noOfDays}
                  onChange={(e) => setFormData({ ...formData, noOfDays: parseFloat(e.target.value) })}
                  readOnly={formData.dateRequestedFrom !== formData.dateRequestedTo}
                  className={cn(
                    "w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
                    formData.dateRequestedFrom !== formData.dateRequestedTo ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50 text-slate-900"
                  )}
                  required
                />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Leave</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={formData.reasonForRequestedLeave}
                    onChange={(e) => setFormData({ ...formData, reasonForRequestedLeave: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    placeholder="Explain why you need leave..."
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
