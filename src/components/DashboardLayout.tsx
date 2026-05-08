import { useState } from "react";
import { useAuth } from "../context/AuthContext";
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
  UserPlus
} from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Staf", "Admin", "HOD"] },
    { id: "punch-miss", label: "Punch Miss", icon: Clock, roles: ["Staf", "Admin", "HOD"] },
    { id: "leave", label: "Leave", icon: Calendar, roles: ["Staf", "Admin", "HOD"] },
    { id: "holiday", label: "Holiday Working", icon: Briefcase, roles: ["Staf", "Admin", "HOD"] },
    { id: "hod-approvals", label: "HOD Approvals", icon: CheckCircle, roles: ["Admin", "HOD"] },
    { id: "hr-approvals", label: "HR Approvals", icon: Users, roles: ["Admin"] },
    { id: "attendance", label: "Attendance", icon: Users, roles: ["Staf", "Admin", "HOD"] },
    { id: "salary", label: "Salary Records", icon: CreditCard, roles: ["Staf", "Admin", "HOD"] },
    { id: "salary-increment", label: "Salary Increment", icon: TrendingUp, roles: ["Admin"] },
    { id: "joining", label: "Joining", icon: UserPlus, roles: ["Admin"] },
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
        <header className="h-16 bg-white border-b border-pink-100 flex items-center justify-between px-4 md:px-8 shrink-0">
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
          <div className="flex items-center gap-4">
            <span className="text-xs md:text-sm text-slate-500 hidden sm:inline">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
