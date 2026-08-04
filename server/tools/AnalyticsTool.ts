import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface HrAnalyticsInput {}

export interface HrAnalyticsOutput {
  totalActiveEmployees: number;
  employeesByRole: Record<string, number>;
  leaveBreakdown: {
    byType: Record<string, number>;
    pendingCount: number;
    approvedCount: number;
  };
  salaryIncrementBreakdown: {
    pendingCount: number;
    approvedCount: number;
  };
}

export const analyticsTool: BaseTool<HrAnalyticsInput, HrAnalyticsOutput> = {
  name: "hr_analytics",
  description:
    "Computes HR-wide analytics: active employee counts by role, leave usage breakdown by type, and the salary increment approval funnel.",
  parameters: { type: "object", properties: {} },
  async execute() {
    const [employeesRes, livingRes, leavesRes, incrementsRes] = await Promise.all([
      getGasClient().call<GasRecord>("getEmployeeDetails", {}),
      getGasClient().call<GasRecord>("getLivingHistory", {}),
      getGasClient().call<GasRecord>("getLeaves", {}),
      getGasClient().call<GasRecord>("getSalaryIncrements", {}),
    ]);

    const employees = unwrapGasList(employeesRes);
    const living = unwrapGasList(livingRes);
    const leaves = unwrapGasList(leavesRes);
    const increments = unwrapGasList(incrementsRes);

    const livingIds = new Set(
      living.map((row) => String(row.pmmplAc ?? row.employeeId ?? "").trim()).filter(Boolean)
    );
    const activeEmployees = employees.filter((row) => !livingIds.has(String(row.employeeId ?? "").trim()));

    const employeesByRole: Record<string, number> = {};
    for (const emp of activeEmployees) {
      const role = String(emp.role ?? "Unknown");
      employeesByRole[role] = (employeesByRole[role] ?? 0) + 1;
    }

    const byType: Record<string, number> = {};
    let leavePending = 0;
    let leaveApproved = 0;
    for (const leave of leaves) {
      const type = String(leave.typeOfLeave ?? "Unknown");
      byType[type] = (byType[type] ?? 0) + 1;
      // Mirrors DashboardHome.tsx: status2 is the final HR approval stage.
      if (leave.status2 === "Work Done") leaveApproved++;
      else if (!leave.status2 || leave.status2 === "Pending") leavePending++;
    }

    let incrementPending = 0;
    let incrementApproved = 0;
    for (const inc of increments) {
      // Mirrors DashboardHome.tsx: status3 is the final management approval stage.
      if (inc.status3 === "Work Done") incrementApproved++;
      else if (!inc.status3 || inc.status3 === "Pending") incrementPending++;
    }

    return {
      totalActiveEmployees: activeEmployees.length,
      employeesByRole,
      leaveBreakdown: { byType, pendingCount: leavePending, approvedCount: leaveApproved },
      salaryIncrementBreakdown: { pendingCount: incrementPending, approvedCount: incrementApproved },
    };
  },
};

toolRegistry.register(analyticsTool);
