import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface OfferLetterLookupInput {}

export interface OfferLetterLookupOutput {
  records: GasRecord[];
}

export const offerLetterTool: BaseTool<OfferLetterLookupInput, OfferLetterLookupOutput> = {
  name: "offer_letter_lookup",
  description: "Lists issued offer letters.",
  parameters: { type: "object", properties: {} },
  async execute() {
    const res = await getGasClient().call<GasRecord>("getOfferLetters", {});
    return { records: unwrapGasList(res) };
  },
};

toolRegistry.register(offerLetterTool);
