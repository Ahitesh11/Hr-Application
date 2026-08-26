import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { LoanApplicationFms } from "../types";
import { Plus, Search, Loader2, Banknote, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

const StatusBadge = ({ status, step }: { status?: string, step: number }) => {
  const s = status || "Pending";
  const cfg =
    s === "Work Done" || s === "Payment Done" || s === "Tally Done" ? { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", label: s } :
    s === "Rejected"     ? { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "✗ Rejected" } :
    s.includes("Approved") ? { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: s } :
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

type TabId = "mgmt-approval" | "make-payment" | "tally-entry" | "history";

export const LoanApplicationModule: React.FC = () => {
  const { user, actingAs } = useAuth();
  const [data, setData] = useState<LoanApplicationFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("mgmt-approval");

  // Modals for steps
  const [step1ModalOpen, setStep1ModalOpen] = useState(false);
  const [step2ModalOpen, setStep2ModalOpen] = useState(false);
  const [step3ModalOpen, setStep3ModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | undefined>(undefined);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    designation: "",
    companyName: "",
    workLocation: "",
    requestAmount: "",
    monthlyDeductionAmount: "",
    reason: "",
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Step 1 State
  const [step1Data, setStep1Data] = useState({
    approvedAmount: "",
    status: "Mgmt Approved"
  });

  // Step 2 State
  const [step2Data, setStep2Data] = useState({
    status: "Payment Done"
  });

  // Step 3 State
  const [step3Data, setStep3Data] = useState({
    status: "Work Done"
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getLoanApplications(user?.role === "Admin" || user?.role === "HOD" ? undefined : user?.employeeId);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching loan applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const fetchEmployees = async () => {
      try {
        const emps = await api.getPresentEmployees();
        setEmployees(emps);
      } catch (error) {
        console.error("Failed to fetch employees", error);
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
        employeeName: emp.employeeName || emp.nameAsPerAadhar || emp.name || "",
        designation: emp.designation || "",
        companyName: emp.companyName || emp.joiningCompanyName || "",
        workLocation: emp.location || emp.plantLocation || prev.workLocation
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
      const empName = formData.employeeName || actingAs?.name || user?.name || "";
      const compName = formData.companyName || actingAs?.companyName || user?.companyName || "";
      const desg = formData.designation || user?.designation || "";
      
      const payload: Partial<LoanApplicationFms> = {
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        employeeId: empId,
        employeeName: empName,
        designation: desg,
        companyName: compName,
        workLocation: formData.workLocation,
        requestAmount: formData.requestAmount,
        monthlyDeductionAmount: formData.monthlyDeductionAmount,
        reason: formData.reason,
      };

      const success = await api.submitLoanApplication(payload);

      if (success) {
        setIsFormOpen(false);
        setFormData({
          employeeId: "",
          employeeName: "",
          designation: "",
          companyName: "",
          workLocation: "",
          requestAmount: "",
          monthlyDeductionAmount: "",
          reason: "",
        });
        setEmpSearch("");
        fetchData();
        alert("Data saved successfully!");
      } else {
        alert("Failed to save data.");
      }
    } catch (error) {
      console.error("Error submitting loan application:", error);
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
      const extraFields = { approvedAmount: step1Data.approvedAmount };
      const success = await api.updateStep("Loan Application", selectedRowId, 1, actualTime, step1Data.status, extraFields, selectedRowIndex);
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
      const success = await api.updateStep("Loan Application", selectedRowId, 2, actualTime, step2Data.status, undefined, selectedRowIndex);
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

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Loan Application", selectedRowId, 3, actualTime, step3Data.status, undefined, selectedRowIndex);
      if (success) {
        setStep3ModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating step 3:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.employeeName?.toLowerCase().includes(term) ||
                            item.employeeId?.toLowerCase().includes(term) ||
                            item.loanNo?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (activeTab === "mgmt-approval") return item.planned1 && !item.actual1;
      if (activeTab === "make-payment") return item.planned2 && item.actual1 && !item.actual2;
      if (activeTab === "tally-entry") return item.planned3 && item.actual2 && !item.actual3;
      if (activeTab === "history") return !!item.actual3;
      return true;
    });
  }, [data, searchTerm, activeTab]);

  const getTabCount = (tab: TabId) => {
    return data.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = item.employeeName?.toLowerCase().includes(term) ||
                            item.employeeId?.toLowerCase().includes(term) ||
                            item.loanNo?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (tab === "mgmt-approval") return item.planned1 && !item.actual1;
      if (tab === "make-payment") return item.planned2 && item.actual1 && !item.actual2;
      if (tab === "tally-entry") return item.planned3 && item.actual2 && !item.actual3;
      if (tab === "history") return !!item.actual3;
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
              <Banknote className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Loan Applications</h1>
              <p className="text-sm font-medium text-slate-500">Manage employee loan requests and approvals</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              New Application
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Loan No, Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-pink-500 transition-all"
              />
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 mt-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("mgmt-approval")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "mgmt-approval" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Mgmt Approval
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "mgmt-approval" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("mgmt-approval")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("make-payment")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "make-payment" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Make Payment
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "make-payment" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("make-payment")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tally-entry")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap", activeTab === "tally-entry" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Tally Entry
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "tally-entry" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("tally-entry")}
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
              <p className="text-slate-800 font-bold text-lg">No applications found in this step.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                  <tr>
                    {activeTab === "tally-entry" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Timestamp</th>}
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Loan No.</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Employee Id</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Employee Name</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Designation</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Work Location</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Request Amount</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Monthly Deduction</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Reason</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100">Company Name</th>
                    
                    {activeTab === "mgmt-approval" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-amber-50/30">Planned 1</th>}
                    
                    {(activeTab === "make-payment" || activeTab === "tally-entry" || activeTab === "history") && (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-blue-50/50">Status 1</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-blue-50/50">Approved Amount</th>
                      </>
                    )}
                    
                    {activeTab === "make-payment" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-amber-50/30">Planned 2</th>}
                    {activeTab === "tally-entry" && <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-amber-50/30">Planned 3</th>}
                    
                    {activeTab === "history" && (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-pink-50/30">Payment Form</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase border-b border-r border-slate-100 bg-emerald-50/30">Status 2</th>
                      </>
                    )}

                    {activeTab !== "history" && <th className="px-4 py-3 text-[11px] font-bold text-slate-800 uppercase border-b bg-slate-100 text-center sticky right-0">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap text-sm text-slate-700">
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-200">
                      {activeTab === "tally-entry" && <td className="px-4 py-3 border-r border-slate-100">{item.timestamp}</td>}
                      <td className="px-4 py-3 border-r border-slate-100 font-bold">{item.loanNo}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.employeeId}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium">{item.employeeName}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.designation}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.workLocation}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-pink-600">{item.requestAmount}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.monthlyDeductionAmount}</td>
                      <td className="px-4 py-3 border-r border-slate-100 max-w-[200px] truncate" title={item.reason}>{item.reason}</td>
                      <td className="px-4 py-3 border-r border-slate-100">{item.companyName}</td>
                      
                      {activeTab === "mgmt-approval" && <td className="px-4 py-3 border-r border-slate-100 text-amber-600 font-medium">{item.planned1}</td>}
                      
                      {(activeTab === "make-payment" || activeTab === "tally-entry" || activeTab === "history") && (
                        <>
                          <td className="px-4 py-3 border-r border-slate-100"><StatusBadge status={item.status1} step={1} /></td>
                          <td className="px-4 py-3 border-r border-slate-100 text-green-600 font-bold">{item.approvedAmount}</td>
                        </>
                      )}
                      
                      {activeTab === "make-payment" && <td className="px-4 py-3 border-r border-slate-100 text-amber-600 font-medium">{item.planned2}</td>}
                      {activeTab === "tally-entry" && <td className="px-4 py-3 border-r border-slate-100 text-amber-600 font-medium">{item.planned3}</td>}
                      
                      {activeTab === "history" && (
                        <>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {item.paymentForm?.startsWith('http') || item.paymentForm?.startsWith('data:image') ? (
                              <a href={item.paymentForm} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">View Document</a>
                            ) : (
                              <span className="truncate max-w-[150px]" title={item.paymentForm}>{item.paymentForm}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100"><StatusBadge status={item.status2} step={3} /></td>
                        </>
                      )}

                      {/* Action Button */}
                      {activeTab !== "history" && (
                        <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.03)]">
                          {activeTab === "mgmt-approval" && (user?.role === "Admin" || user?.role === "HOD") && (
                            <button onClick={() => { setSelectedRowId(item.loanNo || ""); setSelectedRowIndex(item._row); setStep1ModalOpen(true); }} className="px-3 py-1.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg hover:bg-pink-200">
                              Approve
                            </button>
                          )}
                          {activeTab === "make-payment" && (user?.role === "Admin") && (
                            <button onClick={() => { setSelectedRowId(item.loanNo || ""); setSelectedRowIndex(item._row); setStep2ModalOpen(true); }} className="px-3 py-1.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg hover:bg-pink-200">
                              Make Payment
                            </button>
                          )}
                          {activeTab === "tally-entry" && (user?.role === "Admin") && (
                            <button onClick={() => { setSelectedRowId(item.loanNo || ""); setSelectedRowIndex(item._row); setStep3ModalOpen(true); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-200">
                              Update Tally
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

      {/* New Application Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">New Loan Application</h3>
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
                        {employees
                          .filter(emp => {
                            const id = (emp.employeeId || emp.pmmplAc || emp.employeeCode)?.toString().trim() || "";
                            const name = (emp.employeeName || emp.nameAsPerAadhar || emp.name)?.toString().toLowerCase() || "";
                            const s = empSearch.toLowerCase();
                            return id.toLowerCase().includes(s) || name.includes(s);
                          })
                          .map((emp, i) => {
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
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({...formData, employeeName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Location</label>
                <input
                  type="text"
                  value={formData.workLocation}
                  onChange={(e) => setFormData({...formData, workLocation: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Request Amount</label>
                  <input
                    type="number"
                    value={formData.requestAmount}
                    onChange={(e) => setFormData({...formData, requestAmount: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Deduction</label>
                  <input
                    type="number"
                    value={formData.monthlyDeductionAmount}
                    onChange={(e) => setFormData({...formData, monthlyDeductionAmount: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none min-h-[100px]"
                  required
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

      {/* Step 1 Modal (Mgmt Approval) */}
      {step1ModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Mgmt Approval</h3>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Approved Amount</label>
                <input
                  type="number"
                  value={step1Data.approvedAmount}
                  onChange={(e) => setStep1Data({...step1Data, approvedAmount: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={step1Data.status}
                  onChange={(e) => setStep1Data({...step1Data, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Mgmt Approved">Approve</option>
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

      {/* Step 2 Modal (Make Payment) */}
      {step2ModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden p-6 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Make Payment</h3>
            {(() => {
              const item = data.find(d => d.loanNo === selectedRowId);
              const url = item?.paymentForm || "";
              if (url.startsWith("http")) {
                 return (
                   <div className="w-full h-[380px] mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                     <iframe src={url.includes('?') ? url + '&embedded=true' : url + '?embedded=true'} className="w-full h-full" frameBorder="0" marginHeight={0} marginWidth={0}>Loading...</iframe>
                   </div>
                 );
              }
              return (
                 <div className="bg-amber-50 p-4 rounded-xl text-amber-700 text-sm mb-4 border border-amber-200">
                   <strong>No valid Google Form link available.</strong><br/>
                   The "Payment Form" cell for this application does not contain a valid URL ({url}).
                 </div>
              );
            })()}
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Update Status in HR App</label>
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3 Modal (Tally Entry) */}
      {step3ModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tally Entry</h3>
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={step3Data.status}
                  onChange={(e) => setStep3Data({...step3Data, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Work Done">Work Done</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep3ModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-lg flex justify-center">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
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
