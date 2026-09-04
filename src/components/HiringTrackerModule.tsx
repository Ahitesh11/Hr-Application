import { useState, useEffect } from "react";
import { api } from "../services/api";
import { HiringTracker } from "../types";
import { Loader2, Search, RefreshCw, Briefcase, Plus, X, ChevronDown, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

const emptyForm = {
  indentNumber: "",
  company: "",
  post: "",
  gender: "",
  prefer: "",
  numberOfEnquiryNeed: "",
  positionFullFillDate: "",
  department: "",
  experience: ""
};

const emptyUpdateForm = {
  indentNumber: "",
  socialSitePost: "",
  which: "",
  whatDidTheCandidateSays: "",
  trackerStatus: "",
  nextCallDate: "",
  interviewStatus: "",
  followUpHistory: "",
  candidateName: "",
  dob: "",
  candidatePhoneNumber: "",
  previousCompanyName: "",
  jobExperience: "",
  reasonForLeaving: "",
  maritalStatus: "",
  candidatePhoto: "",
  presentAddress: "",
  resumeCopy: "",
  interviewScheduleDate: ""
};

type TabId = "social-site" | "call-tracker" | "follow-up" | "interview" | "history";

export const HiringTrackerModule = () => {
  const [data, setData] = useState<HiringTracker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create New Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update Step Modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateData, setUpdateData] = useState(emptyUpdateForm);
  const [isUpdating, setIsUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("social-site");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getHiringTracker();
      setData(result || []);
    } catch (error) {
      console.error("Failed to fetch hiring tracker data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'candidatePhoto' | 'resumeCopy') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select a file under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUpdateData(prev => ({ ...prev, [fieldName]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await api.submitHiringTracker(formData);
      if (success) {
        setIsModalOpen(false);
        setFormData(emptyForm);
        fetchData();
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const payload = { ...updateData, tab: activeTab };
      const success = await api.updateHiringTrackerStep(payload);
      if (success) {
        setIsUpdateModalOpen(false);
        setUpdateData(emptyUpdateForm);
        fetchData();
      } else {
        alert("Failed to update step. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while updating.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateModal = (item: HiringTracker) => {
    setUpdateData({
      indentNumber: item.indentNumber || "",
      socialSitePost: item.socialSitePost || "",
      which: item.which || "",
      whatDidTheCandidateSays: "",
      trackerStatus: item.trackerStatus || "",
      nextCallDate: item.nextCallDate || "",
      interviewStatus: item.interviewStatus || "",
      followUpHistory: item.followUpHistory || item.whatDidTheCandidateSays || "",
      candidateName: item.candidateName || "",
      dob: item.dob || "",
      candidatePhoneNumber: item.candidatePhoneNumber || "",
      previousCompanyName: item.previousCompanyName || "",
      jobExperience: item.jobExperience || "",
      reasonForLeaving: item.reasonForLeaving || "",
      maritalStatus: item.maritalStatus || "",
      candidatePhoto: item.candidatePhoto || "",
      presentAddress: item.presentAddress || "",
      resumeCopy: item.resumeCopy || "",
      interviewScheduleDate: item.interviewScheduleDate || ""
    });
    setIsUpdateModalOpen(true);
  };

  const filteredData = data.filter((item) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      item.indentNumber?.toLowerCase().includes(term) ||
      item.company?.toLowerCase().includes(term) ||
      item.post?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term)
    );
    if (!matchesSearch) return false;

    // Filter by Active Tab Workflow
    if (activeTab === "social-site") {
      // Show if Planned1 exists and Actual1 is empty
      return item.planned1 && !item.actual1;
    } else if (activeTab === "call-tracker") {
      // Show if Planned2 exists and Actual2 is empty AND not In Progress
      return item.planned2 && !item.actual2 && item.trackerStatus !== "In Progress";
    } else if (activeTab === "follow-up") {
      // Show if Planned2 exists and Actual2 is empty AND Tracker Status IS In Progress
      return item.planned2 && !item.actual2 && item.trackerStatus === "In Progress";
    } else if (activeTab === "interview") {
      // Show if Planned3 exists and Actual3 is empty
      return item.planned3 && !item.actual3;
    } else if (activeTab === "history") {
      // Show if Actual3 is completed, meaning all steps are done
      return !!item.actual3;
    }

    return true;
  });

  const getTabCount = (tab: TabId) => {
    return data.filter((item) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = (
        item.indentNumber?.toLowerCase().includes(term) ||
        item.company?.toLowerCase().includes(term) ||
        item.post?.toLowerCase().includes(term) ||
        item.department?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;

      if (tab === "social-site") return item.planned1 && !item.actual1;
      if (tab === "call-tracker") return item.planned2 && !item.actual2 && item.trackerStatus !== "In Progress";
      if (tab === "follow-up") return item.planned2 && !item.actual2 && item.trackerStatus === "In Progress";
      if (tab === "interview") return item.planned3 && !item.actual3;
      if (tab === "history") return !!item.actual3;
      return false;
    }).length;
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-slate-100 text-slate-600";
    const s = status.toLowerCase();
    if (s.includes("done") || s.includes("selected") || s.includes("hired")) return "bg-emerald-100 text-emerald-700";
    if (s.includes("pending") || s.includes("in progress")) return "bg-amber-100 text-amber-700";
    if (s.includes("rejected")) return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 pt-5 shrink-0 z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">Hiring Tracker</h1>
              <p className="text-sm font-medium text-slate-500">Track and manage recruitment processes</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white font-bold text-sm rounded-xl hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200"
            >
              <Plus className="w-4 h-4" />
              Add New Indent Request
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Indent, Post..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-pink-500 transition-all"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 mt-2">
          <button
            onClick={() => setActiveTab("social-site")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5", activeTab === "social-site" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Social Site
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "social-site" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("social-site")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("call-tracker")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5", activeTab === "call-tracker" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Call Tracker
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "call-tracker" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("call-tracker")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("follow-up")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5", activeTab === "follow-up" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Follow Up
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "follow-up" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("follow-up")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("interview")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5", activeTab === "interview" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Interview
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "interview" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
              {getTabCount("interview")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn("py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5", activeTab === "history" ? "border-pink-600 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            History
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeTab === "history" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-500")}>
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
              <p className="text-slate-500 font-medium">Loading tracking data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-800 font-bold text-lg">No pending tasks for this step!</p>
              <p className="text-slate-500 font-medium text-sm text-center max-w-sm">
                All records have been updated or there are no new records to process.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <tr>
                    {/* Common Basic Info */}
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Indent No</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Company</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Post</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Gender</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Prefer</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Enquiry Need</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Full-Fill Date</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Department</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-200">Experience</th>
                    
                    {/* Active Tab Specific Columns */}
                    {activeTab === "social-site" && (
                      <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-pink-600 uppercase tracking-wider border-b border-r border-slate-200 bg-pink-50/50">Planned1</th>
                    )}
                    
                    {activeTab === "call-tracker" && (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Social Site Post</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-200">Which</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-pink-600 uppercase tracking-wider border-b border-r border-slate-200 bg-pink-50/50">Planned2</th>
                      </>
                    )}
                    
                    {activeTab === "follow-up" && (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 min-w-[200px]">Follow Up History</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Next Call Date</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Tracker Status</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-pink-600 uppercase tracking-wider border-b border-r border-slate-200 bg-pink-50/50">Planned2</th>
                      </>
                    )}
                    
                    {(activeTab === "interview" || activeTab === "history") && (
                      <>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Social Site Post</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Which</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Interview Status</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100">Tracker Status</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Candidate Name</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">DOB</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Phone Number</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Previous Company</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Job Experience</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Reason For Leaving</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Marital Status</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Candidate Photo</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 min-w-[180px]">Present Address</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Resume Copy</th>
                        <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 whitespace-nowrap">Interview Schedule Date</th>
                        {activeTab === "interview" && <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-pink-600 uppercase tracking-wider border-b border-r border-slate-200 bg-pink-50/50">Planned3</th>}
                        {activeTab === "history" && <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-emerald-600 uppercase tracking-wider border-b border-r border-slate-200 bg-emerald-50/50">Actual3 (Completed)</th>}
                      </>
                    )}
                    
                    {/* Action Column */}
                    {activeTab !== "history" && (
                      <th className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-800 uppercase tracking-wider border-b bg-slate-100 text-center sticky right-0">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-pink-50/40 transition-colors duration-200">
                      {/* Common Basic Info */}
                      <td className="px-4 py-3 text-xs font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">{row.indentNumber || "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-pink-700 border-r border-slate-100 whitespace-nowrap">{row.company || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">{row.post || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.gender || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.prefer || "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700 border-r border-slate-100 text-center">{row.numberOfEnquiryNeed || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.positionFullFillDate || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.department || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap">{row.experience || "—"}</td>
                      
                      {/* Active Tab Specific Columns */}
                      {activeTab === "social-site" && (
                        <td className="px-4 py-3 text-xs font-bold text-pink-700 whitespace-nowrap bg-pink-50/30 border-r border-slate-200">{row.planned1 || "—"}</td>
                      )}
                      
                      {activeTab === "call-tracker" && (
                        <>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 truncate max-w-[150px]" title={row.socialSitePost}>{row.socialSitePost || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap">{row.which || "—"}</td>
                          <td className="px-4 py-3 text-xs font-bold text-pink-700 whitespace-nowrap bg-pink-50/30 border-r border-slate-200">{row.planned2 || "—"}</td>
                        </>
                      )}

                      {activeTab === "follow-up" && (
                        <>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            <div className="max-h-24 overflow-y-auto custom-scrollbar text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed pr-2">
                              {row.followUpHistory || row.whatDidTheCandidateSays || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap align-top">{row.nextCallDate || "—"}</td>
                          <td className="px-4 py-3 border-r border-slate-100 align-top">
                            {row.trackerStatus ? (
                              <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black whitespace-nowrap uppercase tracking-wider", getStatusColor(row.trackerStatus))}>
                                {row.trackerStatus}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-pink-700 whitespace-nowrap bg-pink-50/30 border-r border-slate-200 align-top">{row.planned2 || "—"}</td>
                        </>
                      )}
                      
                      {(activeTab === "interview" || activeTab === "history") && (
                        <>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 truncate max-w-[150px]" title={row.socialSitePost}>{row.socialSitePost || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.which || "—"}</td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {row.interviewStatus ? (
                              <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black whitespace-nowrap uppercase tracking-wider", getStatusColor(row.interviewStatus))}>
                                {row.interviewStatus}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {row.trackerStatus ? (
                              <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black whitespace-nowrap uppercase tracking-wider", getStatusColor(row.trackerStatus))}>
                                {row.trackerStatus}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">{row.candidateName || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.dob || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.candidatePhoneNumber || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.previousCompanyName || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.jobExperience || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 truncate max-w-[150px]" title={row.reasonForLeaving}>{row.reasonForLeaving || "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.maritalStatus || "—"}</td>
                          <td className="px-4 py-3 text-xs border-r border-slate-100 whitespace-nowrap">
                            {row.candidatePhoto ? (
                              <a href={row.candidatePhoto} target="_blank" rel="noreferrer" className="font-bold text-pink-600 hover:underline">View</a>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 truncate max-w-[180px]" title={row.presentAddress}>{row.presentAddress || "—"}</td>
                          <td className="px-4 py-3 text-xs border-r border-slate-100 whitespace-nowrap">
                            {row.resumeCopy ? (
                              <a href={row.resumeCopy} target="_blank" rel="noreferrer" className="font-bold text-pink-600 hover:underline">View</a>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{row.interviewScheduleDate || "—"}</td>
                          {activeTab === "interview" && <td className="px-4 py-3 text-xs font-bold text-pink-700 whitespace-nowrap bg-pink-50/30 border-r border-slate-200">{row.planned3 || "—"}</td>}
                          {activeTab === "history" && <td className="px-4 py-3 text-xs font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/30 border-r border-slate-200">{row.actual3 || "—"}</td>}
                        </>
                      )}
                      
                      {/* Action Button */}
                      {activeTab !== "history" && (
                        <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.03)]">
                          <button
                            onClick={() => openUpdateModal(row)}
                            className="px-3 py-1.5 bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white font-bold text-[11px] rounded-lg transition-colors whitespace-nowrap"
                          >
                            Update
                          </button>
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

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-black text-slate-800">New Hiring Request</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form id="hiring-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: "Company", name: "company", type: "select", options: ["Pmmpl", "Purab", "Refrasynth", "Refratech", "Rkl"] },
                 { 
                    label: "Post", 
                    name: "post", 
                    type: "select", 
                    options: [
                      "Accounts Executive",
                      "Accounts Manager",
                      "Admin Executive",
                      "Application Incharge",
                      "Application Labour",
                      "Application Manager",
                      "Application Supervisor",
                      "Asset Fitter",
                      "Assistant Chemist",
                      "Assistant Marketing Manager",
                      "Cashier",
                      "Cfo",
                      "Civil Site Supervisor",
                      "Crm",
                      "Crusher Supervisor",
                      "Data Operator",
                      "Dme",
                      "Draftsman",
                      "Driver",
                      "Ea",
                      "Electrical Helper",
                      "Financial Executive",
                      "Gm Hr",
                      "Grinding Mill Supervisor",
                      "Guard",
                      "Help",
                      "Helper",
                      "Hr",
                      "Hydra Operator",
                      "Jcb Operator",
                      "Jr Accountant",
                      "Jr. Purchase Executive",
                      "Lab Assistant",
                      "Lab Helper",
                      "Lab Incharge",
                      "Labour",
                      "Liasoning",
                      "Logistic Executive",
                      "Marketing Executive",
                      "Marketing Manager",
                      "Mechanical Hepler",
                      "Mechnical Helper",
                      "Office Boy",
                      "Pc",
                      "Plant Electrician",
                      "Plant Executive",
                      "Plant Helper",
                      "Plant Incharge",
                      "Plant Mechanical",
                      "Plant Supervisor",
                      "Production Supervisor",
                      "Project Manager",
                      "Purchase Executive",
                      "Purchase Manager",
                      "Sales & Marketing",
                      "Sales Cordinator",
                      "Sales Executive",
                      "Sales Manager",
                      "Senior General Manager",
                      "Site Supervisor",
                      "Sr Accountant",
                      "Stock Yard Supervisor",
                      "Store Executive",
                      "Store Manager",
                      "Store Purchaser",
                      "Technical Head",
                      "Welder",
                      "Workshop Operator",
                      "Weibridge Operator",
                      "Nodulizer",
                      "Fitter"
                    ]
                  },                  { label: "Gender", name: "gender", type: "select", options: ["Male", "Female"] },
                  { label: "Prefer", name: "prefer", type: "select", options: ["Any", "Experience", "Fresher"] },
                  { label: "Number Of Enquiry Need", name: "numberOfEnquiryNeed", type: "number" },
                  { label: "Position Full-Fill Date", name: "positionFullFillDate", type: "date" },
                  { label: "Department", name: "department", type: "select", options: ["Accounts & Finance", "Admin", "Housekeeping", "Human Resources (HR)", "IT", "Maintenance", "Management", "Marketing", "Production", "Projects", "Purchase", "Reception", "Sales", "Stores / Inventory", "Technical","Lab"] },
                  { label: "Experience", name: "experience", type: "text" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <div className="relative">
                        <select
                          value={(formData as any)[field.name]}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none"
                        >
                          <option value="">-- Select --</option>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        value={(formData as any)[field.name]}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="hiring-form"
                disabled={isSubmitting}
                className="px-6 py-2 bg-pink-600 text-white font-bold text-sm rounded-xl hover:bg-pink-700 transition-colors flex items-center gap-2 shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Step Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-black text-slate-800">Update Step</h2>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form id="update-form" onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              
              {/* Common Details for context */}
              <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 mb-2">
                <p className="text-xs font-bold text-pink-800">Indent: {updateData.indentNumber}</p>
                <p className="text-xs text-pink-600 mt-1">Completing {
                  activeTab === 'social-site' ? '1st Step (Social Site)' : 
                  (activeTab === 'call-tracker' || activeTab === 'follow-up') ? '2nd Step (Call Tracker)' : 
                  '3rd Step (Interview)'
                }</p>
              </div>

              {/* Conditional Fields based on active tab */}
              {activeTab === 'social-site' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Social Site Post</label>
                    <input
                      type="text"
                      value={updateData.socialSitePost}
                      onChange={(e) => setUpdateData({ ...updateData, socialSitePost: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Which</label>
                    <input
                      type="text"
                      value={updateData.which}
                      onChange={(e) => setUpdateData({ ...updateData, which: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    />
                  </div>
                </>
              )}

              {(activeTab === 'call-tracker' || activeTab === 'follow-up') && (
                <>
                  {updateData.followUpHistory && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Conversation History</label>
                      <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                        {updateData.followUpHistory}
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Tracker Status</label>
                    <div className="relative">
                      <select
                        value={updateData.trackerStatus}
                        onChange={(e) => setUpdateData({ ...updateData, trackerStatus: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      >
                        <option value="">-- Select Status --</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {updateData.trackerStatus && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Add New Remark</label>
                      <textarea
                        value={updateData.whatDidTheCandidateSays}
                        onChange={(e) => setUpdateData({ ...updateData, whatDidTheCandidateSays: e.target.value })}
                        required
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      />
                    </div>
                  )}
                  {updateData.trackerStatus === "In Progress" && (
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Next Call Date</label>
                      <input
                        type="date"
                        value={updateData.nextCallDate}
                        onChange={(e) => setUpdateData({ ...updateData, nextCallDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      />
                    </div>
                  )}

                  {updateData.trackerStatus === "Done" && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-2">
                      <div className="sm:col-span-2">
                        <h3 className="text-sm font-black text-emerald-800 border-b border-emerald-200 pb-2">Candidate Details</h3>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Candidate Name</label>
                        <input
                          type="text"
                          value={updateData.candidateName}
                          onChange={(e) => setUpdateData({ ...updateData, candidateName: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">DOB</label>
                        <input
                          type="date"
                          value={updateData.dob}
                          onChange={(e) => setUpdateData({ ...updateData, dob: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          value={updateData.candidatePhoneNumber}
                          onChange={(e) => setUpdateData({ ...updateData, candidatePhoneNumber: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Marital Status</label>
                        <div className="relative">
                          <select
                            value={updateData.maritalStatus}
                            onChange={(e) => setUpdateData({ ...updateData, maritalStatus: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                          >
                            <option value="">-- Select --</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Previous Company Name</label>
                        <input
                          type="text"
                          value={updateData.previousCompanyName}
                          onChange={(e) => setUpdateData({ ...updateData, previousCompanyName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Job Experience</label>
                        <input
                          type="text"
                          value={updateData.jobExperience}
                          onChange={(e) => setUpdateData({ ...updateData, jobExperience: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Reason Of Leaving Previous Company</label>
                        <input
                          type="text"
                          value={updateData.reasonForLeaving}
                          onChange={(e) => setUpdateData({ ...updateData, reasonForLeaving: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Present Address</label>
                        <textarea
                          value={updateData.presentAddress}
                          onChange={(e) => setUpdateData({ ...updateData, presentAddress: e.target.value })}
                          rows={2}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Candidate Photo (Image/PDF)</label>
                        {updateData.candidatePhoto && !updateData.candidatePhoto.startsWith("data:") ? (
                          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl">
                            <a href={updateData.candidatePhoto} target="_blank" rel="noreferrer" className="text-xs font-bold text-pink-600 hover:underline truncate max-w-[200px]">View Uploaded Photo</a>
                            <button type="button" onClick={() => setUpdateData({ ...updateData, candidatePhoto: "" })} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, 'candidatePhoto')}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          />
                        )}
                        {updateData.candidatePhoto && updateData.candidatePhoto.startsWith("data:") && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1">✓ File selected and ready to upload</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Resume Copy (Image/PDF)</label>
                        {updateData.resumeCopy && !updateData.resumeCopy.startsWith("data:") ? (
                          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl">
                            <a href={updateData.resumeCopy} target="_blank" rel="noreferrer" className="text-xs font-bold text-pink-600 hover:underline truncate max-w-[200px]">View Uploaded Resume</a>
                            <button type="button" onClick={() => setUpdateData({ ...updateData, resumeCopy: "" })} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, 'resumeCopy')}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          />
                        )}
                        {updateData.resumeCopy && updateData.resumeCopy.startsWith("data:") && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1">✓ File selected and ready to upload</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Interview Schedule Date</label>
                        <input
                          type="date"
                          value={updateData.interviewScheduleDate}
                          onChange={(e) => setUpdateData({ ...updateData, interviewScheduleDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>

                    </div>
                  )}
                </>
              )}

              {activeTab === 'interview' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Interview Status</label>
                    <div className="relative">
                      <select
                        value={updateData.interviewStatus}
                        onChange={(e) => setUpdateData({ ...updateData, interviewStatus: e.target.value })}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      >
                        <option value="">-- Select Status --</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Selected">Selected</option>
                        <option value="Hired">Hired</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}
            </form>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="update-form"
                disabled={isUpdating}
                className="px-6 py-2 bg-pink-600 text-white font-bold text-sm rounded-xl hover:bg-pink-700 transition-colors flex items-center gap-2 shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Submit Update
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
