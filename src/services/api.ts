import { User, PunchMissFms, LeaveFms, HolidayWorkingFms, Attendance, SalaryRecord, SalaryIncrementFms, LoanApplicationFms } from "../types";

const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL || "";

async function callGas(action: string, payload: any = {}) {
  if (!GAS_URL) {
    console.error("GAS_WEB_APP_URL is not set.");
    return null;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      console.error(`GAS returned HTTP ${response.status} for action ${action}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error calling GAS action ${action}:`, error);
    return null;
  }
}

// For development/demo purposes, we'll use a mock if GAS_URL is not set or fails
// In a real app, you'd only use the callGas function.
const useMock = !GAS_URL || GAS_URL.includes("YOUR_SCRIPT_ID");

export const api = {
  login: async (employeeId: string, password: string): Promise<User | null> => {
    console.log(`Attempting login for ${employeeId} using ${useMock ? 'Mock' : 'Real GAS'}`);
    if (useMock) {
      // Mock login logic
      if (employeeId === "PMMPL-7" && password === "PMMPL-7Rajkumar sahu") {
        return { employeeId, name: "Rajkumar sahu", designation: "Driver", companyName: "Pmmpl", role: "Admin", cl: 12, el: 22, ml: 6, hod: "" };
      }
      if (employeeId === "PMMPL-2" && password === "PMMPL-2Jitendra Singh") {
        return { employeeId, name: "Jitendra Singh", designation: "Plant Supervisor", companyName: "Pmmpl", role: "Staf", cl: 12, el: 22, ml: 6, hod: "" };
      }
      return null;
    }
    const res = await callGas("login", { employeeId, password });
    return res && res.success ? res.user : null;
  },

  getPunchMiss: async (employeeId?: string): Promise<PunchMissFms[]> => {
    if (useMock) return [];
    const res = await callGas("getPunchMiss", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  submitPunchMiss: async (data: Partial<PunchMissFms>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitPunchMiss", data);
    return !!(res && res.success);
  },

  getLeaves: async (employeeId?: string): Promise<LeaveFms[]> => {
    if (useMock) return [];
    const res = await callGas("getLeaves", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  submitLeave: async (data: Partial<LeaveFms>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitLeave", data);
    return !!(res && res.success);
  },

  getHolidayWorking: async (employeeId?: string): Promise<HolidayWorkingFms[]> => {
    if (useMock) return [];
    const res = await callGas("getHolidayWorking", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  submitHolidayWorking: async (data: Partial<HolidayWorkingFms>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitHolidayWorking", data);
    return !!(res && res.success);
  },

  getAttendance: async (employeeId?: string): Promise<Attendance[]> => {
    if (useMock) return [];
    const res = await callGas("getAttendance", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  getSalaryRecords: async (employeeId?: string): Promise<SalaryRecord[]> => {
    if (useMock) return [];
    const res = await callGas("getSalaryRecords", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  testConnection: async (): Promise<any> => {
    if (useMock) return { success: true, message: "Mock Connection Successful!", sheets: ["Mock Sheet"] };
    return callGas("test", {});
  },

  updateStep: async (sheetName: string, rowId: string, step: number, actual: string, status?: string, extraFields?: any, rowIndex?: number): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("updateStep", { sheetName, rowId, step, actual, status, extraFields, rowIndex });
    return !!(res && res.success);
  },


  getSalaryIncrements: async (employeeId?: string): Promise<SalaryIncrementFms[]> => {
    if (useMock) return [];
    const res = await callGas("getSalaryIncrements", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  getEmployeeById: async (employeeId: string): Promise<any[]> => {
    const res = await callGas("getEmployeeDetails", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  getAllEmployees: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getEmployeeDetails", {});
    return Array.isArray(res) ? res : [];
  },

  /* Returns only employees who have NOT left (not in Living History) */
  getActiveEmployees: async (): Promise<any[]> => {
    if (useMock) return [];
    const [all, living] = await Promise.all([
      callGas("getEmployeeDetails", {}),
      callGas("getLivingHistory", {}),
    ]);
    const allEmps      = Array.isArray(all)    ? all    : [];
    const livingHistory = Array.isArray(living) ? living : [];
    const livingIds = new Set(
      livingHistory
        .map((l: any) => (l.pmmplAc || l.employeeId || l.employeeCode || "").toString().trim())
        .filter(Boolean)
    );
    return allEmps.filter((e: any) => {
      const id = (e.employeeId || e.pmmplAc || e.employeeCode || "").toString().trim();
      return !livingIds.has(id);
    });
  },

  /* Check whether a single employee ID belongs to a living (ex-)employee */
  isEmployeeLiving: async (employeeId: string): Promise<boolean> => {
    if (useMock) return false;
    const living = await callGas("getLivingHistory", {});
    if (!Array.isArray(living)) return false;
    const id = employeeId.toString().trim();
    return living.some(
      (l: any) => (l.pmmplAc || l.employeeId || l.employeeCode || "").toString().trim() === id
    );
  },

  submitSalaryIncrement: async (data: Partial<SalaryIncrementFms>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitSalaryIncrement", data);
    return !!(res && res.success);
  },

  getPresentEmployees: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getPresentEmployees", {});
    return Array.isArray(res) ? res : [];
  },

  getJoining: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getJoining", {});
    return Array.isArray(res) ? res : [];
  },

  submitJoining: async (data: Record<string, any>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitJoining", data);
    return !!(res && res.success);
  },

  updateMailId: async (employeeId: string, mailId: string): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("updateMailId", { employeeId, mailId });
    return !!(res && res.success);
  },

  submitLiving: async (data: Record<string, any>): Promise<{ ok: boolean; error?: string }> => {
    if (useMock) return { ok: true };
    const res = await callGas("submitLiving", data);
    if (res && res.success) return { ok: true };
    return { ok: false, error: res?.error || "GAS returned failure — check deployment" };
  },

  getLivingHistory: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getLivingHistory", {});
    return Array.isArray(res) ? res : [];
  },

  updateLivingPayment: async (pmmplAc: string, paymentDate?: string): Promise<{ ok: boolean; error?: string }> => {
    if (useMock) return { ok: true };
    const res = await callGas("updateLivingPayment", { pmmplAc, paymentDate });
    if (res && res.success) return { ok: true };
    return { ok: false, error: res?.error || "Failed to update payment" };
  },

  getActualSalaryIncrements: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getActualSalaryIncrements", {});
    return Array.isArray(res) ? res : [];
  },

  savePaidLeaveReport: async (rows: any[]): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("savePaidLeaveReport", { rows });
    return !!(res && res.success);
  },

  getHiringTracker: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getHiringTracker", {});
    return Array.isArray(res) ? res : [];
  },

  submitHiringTracker: async (data: Record<string, any>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitHiringTracker", data);
    return !!(res && res.success);
  },

  updateHiringTrackerStep: async (data: Record<string, any>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("updateHiringTrackerStep", data);
    return !!(res && res.success);
  },

  getLoanApplications: async (employeeId?: string): Promise<LoanApplicationFms[]> => {
    if (useMock) return [];
    const res = await callGas("getLoanApplications", { employeeId });
    return Array.isArray(res) ? res : [];
  },

  submitLoanApplication: async (data: Partial<LoanApplicationFms>): Promise<boolean> => {
    if (useMock) return true;
    const res = await callGas("submitLoanApplication", data);
    return !!(res && res.success);
  },

  getOfferLetters: async (): Promise<any[]> => {
    if (useMock) return [];
    const res = await callGas("getOfferLetters", {});
    return Array.isArray(res) ? res : [];
  },


  submitOfferLetter: async (data: Record<string, any>): Promise<any> => {
    if (useMock) return { success: true };
    const res = await callGas("submitOfferLetter", data);
    return res;
  },

  submitDocument: async (data: Record<string, any>): Promise<any> => {
    if (useMock) return { success: true };
    const res = await callGas("submitDocument", data);
    return res;
  },
};
