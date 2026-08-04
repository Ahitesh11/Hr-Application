import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface HiringTrackerLookupInput {}

export interface HiringTrackerLookupOutput {
  records: GasRecord[];
}

export const hiringTool: BaseTool<HiringTrackerLookupInput, HiringTrackerLookupOutput> = {
  name: "hiring_tracker_lookup",
  description: "Lists all hiring/recruitment tracker entries.",
  parameters: { type: "object", properties: {} },
  async execute() {
    const res = await getGasClient().call<GasRecord>("getHiringTracker", {});
    return { records: unwrapGasList(res) };
  },
};

toolRegistry.register(hiringTool);
