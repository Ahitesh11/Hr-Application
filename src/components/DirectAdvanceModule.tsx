import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { DirectAdvanceFms } from "../types";
import { Plus, Search, Loader2, Wallet, ChevronDown, X, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

const StatusBadge = ({ status }: { status?: string }) => {
  const s = status || "Pending";
  const cfg =
    s === "Payment Done" || s === "Approved" ? { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", label: s } :
    s === "Rejected"                          ? { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "✗ Rejected" } :
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

type TabId = "approval" | "payment" | "history";

export const DirectAdvanceModule: React.FC = () => {
  const { user, actingAs } = useAuth();
  const [data, setData] = useState<DirectAdvanceFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("approval");

  const [step1ModalOpen, setStep1ModalOpen] = useState(false);
  const [step2ModalOpen, setStep2ModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | undefined>(undefined);

  const [formData, setFormData] = useState({
    employeeId: "",
    personName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    paymentType: "Cash",
    notes: "",
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [step1Data, setStep1Data] = useState({ status: "Approved" });
  const [step2Data, setStep2Data] = useState({ status: "Payment Done" });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getDirectAdvances(user?.role === "Admin" || user?.role === "HOD" ? undefined : user?.employeeId);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching direct advances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const fetchEmployees = async () => {
      setIsEmployeesLoading(true);
      try {
        const emps = await api.getPresentEmployees();
        setEmployees(emps);
      } catch (error) {
        console.error("Failed to fetch employees", error);
      } finally {
        setIsEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, [user]);

  const handleEmpIdChange = (empId: string) => {
    const emp = employees.find(e =>
      (e.employeeId || e.pmmplAc || e.employeeCode)?.toString().trim() === empId.trim()
    );
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: empId,
        personName: emp.employeeName || emp.nameAsPerAadhar || emp.name || "",
      }));
    } else {
      setFormData(prev => ({ ...prev, employeeId: empId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const empId = formData.employeeId || actingAs?.employeeId || user?.employeeId || "";
      const personName = formData.personName || actingAs?.name || user?.name || "";

      const payload: Partial<DirectAdvanceFms> = {
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        employeeId: empId,
        personName,
        date: formData.date,
        amount: formData.amount,
        paymentType: formData.paymentType,
        notes: formData.notes,
      };

      const success = await api.submitDirectAdvance(payload);

      if (success) {
        setIsFormOpen(false);
        setFormData({
          employeeId: "",
          personName: "",
          date: format(new Date(), "yyyy-MM-dd"),
          amount: "",
          paymentType: "Cash",
          notes: "",
        });
        setEmpSearch("");
        fetchData();
        alert("Data saved successfully!");
      } else {
        alert("Failed to save data.");
      }
    } catch (error) {
      console.error("Error submitting direct advance:", error);
      alert("An error occurred during submission.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Direct Advance", selectedRowId, 1, actualTime, step1Data.status, undefined, selectedRowIndex);
      if (success) {
        setStep1ModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating step 1:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Direct Advance", selectedRowId, 2, actualTime, step2Data.status, undefined, selectedRowIndex);
      if (success) {
        setStep2ModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating step 2:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.personName?.toLowerCase().includes(term) ||
                            item.employeeId?.toLowerCase().includes(term) ||
                            item.daNumber?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (activeTab === "approval") return item.planned1 && !item.actual1;
      if (activeTab === "payment") return item.planned2 && item.actual1 && !item.actual2;
      if (activeTab === "history") return !!item.actual2;
      return true;
    });
  }, [data, searchTerm, activeTab]);

  const getTabCount = (tab: TabId) => {
    return data.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.personName?.toLowerCase().includes(term) ||
                            item.employeeId?.toLowerCase().includes(term) ||
                            item.daNumber?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (tab === "approval") return item.planned1 && !item.actual1;
      if (tab === "payment") return item.planned2 && item.actual1 && !item.actual2;
      if (tab === "history") return !!item.actual2;
      return false;
    }).length;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 pt-5 shrink-0 z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Direct Advance</h1>
              <p className="text-sm font-medium text-slate-500">Manage employee direct advance requests and payments</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New Advance
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search DA No, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-pink-500 transition-all"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh"
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("approval")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "approval" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
          Mgmt Approval
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "approval" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("approval")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "payment" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Tally Entry
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "payment" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("payment")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "history" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            History
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "history" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500")}>
              {getTabCount("history")}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
              <p className="text-slate-500 font-medium">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <p className="text-slate-800 font-bold text-lg">No advances found in this step.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Timestamp</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">DA Number</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Employee ID</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Person Name</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Date</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Amount</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Payment Type</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Notes</th>

                    {activeTab === "approval" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-amber-50/30">Planned 1</th>}

                    {(activeTab === "payment" || activeTab === "history") && (
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-blue-50/50">Status 1</th>
                    )}

                    {activeTab === "payment" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-amber-50/30">Planned 2</th>}

                    {activeTab === "history" && (
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-emerald-50/30">Status 2</th>
                    )}

                    {activeTab !== "history" && <th className="px-4 py-3 text-[11px] font-bold text-slate-800 uppercase border-b bg-slate-100 text-center sticky right-0">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap text-sm text-slate-700">
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="px-4 py-3 border-r border-slate-100">{item.timestamp}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold">{item.daNumber}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.employeeId}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium">{item.personName}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.date}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-pink-600">{item.amount}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.paymentType}</td>
                      <td className="px-4 py-3 border-r border-slate-100 max-w-[200px] truncate" title={item.notes}>{item.notes}</td>

                      {activeTab === "approval" && <td className="px-4 py-3 border-r border-slate-100 text-amber-600 font-medium">{item.planned1}</td>}

                      {(activeTab === "payment" || activeTab === "history") && (
                        <td className="px-4 py-3 border-r border-slate-100"><StatusBadge status={item.status1} /></td>
                      )}

                      {activeTab === "payment" && <td className="px-4 py-3 border-r border-slate-100 text-amber-600 font-medium">{item.planned2}</td>}

                      {activeTab === "history" && (
                        <td className="px-4 py-3 border-r border-slate-100"><StatusBadge status={item.status2} /></td>
                      )}

                      {/* Action Button */}
                      {activeTab !== "history" && (
                        <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.03)]">
                          {activeTab === "approval" && (user?.role === "Admin" || user?.role === "HOD") && (
                            <button onClick={() => { setSelectedRowId(item.daNumber || ""); setSelectedRowIndex(item._row); setStep1ModalOpen(true); }} className="px-3 py-1.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg hover:bg-pink-200">
                              Approve
                            </button>
                          )}
                          {activeTab === "payment" && (user?.role === "Admin") && (
                            <button onClick={() => { setSelectedRowId(item.daNumber || ""); setSelectedRowIndex(item._row); setStep2ModalOpen(true); }} className="px-3 py-1.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg hover:bg-pink-200">
                              Update
                            </button>
                          )}
                          {(!["Admin", "HOD"].includes(user?.role || "")) && (
                            <span className="text-[10px] text-slate-400">No Action</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Advance Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">New Direct Advance</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee Id</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none pr-10"
                      placeholder="Search ID or Name..."
                      required
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

                    {isDropdownOpen && (
                      <div className="absolute z-[110] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {isEmployeesLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading employees...
                          </div>
                        ) : (() => {
                          const matches = employees.filter(emp => {
                            const id = (emp.employeeId || emp.pmmplAc || emp.employeeCode)?.toString().trim() || "";
                            const name = (emp.employeeName || emp.nameAsPerAadhar || emp.name)?.toString().toLowerCase() || "";
                            const s = empSearch.toLowerCase();
                            return id.toLowerCase().includes(s) || name.includes(s);
                          });
                          if (matches.length === 0) {
                            return <div className="px-4 py-3 text-sm text-slate-400">No employees found</div>;
                          }
                          return matches.map((emp, i) => {
                            const id = (emp.employeeId || emp.pmmplAc || emp.employeeCode)?.toString().trim();
                            if (!id) return null;
                            return (
                              <div
                                key={i}
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-pink-50 cursor-pointer border-b border-slate-50 last:border-none"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEmpSearch(`${id} - ${emp.employeeName || emp.nameAsPerAadhar || emp.name}`);
                                  setIsDropdownOpen(false);
                                  handleEmpIdChange(id);
                                }}
                              >
                                <span className="font-bold text-slate-900">{id}</span> - {emp.employeeName || emp.nameAsPerAadhar || emp.name}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Person Name</label>
                  <input
                    type="text"
                    value={formData.personName}
                    onChange={(e) => setFormData({...formData, personName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none appearance-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none min-h-[100px]"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-2.5 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition-all flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 1 Modal (Approval) */}
      {step1ModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Get Approval</h3>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={step1Data.status}
                  onChange={(e) => setStep1Data({...step1Data, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep1ModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-2 bg-pink-600 text-white font-semibold rounded-lg flex justify-center">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2 Modal (Payment) */}
      {step2ModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Get Tally Entry</h3>
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Update Status</label>
                <select
                  value={step2Data.status}
                  onChange={(e) => setStep2Data({...step2Data, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Payment Done">Mark as Done</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep2ModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-pink-600 text-white font-semibold rounded-lg flex justify-center hover:bg-pink-700 transition-colors">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
