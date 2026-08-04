import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { sanitizeEmployeeRecord, EmployeeSummary } from "../utils/sanitizeEmployee";
import { ApiError } from "../utils/ApiError";
import { BaseTool, ToolExecutionContext, toolRegistry } from "./index";

export interface EmployeeProfileInput {
  employeeId: string;
}

export interface EmployeeProfileOutput {
  employee: EmployeeSummary | null;
}

export const employeeProfileTool: BaseTool<EmployeeProfileInput, EmployeeProfileOutput> = {
  name: "employee_profile",
  description:
    "Fetches one employee's basic profile (name, designation, department, HOD). Never returns salary, bank, or login details.",
  parameters: {
    type: "object",
    properties: {
      employeeId: { type: "string", description: "Employee ID to look up" },
    },
    required: ["employeeId"],
  },
  async execute(input: EmployeeProfileInput, _context: ToolExecutionContext): Promise<EmployeeProfileOutput> {
    const employeeId = input.employeeId?.trim();
    if (!employeeId) {
      throw ApiError.badRequest("employeeId is required");
    }

    const res = await getGasClient().call<GasRecord>("getEmployeeDetails", { employeeId });
    const records = unwrapGasList(res);
    return { employee: records[0] ? sanitizeEmployeeRecord(records[0]) : null };
  },
};

toolRegistry.register(employeeProfileTool);
