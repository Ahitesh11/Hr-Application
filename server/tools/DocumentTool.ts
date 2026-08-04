import { GasRecord } from "../types/gas.types";
import { getGasClient, unwrapGasList } from "../services/gasClient";
import { BaseTool, toolRegistry } from "./index";

export interface DocumentRecordsLookupInput {}

export interface DocumentRecordsLookupOutput {
  records: GasRecord[];
}

/**
 * GAS's submitDocument action writes into the same "Offer Letters" sheet as
 * offer letters (see GOOGLE_APPS_SCRIPT.gs) — there is no separate documents
 * sheet or action in the existing backend. This tool reads that same source;
 * it isn't duplicating OfferLetterTool, both genuinely read the one sheet
 * that exists.
 */
export const documentTool: BaseTool<DocumentRecordsLookupInput, DocumentRecordsLookupOutput> = {
  name: "document_records_lookup",
  description: "Lists generated HR documents (shares its data source with offer letters in the current system).",
  parameters: { type: "object", properties: {} },
  async execute() {
    const res = await getGasClient().call<GasRecord>("getOfferLetters", {});
    return { records: unwrapGasList(res) };
  },
};

toolRegistry.register(documentTool);
