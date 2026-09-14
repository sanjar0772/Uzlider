export const ROLES = [
  "OWNER",
  "MANAGER",
  "DISPATCHER",
  "UPDATER",
  "ACCOUNTANT",
  "DRIVER",
] as const;
export type Role = (typeof ROLES)[number];

export const LOAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;
export type LoadStatus = (typeof LOAD_STATUSES)[number];

export const DRIVER_STATUSES = ["AVAILABLE", "ON_LOAD", "OFF_DUTY"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const TRUCK_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export const EQUIPMENT_TYPES = [
  "VAN",
  "REEFER",
  "FLATBED",
  "POWER_ONLY",
  "STEP_DECK",
  "OTHER",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "FUEL",
  "MAINTENANCE",
  "TOLLS",
  "INSURANCE",
  "PERMITS",
  "LODGING",
  "FOOD",
  "OFFICE",
  "PARKING",
  "FINES",
  "DISPATCH_FEE",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const MAINTENANCE_TYPES = [
  "SERVICE",
  "REPAIR",
  "INSPECTION",
  "TIRES",
  "OTHER",
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const DOC_CATEGORIES = [
  "RATE_CON",
  "BOL",
  "POD",
  "INVOICE",
  "INSURANCE",
  "REGISTRATION",
  "CDL",
  "MEDICAL",
  "OTHER",
] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const STOP_TYPES = ["PICKUP", "DROPOFF"] as const;
export type StopType = (typeof STOP_TYPES)[number];

// US states + common Canadian provinces, used for IFTA jurisdiction tagging.
export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "AB", "BC", "MB", "ON", "QC", "SK",
] as const;

// ---- Permission matrix ----
export const can = {
  manageUsers: (r: string) => ["OWNER", "MANAGER"].includes(r),
  manageDrivers: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  manageTrucks: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  manageCustomers: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  createLoad: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  editLoad: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  deleteLoad: (r: string) => ["OWNER", "MANAGER"].includes(r),
  assignDriver: (r: string) => ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  updateStatus: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "UPDATER", "DRIVER"].includes(r),
  manageInvoices: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewInvoices: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewReports: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewFinancials: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT", "DISPATCHER"].includes(r),
  viewAllLoads: (r: string) => r !== "DRIVER",
  viewActivity: (r: string) => ["OWNER", "MANAGER"].includes(r),
  // Company + Telegram settings: admins only.
  manageSettings: (r: string) => ["OWNER", "MANAGER"].includes(r),
  manageTelegram: (r: string) => ["OWNER", "MANAGER"].includes(r),
  // Only an Owner may create/modify/delete Owner accounts or grant the Owner role.
  manageOwners: (r: string) => r === "OWNER",
  // ---- Operational + financial depth ----
  viewExpenses: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT", "DISPATCHER"].includes(r),
  manageExpenses: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  viewMaintenance: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "ACCOUNTANT"].includes(r),
  manageMaintenance: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER"].includes(r),
  viewFuel: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "ACCOUNTANT"].includes(r),
  // Drivers may log their own fuel stops; staff manage all.
  manageFuel: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "ACCOUNTANT", "DRIVER"].includes(r),
  viewAnalytics: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT", "DISPATCHER"].includes(r),
  viewSettlements: (r: string) =>
    ["OWNER", "MANAGER", "ACCOUNTANT"].includes(r),
  // Anyone who can post updates can attach documents (drivers upload PODs).
  manageDocuments: (r: string) =>
    ["OWNER", "MANAGER", "DISPATCHER", "UPDATER", "ACCOUNTANT", "DRIVER"].includes(r),
};

// Rank used to stop privilege escalation: a user may never act on an account
// whose role outranks their own, nor grant a role above their own.
export const ROLE_RANK: Record<string, number> = {
  OWNER: 5,
  MANAGER: 4,
  ACCOUNTANT: 3,
  DISPATCHER: 3,
  UPDATER: 2,
  DRIVER: 1,
};

// Validate that a value is a member of an enum list (guards against 500s and
// clients pushing arbitrary status strings straight into the database).
export function isLoadStatus(v: any): v is LoadStatus {
  return typeof v === "string" && (LOAD_STATUSES as readonly string[]).includes(v);
}
export function isDriverStatus(v: any): v is DriverStatus {
  return typeof v === "string" && (DRIVER_STATUSES as readonly string[]).includes(v);
}
export function isTruckStatus(v: any): v is TruckStatus {
  return typeof v === "string" && (TRUCK_STATUSES as readonly string[]).includes(v);
}
export function isInvoiceStatus(v: any): v is InvoiceStatus {
  return typeof v === "string" && (INVOICE_STATUSES as readonly string[]).includes(v);
}
export function isEquipmentType(v: any): v is EquipmentType {
  return typeof v === "string" && (EQUIPMENT_TYPES as readonly string[]).includes(v);
}
export function isExpenseCategory(v: any): v is ExpenseCategory {
  return typeof v === "string" && (EXPENSE_CATEGORIES as readonly string[]).includes(v);
}
export function isMaintenanceType(v: any): v is MaintenanceType {
  return typeof v === "string" && (MAINTENANCE_TYPES as readonly string[]).includes(v);
}
export function isDocCategory(v: any): v is DocCategory {
  return typeof v === "string" && (DOC_CATEGORIES as readonly string[]).includes(v);
}
export function isStopType(v: any): v is StopType {
  return typeof v === "string" && (STOP_TYPES as readonly string[]).includes(v);
}

export const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  DISPATCHER:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  UPDATER: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ACCOUNTANT:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  DRIVER: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const LOAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  IN_TRANSIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DELIVERED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  AVAILABLE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ON_LOAD: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  OFF_DUTY: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const TRUCK_STATUS_COLORS: Record<string, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  MAINTENANCE:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  INACTIVE: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  FUEL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  MAINTENANCE: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  TOLLS: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  INSURANCE: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  PERMITS: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  LODGING: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  FOOD: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  OFFICE: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  PARKING: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  FINES: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  DISPATCH_FEE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const MAINTENANCE_TYPE_COLORS: Record<string, string> = {
  SERVICE: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  REPAIR: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  INSPECTION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  TIRES: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export const DOC_CATEGORY_COLORS: Record<string, string> = {
  RATE_CON: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  BOL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  POD: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  INVOICE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  INSURANCE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  REGISTRATION: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  CDL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  MEDICAL: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};
