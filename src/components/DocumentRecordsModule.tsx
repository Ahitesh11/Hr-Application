import React, { useState, useEffect } from "react";
import { Search, Loader2, FileText, CheckCircle, Clock } from "lucide-react";
import { api } from "../services/api";

export const DocumentRecordsModule: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOfferLetters();
      // Sort by timestamp descending if possible
      data.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });
      setRecords(data);
    } catch (error) {
      console.error("Error fetching document records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    (record.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
    (record.candidateId?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
    (record.documentType?.toLowerCase().includes(searchTerm.toLowerCase()) || "")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ID or Document Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Loading document records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Records Found</h3>
          <p className="text-slate-500">No generated documents match your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Document Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Document Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {record.timestamp ? new Date(record.timestamp).toLocaleString() : "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{record.fullName || "-"}</span>
                        <span className="text-xs text-slate-500">{record.candidateId || record.employeeId || "-"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {record.documentType || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {record.status === "Generated" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                        <span className="text-sm text-slate-700 font-medium">{record.status || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {record.documentLink && !record.documentLink.includes("Error") ? (
                        <a 
                          href={record.documentLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="w-4 h-4" /> View PDF
                        </a>
                      ) : (
                        <span className="text-xs text-red-500 font-medium">Not Available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
