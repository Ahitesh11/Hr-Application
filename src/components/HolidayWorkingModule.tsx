import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { HolidayWorkingFms } from "../types";
import { Plus, Search, CheckCircle, Clock, AlertCircle, Loader2, Briefcase, X } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

export const HolidayWorkingModule: React.FC = () => {
  const { user, actingAs } = useAuth();
  const [data, setData] = useState<HolidayWorkingFms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = ["2026", "2027", "2028", "2029"];

  const [formData, setFormData] = useState({
    status1: "Holiday Working",
    workingDateFrom: format(new Date(), "yyyy-MM-dd"),
    workingDateTo: format(new Date(), "yyyy-MM-dd"),
    numberOfDays: 1,
    workDoneReason: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getHolidayWorking(user?.role === "Admin" ? undefined : user?.employeeId);
      setData((result || []).filter(d => d.timestamp && d.holidayWorkingNo));

    } catch (error) {
      console.error("Error fetching holiday working data:", error);
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
      const success = await api.submitHolidayWorking({
        ...formData,
        employeeId: actingAs?.employeeId || user?.employeeId,
        name: actingAs?.name || user?.name,
        companyName: actingAs?.companyName || user?.companyName,
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss")
      } as any);

      if (success) {
        setIsFormOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting holiday working:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStep = async (rowId: string, step: number) => {
    setIsLoading(true);
    try {
      const actualTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const success = await api.updateStep("Holiday Working Fms", rowId, step, actualTime);
      if (success) {
        fetchData();
      }
    } catch (error) {
      console.error("Error updating step:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.holidayWorkingNo?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    item.planned1 && item.planned1.trim() !== ""
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or HW No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          New HW Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total HW Requests</p>
            <p className="text-2xl font-bold text-slate-900">{data.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending Approvals</p>
            <p className="text-2xl font-bold text-slate-900">{data.filter(d => d.status3 === "Pending").length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Fully Approved</p>
            <p className="text-2xl font-bold text-slate-900">{data.filter(d => d.status3 === "Work Done").length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">HW No</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Employee ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Company Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center">Status1</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Working From</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Working To</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center">Days</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Work Done / Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-600 capitalize text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading data...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-pink-50/40 transition-colors duration-200">
                    <td className="px-3 py-4 text-xs text-slate-600 text-center whitespace-nowrap">{item.timestamp}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 text-center">{item.holidayWorkingNo}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 text-center">{item.employeeId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-center whitespace-nowrap">{item.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 text-center whitespace-nowrap">{item.companyName}</td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600 text-center">{item.status1}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-center">{item.workingDateFrom}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-center">{item.workingDateTo}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900 text-center">{item.numberOfDays}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate text-center">{item.workDoneReason}</td>
                    <td className="px-6 py-4 text-center">
                      {user?.role === "Admin" && (
                        <div className="flex gap-2 justify-center">
                          {item.status2 === "Pending" && (
                            <button
                              onClick={() => handleUpdateStep(item.holidayWorkingNo, 1)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 font-bold"
                            >
                              HOD OK
                            </button>
                          )}
                          {item.status2 === "Work Done" && item.status3 === "Pending" && (
                            <button
                              onClick={() => handleUpdateStep(item.holidayWorkingNo, 2)}
                              className="px-3 py-1 bg-pink-600 text-white text-xs font-bold rounded hover:bg-pink-700 font-bold"
                            >
                              HR OK
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
              <h3 className="text-xl font-bold text-slate-900">Holiday Working Request</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status1</label>
                  <select
                    value={formData.status1}
                    onChange={(e) => setFormData({ ...formData, status1: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  >
                    <option value="Holiday Working">Holiday Working</option>
                    <option value="Mgmt Salary Approval">Mgmt Salary Approval</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Working Date From</label>
                  <input
                    type="date"
                    value={formData.workingDateFrom}
                    onChange={(e) => setFormData({ ...formData, workingDateFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Working Date To</label>
                  <input
                    type="date"
                    value={formData.workingDateTo}
                    onChange={(e) => setFormData({ ...formData, workingDateTo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number Of Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.numberOfDays}
                  onChange={(e) => setFormData({ ...formData, numberOfDays: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Done / Reason</label>
                <textarea
                  value={formData.workDoneReason}
                  onChange={(e) => setFormData({ ...formData, workDoneReason: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none min-h-[80px]"
                  placeholder="What work will be done?"
                  required
                />
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
