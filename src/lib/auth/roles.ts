export type AppRole = "ADMIN" | "OFFICE" | "INSTRUCTOR";

/**
 * Centralised role-permission checks. Keep all "who can do what" logic here
 * rather than scattered across routes/components.
 */
export const permissions = {
  canEditSchedule: (role: AppRole) => role === "ADMIN" || role === "OFFICE",
  canViewSchedule: (_role: AppRole) => true,
  canManageInstructors: (role: AppRole) => role === "ADMIN" || role === "OFFICE",
  canManagePartners: (role: AppRole) => role === "ADMIN" || role === "OFFICE",
  // Discounts over 10% require admin approval per the cancellation/discount policy
  canApplyDiscountOver10Pct: (role: AppRole) => role === "ADMIN",
  canIssueInvoice: (role: AppRole) => role === "ADMIN" || role === "OFFICE",
  canRecordPayment: (role: AppRole) => role === "ADMIN" || role === "OFFICE",
};
