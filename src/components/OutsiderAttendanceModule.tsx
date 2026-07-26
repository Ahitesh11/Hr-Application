import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  Camera,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Image as ImageIcon,
  History,
  AlertCircle,
  LogIn,
  LogOut,
  Briefcase
} from "lucide-react";
import { cn } from "../lib/utils";

type StatusType = "IN" | "OUT" | "MID" | "Leave";

export const OutsiderAttendanceModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"mark" | "history" | "hr-approvals">("mark");
  const [status, setStatus] = useState<StatusType | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [hrApprovalData, setHrApprovalData] = useState<{status: string, remarks: string, item: any | null}>({status: 'Approved', remarks: '', item: null});

  const [image, setImage] = useState<string>("");
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    mapLink: string;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "history" || activeTab === "hr-approvals") {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.getOutsiderAttendance(user?.role === "Admin" || (user?.role as string) === "HR" ? undefined : user?.employeeId);
      setHistory(res || []);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleHrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrApprovalData.item) return;

    setIsSubmitting(true);
    try {
      const success = await api.updateOutsiderAttendanceHRStatus({
        timestamp: hrApprovalData.item.timestamp || hrApprovalData.item.Timestamp,
        hrStatus: hrApprovalData.status,
        hrRemarks: hrApprovalData.remarks
      });

      if (success) {
        setSuccessMsg("Status updated successfully!");
        setHrApprovalData({status: 'Approved', remarks: '', item: null});
        loadHistory();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg("Failed to update status.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const fetchLocation = async () => {
    setIsGettingLocation(true);
    setErrorMsg("");
    
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        let address = "Unknown Location";

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }

        setLocation({ lat, lng, address, mapLink });
        setIsGettingLocation(false);
      },
      (err) => {
        setErrorMsg("Failed to get location. Please enable GPS permissions.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) {
      setErrorMsg("Please select a status.");
      return;
    }
    
    const isLeave = status === "Leave";

    if (!isLeave && !image) {
      setErrorMsg("Please capture an image.");
      return;
    }
    
    if (!isLeave && !location) {
      setErrorMsg("Please fetch your current location.");
      return;
    }

    if (isLeave && (!leaveStartDate || !leaveReason)) {
      setErrorMsg("Please fill in leave start date and reason.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const now = new Date();
      const payload = {
        employeeId: user?.employeeId,
        name: user?.name,
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        status,
        image: isLeave ? "" : image,
        latitude: isLeave ? "" : location?.lat?.toString(),
        longitude: isLeave ? "" : location?.lng?.toString(),
        address: isLeave ? "" : location?.address,
        mapLink: isLeave ? "" : location?.mapLink,
        leaveStartDate: isLeave ? leaveStartDate : "",
        leaveEndDate: isLeave ? leaveEndDate : "",
        reason: isLeave ? leaveReason : ""
      };

      const success = await api.submitOutsiderAttendance(payload);
      
      if (success) {
        setSuccessMsg("Attendance marked successfully!");
        setStatus("");
        setImage("");
        setLocation(null);
        setLeaveStartDate("");
        setLeaveEndDate("");
        setLeaveReason("");
      } else {
        setErrorMsg("Failed to mark attendance. Please try again.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Outsider Attendance</h2>
            <p className="text-sm text-slate-400">Mark your field attendance or apply for leave</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("mark")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "mark" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "history" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            History
          </button>
          {(user?.role === "Admin" || (user?.role as string) === "HR") && (
            <button
              onClick={() => setActiveTab("hr-approvals")}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "hr-approvals" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              HR Approvals
            </button>
          )}
        </div>
      </div>

      {activeTab === "mark" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 lg:p-8 space-y-6">
            
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
                Select Activity
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "IN", label: "Punch IN", icon: LogIn, base: "emerald" },
                  { id: "OUT", label: "Punch OUT", icon: LogOut, base: "red" },
                  { id: "MID", label: "Mid Day", icon: Briefcase, base: "blue" },
                  { id: "Leave", label: "Leave", icon: Calendar, base: "orange" },
                ].map((s) => {
                  const Icon = s.icon;
                  const isActive = status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id as StatusType)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl transition-all duration-300 border-2 overflow-hidden group",
                        isActive 
                          ? s.base === "emerald" ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/20 shadow-lg scale-[1.02]" :
                            s.base === "red" ? "bg-red-50 border-red-500 text-red-700 shadow-red-500/20 shadow-lg scale-[1.02]" :
                            s.base === "blue" ? "bg-blue-50 border-blue-500 text-blue-700 shadow-blue-500/20 shadow-lg scale-[1.02]" :
                            "bg-orange-50 border-orange-500 text-orange-700 shadow-orange-500/20 shadow-lg scale-[1.02]"
                          : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md"
                      )}
                    >
                      {/* Active indicator dot */}
                      <div className={cn(
                        "absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-300",
                        isActive 
                          ? s.base === "emerald" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
                            s.base === "red" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" :
                            s.base === "blue" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" :
                            "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                          : "opacity-0 scale-0"
                      )} />
                      
                      <Icon className={cn(
                        "w-6 h-6 transition-all duration-300",
                        isActive ? "scale-110" : "group-hover:scale-110"
                      )} />
                      <span className="font-bold text-xs">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {status === "Leave" ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Start Date *</label>
                    <input 
                      type="date"
                      value={leaveStartDate}
                      onChange={e => setLeaveStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">End Date</label>
                    <input 
                      type="date"
                      value={leaveEndDate}
                      onChange={e => setLeaveEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Reason *</label>
                  <textarea 
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for leave..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all resize-none"
                  />
                </div>
              </div>
            ) : status ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Live Photo *
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageCapture}
                  />
                  
                  {image ? (
                    <div className="relative group rounded-3xl overflow-hidden border-2 border-blue-200 bg-slate-50 aspect-video sm:aspect-[4/3] flex items-center justify-center">
                      <img src={image} alt="Captured" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-2 bg-white rounded-xl font-bold text-sm text-slate-900 shadow-xl"
                        >
                          Retake Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video sm:aspect-[4/3] bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all text-blue-600"
                    >
                      <Camera className="w-10 h-10" />
                      <span className="font-bold text-sm">Tap to Open Camera</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Location *
                  </label>
                  {location ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-4 items-start">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 text-sm mb-1">Location Verified</h4>
                        <p className="text-xs text-emerald-700 font-medium leading-relaxed mb-2">
                          {location.address}
                        </p>
                        <a href={location.mapLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                          View on Map
                        </a>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={fetchLocation}
                      disabled={isGettingLocation}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all disabled:opacity-50"
                    >
                      {isGettingLocation ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS...</>
                      ) : (
                        <><MapPin className="w-5 h-5" /> Get Current Location</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !status}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-1 hover:shadow-xl",
                status === "Leave" ? "bg-orange-500 shadow-orange-500/20" : "bg-blue-600 shadow-blue-600/20"
              )}
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
              ) : (
                <>Submit {status === "Leave" ? "Leave Application" : "Attendance"}</>
              )}
            </button>

          </form>

          <div className="hidden lg:flex flex-col gap-6">
            <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                <MapPin className="w-48 h-48" />
              </div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all duration-700" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wider uppercase mb-6 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Tracking Active
                </div>
                
                <h3 className="text-3xl font-extrabold mb-3 tracking-tight">Outsider Attendance</h3>
                <p className="text-blue-100/90 text-sm font-medium max-w-[85%] mb-10 leading-relaxed">
                  As a field worker, your location and photo are required to mark attendance securely. Please allow camera and location permissions when prompted.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/10 hover:bg-white/15 rounded-2xl p-5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300 group/item cursor-default">
                    <div className="p-3 bg-blue-500/30 rounded-xl group-hover/item:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-blue-100" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white mb-0.5">Timely Punches</h4>
                      <p className="text-xs text-blue-200/80 font-medium">Always punch IN before starting work</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/10 hover:bg-white/15 rounded-2xl p-5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300 group/item cursor-default">
                    <div className="p-3 bg-indigo-500/30 rounded-xl group-hover/item:scale-110 transition-transform duration-300">
                      <MapPin className="w-6 h-6 text-blue-100" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white mb-0.5">Accurate GPS</h4>
                      <p className="text-xs text-blue-200/80 font-medium">Your live location is mapped automatically</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingHistory ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-500">Loading your attendance history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <History className="w-12 h-12 text-slate-200" />
              <p className="text-base font-bold text-slate-600">No History Found</p>
              <p className="text-sm text-slate-400">You haven't marked any outsider attendance yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Date", "Time", "Name", "Status", "Photo", "Location"].map(h => (
                      <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((row, idx) => {
                    const statusVal = row.status || row.Status;
                    const dateVal = row.date || row.Date || row.timestamp;
                    const isLeave = statusVal === "Leave";
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-700">{dateVal}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">{row.time || row.Time || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-800">{row.name || row.Name || user?.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-3 py-1 text-xs font-bold rounded-lg border",
                            statusVal === "IN" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            statusVal === "OUT" ? "bg-red-50 text-red-600 border-red-100" :
                            statusVal === "MID" ? "bg-blue-50 text-blue-600 border-blue-100" :
                            "bg-orange-50 text-orange-600 border-orange-100"
                          )}>
                            {statusVal}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {!isLeave && (row.imageLink || row['Image Link']) ? (
                            <a 
                              href={row.imageLink || row['Image Link']} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center hover:border-blue-400 hover:text-blue-500 transition-all text-slate-400"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No Image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                          {!isLeave ? (
                            <div>
                              <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed mb-1">
                                {row.address || row.Address || "—"}
                              </p>
                              {(row.mapLink || row['Map Link']) && (
                                <a href={row.mapLink || row['Map Link']} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> View Map
                                </a>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-orange-600 mb-1">
                                {row.leaveStartDate || row['Leave Start Date']} to {row.leaveEndDate || row['Leave End Date'] || "—"}
                              </p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{row.reason || row.Reason || "—"}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "hr-approvals" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingHistory ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-500">Loading records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <History className="w-12 h-12 text-slate-200" />
              <p className="text-base font-bold text-slate-600">No Records Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Date", "Time", "Name", "Status", "Photo/Loc", "HR Status", "Action"].map(h => (
                      <th key={h} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((row, idx) => {
                    const statusVal = row.status || row.Status;
                    const dateVal = row.date || row.Date || row.timestamp;
                    const hrStatus = row.hrStatus || row['HR Status'];
                    const hrRemarks = row.hrRemarks || row['HR Remarks'];
                    const isLeave = statusVal === "Leave";
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{dateVal}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{row.time || row.Time || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{row.name || row.Name || "—"}</p>
                            <p className="text-xs text-slate-500 font-medium">ID: {row.employeeId || row['Emp Id'] || "—"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-3 py-1 text-xs font-bold rounded-lg border",
                            statusVal === "IN" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            statusVal === "OUT" ? "bg-red-50 text-red-600 border-red-100" :
                            statusVal === "MID" ? "bg-blue-50 text-blue-600 border-blue-100" :
                            "bg-orange-50 text-orange-600 border-orange-100"
                          )}>
                            {statusVal}
                          </span>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                          {!isLeave ? (
                            <div className="flex items-center gap-3">
                              {(row.imageLink || row['Image Link']) ? (
                                <a href={row.imageLink || row['Image Link']} target="_blank" rel="noreferrer" className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center hover:border-blue-400 hover:text-blue-500 transition-all text-slate-400">
                                  <ImageIcon className="w-4 h-4" />
                                </a>
                              ) : <span className="text-xs text-slate-400">No Img</span>}
                              
                              <div className="flex-1">
                                <p className="text-xs text-slate-600 font-medium line-clamp-1">{row.address || row.Address || "—"}</p>
                                {(row.mapLink || row['Map Link']) && (
                                  <a href={row.mapLink || row['Map Link']} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> View Map
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-orange-600 mb-1">
                                {row.leaveStartDate || row['Leave Start Date']} to {row.leaveEndDate || row['Leave End Date'] || "—"}
                              </p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{row.reason || row.Reason || "—"}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hrStatus ? (
                            <div>
                              <span className={cn(
                                "px-3 py-1 text-xs font-bold rounded-full",
                                hrStatus === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {hrStatus}
                              </span>
                              {hrRemarks && <p className="text-[10px] text-slate-500 mt-1 max-w-[150px] truncate" title={hrRemarks}>{hrRemarks}</p>}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <button
                             onClick={() => setHrApprovalData({status: 'Approved', remarks: hrRemarks || '', item: row})}
                             className="px-4 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold rounded-xl transition-all"
                           >
                             Update
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HR Approval Modal */}
      {hrApprovalData.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Update HR Status</h3>
              <button onClick={() => setHrApprovalData({status: 'Approved', remarks: '', item: null})} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleHrSubmit} className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setHrApprovalData(p => ({...p, status: 'Approved'}))} className={cn("py-3 rounded-2xl font-bold text-sm transition-all border-2", hrApprovalData.status === 'Approved' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-50 border-transparent text-slate-500")}>
                    Approve
                  </button>
                  <button type="button" onClick={() => setHrApprovalData(p => ({...p, status: 'Rejected'}))} className={cn("py-3 rounded-2xl font-bold text-sm transition-all border-2", hrApprovalData.status === 'Rejected' ? "bg-red-50 border-red-500 text-red-700" : "bg-slate-50 border-transparent text-slate-500")}>
                    Reject
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Remarks (Optional)</label>
                <textarea 
                  value={hrApprovalData.remarks}
                  onChange={e => setHrApprovalData(p => ({...p, remarks: e.target.value}))}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="Add any remarks here..."
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Saving...</> : "Save Status"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
