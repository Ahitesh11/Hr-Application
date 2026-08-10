import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { SalaryRecord } from "../types";
import { Search, Loader2, Download, IndianRupee } from "lucide-react";
import { cn } from "../lib/utils";

import { SalarySlip } from "./SalarySlip";

export const SalaryModule: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SalaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getSalaryRecords(user?.role === "Admin" ? undefined : user?.employeeId);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching salary records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.month?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or month..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-4 font-bold text-slate-600">Emp Code</th>
                <th className="px-3 py-4 font-bold text-slate-600">Name</th>
                <th className="px-3 py-4 font-bold text-slate-600">Days</th>
                <th className="px-3 py-4 font-bold text-slate-600 text-center">Net Payable</th>
                <th className="px-3 py-4 font-bold text-slate-600">Month/Year</th>
                <th className="px-3 py-4 font-bold text-slate-600 text-center uppercase">Salary Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading records...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-slate-500">
                    No salary records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-pink-50/40 transition-colors duration-200">
                    <td className="px-3 py-4 font-medium text-slate-900">{item.employeeCode}</td>
                    <td className="px-3 py-4 font-bold text-slate-900">{item.employeeName}</td>
                    <td className="px-3 py-4 text-slate-600 font-bold">{item.noOfDaysPresent} <span className="text-[9px] opacity-60">Days</span></td>
                    <td className="px-3 py-4 font-black text-pink-600 text-center text-sm">₹{parseFloat(item.payment || "0").toLocaleString()}</td>
                    <td className="px-3 py-4 text-slate-500 font-bold italic">{item.month} {item.year}</td>
                    <td className="px-3 py-4 text-center">
                      <button 
                        onClick={() => setSelectedRecord(item)}
                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200 group flex items-center gap-2 mx-auto"
                      >
                        <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">View Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <SalarySlip 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}
    </div>
  );
};

