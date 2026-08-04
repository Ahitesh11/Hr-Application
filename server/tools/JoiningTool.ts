import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface JoiningLookupInput {}

export interface JoiningLookupOutput {
  records: GasRecord[];
}

export const joiningTool: BaseTool<JoiningLookupInput, JoiningLookupOutput> = {
  name: "joining_lookup",
  description: "Lists employee joining/onboarding tracker entries.",
  parameters: { type: "object", properties: {} },
  async execute() {
    const res = await getGasClient().call<GasRecord>("getJoining", {});
    return { records: unwrapGasList(res) };
  },
};

toolRegistry.register(joiningTool);
