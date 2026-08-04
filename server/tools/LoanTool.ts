import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { assertSelfOrPrivileged } from "../utils/toolAccess";
import { BaseTool, toolRegistry } from "./index";

export interface LoanLookupInput {
  /** Defaults to the requesting employee when omitted. */
  employeeId?: string;
}

export interface LoanLookupOutput {
  employeeId: string;
  records: GasRecord[];
}

export const loanTool: BaseTool<LoanLookupInput, LoanLookupOutput> = {
  name: "loan_application_lookup",
  description:
    "Looks up loan applications for an employee. Defaults to the requesting employee; looking up someone else requires HOD/HR/Admin.",
  parameters: {
    type: "object",
    properties: {
      employeeId: { type: "string", description: "Employee ID to look up. Omit to use the requesting employee." },
    },
  },
  async execute(input, context) {
    const target = input.employeeId?.trim() || context.employeeId;
    assertSelfOrPrivileged(context, target);

    const res = await getGasClient().call<GasRecord>("getLoanApplications", { employeeId: target });
    return { employeeId: target, records: unwrapGasList(res) };
  },
};

toolRegistry.register(loanTool);
