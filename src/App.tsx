import { useState, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./components/Login";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHome } from "./components/DashboardHome";
import { Loader2 } from "lucide-react";

// Lazy-loaded: each of these (plus PDF libs some of them pull in, e.g. jsPDF/html2canvas
// for offer letters and payslips) previously shipped in one ~1.2MB upfront bundle even
// though a given user only ever opens a handful of these tabs. Splitting them means the
// initial load only pays for Login + the dashboard shell; a module's code downloads the
// first time its tab is opened, not before.
const PunchMissModule = lazy(() => import("./components/PunchMissModule").then(m => ({ default: m.PunchMissModule })));
const LeaveModule = lazy(() => import("./components/LeaveModule").then(m => ({ default: m.LeaveModule })));
const HolidayWorkingModule = lazy(() => import("./components/HolidayWorkingModule").then(m => ({ default: m.HolidayWorkingModule })));
const AttendanceModule = lazy(() => import("./components/AttendanceModule").then(m => ({ default: m.AttendanceModule })));
const SalaryModule = lazy(() => import("./components/SalaryModule").then(m => ({ default: m.SalaryModule })));
const PayrollModule = lazy(() => import("./components/PayrollModule").then(m => ({ default: m.PayrollModule })));
const SalaryIncrementModule = lazy(() => import("./components/SalaryIncrementModule").then(m => ({ default: m.SalaryIncrementModule })));
const ApprovalModule = lazy(() => import("./components/ApprovalModule").then(m => ({ default: m.ApprovalModule })));
const JoiningModule = lazy(() => import("./components/JoiningModule").then(m => ({ default: m.JoiningModule })));
const LeaveReportModule = lazy(() => import("./components/LeaveReportModule").then(m => ({ default: m.LeaveReportModule })));
const UpcomingIncrementModule = lazy(() => import("./components/UpcomingIncrementModule").then(m => ({ default: m.UpcomingIncrementModule })));
const HiringTrackerModule = lazy(() => import("./components/HiringTrackerModule").then(m => ({ default: m.HiringTrackerModule })));
const LoanApplicationModule = lazy(() => import("./components/LoanApplicationModule").then(m => ({ default: m.LoanApplicationModule })));
const FormatsModule = lazy(() => import("./components/FormatsModule").then(m => ({ default: m.FormatsModule })));
const OutsiderAttendanceModule = lazy(() => import("./components/OutsiderAttendanceModule").then(m => ({ default: m.OutsiderAttendanceModule })));

const ModuleFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
  </div>
);

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
      case "outsider-attendance":
        return <OutsiderAttendanceModule />;
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
      case "payroll":
        return <PayrollModule />;
      case "salary-increment":
        return <SalaryIncrementModule />;
      case "upcoming-increment":
        return <UpcomingIncrementModule />;
      case "joining":
        return <JoiningModule />;
      case "leave-report":
        return <LeaveReportModule />;
      case "hiring-tracker":
        return <HiringTrackerModule />;
      case "loan-application":
        return <LoanApplicationModule />;
      case "formats":
        return <FormatsModule />;
      default:
        return <DashboardHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={<ModuleFallback />}>
        {renderContent()}
      </Suspense>
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
