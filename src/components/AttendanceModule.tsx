import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Attendance } from "../types";
import { Search, Loader2, Download } from "lucide-react";
import { cn } from "../lib/utils";
import { format, parseISO, isValid } from "date-fns";

export const AttendanceModule: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getAttendance(user?.role === "Admin" ? undefined : user?.employeeId);
      setData(result || []);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatValue = (val: string, type: 'date' | 'time') => {
    if (!val || typeof val !== 'string') return val;
    
    // Check if it's an ISO string (contains T and Z)
    if (val.includes('T') && val.includes('Z')) {
      const date = parseISO(val);
      if (isValid(date)) {
        if (type === 'date') {
          return format(date, "MM/dd/yyyy");
        } else {
          // For time-only values, Sheets often uses 1899-12-30 as the base date
          return format(date, "h:mm:ss a");
        }
      }
    }
    return val;
  };

  const filteredData = data.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all">
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Year</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Month</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Department</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Emp Id</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Name</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Company</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Designation</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Date</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">In</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center">Out</th>
                <th className="px-2 md:px-4 py-3 text-[10px] font-bold text-slate-600 capitalize text-center whitespace-nowrap">Working Hour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-slate-500">Loading attendance...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-pink-50/40 transition-colors duration-200">
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.year}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.month}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.department}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.empId}</td>
                    <td className="px-2 md:px-4 py-3 font-bold text-slate-900 text-center whitespace-nowrap">{item.name}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.company}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{item.designation}</td>
                    <td className="px-2 md:px-4 py-3 font-medium text-slate-900 text-center whitespace-nowrap">{formatValue(item.date, 'date')}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{formatValue(item.in, 'time')}</td>
                    <td className="px-2 md:px-4 py-3 text-slate-600 text-center">{formatValue(item.out, 'time')}</td>
                    <td className="px-2 md:px-4 py-3 text-center">
                      <span className={cn(
                        "font-bold",
                        parseFloat(item.workingHour) >= 8 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {item.workingHour}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
