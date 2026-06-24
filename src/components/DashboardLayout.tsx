
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  Briefcase,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  UserPlus,
  UserCheck,
  Search,
  Loader2,
  Bell
} from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, actingAs, setActingAs } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showActAsPanel, setShowActAsPanel] = useState(false);
  const [actAsInput, setActAsInput] = useState("");
  const [actAsLookupResult, setActAsLookupResult] = useState<{ name: string; companyName: string } | null>(null);
  const [actAsManualName, setActAsManualName] = useState("");
  const [actAsManualCompany, setActAsManualCompany] = useState("");
  const [actAsNotFound, setActAsNotFound] = useState(false);
  const [actAsLoading, setActAsLoading] = useState(false);
  const [actAsIsLiving, setActAsIsLiving] = useState(false);

  const handleActAsLookup = async () => {
    if (!actAsInput.trim()) return;
    setActAsLoading(true);
    setActAsLookupResult(null);
    setActAsNotFound(false);
    setActAsIsLiving(false);
    setActAsManualName("");
    setActAsManualCompany("");
    try {
      const [emps, isLiving] = await Promise.all([
        api.getEmployeeById(actAsInput.trim()),
        api.isEmployeeLiving(actAsInput.trim()),
      ]);
      if (isLiving) {
        setActAsIsLiving(true);
        return;
      }
      const emp = emps?.[0];
      if (emp) {
        const name = emp.name || emp.employeeName || "";
        const companyName = emp.companyName || emp.company || emp.joiningCompanyName || "";
        setActAsLookupResult({ name, companyName });
      } else {
        setActAsNotFound(true);
      }
    } catch {
      setActAsNotFound(true);
    } finally {
      setActAsLoading(false);
    }
  };

  const handleActAsSet = () => {
    const name = actAsLookupResult?.name || actAsManualName;
    const companyName = actAsLookupResult?.companyName || actAsManualCompany;
    if (!actAsInput.trim() || !name) return;
    setActingAs({ employeeId: actAsInput.trim(), name, companyName });
    setShowActAsPanel(false);
    setActAsInput("");
    setActAsLookupResult(null);
    setActAsNotFound(false);
  };

  const handleActAsClear = () => {
    setActingAs(null);
    setShowActAsPanel(false);
    setActAsInput("");
    setActAsLookupResult(null);
    setActAsNotFound(false);
  };

  const menuItems = [
    { id: "dashboard",     label: "Dashboard",          icon: LayoutDashboard, roles: ["Staf", "Admin", "HOD"] },
    { id: "punch-miss",    label: "Punch Miss",          icon: Clock,           roles: ["Staf", "Admin", "HOD"] },
    { id: "leave",         label: "Leave",               icon: Calendar,        roles: ["Staf", "Admin", "HOD"] },
    { id: "holiday",       label: "Holiday Working",     icon: Briefcase,       roles: ["Staf", "Admin", "HOD"] },
    { id: "hod-approvals", label: "HOD Approvals",       icon: CheckCircle,     roles: ["Admin", "HOD"] },
    { id: "hr-approvals",  label: "HR Approvals",        icon: Users,           roles: ["Admin"] },
    { id: "leave-report",  label: "Leave Report",        icon: TrendingUp,      roles: ["Admin"] },
    { id: "attendance",    label: "Attendance",          icon: Users,           roles: ["Staf", "Admin", "HOD"] },
    { id: "salary",        label: "Salary Records",      icon: CreditCard,      roles: ["Staf", "Admin", "HOD"] },
    { id: "salary-increment",          label: "Salary Increment",          icon: TrendingUp, roles: ["Admin"] },
    { id: "upcoming-increment",        label: "Upcoming Increment",         icon: Bell,       roles: ["Admin"] },
    { id: "joining",                   label: "Joining",                    icon: UserPlus,   roles: ["Admin"] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role || "Staf"));

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen bg-pink-50 flex overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-pink-100 transition-all duration-300 flex flex-col z-[70] h-full fixed md:relative",
          isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0 md:w-20 lg:w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between shrink-0">
          <span className={cn("font-bold text-xl text-pink-600 transition-opacity", !isSidebarOpen && "md:opacity-0 lg:opacity-100")}>
            FMS
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-pink-50 rounded-lg transition-colors md:hidden"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                activeTab === item.id
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-100"
                  : "text-slate-600 hover:bg-pink-50"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-pink-600")} />
              <span className={cn("font-medium transition-opacity", !isSidebarOpen && "md:opacity-0 lg:opacity-100")}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <ChevronRight className={cn("w-4 h-4 ml-auto transition-opacity", !isSidebarOpen && "md:opacity-0 lg:opacity-100")} />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-pink-50 shrink-0">
          <div className={cn("flex items-center gap-3 mb-4", !isSidebarOpen && "md:justify-center lg:justify-start")}>
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600 shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div className={cn("flex-1 min-w-0 transition-opacity", !isSidebarOpen && "md:opacity-0 lg:opacity-100")}>
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all",
              !isSidebarOpen && "md:justify-center lg:justify-start"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={cn("font-medium transition-opacity", !isSidebarOpen && "md:opacity-0 lg:opacity-100")}>
              Logout
            </span>
          </button>
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-white border-b border-pink-100 shrink-0">
          <div className="h-16 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-pink-50 rounded-lg transition-colors md:hidden"
              >
                <Menu className="w-6 h-6 text-slate-600" />
              </button>
              <h2 className="text-base md:text-lg font-bold text-slate-800 truncate">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs md:text-sm text-slate-500 hidden sm:inline">
                {new Date().toLocaleDateString()}
              </span>

              {/* Act As Employee — Admin only */}
              {user?.role === "Admin" && (
                <div className="relative">
                  {actingAs ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Acting as:</span>
                      <span>{actingAs.name}</span>
                      <span className="text-[10px] opacity-70">({actingAs.employeeId})</span>
                      <button onClick={handleActAsClear} className="ml-1 hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowActAsPanel(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Act As Employee</span>
                    </button>
                  )}

                  {/* Lookup panel */}
                  {showActAsPanel && (
                    <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-slate-800">Fill form on behalf of</p>
                        <button onClick={() => setShowActAsPanel(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={actAsInput}
                          onChange={e => setActAsInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleActAsLookup()}
                          placeholder="Employee ID (e.g. PMMPL-320)"
                          className="flex-1 px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={handleActAsLookup}
                          disabled={actAsLoading || !actAsInput.trim()}
                          className="px-3 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50"
                          style={{ background: "#1d4ed8" }}
                        >
                          {actAsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {actAsIsLiving && (
                        <div className="mb-3 p-2.5 rounded-xl text-xs" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                          <p className="font-black text-red-700">Employee has left the organization</p>
                          <p className="text-red-500 mt-0.5">This employee is in Living History and cannot be selected.</p>
                        </div>
                      )}

                      {actAsLookupResult && (
                        <div className="mb-3 p-2.5 rounded-xl text-xs" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                          <p className="font-black text-green-800">{actAsLookupResult.name}</p>
                          <p className="text-green-600">{actAsLookupResult.companyName}</p>
                        </div>
                      )}

                      {actAsNotFound && (
                        <div className="mb-3 space-y-2">
                          <p className="text-xs text-red-500 font-medium">Employee not found. Enter manually:</p>
                          <input
                            type="text"
                            value={actAsManualName}
                            onChange={e => setActAsManualName(e.target.value)}
                            placeholder="Employee Name"
                            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                          />
                          <input
                            type="text"
                            value={actAsManualCompany}
                            onChange={e => setActAsManualCompany(e.target.value)}
                            placeholder="Company Name (e.g. Pmmpl)"
                            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                          />
                        </div>
                      )}

                      <button
                        onClick={handleActAsSet}
                        disabled={!actAsInput.trim() || actAsIsLiving || (!actAsLookupResult && !actAsManualName)}
                        className="w-full py-2 rounded-xl text-white text-xs font-black disabled:opacity-40"
                        style={{ background: "#1d4ed8" }}
                      >
                        Set Employee
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active "acting as" banner */}
          {actingAs && user?.role === "Admin" && (
            <div className="px-4 md:px-8 py-2 text-xs font-bold flex items-center gap-2"
              style={{ background: "#d1fae5", color: "#065f46" }}>
              <UserCheck className="w-3.5 h-3.5" />
              Forms will be submitted for: <span className="font-black">{actingAs.name} ({actingAs.employeeId})</span>
              <button onClick={handleActAsClear} className="ml-auto underline font-medium">Clear</button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
