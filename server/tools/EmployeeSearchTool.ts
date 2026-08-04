import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { sanitizeEmployeeRecord, EmployeeSummary } from "../utils/sanitizeEmployee";
import { ApiError } from "../utils/ApiError";
import { BaseTool, ToolExecutionContext, toolRegistry } from "./index";

const MAX_RESULTS = 25;

export interface EmployeeSearchInput {
  /** Name or employee ID to search for, matched as a case-insensitive substring. */
  query: string;
}

export interface EmployeeSearchOutput {
  results: EmployeeSummary[];
}

export const employeeSearchTool: BaseTool<EmployeeSearchInput, EmployeeSearchOutput> = {
  name: "employee_search",
  description:
    "Searches employees by name or employee ID. Returns basic directory info (name, designation, department, HOD) only — never salary, bank, or login details.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Name or employee ID to search for" },
    },
    required: ["query"],
  },
  async execute(input: EmployeeSearchInput, _context: ToolExecutionContext): Promise<EmployeeSearchOutput> {
    const query = input.query?.trim();
    if (!query) {
      throw ApiError.badRequest("query is required");
    }

    const res = await getGasClient().call<GasRecord>("getEmployeeDetails", {});
    const records = unwrapGasList(res);

    const needle = query.toLowerCase();
    const matches = records.filter((record) => {
      const name = String(record.name ?? "").toLowerCase();
      const employeeId = String(record.employeeId ?? "").toLowerCase();
      return name.includes(needle) || employeeId.includes(needle);
    });

    return { results: matches.slice(0, MAX_RESULTS).map(sanitizeEmployeeRecord) };
  },
};

toolRegistry.register(employeeSearchTool);
