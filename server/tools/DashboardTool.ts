import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface DashboardInsightsInput {}

export interface DashboardInsightsOutput {
  presentToday: number;
  activeEmployees: number;
  pendingLeaveApprovals: number;
  pendingSalaryIncrementApprovals: number;
  totalHiringRequisitions: number;
}

export const dashboardTool: BaseTool<DashboardInsightsInput, DashboardInsightsOutput> = {
  name: "dashboard_insights",
  description: "Quick top-line HR snapshot: who's present today, active headcount, and pending approval counts.",
  parameters: { type: "object", properties: {} },
  async execute() {
    const [presentRes, employeesRes, livingRes, leavesRes, incrementsRes, hiringRes] = await Promise.all([
      getGasClient().call<GasRecord>("getPresentEmployees", {}),
      getGasClient().call<GasRecord>("getEmployeeDetails", {}),
      getGasClient().call<GasRecord>("getLivingHistory", {}),
      getGasClient().call<GasRecord>("getLeaves", {}),
      getGasClient().call<GasRecord>("getSalaryIncrements", {}),
      getGasClient().call<GasRecord>("getHiringTracker", {}),
    ]);

    const present = unwrapGasList(presentRes);
    const employees = unwrapGasList(employeesRes);
    const living = unwrapGasList(livingRes);
    const leaves = unwrapGasList(leavesRes);
    const increments = unwrapGasList(incrementsRes);
    const hiring = unwrapGasList(hiringRes);

    const livingIds = new Set(
      living.map((row) => String(row.pmmplAc ?? row.employeeId ?? "").trim()).filter(Boolean)
    );
    const activeEmployees = employees.filter((row) => !livingIds.has(String(row.employeeId ?? "").trim()));

    const pendingLeaveApprovals = leaves.filter((l) => !l.status2 || l.status2 === "Pending").length;
    const pendingSalaryIncrementApprovals = increments.filter(
      (i) => !i.status3 || i.status3 === "Pending"
    ).length;

    return {
      presentToday: present.length,
      activeEmployees: activeEmployees.length,
      pendingLeaveApprovals,
      pendingSalaryIncrementApprovals,
      totalHiringRequisitions: hiring.length,
    };
  },
};

toolRegistry.register(dashboardTool);
