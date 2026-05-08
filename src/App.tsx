import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./components/Login";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHome } from "./components/DashboardHome";
import { PunchMissModule } from "./components/PunchMissModule";
import { LeaveModule } from "./components/LeaveModule";
import { HolidayWorkingModule } from "./components/HolidayWorkingModule";
import { AttendanceModule } from "./components/AttendanceModule";
import { SalaryModule } from "./components/SalaryModule";
import { SalaryIncrementModule } from "./components/SalaryIncrementModule";
import { ApprovalModule } from "./components/ApprovalModule";
import { JoiningModule } from "./components/JoiningModule";
import { Loader2 } from "lucide-react";

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-pink-600" />
          <p className="text-slate-500 font-medium">Initializing system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome onNavigate={setActiveTab} />;
      case "punch-miss":
        return <PunchMissModule />;
      case "leave":
        return <LeaveModule />;
      case "holiday":
        return <HolidayWorkingModule />;
      case "hod-approvals":
        return <ApprovalModule role="HOD" />;
      case "hr-approvals":
        return <ApprovalModule role="HR" />;
      case "attendance":
        return <AttendanceModule />;
      case "salary":
        return <SalaryModule />;
      case "salary-increment":
        return <SalaryIncrementModule />;
      case "joining":
        return <JoiningModule />;
      default:
        return <DashboardHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
