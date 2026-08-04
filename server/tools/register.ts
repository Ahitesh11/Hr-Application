/**
 * Importing this module registers all HR tools into toolRegistry via their
 * own self-registration side effects. The Agent Engine (Phase 8) imports
 * this once at startup rather than importing each tool file individually.
 */
import "./EmployeeSearchTool";
import "./EmployeeProfileTool";
import "./AttendanceTool";
import "./LeaveTool";
import "./SalaryTool";
import "./SalaryIncrementTool";
import "./LoanTool";
import "./HiringTool";
import "./JoiningTool";
import "./OfferLetterTool";
import "./DocumentTool";
import "./PolicyTool";
import "./AnalyticsTool";
import "./DashboardTool";

export { toolRegistry } from "./index";
