import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { PunchMissFms } from "../types";
import { Plus, Search, Filter, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
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

export const PunchMissModule: React.FC = () => {
  const { user, actingAs } = useAuth();
  const [data, setData] = useState<PunchMissFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    inOut: "In",
    date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    punchMissTime: "",
    ampm: "AM",
    image: ""
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isTesting, setIsTesting] = useState(false);
  const gasUrlMissing = !import.meta.env.VITE_GAS_WEB_APP_URL;

  const testConnection = async () => {
    if (gasUrlMissing) {
      alert("Error: VITE_GAS_WEB_APP_URL is not set in the Secrets menu.");
      return;
    }
    setIsTesting(true);
    try {
      const res = await api.testConnection();
      if (res && res.success) {
        alert("Connection Successful! Found sheets: " + res.sheets.join(", "));
      } else {
        alert("Connection Failed: " + (res?.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error testing connection: " + err);
    } finally {
      setIsTesting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getPunchMiss(user?.role === "Admin" ? undefined : user?.employeeId);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching punch miss data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Mapping fields exactly as requested for the Sheet
      const payload = {
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        pmNo: "", // GAS will generate this
        inOut: formData.inOut,
        date: formData.date,
        employeeId: actingAs?.employeeId || user?.employeeId,
        name: actingAs?.name || user?.name,
        punchMissTime: formData.punchMissTime ? `${formData.punchMissTime} ${formData.ampm}` : "",
        image: formData.image
      };

      const success = await api.submitPunchMiss(payload as any);

      if (success) {
        setIsFormOpen(false);
        setFormData({
          inOut: "In",
          date: format(new Date(), "yyyy-MM-dd"),
          reason: "",
          punchMissTime: "",
          ampm: "AM",
          image: ""
        });
        fetchData();
        alert("Data saved successfully!");
      } else {
        alert("Failed to save data. Please check your GAS URL and permissions.");
      }
    } catch (error) {
      console.error("Error submitting punch miss:", error);
      alert("An error occurred during submission.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStep = async (rowId: string) => {
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Punch Miss Fms", rowId, 1, actualTime);
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
    (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.pmNo?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    item.status !== "Work Done" &&
    item.planned && item.planned.trim() !== ""
  ), [data, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID or PM No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={testConnection}
            disabled={isTesting}
            title="Test Google Sheets Connection"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 flex items-center gap-2 whitespace-nowrap"
          >
            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
            <span className="hidden sm:inline text-sm font-medium">Test Connection</span>
          </button>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          New Punch Miss
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #2563eb" }}>
          <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Requests</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #d97706" }}>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.filter(d => d.status === "Pending").length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
          style={{ borderTop: "3px solid #059669" }}>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Work Done</p>
            <p className="text-3xl font-extrabold text-slate-900">{data.filter(d => d.status === "Work Done").length}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "520px" }}>
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">PM No</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">In/Out</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Reason</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Time</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Image</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Planned</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
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
                    className={cn("transition-colors hover:bg-pink-50/40 transition-colors duration-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.timestamp}</td>
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
                        <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                          {(item.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{item.reason}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.punchMissTime}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {item.image ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            <img
                              src={item.image}
                              alt="Punch Miss"
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => window.open(item.image, '_blank')}
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No image</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.planned}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "Pending" && user?.role === "Admin" && (
                        <button
                          onClick={() => handleUpdateStep(item.pmNo)}
                          className="px-3 py-1.5 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95"
                          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">New Punch Miss Request</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.inOut}
                    onChange={(e) => setFormData({...formData, inOut: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    <option value="In">In</option>
                    <option value="Out">Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Punch Miss Time</label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={formData.punchMissTime}
                    onChange={(e) => setFormData({...formData, punchMissTime: e.target.value})}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, ampm: "AM"})}
                      className={`px-4 py-2 text-sm font-bold transition-colors ${formData.ampm === "AM" ? "bg-pink-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, ampm: "PM"})}
                      className={`px-4 py-2 text-sm font-bold transition-colors ${formData.ampm === "PM" ? "bg-pink-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none min-h-[100px]"
                  placeholder="Explain the reason for missing punch..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
                {formData.image && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
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
                  className="flex-1 py-2.5 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
