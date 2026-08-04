import { ToolExecutionContext } from "../tools/BaseTool";
import { ApiError } from "./ApiError";

const PRIVILEGED_ROLES = new Set(["Admin", "HR", "HOD"]);

/**
 * Guards tools that expose one employee's personal/financial records
 * (attendance, leave, salary, loans). Self-lookup is always allowed;
 * looking up someone else requires a privileged role.
 *
 * Note: this only checks the role already present on the context. Verifying
 * that the caller actually is who context.employeeId/role claims is Phase
 * 12's job (real auth) — this guard just stops an unrestricted tool from
 * handing out anyone's data to anyone in the meantime.
 */
export function assertSelfOrPrivileged(context: ToolExecutionContext, targetEmployeeId: string): void {
  if (context.employeeId === targetEmployeeId) return;
  if (context.role && PRIVILEGED_ROLES.has(context.role)) return;
  throw ApiError.forbidden(`Not authorized to access records for employee ${targetEmployeeId}`);
}
